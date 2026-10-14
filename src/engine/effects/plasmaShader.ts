import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor } from '../../types/keyboard';
import { K630_LAYOUT } from '../layout';
import { applyBrightness, hslToRgb, lerpColor } from '../color';

export interface PlasmaShaderParams {
  brightness: number;
  speed: number;            // Time scale multiplier
  mode: 'rainbow' | 'duo';  // Rainbow vs dual-tone
  primaryHue: number;       // 0.0 to 1.0
  secondaryHue: number;     // 0.0 to 1.0
}

export class PlasmaShaderEffect implements ILightingEffect {
  readonly type = 'plasma_shader' as const;
  readonly name = 'Plasma Shader';

  constructor(public params: PlasmaShaderParams = { ...DEFAULT_PLASMA_SHADER_PARAMS }) {}

  reset(): void {}

  update(ctx: AnimationContext): KeyFrameColor {
    const t = ctx.totalTime * 2.0 * Math.max(0.1, this.params.speed);
    const frame: KeyFrameColor = {};
    const keys = ctx.keys ?? K630_LAYOUT;

    const isRainbow = this.params.mode === 'rainbow';
    const c1 = hslToRgb(this.params.primaryHue ?? 0.8, 1.0, 0.5);   // Purple default
    const c2 = hslToRgb(this.params.secondaryHue ?? 0.5, 1.0, 0.5); // Cyan default

    for (const key of keys) {
      const c = key.gridX;
      const r = key.gridY;

      const v1 = Math.sin(c * 0.45 + t);
      const v2 = Math.sin((r * 0.6 + t) * 0.8);
      const v3 = Math.sin(c * 0.35 + r * 0.45 + t);
      const v = (v1 + v2 + v3) / 3.0; // [-1.0, 1.0]
      const norm = (v + 1.0) / 2.0;   // [0.0, 1.0]

      let col;
      if (isRainbow) {
        // Map normalized value to continuous 0..1 hue
        const hue = (norm + t * 0.05) % 1.0;
        col = hslToRgb(hue, 1.0, 0.5);
      } else {
        col = lerpColor(c1, c2, norm);
      }

      frame[key.id] = applyBrightness(col, this.params.brightness);
    }

    return frame;
  }
}

export const DEFAULT_PLASMA_SHADER_PARAMS: PlasmaShaderParams = {
  brightness: 1.0,
  speed: 1.0,
  mode: 'rainbow',
  primaryHue: 0.80, // Magenta/purple
  secondaryHue: 0.50, // Cyan
};
