import { AnimationContext, ILightingEffect, MagneticFieldParams } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE } from '../layout';
import { applyBrightness, lerpColor } from '../color';

export const DEFAULT_MAGNETIC_FIELD_PARAMS: MagneticFieldParams = {
  brightness: 1.0,
  speed: 1.0,
  primaryColor: { r: 255, g: 34, b: 68 },   // North pole Red
  secondaryColor: { r: 0, g: 136, b: 255 }, // South pole Blue
};

export class MagneticFieldEffect implements ILightingEffect {
  readonly type = 'magnetic_field' as const;
  readonly name = 'Magnetic Field';

  private mx: number = 6.5;
  private my: number = 2.0;
  private overrideTimer: number = 0;
  private overrideX: number = 6.5;
  private overrideY: number = 2.0;

  constructor(public params: MagneticFieldParams = { ...DEFAULT_MAGNETIC_FIELD_PARAMS }) {
    this.reset();
  }

  reset(): void {
    this.mx = 6.5;
    this.my = 2.0;
    this.overrideTimer = 0;
  }

  onKeyDown(code: string): void {
    const key = KEY_BY_CODE[code];
    if (!key) return;

    this.overrideX = key.gridX;
    this.overrideY = key.gridY;
    this.overrideTimer = 1.5;
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.min(ctx.dt, 0.1);
    const speed = Math.max(0.2, this.params.speed ?? 1.0);
    const t = ctx.totalTime * speed;

    if (this.overrideTimer > 0) {
      this.overrideTimer -= dt;
      this.mx += (this.overrideX - this.mx) * Math.min(1.0, dt * 10);
      this.my += (this.overrideY - this.my) * Math.min(1.0, dt * 10);
    } else {
      // Figure-8 Lemniscate drift centered at (6.5, 2.0)
      this.mx = 6.5 + 4.5 * Math.sin(t * 1.5);
      this.my = 2.0 + 1.6 * Math.sin(t * 3.0);
    }

    const frame: KeyFrameColor = {};
    const northCol = this.params.primaryColor ?? DEFAULT_MAGNETIC_FIELD_PARAMS.primaryColor;
    const southCol = this.params.secondaryColor ?? DEFAULT_MAGNETIC_FIELD_PARAMS.secondaryColor;
    const brightness = Math.max(0, Math.min(1, this.params.brightness ?? 1.0));

    for (const key of K630_LAYOUT) {
      const c = key.gridX;
      const r = key.gridY;

      const dx = this.mx - c;
      const dy = this.my - r;
      const theta = Math.atan2(dy, dx);
      const d = Math.hypot(dx, dy);

      // Gradient between poles
      const poleFactor = (Math.sin(theta) + 1.0) * 0.5;
      const fieldStrength = 1.0 / (1.0 + d * 0.28);

      const baseGrad = lerpColor(southCol, northCol, poleFactor);
      const attenuated: RGBColor = {
        r: Math.round(baseGrad.r * fieldStrength),
        g: Math.round(baseGrad.g * fieldStrength),
        b: Math.round(baseGrad.b * fieldStrength),
      };

      frame[key.id] = applyBrightness(attenuated, brightness);
    }

    return frame;
  }
}
