import { AnimationContext, ILightingEffect, SolarEclipseParams } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT } from '../layout';
import { applyBrightness, lerpColor } from '../color';

export const DEFAULT_SOLAR_ECLIPSE_PARAMS: SolarEclipseParams = {
  brightness: 1.0,
  speed: 1.0,
  primaryColor: { r: 255, g: 184, b: 0 },   // Sun Corona Gold
  secondaryColor: { r: 138, g: 43, b: 226 }, // Corona Violet / Outer glow
};

export class SolarEclipseEffect implements ILightingEffect {
  readonly type = 'solar_eclipse' as const;
  readonly name = 'Solar Eclipse';

  private flareBurst: number = 0;

  constructor(public params: SolarEclipseParams = { ...DEFAULT_SOLAR_ECLIPSE_PARAMS }) {
    this.reset();
  }

  reset(): void {
    this.flareBurst = 0;
  }

  onKeyDown(_code: string): void {
    this.flareBurst = 1.0;
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.min(ctx.dt, 0.1);
    const speed = Math.max(0.2, this.params.speed ?? 1.0);
    const time = ctx.totalTime * speed;

    if (this.flareBurst > 0) {
      this.flareBurst = Math.max(0, this.flareBurst - dt * 2.0);
    }

    const sunX = 6.5;
    const sunY = 2.0;
    // Moon moves from -2.0 to 16.0 horizontally
    const moonX = ((time * 1.5) % 18.0) - 2.0;
    const moonY = 2.0;

    const frame: KeyFrameColor = {};
    const primary = this.params.primaryColor ?? DEFAULT_SOLAR_ECLIPSE_PARAMS.primaryColor;
    const secondary = this.params.secondaryColor ?? DEFAULT_SOLAR_ECLIPSE_PARAMS.secondaryColor;
    const brightness = Math.max(0, Math.min(1, this.params.brightness ?? 1.0));

    for (const key of K630_LAYOUT) {
      const c = key.gridX;
      const r = key.gridY;

      const d_sun = Math.hypot(c - sunX, r - sunY);
      const d_moon = Math.hypot(c - moonX, r - moonY);

      let col: RGBColor = { r: 0, g: 0, b: 0 };

      if (d_moon < 1.9) {
        // Moon core is pitch black
        col = { r: 0, g: 0, b: 0 };
      } else {
        // Corona rays & shimmer
        const angle = Math.atan2(r - sunY, c - sunX);
        const rayNoise = Math.sin(angle * 8.0 + time * 3.0) * 0.3 + 0.7;
        const maxDist = (3.4 + this.flareBurst * 2.5) * rayNoise;

        if (d_sun < maxDist) {
          const t = d_sun / maxDist;
          const coronaColor = lerpColor(primary, secondary, t);
          // Intensity falloff
          const intensity = Math.pow(1.0 - t, 1.4);
          // Moon penumbra rim bright ring
          const rimBonus = d_moon < 2.5 ? (2.5 - d_moon) * 0.8 : 0;
          const factor = Math.min(1.0, intensity + rimBonus + this.flareBurst);

          col = {
            r: Math.round(coronaColor.r * factor),
            g: Math.round(coronaColor.g * factor),
            b: Math.round(coronaColor.b * factor),
          };
        } else {
          // Subtle deep space background
          col = { r: 4, g: 2, b: 8 };
        }
      }

      frame[key.id] = applyBrightness(col, brightness);
    }

    return frame;
  }
}
