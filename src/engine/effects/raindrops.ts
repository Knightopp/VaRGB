import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT } from '../layout';
import { applyBrightness } from '../color';

export interface RaindropsParams {
  brightness: number;
  speed: number;            // Drop expansion speed multiplier
  spawnInterval: number;    // Seconds between drops (default 0.3)
  maxRadius: number;        // Maximum ripple radius (default 3.5)
  primaryColor: RGBColor;  // Ripple color
}

interface Raindrop {
  r: number;       // Center row
  c: number;       // Center column
  radius: number;  // Current expanding radius
  maxRadius: number;
}

export class RaindropsEffect implements ILightingEffect {
  readonly type = 'raindrops' as const;
  readonly name = 'Raindrops';

  private drops: Raindrop[] = [];
  private spawnTimer: number = 0;
  private readonly maxDrops = 20;

  constructor(public params: RaindropsParams = { ...DEFAULT_RAINDROPS_PARAMS }) {}

  reset(): void {
    this.drops = [];
    this.spawnTimer = 0;
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.max(0.001, Math.min(0.5, ctx.dt));
    const keys = ctx.keys ?? K630_LAYOUT;
    const expandSpeed = 4.5 * (this.params.speed ?? 1.0);
    const maxR = this.params.maxRadius ?? 3.5;
    const interval = Math.max(0.05, this.params.spawnInterval ?? 0.3);

    // Spawn new drops
    this.spawnTimer += dt;
    while (this.spawnTimer >= interval) {
      this.spawnTimer -= interval;
      this.drops.push({
        r: Math.floor(Math.random() * 5),
        c: Math.floor(Math.random() * 14),
        radius: 0,
        maxRadius: maxR,
      });
      if (this.drops.length > this.maxDrops) {
        this.drops.shift();
      }
    }

    // Advance drops
    this.drops = this.drops.filter(d => {
      d.radius += expandSpeed * dt;
      return d.radius < d.maxRadius;
    });

    const frame: KeyFrameColor = {};
    const rippleColor = this.params.primaryColor;
    const ringWidth = 0.65;

    for (const key of keys) {
      const kx = key.gridX;
      const ky = key.gridY;
      let maxIntensity = 0;

      for (const drop of this.drops) {
        const dx = kx - drop.c;
        const dy = ky - drop.r;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Ring detection: key is on the expanding ring if close to the current radius
        const ringDelta = Math.abs(dist - drop.radius);
        if (ringDelta < ringWidth) {
          const ringFade = 1.0 - (ringDelta / ringWidth);
          const lifeFade = 1.0 - (drop.radius / drop.maxRadius);
          const intensity = ringFade * lifeFade;
          maxIntensity = Math.max(maxIntensity, intensity);
        }
      }

      if (maxIntensity > 0.005) {
        frame[key.id] = applyBrightness(rippleColor, maxIntensity * this.params.brightness);
      } else {
        frame[key.id] = { r: 0, g: 0, b: 0 };
      }
    }

    return frame;
  }
}

export const DEFAULT_RAINDROPS_PARAMS: RaindropsParams = {
  brightness: 1.0,
  speed: 1.0,
  spawnInterval: 0.3,
  maxRadius: 3.5,
  primaryColor: { r: 100, g: 220, b: 255 }, // Cyan-white
};
