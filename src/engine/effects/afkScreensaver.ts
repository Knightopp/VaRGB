import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT } from '../layout';
import { applyBrightness, lerpColor, interpolatePalette } from '../color';

export type AfkScreensaverMode = 'aurora' | 'matrix_rain';

export interface AfkScreensaverParams {
  brightness: number;
  idleTimeout: number;       // Seconds before screensaver activates (default 120)
  crossfadeDuration: number; // Seconds for crossfade transition (default 2.0)
  screensaverMode: AfkScreensaverMode;
  dimColor: RGBColor;        // Idle/typing static color
  dimLevel: number;          // Active typing brightness (default 0.15)
}

/**
 * AFK Screensaver effect.
 *
 * Tracks time since last keystroke. While actively typing, shows a clean
 * low-distraction dimmed profile. After idle_time >= threshold, smoothly
 * crossfades into an ambient screensaver animation (Aurora Flow or Matrix Rain).
 * Any keystroke snaps the alpha back immediately.
 */
export class AfkScreensaverEffect implements ILightingEffect {
  readonly type = 'afk_screensaver' as const;
  readonly name = 'AFK Screensaver';

  private idleTime: number = 0;
  private crossfadeAlpha: number = 0; // 0 = active mode, 1 = screensaver
  private currentTime: number = 0;

  // Internal aurora state for screensaver
  private auroraPalette: RGBColor[] = [
    { r: 0, g: 229, b: 255 },
    { r: 0, g: 64, b: 255 },
    { r: 157, g: 0, b: 255 },
    { r: 0, g: 150, b: 255 },
  ];

  // Matrix rain state
  private matrixDrops: { col: number; head: number; speed: number; len: number }[] = [];
  private matrixInited: boolean = false;

  constructor(public params: AfkScreensaverParams = { ...DEFAULT_AFK_SCREENSAVER_PARAMS }) {}

  onKeyDown(_code: string): void {
    this.idleTime = 0;
    this.crossfadeAlpha = 0; // Snap back immediately
  }

  reset(): void {
    this.idleTime = 0;
    this.crossfadeAlpha = 0;
    this.currentTime = 0;
    this.matrixDrops = [];
    this.matrixInited = false;
  }

  private initMatrixDrops(): void {
    this.matrixDrops = [];
    for (let c = 0; c < 14; c++) {
      if (Math.random() < 0.6) {
        this.matrixDrops.push({
          col: c,
          head: -Math.random() * 5,
          speed: 1.5 + Math.random() * 3.0,
          len: 2 + Math.floor(Math.random() * 3),
        });
      }
    }
    this.matrixInited = true;
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.max(0.001, Math.min(0.5, ctx.dt));
    this.currentTime += dt;
    this.idleTime += dt;
    const keys = ctx.keys ?? K630_LAYOUT;

    const timeout = Math.max(5, this.params.idleTimeout ?? 120);
    const crossfadeDur = Math.max(0.5, this.params.crossfadeDuration ?? 2.0);

    // Update crossfade alpha
    if (this.idleTime >= timeout) {
      const elapsed = this.idleTime - timeout;
      this.crossfadeAlpha = Math.min(1.0, elapsed / crossfadeDur);
    }
    // Note: alpha is snapped to 0 in onKeyDown

    const frame: KeyFrameColor = {};
    const dimColor = this.params.dimColor;
    const dimLevel = this.params.dimLevel ?? 0.15;

    // Active (typing) frame: clean static dim
    const activeFrame: KeyFrameColor = {};
    for (const key of keys) {
      activeFrame[key.id] = applyBrightness(dimColor, dimLevel * this.params.brightness);
    }

    if (this.crossfadeAlpha <= 0.001) {
      return activeFrame;
    }

    // Screensaver frame
    const ssFrame: KeyFrameColor = {};
    const mode = this.params.screensaverMode ?? 'aurora';

    if (mode === 'aurora') {
      // Internal aurora shader
      const time = this.currentTime;
      const speed = 0.3;
      const gradWidth = 1.2;
      const cosA = Math.cos(Math.PI / 4);
      const sinA = Math.sin(Math.PI / 4);

      for (const key of keys) {
        const proj = key.normX * cosA + key.normY * sinA;
        const t = (proj / gradWidth) - time * speed;
        const color = interpolatePalette(this.auroraPalette, t);
        ssFrame[key.id] = applyBrightness(color, 0.7 * this.params.brightness);
      }
    } else {
      // Matrix rain shader
      if (!this.matrixInited) this.initMatrixDrops();

      // Advance drops
      for (const drop of this.matrixDrops) {
        drop.head += drop.speed * dt;
        if (drop.head > 5 + drop.len) {
          drop.head = -Math.random() * 3;
          drop.speed = 1.5 + Math.random() * 3.0;
          drop.col = Math.floor(Math.random() * 14);
        }
      }

      // Spawn occasional new drops
      if (Math.random() < 0.15 * dt * 10) {
        this.matrixDrops.push({
          col: Math.floor(Math.random() * 14),
          head: -1,
          speed: 1.5 + Math.random() * 3.0,
          len: 2 + Math.floor(Math.random() * 3),
        });
        if (this.matrixDrops.length > 25) this.matrixDrops.shift();
      }

      // Render
      for (const key of keys) {
        const r = key.gridY;
        const c = key.gridX;
        let maxBright = 0;

        for (const drop of this.matrixDrops) {
          if (drop.col !== c) continue;
          const dist = drop.head - r;
          if (dist >= 0 && dist <= drop.len) {
            const fade = 1.0 - dist / drop.len;
            maxBright = Math.max(maxBright, fade);
          }
        }

        if (maxBright > 0.01) {
          const headColor: RGBColor = { r: 200, g: 255, b: 200 };
          const trailColor: RGBColor = { r: 0, g: 180, b: 30 };
          const color = lerpColor(trailColor, headColor, maxBright);
          ssFrame[key.id] = applyBrightness(color, maxBright * 0.8 * this.params.brightness);
        } else {
          ssFrame[key.id] = { r: 0, g: 0, b: 0 };
        }
      }
    }

    // Blend active and screensaver frames
    for (const key of keys) {
      const active = activeFrame[key.id] || { r: 0, g: 0, b: 0 };
      const ss = ssFrame[key.id] || { r: 0, g: 0, b: 0 };
      frame[key.id] = lerpColor(active, ss, this.crossfadeAlpha);
    }

    return frame;
  }
}

export const DEFAULT_AFK_SCREENSAVER_PARAMS: AfkScreensaverParams = {
  brightness: 1.0,
  idleTimeout: 120,
  crossfadeDuration: 2.0,
  screensaverMode: 'aurora',
  dimColor: { r: 40, g: 50, b: 70 },
  dimLevel: 0.15,
};
