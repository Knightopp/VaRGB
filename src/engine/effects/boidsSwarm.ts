import { AnimationContext, ILightingEffect, BoidsSwarmParams } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE } from '../layout';
import { applyBrightness, hslToRgb, lerpColor } from '../color';

export const DEFAULT_BOIDS_SWARM_PARAMS: BoidsSwarmParams = {
  brightness: 1.0,
  speed: 1.0,
  primaryColor: { r: 0, g: 238, b: 255 },   // Cyan leader
  secondaryColor: { r: 255, g: 0, b: 170 }, // Magenta follower
  colorMode: 'rainbow',
};

interface Boid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hue: number;
}

export class BoidsSwarmEffect implements ILightingEffect {
  readonly type = 'boids_swarm' as const;
  readonly name = 'Boids Swarm';

  private boids: Boid[] = [];

  constructor(public params: BoidsSwarmParams = { ...DEFAULT_BOIDS_SWARM_PARAMS }) {
    this.reset();
  }

  reset(): void {
    this.boids = Array.from({ length: 6 }, (_, i) => ({
      x: 2 + Math.random() * 10,
      y: 1 + Math.random() * 3,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 2,
      hue: (i / 6) * 360,
    }));
  }

  onKeyDown(code: string): void {
    const key = KEY_BY_CODE[code];
    if (!key) return;

    const kx = key.gridX;
    const ky = key.gridY;

    // Strong radial repulsion impulse from pressed key
    for (const b of this.boids) {
      const dx = b.x - kx;
      const dy = b.y - ky;
      const dist = Math.hypot(dx, dy) || 0.1;
      const force = 12.0 / (dist + 0.5);
      b.vx += (dx / dist) * force;
      b.vy += (dy / dist) * force;
    }
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.min(ctx.dt, 0.05);
    const speed = Math.max(0.2, this.params.speed ?? 1.0);

    const numBoids = this.boids.length;

    // Reynolds Flocking Algorithm
    for (let i = 0; i < numBoids; i++) {
      const b = this.boids[i];
      let centerX = 0, centerY = 0;
      let alignVx = 0, alignVy = 0;
      let sepX = 0, sepY = 0;
      let neighbors = 0;

      for (let j = 0; j < numBoids; j++) {
        if (i === j) continue;
        const other = this.boids[j];
        const dist = Math.hypot(b.x - other.x, b.y - other.y);

        if (dist < 5.0) {
          centerX += other.x;
          centerY += other.y;
          alignVx += other.vx;
          alignVy += other.vy;
          neighbors++;
        }

        if (dist < 1.5 && dist > 0) {
          sepX += (b.x - other.x) / dist;
          sepY += (b.y - other.y) / dist;
        }
      }

      if (neighbors > 0) {
        // Cohesion
        centerX /= neighbors;
        centerY /= neighbors;
        b.vx += (centerX - b.x) * 1.2 * dt;
        b.vy += (centerY - b.y) * 1.2 * dt;

        // Alignment
        alignVx /= neighbors;
        alignVy /= neighbors;
        b.vx += (alignVx - b.vx) * 1.8 * dt;
        b.vy += (alignVy - b.vy) * 1.8 * dt;
      }

      // Separation
      b.vx += sepX * 4.5 * dt;
      b.vy += sepY * 4.5 * dt;

      // Soft boundary steering
      if (b.x < 1.0) b.vx += (1.0 - b.x) * 8.0 * dt;
      if (b.x > 12.0) b.vx -= (b.x - 12.0) * 8.0 * dt;
      if (b.y < 0.5) b.vy += (0.5 - b.y) * 8.0 * dt;
      if (b.y > 3.5) b.vy -= (b.y - 3.5) * 8.0 * dt;

      // Clamp speed
      const vMag = Math.hypot(b.vx, b.vy);
      const maxV = 5.0 * speed;
      if (vMag > maxV) {
        b.vx = (b.vx / vMag) * maxV;
        b.vy = (b.vy / vMag) * maxV;
      }

      // Move
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Toroidal gentle wrap
      if (b.x < -0.5) b.x = 13.5;
      if (b.x > 13.5) b.x = -0.5;
      if (b.y < -0.5) b.y = 4.5;
      if (b.y > 4.5) b.y = -0.5;
    }

    const frame: KeyFrameColor = {};
    const primary = this.params.primaryColor ?? DEFAULT_BOIDS_SWARM_PARAMS.primaryColor;
    const secondary = this.params.secondaryColor ?? DEFAULT_BOIDS_SWARM_PARAMS.secondaryColor;
    const isRainbow = this.params.colorMode === 'rainbow';
    const brightness = Math.max(0, Math.min(1, this.params.brightness ?? 1.0));

    for (const key of K630_LAYOUT) {
      const kx = key.gridX;
      const ky = key.gridY;

      let totalR = 0, totalG = 0, totalB = 0;

      for (let i = 0; i < numBoids; i++) {
        const b = this.boids[i];
        const dist = Math.hypot(kx - b.x, ky - b.y);

        if (dist < 2.0) {
          const falloff = Math.max(0, 1.0 - dist / 2.0);
          const col = isRainbow
            ? hslToRgb((b.hue + ctx.totalTime * 40) % 360, 1.0, 0.5)
            : lerpColor(primary, secondary, i / (numBoids - 1));

          totalR += col.r * falloff;
          totalG += col.g * falloff;
          totalB += col.b * falloff;
        }
      }

      const clampedCol: RGBColor = {
        r: Math.min(255, Math.round(totalR)),
        g: Math.min(255, Math.round(totalG)),
        b: Math.min(255, Math.round(totalB)),
      };

      frame[key.id] = applyBrightness(clampedCol, brightness);
    }

    return frame;
  }
}
