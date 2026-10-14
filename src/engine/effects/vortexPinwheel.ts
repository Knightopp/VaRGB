import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor } from '../../types/keyboard';
import { K630_LAYOUT } from '../layout';
import { applyBrightness, hslToRgb } from '../color';

export interface VortexPinwheelParams {
  brightness: number;
  speed: number;     // Rotation speed multiplier
  twist: number;     // Spiral twist factor (default 0.12)
}

const TWO_PI = Math.PI * 2;

export class VortexPinwheelEffect implements ILightingEffect {
  readonly type = 'vortex_pinwheel' as const;
  readonly name = 'Vortex Pinwheel';

  constructor(public params: VortexPinwheelParams = { ...DEFAULT_VORTEX_PINWHEEL_PARAMS }) {}

  reset(): void {}

  update(ctx: AnimationContext): KeyFrameColor {
    const keys = ctx.keys ?? K630_LAYOUT;
    const time = ctx.totalTime;
    const speed = 0.4 * (this.params.speed ?? 1.0);
    const twist = this.params.twist ?? 0.12;

    const cx = 6.5;
    const cy = 2.0;
    const frame: KeyFrameColor = {};

    for (const key of keys) {
      const dx = key.gridX - cx;
      const dy = key.gridY - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      const theta = Math.atan2(dy, dx);

      // Compute hue with spiral twist
      let hue = ((theta / TWO_PI) + (d * twist) - (time * speed)) % 1.0;
      if (hue < 0) hue += 1.0;

      const color = hslToRgb(hue * 360, 1.0, 0.5);
      frame[key.id] = applyBrightness(color, this.params.brightness);
    }

    return frame;
  }
}

export const DEFAULT_VORTEX_PINWHEEL_PARAMS: VortexPinwheelParams = {
  brightness: 1.0,
  speed: 1.0,
  twist: 0.12,
};
