import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT } from '../layout';
import { applyBrightness, lerpColor } from '../color';

export interface CrtScanlineParams {
  brightness: number;
  speed: number;            // Scanline travel speed
  scanColor: RGBColor;      // Retro phosphor green/cyan
}

interface GlitchShift {
  targetRow: number;
  duration: number;         // Remaining duration
}

export class CrtScanlineEffect implements ILightingEffect {
  readonly type = 'crt_scanline' as const;
  readonly name = 'CRT Scanline';

  private activeGlitch: GlitchShift | null = null;

  constructor(public params: CrtScanlineParams = { ...DEFAULT_CRT_SCANLINE_PARAMS }) {}

  reset(): void {
    this.activeGlitch = null;
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.min(ctx.dt, 0.1);
    const speed = 3.5 * Math.max(0.2, this.params.speed);
    const scanY = (ctx.totalTime * speed) % 5.0;

    // Check for random glitch aberration
    if (this.activeGlitch) {
      this.activeGlitch.duration -= dt;
      if (this.activeGlitch.duration <= 0) {
        this.activeGlitch = null;
      }
    } else {
      // 5% chance per second (~ 0.05 * dt chance per frame)
      if (Math.random() < 0.08 * dt) {
        this.activeGlitch = {
          targetRow: Math.floor(Math.random() * 5),
          duration: 0.12,
        };
      }
    }

    const frame: KeyFrameColor = {};
    const keys = ctx.keys ?? K630_LAYOUT;
    const phosphor = this.params.scanColor;
    const DIM_PHOSPHOR: RGBColor = {
      r: Math.round(phosphor.r * 0.08),
      g: Math.round(phosphor.g * 0.08),
      b: Math.round(phosphor.b * 0.08),
    };

    for (const key of keys) {
      const r = key.gridY;
      const c = key.gridX;

      // Distance to vertical beam in row units (with wrap)
      const dy = Math.abs(r - scanY);
      const intensity = Math.max(0, 1.0 - dy / 1.3);

      let baseCol = lerpColor(DIM_PHOSPHOR, phosphor, intensity);

      // Chromatic aberration glitch row
      if (this.activeGlitch && r === this.activeGlitch.targetRow) {
        if (c % 2 === 0) {
          baseCol = { r: 255, g: 0, b: 40 };  // Red split
        } else {
          baseCol = { r: 0, g: 150, b: 255 }; // Cyan/blue split
        }
      }

      frame[key.id] = applyBrightness(baseCol, this.params.brightness);
    }

    return frame;
  }
}

export const DEFAULT_CRT_SCANLINE_PARAMS: CrtScanlineParams = {
  brightness: 1.0,
  speed: 1.0,
  scanColor: { r: 0, g: 255, b: 136 }, // Phosphor green #00FF88
};
