import { StarlightParams, AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor } from '../../types/keyboard';
import { applyBrightness, lerpColor } from '../color';

export class StarlightEffect implements ILightingEffect {
  readonly type = 'starlight';
  readonly name = 'Starlight';

  constructor(public params: StarlightParams) {}

  update(ctx: AnimationContext): KeyFrameColor {
    const frame: KeyFrameColor = {};
    for (const [index, key] of ctx.keys.entries()) {
      const phase = Math.sin(ctx.totalTime * this.params.speed * 2.2 + index * 12.9898) * 43758.5453;
      const twinkle = phase - Math.floor(phase);
      const threshold = 1 - this.params.density * 0.18;
      const intensity = twinkle > threshold ? (twinkle - threshold) / Math.max(0.001, 1 - threshold) : 0;
      const color = lerpColor(this.params.backgroundColor, this.params.color, intensity);
      frame[key.id] = applyBrightness(color, this.params.brightness);
    }
    return frame;
  }

  reset(): void {}
}

export const DEFAULT_STARLIGHT_PARAMS: StarlightParams = {
  speed: 0.8,
  brightness: 0.9,
  density: 0.5,
  color: { r: 110, g: 170, b: 255 },
  backgroundColor: { r: 0, g: 0, b: 0 },
};
