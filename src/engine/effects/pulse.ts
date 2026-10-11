import { PulseParams, AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor } from '../../types/keyboard';
import { applyBrightness } from '../color';

export class PulseEffect implements ILightingEffect {
  readonly type = 'pulse';
  readonly name = 'Crimson Pulse';

  constructor(public params: PulseParams) {}

  update(ctx: AnimationContext): KeyFrameColor {
    const frame: KeyFrameColor = {};
    const phase = ctx.totalTime * this.params.speed * Math.PI;

    // Smooth periodic wave between 0 and 1 with exponential human eye perception curve
    const sinWave = (Math.sin(phase) + 1) / 2;
    // Human perception curve (quadratic)
    const curve = Math.pow(sinWave, 1.8);

    const minB = Math.max(0, Math.min(0.5, this.params.minBrightness));
    const currentIntensity = minB + (1 - minB) * curve;
    const effectiveBrightness = this.params.brightness * currentIntensity;
    const litColor = applyBrightness(this.params.color, effectiveBrightness);

    for (const key of ctx.keys) {
      frame[key.id] = litColor;
    }

    return frame;
  }

  reset(): void {}
}

export const DEFAULT_PULSE_PARAMS: PulseParams = {
  speed: 0.8,
  brightness: 0.95,
  color: { r: 230, g: 0, b: 20 }, // Rich crimson
  minBrightness: 0,                // Fully off baseline
};
