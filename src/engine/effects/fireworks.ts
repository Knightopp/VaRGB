import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE } from '../layout';
import { applyBrightness, hslToRgb } from '../color';

export interface FireworksParams {
  brightness: number;
  speed: number;            // Simulation speed multiplier
}

interface Flare {
  c: number;
  currentR: number;         // Float row position (moving 4 -> targetR)
  targetR: number;
  color: RGBColor;
}

interface SparkParticle {
  x: number;                // Float col
  y: number;                // Float row
  vx: number;
  vy: number;
  age: number;              // Seconds
  maxAge: number;           // Seconds (~0.5s)
  color: RGBColor;
}

export class FireworksEffect implements ILightingEffect {
  readonly type = 'fireworks' as const;
  readonly name = 'Fireworks';

  private flares: Flare[] = [];
  private particles: SparkParticle[] = [];
  private idleTime: number = 0;

  constructor(public params: FireworksParams = { ...DEFAULT_FIREWORKS_PARAMS }) {}

  reset(): void {
    this.flares = [];
    this.particles = [];
    this.idleTime = 0;
  }

  private launch(targetR: number, targetC: number): void {
    const hue = Math.random();
    const color = hslToRgb(hue, 1.0, 0.6);
    this.flares.push({
      c: targetC,
      currentR: 4.0,
      targetR,
      color,
    });
  }

  onKeyDown(code: string): void {
    this.idleTime = 0;
    const key = KEY_BY_CODE[code];
    if (key) {
      this.launch(key.gridY, key.gridX);
    } else {
      this.launch(Math.floor(Math.random() * 3), Math.floor(Math.random() * 14));
    }
  }

  private detonate(targetR: number, targetC: number, color: RGBColor): void {
    // 8 sparks radiating outward in 45-degree increments
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4.0;
      const speed = 4.0 + Math.random() * 2.0;
      this.particles.push({
        x: targetC,
        y: targetR,
        vx: Math.cos(angle) * speed * 1.5,
        vy: Math.sin(angle) * speed * 0.8 - 1.5, // Initial upward burst
        age: 0,
        maxAge: 0.5 + Math.random() * 0.2,
        color,
      });
    }
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.min(ctx.dt, 0.1);
    const speed = Math.max(0.2, this.params.speed);
    this.idleTime += dt;

    // Auto-launch periodic firework if idle
    if (this.idleTime >= 2.0) {
      this.launch(Math.floor(Math.random() * 3), 2 + Math.floor(Math.random() * 10));
      this.idleTime = 0;
    }

    // Update flares
    const remainingFlares: Flare[] = [];
    const flareSpeed = 16.0 * speed; // Rows per second

    for (const f of this.flares) {
      f.currentR -= flareSpeed * dt;
      if (f.currentR <= f.targetR) {
        this.detonate(f.targetR, f.c, f.color);
      } else {
        remainingFlares.push(f);
      }
    }
    this.flares = remainingFlares;

    // Update particles
    const remainingParticles: SparkParticle[] = [];
    const gravity = 8.0 * speed; // Downward row gravity

    for (const p of this.particles) {
      p.age += dt;
      if (p.age < p.maxAge) {
        p.x += p.vx * dt * speed;
        p.vy += gravity * dt;
        p.y += p.vy * dt * speed;
        remainingParticles.push(p);
      }
    }
    this.particles = remainingParticles;

    const frame: KeyFrameColor = {};
    const keys = ctx.keys ?? K630_LAYOUT;

    for (const key of keys) {
      const kr = key.gridY;
      const kc = key.gridX;

      let rAcc = 0;
      let gAcc = 0;
      let bAcc = 0;

      // Flares illumination
      for (const f of this.flares) {
        let isHit = false;
        if (key.id === 'space') {
          isHit = Math.abs(f.currentR - 4) < 0.6 && f.c >= 3 && f.c <= 9;
        } else {
          isHit = Math.abs(f.currentR - kr) < 0.6 && Math.abs(f.c - kc) < 0.6;
        }
        if (isHit) {
          rAcc = Math.min(255, rAcc + f.color.r);
          gAcc = Math.min(255, gAcc + f.color.g);
          bAcc = Math.min(255, bAcc + f.color.b);
        }
      }

      // Spark particles illumination
      for (const p of this.particles) {
        let dist = 999;
        if (key.id === 'space') {
          for (let sc = 3; sc <= 9; sc++) {
            const d = Math.hypot(p.x - sc, p.y - 4);
            if (d < dist) dist = d;
          }
        } else {
          dist = Math.hypot(p.x - kc, p.y - kr);
        }

        if (dist < 1.3) {
          const fade = Math.max(0, 1.0 - p.age / p.maxAge);
          const spatial = Math.max(0, 1.0 - dist / 1.3);
          const intensity = fade * spatial;

          rAcc = Math.min(255, rAcc + p.color.r * intensity);
          gAcc = Math.min(255, gAcc + p.color.g * intensity);
          bAcc = Math.min(255, bAcc + p.color.b * intensity);
        }
      }

      const col = {
        r: Math.round(rAcc),
        g: Math.round(gAcc),
        b: Math.round(bAcc),
      };
      frame[key.id] = applyBrightness(col, this.params.brightness);
    }

    return frame;
  }
}

export const DEFAULT_FIREWORKS_PARAMS: FireworksParams = {
  brightness: 1.0,
  speed: 1.0,
};
