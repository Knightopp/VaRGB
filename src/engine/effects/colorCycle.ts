import { ColorCycleParams, AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor } from '../../types/keyboard';
import { applyBrightness, hslToRgb } from '../color';

export class ColorCycleEffect implements ILightingEffect {
  readonly type = 'color_cycle';
  readonly name = 'Prism Drift';

  constructor(public params: ColorCycleParams) {}

  update(ctx: AnimationContext): KeyFrameColor {
    const frame: KeyFrameColor = {};
    for (const key of ctx.keys) {
      const hue = (ctx.totalTime * this.params.speed * 55 + key.normX * this.params.spread * 360) % 360;
      frame[key.id] = applyBrightness(hslToRgb(hue, 1, 0.5), this.params.brightness);
    }
    return frame;
  }

  reset(): void {}
}

export const DEFAULT_COLOR_CYCLE_PARAMS: ColorCycleParams = {
  speed: 0.7,
  brightness: 0.9,
  spread: 1.4,
};
