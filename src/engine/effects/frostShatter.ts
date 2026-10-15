import { AnimationContext, ILightingEffect, FrostShatterParams } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE } from '../layout';
import { applyBrightness, lerpColor } from '../color';

export const DEFAULT_FROST_SHATTER_PARAMS: FrostShatterParams = {
  brightness: 1.0,
  speed: 1.0,
  primaryColor: { r: 255, g: 255, b: 255 },   // Ice fracture flash
  secondaryColor: { r: 0, g: 204, b: 255 },   // Glacier cyan cool-down
  backgroundColor: { r: 0, g: 0, b: 0 },    // Pure Black base
};

interface FractureRay {
  originX: number;
  originY: number;
  angle: number;
  maxDistance: number;
  age: number; // 0 to 0.6s
}

export class FrostShatterEffect implements ILightingEffect {
  readonly type = 'frost_shatter' as const;
  readonly name = 'Frost Shatter';

  private rays: FractureRay[] = [];

  constructor(public params: FrostShatterParams = { ...DEFAULT_FROST_SHATTER_PARAMS }) {
    this.reset();
  }

  reset(): void {
    this.rays = [];
  }

  onKeyDown(code: string): void {
    const key = KEY_BY_CODE[code];
    if (!key) return;

    const ox = key.gridX;
    const oy = key.gridY;

    // 4 fracture rays radiating outwards
    for (let i = 0; i < 4; i++) {
      const baseAngle = (Math.PI / 2) * i;
      const jitter = (Math.random() - 0.5) * (50 * Math.PI / 180);
      this.rays.push({
        originX: ox,
        originY: oy,
        angle: baseAngle + jitter,
        maxDistance: 4.0 + Math.random() * 3.0,
        age: 0,
      });
    }

    if (this.rays.length > 32) {
      this.rays.splice(0, this.rays.length - 32);
    }
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.min(ctx.dt, 0.1);
    const speed = Math.max(0.2, this.params.speed ?? 1.0);

    for (let i = this.rays.length - 1; i >= 0; i--) {
      this.rays[i].age += dt * speed;
      if (this.rays[i].age > 0.65) {
        this.rays.splice(i, 1);
      }
    }

    const frame: KeyFrameColor = {};
    const primary = this.params.primaryColor ?? DEFAULT_FROST_SHATTER_PARAMS.primaryColor;
    const secondary = this.params.secondaryColor ?? DEFAULT_FROST_SHATTER_PARAMS.secondaryColor;
    const bgCol = this.params.backgroundColor ?? DEFAULT_FROST_SHATTER_PARAMS.backgroundColor;
    const brightness = Math.max(0, Math.min(1, this.params.brightness ?? 1.0));

    // Calculate intensity per key
    for (const key of K630_LAYOUT) {
      const kx = key.gridX;
      const ky = key.gridY;

      // Ambient crystal twinkle
      const twinkle = Math.sin(kx * 1.5 + ky * 2.3 + ctx.totalTime * 2.0) * 0.15 + 0.85;
      let col: RGBColor = {
        r: Math.round(bgCol.r * twinkle),
        g: Math.round(bgCol.g * twinkle),
        b: Math.round(bgCol.b * twinkle),
      };

      for (const ray of this.rays) {
        const dx = kx - ray.originX;
        const dy = ky - ray.originY;
        const dist = Math.hypot(dx, dy);

        if (dist <= ray.maxDistance) {
          // Angle alignment
          const keyAngle = Math.atan2(dy, dx);
          let angleDiff = Math.abs(keyAngle - ray.angle);
          while (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - 2 * Math.PI);

          if (angleDiff < 0.35 || dist < 0.8) {
            // How far along ray lifecycle
            const progress = ray.age / 0.6; // 0 to 1
            const fade = Math.max(0, 1.0 - progress);

            // Transitions from ice-white to glacier cyan
            const rayCol = lerpColor(secondary, primary, Math.max(0, 1.0 - progress * 1.8));
            col = lerpColor(col, rayCol, fade);
          }
        }
      }

      frame[key.id] = applyBrightness(col, brightness);
    }

    return frame;
  }
}
