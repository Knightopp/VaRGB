import { AnimationContext, ILightingEffect, NewtonsCradleParams } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT } from '../layout';
import { applyBrightness, lerpColor } from '../color';

export const DEFAULT_NEWTONS_CRADLE_PARAMS: NewtonsCradleParams = {
  brightness: 1.0,
  speed: 1.0,
  primaryColor: { r: 0, g: 229, b: 255 },   // Chrome cyan pendulum balls
  secondaryColor: { r: 255, g: 0, b: 119 }, // Kinetic shockwave & center reaction
};

export class NewtonsCradleEffect implements ILightingEffect {
  readonly type = 'newtons_cradle' as const;
  readonly name = "Newton's Cradle";

  private energyBoost: number = 0;
  private shockFlash: number = 0;
  private lastPhaseSign: number = 1;

  constructor(public params: NewtonsCradleParams = { ...DEFAULT_NEWTONS_CRADLE_PARAMS }) {
    this.reset();
  }

  reset(): void {
    this.energyBoost = 0;
    this.shockFlash = 0;
    this.lastPhaseSign = 1;
  }

  onKeyDown(_code: string): void {
    this.energyBoost = Math.min(2.0, this.energyBoost + 0.8);
    this.shockFlash = 1.0;
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.min(ctx.dt, 0.1);
    const speed = Math.max(0.2, this.params.speed ?? 1.0);
    const time = ctx.totalTime * speed;

    if (this.energyBoost > 0) {
      this.energyBoost = Math.max(0, this.energyBoost - dt * 0.8);
    }
    if (this.shockFlash > 0) {
      this.shockFlash = Math.max(0, this.shockFlash - dt * 3.0);
    }

    // Harmonic swing alternating left and right
    const swingFreq = 4.5;
    const rawSwing = Math.sin(time * swingFreq);
    const currentSign = rawSwing >= 0 ? 1 : -1;

    // Detect impact at zero crossing
    if (currentSign !== this.lastPhaseSign) {
      this.shockFlash = 1.0;
      this.lastPhaseSign = currentSign;
    }

    const amplitude = (3.5 + this.energyBoost * 1.5);
    let leftBallC = 4.0;
    let rightBallC = 9.0;

    if (rawSwing < 0) {
      // Left ball swings outward (0 to 4)
      leftBallC = 4.0 + rawSwing * amplitude;
    } else {
      // Right ball swings outward (9 to 13)
      rightBallC = 9.0 + rawSwing * amplitude;
    }

    const frame: KeyFrameColor = {};
    const primary = this.params.primaryColor ?? DEFAULT_NEWTONS_CRADLE_PARAMS.primaryColor;
    const secondary = this.params.secondaryColor ?? DEFAULT_NEWTONS_CRADLE_PARAMS.secondaryColor;
    const brightness = Math.max(0, Math.min(1, this.params.brightness ?? 1.0));

    for (const key of K630_LAYOUT) {
      const c = key.gridX;
      const r = key.gridY;

      let col: RGBColor = { r: 5, g: 8, b: 15 };

      // Center row r = 2 is where the balls hang
      if (r === 2) {
        // Center static keys c = 5, 6, 7, 8
        if (c >= 5 && c <= 8) {
          const impactGlow = this.shockFlash * 0.9;
          col = lerpColor(primary, secondary, impactGlow);
        } else {
          // Check proximity to left swinging ball
          const dLeft = Math.abs(c - leftBallC);
          const dRight = Math.abs(c - rightBallC);

          if (dLeft < 1.0) {
            col = lerpColor(primary, { r: 255, g: 255, b: 255 }, 1.0 - dLeft);
          } else if (dRight < 1.0) {
            col = lerpColor(primary, { r: 255, g: 255, b: 255 }, 1.0 - dRight);
          }
        }
      } else if (r === 1) {
        // String attachment visualization
        if (c >= 4 && c <= 9) {
          col = { r: 20, g: 30, b: 45 };
        }
      }

      // Shockwave burst on center impact
      if (this.shockFlash > 0 && Math.abs(c - 6.5) < 3.0) {
        col = lerpColor(col, secondary, this.shockFlash * 0.6);
      }

      frame[key.id] = applyBrightness(col, brightness);
    }

    return frame;
  }
}
