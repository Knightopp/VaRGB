import { TypingIntensityParams, AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE, KEY_BY_ID } from '../layout';
import { applyBrightness, lerpColor } from '../color';

export class TypingIntensityEffect implements ILightingEffect {
  readonly type = 'typing_intensity';
  readonly name = 'Typing Intensity';

  // Internal smoothed activity state [0.0 .. 1.0] for rolling statistics & diagnostics
  private smoothedActivity: number = 0.0;
  private recentKeystrokes: number[] = [];
  private readonly maxWindowHistory: number = 100;

  // Individual per-key thermal heat levels: keyId -> heat [0.0 .. 1.0]
  private keyHeat: Map<string, number> = new Map();
  private currentTime: number = 0;

  constructor(public params: TypingIntensityParams = { ...DEFAULT_TYPING_INTENSITY_PARAMS }) {
    this.normalizeParams();
  }

  /**
   * Normalizes parameters, correcting legacy blue/orange presets to black/pure-red.
   */
  private normalizeParams(): void {
    if (!this.params) {
      this.params = { ...DEFAULT_TYPING_INTENSITY_PARAMS };
      return;
    }
    // Correct legacy cobalt blue idleColor ({ r: 0, g: 90, b: 220 }) to black (off)
    if (this.params.idleColor && this.params.idleColor.b > 150 && this.params.idleColor.r === 0) {
      this.params.idleColor = { r: 0, g: 0, b: 0 };
    }
    // Correct legacy orange activeColor ({ r: 255, g: 40, b: 0 } or g >= 20) to pure red
    if (this.params.activeColor && this.params.activeColor.r >= 200 && this.params.activeColor.g >= 20) {
      this.params.activeColor = { r: 255, g: 0, b: 0 };
    }
    // Reset legacy 35% idle brightness to 0% (off)
    if (this.params.minBrightness === 0.35) {
      this.params.minBrightness = 0.0;
    }
  }

  onKeyDown(code: string): void {
    const now = this.currentTime;
    this.recentKeystrokes.push(now);
    if (this.recentKeystrokes.length > this.maxWindowHistory) {
      this.recentKeystrokes.shift();
    }

    const key = KEY_BY_CODE[code] || KEY_BY_ID[code] || KEY_BY_ID[code.toLowerCase()];
    if (key) {
      const currentHeat = this.keyHeat.get(key.id) ?? 0.0;
      // Per-key heat accumulation:
      // Each strike heats this specific key (~0.38 at responsiveness 1.5).
      // Repeated strikes drive the key hotter and hotter up to 1.0 (pure blazing red).
      const responsiveness = Math.max(0.4, this.params.responsiveness ?? 1.5);
      const heatGain = 0.25 * responsiveness;
      const nextHeat = Math.min(1.0, currentHeat + heatGain);
      this.keyHeat.set(key.id, nextHeat);
    }
  }

  reset(): void {
    this.smoothedActivity = 0.0;
    this.recentKeystrokes.length = 0;
    this.keyHeat.clear();
    this.currentTime = 0;
  }

  public getSmoothedActivity(): number {
    return this.smoothedActivity;
  }

  public getKeyHeat(keyId: string): number {
    return this.keyHeat.get(keyId) ?? 0.0;
  }

  update(ctx: AnimationContext): KeyFrameColor {
    this.normalizeParams();

    const dt = Math.max(0.001, Math.min(0.5, ctx.dt));
    this.currentTime += dt;
    const now = this.currentTime;
    const keys = ctx.keys ?? K630_LAYOUT;
    const decayDuration = Math.max(0.5, this.params.idleDecayTime ?? 2.5);

    // 1. Cool down each individual key's temperature over time
    const coolingRate = 1.0 / (decayDuration * 0.45);
    const decayFactor = Math.exp(-dt * coolingRate);

    for (const [keyId, heat] of this.keyHeat.entries()) {
      const newHeat = heat * decayFactor;
      if (newHeat <= 0.03) {
        this.keyHeat.delete(keyId);
      } else {
        this.keyHeat.set(keyId, newHeat);
      }
    }

    // 2. Track rolling typing activity for diagnostics & test assertions
    const windowSec = Math.max(0.5, this.params.activityWindow ?? 2.5);
    const cutoff = now - windowSec;
    while (this.recentKeystrokes.length > 0 && this.recentKeystrokes[0] < cutoff) {
      this.recentKeystrokes.shift();
    }

    const currentRate = this.recentKeystrokes.length / windowSec;
    const targetActivity = Math.min(1.0, currentRate / 6.0);
    const responsiveness = Math.max(0.2, this.params.responsiveness ?? 1.5);

    if (targetActivity > this.smoothedActivity) {
      const attackSpeed = responsiveness * 4.0;
      this.smoothedActivity += (targetActivity - this.smoothedActivity) * Math.min(1.0, attackSpeed * dt);
    } else {
      const decayRate = 1.0 / decayDuration;
      this.smoothedActivity += (targetActivity - this.smoothedActivity) * Math.min(1.0, decayRate * dt);
    }

    if (this.smoothedActivity < 0.005) {
      this.smoothedActivity = 0.0;
    }

    // 3. Render frame per key:
    // Initial / unpressed state is pitch black (off: 0, 0, 0)
    const minBright = Math.max(0.0, Math.min(1.0, this.params.minBrightness ?? 0.0));
    const maxBright = Math.max(minBright, Math.min(1.0, this.params.maxBrightness ?? 1.0));
    const idleColor = this.params.idleColor ?? { r: 0, g: 0, b: 0 };
    const activeColor = this.params.activeColor ?? { r: 255, g: 0, b: 0 };

    const hasIdleGlow = minBright > 0.005 && (idleColor.r > 0 || idleColor.g > 0 || idleColor.b > 0);
    const restingColor: RGBColor = hasIdleGlow ? applyBrightness(idleColor, minBright) : { r: 0, g: 0, b: 0 };

    const frame: KeyFrameColor = {};
    for (const key of keys) {
      const heat = this.keyHeat.get(key.id) ?? 0.0;
      if (heat <= 0.03) {
        frame[key.id] = restingColor;
        continue;
      }

      // Key has heat: smoothly transition to activeColor (Pure Red)
      const factor = Math.max(0.0, Math.min(1.0, (heat - 0.03) / 0.97));
      const keyColor = lerpColor(idleColor, activeColor, factor);
      const effectiveBrightness = hasIdleGlow
        ? (minBright + (maxBright - minBright) * factor)
        : maxBright;

      const rendered = applyBrightness(keyColor, effectiveBrightness);
      if (!hasIdleGlow && rendered.r <= 2 && rendered.g === 0 && rendered.b === 0) {
        frame[key.id] = { r: 0, g: 0, b: 0 };
      } else {
        frame[key.id] = rendered;
      }
    }

    return frame;
  }
}

export const DEFAULT_TYPING_INTENSITY_PARAMS: TypingIntensityParams = {
  idleColor: { r: 0, g: 0, b: 0 },          // Initial color is Black / OFF
  activeColor: { r: 255, g: 0, b: 0 },      // Pure Blazing Red (zero green/blue, never orange!)
  minBrightness: 0.0,                      // 0% brightness when waiting (completely OFF)
  maxBrightness: 1.0,                      // 100% full intensity during fast typing
  responsiveness: 1.5,                     // Fast per-key heat gain
  activityWindow: 2.5,                     // 2.5s rolling observation window
  idleDecayTime: 2.5,                      // 2.5s thermal cooling back to off
};
