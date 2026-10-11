import { AuroraParams, AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor } from '../../types/keyboard';
import { interpolatePalette, applyBrightness } from '../color';

export class AuroraEffect implements ILightingEffect {
  readonly type = 'aurora';
  readonly name = 'Aurora Flow';

  constructor(public params: AuroraParams) {}

  update(ctx: AnimationContext): KeyFrameColor {
    const frame: KeyFrameColor = {};
    const angleRad = (this.params.direction * Math.PI) / 180;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    const gradWidth = Math.max(0.1, this.params.gradientWidth);
    const speedPhase = ctx.totalTime * this.params.speed * 0.3;

    for (const key of ctx.keys) {
      // Linear projection along direction vector
      const proj = key.normX * cosA + key.normY * sinA;
      const t = (proj / gradWidth) - speedPhase;
      const rawColor = interpolatePalette(this.params.palette, t);
      frame[key.id] = applyBrightness(rawColor, this.params.brightness);
    }

    return frame;
  }

  reset(): void {}
}

export const DEFAULT_AURORA_PARAMS: AuroraParams = {
  speed: 1.0,
  brightness: 0.9,
  gradientWidth: 1.2,
  direction: 45,
  palette: [
    { r: 0, g: 229, b: 255 },  // Cyan
    { r: 0, g: 64, b: 255 },   // Deep Blue
    { r: 157, g: 0, b: 255 },  // Purple
    { r: 0, g: 150, b: 255 },  // Light Blue
  ],
};
