import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor } from '../../types/keyboard';
import { K630_LAYOUT } from '../layout';
import { applyBrightness, hslToRgb } from '../color';

export interface DvdBounceParams {
  brightness: number;
  speed: number;            // Velocity multiplier
}

export class DvdBounceEffect implements ILightingEffect {
  readonly type = 'dvd_bounce' as const;
  readonly name = 'DVD Bounce';

  private bx: number = 2.0;
  private by: number = 1.0;
  private vx: number = 3.5;
  private vy: number = 2.2;
  private currentHue: number = 0.15;

  private lastXHitTime: number = -10;
  private lastYHitTime: number = -10;
  private jackpotRemaining: number = 0; // In seconds
  private currentTime: number = 0;

  constructor(public params: DvdBounceParams = { ...DEFAULT_DVD_BOUNCE_PARAMS }) {}

  reset(): void {
    this.bx = 2.0;
    this.by = 1.0;
    this.vx = 3.5;
    this.vy = 2.2;
    this.currentHue = 0.15;
    this.lastXHitTime = -10;
    this.lastYHitTime = -10;
    this.jackpotRemaining = 0;
    this.currentTime = 0;
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.min(ctx.dt, 0.1);
    this.currentTime += dt;
    const speed = Math.max(0.2, this.params.speed);

    if (this.jackpotRemaining > 0) {
      this.jackpotRemaining -= dt;
    }

    // Advance position
    this.bx += this.vx * speed * dt;
    this.by += this.vy * speed * dt;

    let hitX = false;
    let hitY = false;

    // X boundaries (0 to 12)
    if (this.bx <= 0) {
      this.bx = 0;
      this.vx = Math.abs(this.vx);
      hitX = true;
    } else if (this.bx >= 12) {
      this.bx = 12;
      this.vx = -Math.abs(this.vx);
      hitX = true;
    }

    // Y boundaries (0 to 3)
    if (this.by <= 0) {
      this.by = 0;
      this.vy = Math.abs(this.vy);
      hitY = true;
    } else if (this.by >= 3) {
      this.by = 3;
      this.vy = -Math.abs(this.vy);
      hitY = true;
    }

    if (hitX) {
      this.lastXHitTime = this.currentTime;
      this.currentHue = (this.currentHue + 0.27) % 1.0;
    }
    if (hitY) {
      this.lastYHitTime = this.currentTime;
      this.currentHue = (this.currentHue + 0.27) % 1.0;
    }

    // Corner jackpot detection: both hit within 0.08s
    if (Math.abs(this.lastXHitTime - this.lastYHitTime) <= 0.08 && (hitX || hitY)) {
      this.jackpotRemaining = 1.0; // 1 second celebration
    }

    const frame: KeyFrameColor = {};
    const keys = ctx.keys ?? K630_LAYOUT;
    const logoColor = hslToRgb(this.currentHue, 1.0, 0.5);

    for (const key of keys) {
      if (this.jackpotRemaining > 0) {
        // Rainbow strobe celebration
        const rainbowHue = (this.currentTime * 5.0 + key.normX * 2.0) % 1.0;
        const rainbowColor = hslToRgb(rainbowHue, 1.0, 0.6);
        frame[key.id] = applyBrightness(rainbowColor, this.params.brightness);
        continue;
      }

      // Check proximity to 2x2 box: [bx, bx + 2] x [by, by + 2]
      // For spacebar (row 4), treat as column 6 or center x
      const kr = key.gridY;
      let kc = key.gridX;

      let intensity = 0;
      if (key.id === 'space') {
        // Spacebar covers cols 3..9
        for (let sc = 3; sc <= 9; sc++) {
          const dx = Math.max(0, this.bx - sc, sc - (this.bx + 2));
          const dy = Math.max(0, this.by - 4, 4 - (this.by + 2));
          const dist = Math.sqrt(dx * dx + dy * dy);
          const cellInt = Math.max(0, 1.0 - dist / 1.2);
          if (cellInt > intensity) intensity = cellInt;
        }
      } else {
        const dx = Math.max(0, this.bx - kc, kc - (this.bx + 2));
        const dy = Math.max(0, this.by - kr, kr - (this.by + 2));
        const dist = Math.sqrt(dx * dx + dy * dy);
        intensity = Math.max(0, 1.0 - dist / 1.2);
      }

      const col = {
        r: Math.round(logoColor.r * intensity),
        g: Math.round(logoColor.g * intensity),
        b: Math.round(logoColor.b * intensity),
      };
      frame[key.id] = applyBrightness(col, this.params.brightness);
    }

    return frame;
  }
}

export const DEFAULT_DVD_BOUNCE_PARAMS: DvdBounceParams = {
  brightness: 1.0,
  speed: 1.0,
};
