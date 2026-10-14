import { AnimationContext, ILightingEffect, KaleidoscopeParams } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE } from '../layout';
import { applyBrightness, hslToRgb, lerpColor } from '../color';

export const DEFAULT_KALEIDOSCOPE_PARAMS: KaleidoscopeParams = {
  brightness: 1.0,
  speed: 1.0,
  primaryColor: { r: 255, g: 0, b: 136 },   // Mandala Magenta
  secondaryColor: { r: 0, g: 229, b: 255 }, // Mandala Cyan
  colorMode: 'rainbow',
};

interface MandalaBurst {
  rq: number;
  cq: number;
  age: number;
}

export class KaleidoscopeEffect implements ILightingEffect {
  readonly type = 'kaleidoscope' as const;
  readonly name = 'Kaleidoscope';

  private bursts: MandalaBurst[] = [];

  constructor(public params: KaleidoscopeParams = { ...DEFAULT_KALEIDOSCOPE_PARAMS }) {
    this.reset();
  }

  reset(): void {
    this.bursts = [];
  }

  onKeyDown(code: string): void {
    const key = KEY_BY_CODE[code];
    if (!key) return;

    // Fold into quadrant
    const rq = Math.min(key.gridY, 4 - key.gridY);
    const cq = Math.min(key.gridX, 13 - key.gridX);

    this.bursts.push({ rq, cq, age: 0 });
    if (this.bursts.length > 8) {
      this.bursts.shift();
    }
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.min(ctx.dt, 0.1);
    const speed = Math.max(0.2, this.params.speed ?? 1.0);
    const time = ctx.totalTime * speed;

    for (let i = this.bursts.length - 1; i >= 0; i--) {
      this.bursts[i].age += dt * 2.5;
      if (this.bursts[i].age > 1.0) {
        this.bursts.splice(i, 1);
      }
    }

    const frame: KeyFrameColor = {};
    const primary = this.params.primaryColor ?? DEFAULT_KALEIDOSCOPE_PARAMS.primaryColor;
    const secondary = this.params.secondaryColor ?? DEFAULT_KALEIDOSCOPE_PARAMS.secondaryColor;
    const isRainbow = this.params.colorMode === 'rainbow';
    const brightness = Math.max(0, Math.min(1, this.params.brightness ?? 1.0));

    for (const key of K630_LAYOUT) {
      const r = key.gridY;
      const c = key.gridX;

      // Mirrored 4-way quadrant coordinates
      const rq = Math.min(r, 4 - r);
      const cq = Math.min(c, 13 - c);

      // Mandala mathematical harmonics
      const angle = Math.atan2(rq - 1.0, cq - 3.2);
      const dist = Math.hypot(cq - 3.2, rq - 1.0);

      const v1 = Math.sin(dist * 1.5 - time * 3.0);
      const v2 = Math.cos(angle * 4.0 + time * 2.0);
      const v3 = Math.sin(cq * 0.8 + rq * 1.2 + time * 1.5);
      const mandalaVal = (v1 + v2 + v3 + 3.0) / 6.0; // 0.0 to 1.0

      let col: RGBColor;
      if (isRainbow) {
        const hue = (mandalaVal * 360 + time * 45) % 360;
        col = hslToRgb(hue, 1.0, 0.5);
      } else {
        col = lerpColor(secondary, primary, mandalaVal);
      }

      // Check keypress bursts reflected across all 4 quadrants
      for (const b of this.bursts) {
        const dBurst = Math.hypot(cq - b.cq, rq - b.rq);
        const ring = Math.abs(dBurst - b.age * 4.0);
        if (ring < 0.9) {
          const intensity = (1.0 - ring / 0.9) * (1.0 - b.age);
          col = lerpColor(col, { r: 255, g: 255, b: 255 }, intensity);
        }
      }

      frame[key.id] = applyBrightness(col, brightness);
    }

    return frame;
  }
}
