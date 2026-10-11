import { ShockwaveParams, AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE, KEY_BY_ID, getKeyCenter } from '../layout';
import { applyBrightness, lerpColor } from '../color';

interface ActiveShockwave {
  originX: number;
  originY: number;
  startTime: number;
}

export class ShockwaveEffect implements ILightingEffect {
  readonly type = 'shockwave';
  readonly name = 'Shockwave';

  private shockwaves: ActiveShockwave[] = [];
  private readonly maxShockwaves: number = 10;
  private currentTime: number = 0;

  constructor(public params: ShockwaveParams = { ...DEFAULT_SHOCKWAVE_PARAMS }) {}

  onKeyDown(code: string): void {
    const key = KEY_BY_CODE[code] || KEY_BY_ID[code];
    if (key) {
      const center = getKeyCenter(key);
      this.triggerShockwaveAt(center.x, center.y);
    }
  }

  public triggerShockwaveAt(x: number, y: number): void {
    this.shockwaves.push({
      originX: x,
      originY: y,
      startTime: this.currentTime,
    });
    if (this.shockwaves.length > this.maxShockwaves) {
      this.shockwaves.shift();
    }
  }

  reset(): void {
    this.shockwaves = [];
    this.currentTime = 0;
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.max(0.001, Math.min(0.5, ctx.dt));
    this.currentTime += dt;
    const now = this.currentTime;
    const keys = ctx.keys ?? K630_LAYOUT;
    // Visually much faster expansion speed: 18 units/sec base * propagationSpeed
    const speed = Math.max(0.5, this.params.propagationSpeed) * 16.0;
    const maxRadius = 18.0; // Across full width of 60% board
    const afterglowSec = Math.max(0.1, this.params.afterglowDuration / 1000);
    const lifeDuration = (maxRadius / speed) + afterglowSec;

    this.shockwaves = this.shockwaves.filter((s) => now - s.startTime < lifeDuration);

    const frame: KeyFrameColor = {};
    const baseColor = applyBrightness(this.params.baseColor, this.params.intensity);
    const ringColor = applyBrightness(this.params.ringColor, this.params.intensity);
    const ringThickness = Math.max(0.2, this.params.thickness * 3.5);

    for (const key of keys) {
      const center = getKeyCenter(key);
      let maxContribution = 0;

      for (const wave of this.shockwaves) {
        const elapsed = now - wave.startTime;
        const currentRadius = elapsed * speed;
        const dx = center.x - wave.originX;
        const dy = center.y - wave.originY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Sustained epicenter illumination: keycap flashes bright and smoothly decays over 0.35s
        if (dist < 1.4 && elapsed < 0.35) {
          const epicenterFlash = Math.max(0, 1.0 - elapsed / 0.35) ** 2;
          maxContribution = Math.max(maxContribution, epicenterFlash);
        }

        // Distance relative to leading edge (positive = behind the ring, negative = ahead)
        const distBehind = currentRadius - dist;

        if (distBehind >= -0.2 && distBehind <= ringThickness) {
          // 1. Razor-sharp leading edge (crest peak at leading ring boundary)
          const crestFraction = Math.max(0, (distBehind + 0.2) / (ringThickness + 0.2));
          const leadingEdgeBrightness = (1.0 - Math.abs(crestFraction - 0.2)) ** 3;
          maxContribution = Math.max(maxContribution, leadingEdgeBrightness);
        } else if (distBehind > ringThickness) {
          // 2. Soft trailing afterglow behind the ring decaying over afterglowDuration
          const timeSinceWavePassed = (distBehind - ringThickness) / speed;
          if (timeSinceWavePassed < afterglowSec) {
            const afterglowRatio = 1.0 - (timeSinceWavePassed / afterglowSec);
            const afterglowBrightness = (afterglowRatio ** 2) * 0.45;
            maxContribution = Math.max(maxContribution, afterglowBrightness);
          }
        }
      }

      if (maxContribution > 0.005) {
        frame[key.id] = lerpColor(baseColor, ringColor, Math.min(1.0, maxContribution));
      } else {
        frame[key.id] = baseColor;
      }
    }

    return frame;
  }
}

export const DEFAULT_SHOCKWAVE_PARAMS: ShockwaveParams = {
  ringColor: { r: 0, g: 195, b: 255 },     // Razor Electric Cyan
  thickness: 0.15,                        // Sharp crisp ring
  propagationSpeed: 2.2,                  // Very fast expansion
  intensity: 1.0,
  afterglowDuration: 450,                 // 450ms trailing afterglow
  baseColor: { r: 0, g: 0, b: 0 },        // Black background
};
