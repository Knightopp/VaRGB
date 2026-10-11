import { KeyFlashParams, AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE, KEY_BY_ID, PHYSICAL_ADJACENCY } from '../layout';
import { applyBrightness, lerpColor } from '../color';

interface KeyFlashState {
  pressTime: number; // Seconds
}

export class KeyFlashEffect implements ILightingEffect {
  readonly type = 'key_flash';
  readonly name = 'Key Flash';

  // Independent flash state tracked per key ID
  private keyFlashes: Map<string, KeyFlashState> = new Map();
  private currentTime: number = 0;

  constructor(public params: KeyFlashParams = { ...DEFAULT_KEY_FLASH_PARAMS }) {}

  onKeyDown(code: string): void {
    const key = KEY_BY_CODE[code] || KEY_BY_ID[code];
    if (key) {
      this.triggerFlash(key.id);
    }
  }

  public triggerFlash(keyId: string): void {
    this.keyFlashes.set(keyId, {
      pressTime: this.currentTime,
    });
  }

  reset(): void {
    this.keyFlashes.clear();
    this.currentTime = 0;
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.max(0.001, Math.min(0.5, ctx.dt));
    this.currentTime += dt;
    const now = this.currentTime;
    const keys = ctx.keys ?? K630_LAYOUT;
    const holdSec = Math.max(0.01, this.params.holdDuration / 1000);
    const fadeSec = Math.max(0.05, this.params.fadeDuration / 1000);
    const totalLifeSec = holdSec + fadeSec;

    // Prune flashes that have completely faded
    for (const [keyId, state] of this.keyFlashes.entries()) {
      if (now - state.pressTime > totalLifeSec) {
        this.keyFlashes.delete(keyId);
      }
    }

    const frame: KeyFrameColor = {};
    const baseColor = applyBrightness(this.params.baseColor, this.params.brightness);
    const flashColor = applyBrightness(this.params.flashColor, this.params.brightness);

    // Compute direct flash intensity for each key
    const directIntensity: Record<string, number> = {};
    for (const [keyId, state] of this.keyFlashes.entries()) {
      const elapsed = now - state.pressTime;
      if (elapsed <= holdSec) {
        directIntensity[keyId] = 1.0;
      } else {
        const fadeProgress = (elapsed - holdSec) / fadeSec;
        directIntensity[keyId] = Math.max(0, Math.cos((Math.PI / 2) * fadeProgress) ** 2);
      }
    }

    // Render keys with independent flash + optional neighbor glow
    for (const key of keys) {
      let keyVal = directIntensity[key.id] ?? 0;

      // Subtle neighboring key glow if enabled
      if (this.params.neighborGlow && keyVal < 1.0) {
        const neighbors = PHYSICAL_ADJACENCY[key.id] || [];
        for (const neighborId of neighbors) {
          const neighborFlash = directIntensity[neighborId];
          if (neighborFlash !== undefined && neighborFlash > 0) {
            const glowContribution = neighborFlash * this.params.neighborGlowIntensity;
            if (glowContribution > keyVal) {
              keyVal = glowContribution;
            }
          }
        }
      }

      if (keyVal > 0.005) {
        frame[key.id] = lerpColor(baseColor, flashColor, keyVal);
      } else {
        frame[key.id] = baseColor;
      }
    }

    return frame;
  }
}

export const DEFAULT_KEY_FLASH_PARAMS: KeyFlashParams = {
  flashColor: { r: 255, g: 255, b: 255 },  // Ultra-bright pure white flash
  holdDuration: 80,                       // 80ms solid flash hold
  fadeDuration: 350,                      // 350ms smooth exponential fade
  brightness: 1.0,
  baseColor: { r: 0, g: 0, b: 0 },        // Black resting background
  neighborGlow: true,                     // Ambient neighbor halo
  neighborGlowIntensity: 0.25,            // 25% subtle neighboring spread
};
