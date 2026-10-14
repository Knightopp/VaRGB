import { AnimationContext, ILightingEffect, BlizzardDriftParams } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE } from '../layout';
import { applyBrightness, lerpColor } from '../color';

export const DEFAULT_BLIZZARD_DRIFT_PARAMS: BlizzardDriftParams = {
  brightness: 1.0,
  speed: 1.0,
  primaryColor: { r: 224, g: 247, b: 250 }, // Ice white / snowflake
  secondaryColor: { r: 13, g: 34, b: 58 },   // Storm blue drift / ice bank
};

interface SnowParticle {
  x: number;
  y: number;
  speed: number;
  size: number;
}

export class BlizzardDriftEffect implements ILightingEffect {
  readonly type = 'blizzard_drift' as const;
  readonly name = 'Blizzard Drift';

  private particles: SnowParticle[] = [];
  private snowBank: number[] = new Array(14).fill(0);

  constructor(public params: BlizzardDriftParams = { ...DEFAULT_BLIZZARD_DRIFT_PARAMS }) {
    this.reset();
  }

  reset(): void {
    this.particles = Array.from({ length: 22 }, () => ({
      x: Math.random() * 14,
      y: Math.random() * 5,
      speed: 1.5 + Math.random() * 2.5,
      size: 0.6 + Math.random() * 0.4,
    }));
    this.snowBank = new Array(14).fill(0.2);
  }

  onKeyDown(code: string): void {
    const key = KEY_BY_CODE[code];
    if (key) {
      // Clear snow at clicked column and blow a flurry upward
      this.snowBank[key.gridX] = 0;
      for (let i = 0; i < 4; i++) {
        this.particles.push({
          x: key.gridX + (Math.random() - 0.5) * 1.5,
          y: key.gridY,
          speed: 3.0 + Math.random() * 3.0,
          size: 1.0,
        });
      }
    }
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.min(ctx.dt, 0.1);
    const speed = Math.max(0.2, this.params.speed ?? 1.0);
    const time = ctx.totalTime * speed;

    // Wind oscillates horizontally
    const wind = Math.sin(time * 0.8) * 2.5 * speed;

    // Melt snowbanks slowly
    for (let c = 0; c < 14; c++) {
      this.snowBank[c] = Math.max(0, this.snowBank[c] - 0.05 * dt * speed);
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.y += p.speed * dt * speed;
      p.x += (wind + 0.3) * dt;

      if (p.x < 0) p.x += 14;
      if (p.x >= 14) p.x -= 14;

      if (p.y >= 4.0) {
        // Land on bottom row
        const col = Math.max(0, Math.min(13, Math.floor(p.x)));
        this.snowBank[col] = Math.min(2.0, this.snowBank[col] + 0.22);

        // Respawn at top
        p.y = -0.5;
        p.x = Math.random() * 14;
        p.speed = 1.5 + Math.random() * 2.5;
      }
    }

    // Keep particles array capped
    if (this.particles.length > 25) {
      this.particles.splice(0, this.particles.length - 25);
    }

    const frame: KeyFrameColor = {};
    const primary = this.params.primaryColor ?? DEFAULT_BLIZZARD_DRIFT_PARAMS.primaryColor;
    const secondary = this.params.secondaryColor ?? DEFAULT_BLIZZARD_DRIFT_PARAMS.secondaryColor;
    const brightness = Math.max(0, Math.min(1, this.params.brightness ?? 1.0));

    for (const key of K630_LAYOUT) {
      const c = key.gridX;
      const r = key.gridY;

      // Base cold ambient
      let col: RGBColor = { ...secondary };

      // Snowbank brightness on bottom row (and slightly row 3)
      if (r === 4) {
        const bank = Math.min(1.0, this.snowBank[c]);
        col = lerpColor(col, primary, bank * 0.85);
      } else if (r === 3 && this.snowBank[c] > 1.0) {
        const bank = Math.min(1.0, this.snowBank[c] - 1.0);
        col = lerpColor(col, primary, bank * 0.4);
      }

      // Check proximity of falling flakes
      for (const p of this.particles) {
        const dist = Math.hypot(c - p.x, r - p.y);
        if (dist < 0.9) {
          const flakeIntensity = (1.0 - dist / 0.9) * p.size;
          col = lerpColor(col, primary, flakeIntensity);
        }
      }

      frame[key.id] = applyBrightness(col, brightness);
    }

    return frame;
  }
}
