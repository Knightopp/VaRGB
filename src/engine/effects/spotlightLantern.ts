import { AnimationContext, ILightingEffect, SpotlightLanternParams } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE } from '../layout';
import { applyBrightness, lerpColor } from '../color';

export const DEFAULT_SPOTLIGHT_LANTERN_PARAMS: SpotlightLanternParams = {
  brightness: 1.0,
  speed: 1.0,
  primaryColor: { r: 255, g: 170, b: 51 },  // Warm lantern core
  secondaryColor: { r: 0, g: 212, b: 255 }, // Lantern halo fringe
};

export class SpotlightLanternEffect implements ILightingEffect {
  readonly type = 'spotlight_lantern' as const;
  readonly name = 'Spotlight Lantern';

  private sx: number = 6.5;
  private sy: number = 2.0;
  private targetX: number = 6.5;
  private targetY: number = 2.0;
  private timeSinceKey: number = 0;

  constructor(public params: SpotlightLanternParams = { ...DEFAULT_SPOTLIGHT_LANTERN_PARAMS }) {
    this.reset();
  }

  reset(): void {
    this.sx = 6.5;
    this.sy = 2.0;
    this.targetX = 6.5;
    this.targetY = 2.0;
    this.timeSinceKey = 0;
  }

  onKeyDown(code: string): void {
    const key = KEY_BY_CODE[code];
    if (!key) return;

    this.targetX = key.gridX;
    this.targetY = key.gridY;
    this.timeSinceKey = 0;
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.min(ctx.dt, 0.1);
    const speed = Math.max(0.2, this.params.speed ?? 1.0);

    this.timeSinceKey += dt;

    // Smoothly chase target
    const lerpSpeed = 8.0 * speed;
    this.sx += (this.targetX - this.sx) * Math.min(1.0, dt * lerpSpeed);
    this.sy += (this.targetY - this.sy) * Math.min(1.0, dt * lerpSpeed);

    // Dim out after 3.0s of inactivity
    let activityDim = 1.0;
    if (this.timeSinceKey > 3.0) {
      activityDim = Math.max(0.08, 1.0 - (this.timeSinceKey - 3.0) * 0.5);
    }

    const frame: KeyFrameColor = {};
    const primary = this.params.primaryColor ?? DEFAULT_SPOTLIGHT_LANTERN_PARAMS.primaryColor;
    const secondary = this.params.secondaryColor ?? DEFAULT_SPOTLIGHT_LANTERN_PARAMS.secondaryColor;
    const brightness = Math.max(0, Math.min(1, this.params.brightness ?? 1.0));

    const radius = 3.2;

    for (const key of K630_LAYOUT) {
      const c = key.gridX;
      const r = key.gridY;

      const dist = Math.hypot(c - this.sx, r - this.sy);

      let col: RGBColor = { r: 0, g: 0, b: 0 };

      if (dist < radius) {
        const normDist = dist / radius;
        // Radial falloff: pow(1 - normDist, 1.8)
        const falloff = Math.pow(1.0 - normDist, 1.8) * activityDim;
        const tint = lerpColor(primary, secondary, normDist);
        col = {
          r: Math.round(tint.r * falloff),
          g: Math.round(tint.g * falloff),
          b: Math.round(tint.b * falloff),
        };
      }

      frame[key.id] = applyBrightness(col, brightness);
    }

    return frame;
  }
}
