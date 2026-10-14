import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE, KEY_BY_ID } from '../layout';
import { applyBrightness } from '../color';

export interface PongBounceParams {
  brightness: number;
  speed: number;           // Speed multiplier
  primaryColor: RGBColor;  // Ball color
  trailLength: number;     // Number of tail positions (2-8)
}

export class PongBounceEffect implements ILightingEffect {
  readonly type = 'pong_bounce' as const;
  readonly name = 'Pong Bounce';

  private bx: number = 6.5;
  private by: number = 2.0;
  private vx: number = 8.0;
  private vy: number = 5.0;
  private trail: { x: number; y: number }[] = [];
  private trailTimer: number = 0;
  private hue: number = 0;

  constructor(public params: PongBounceParams = { ...DEFAULT_PONG_BOUNCE_PARAMS }) {}

  onKeyDown(code: string): void {
    const key = KEY_BY_CODE[code] || KEY_BY_ID[code];
    if (!key) return;
    const kc = key.gridX;
    const kr = key.gridY;

    const dx = this.bx - kc;
    const dy = this.by - kr;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2.5 && dist > 0.01) {
      // Deflect away from keypress
      const nx = dx / dist;
      const ny = dy / dist;
      const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      this.vx = nx * speed * 1.3;
      this.vy = ny * speed * 1.3;
    }
  }

  reset(): void {
    this.bx = 6.5;
    this.by = 2.0;
    this.vx = 8.0;
    this.vy = 5.0;
    this.trail = [];
    this.trailTimer = 0;
    this.hue = 0;
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.max(0.001, Math.min(0.1, ctx.dt));
    const keys = ctx.keys ?? K630_LAYOUT;
    const speedMul = this.params.speed ?? 1.0;

    // Cap velocity magnitude to prevent wild jumps
    const maxSpeed = 20.0 * speedMul;
    const curSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (curSpeed > maxSpeed) {
      const scale = maxSpeed / curSpeed;
      this.vx *= scale;
      this.vy *= scale;
    }

    // Gradually decay boosted speed back to nominal
    const nominalSpeed = 9.4 * speedMul;
    if (curSpeed > nominalSpeed) {
      const dampFactor = 1.0 - 0.8 * dt;
      this.vx *= dampFactor;
      this.vy *= dampFactor;
    }

    // Update position
    this.bx += this.vx * dt * speedMul;
    this.by += this.vy * dt * speedMul;

    // Bounce off boundaries
    if (this.bx < 0) { this.bx = -this.bx; this.vx = Math.abs(this.vx); }
    if (this.bx > 13) { this.bx = 26 - this.bx; this.vx = -Math.abs(this.vx); }
    if (this.by < 0) { this.by = -this.by; this.vy = Math.abs(this.vy); }
    if (this.by > 4) { this.by = 8 - this.by; this.vy = -Math.abs(this.vy); }

    // Clamp to safe bounds
    this.bx = Math.max(0, Math.min(13, this.bx));
    this.by = Math.max(0, Math.min(4, this.by));

    // Record trail position at intervals
    this.trailTimer += dt;
    if (this.trailTimer >= 0.06) {
      this.trailTimer = 0;
      this.trail.push({ x: this.bx, y: this.by });
      const maxTrail = this.params.trailLength ?? 4;
      while (this.trail.length > maxTrail) this.trail.shift();
    }

    // Slowly shift hue for rainbow tail
    this.hue = (this.hue + dt * 60) % 360;

    const frame: KeyFrameColor = {};
    const ballColor = this.params.primaryColor;
    const glowRadius = 1.8;

    for (const key of keys) {
      const kx = key.gridX;
      const ky = key.gridY;

      // Ball glow
      const dx = kx - this.bx;
      const dy = ky - this.by;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let intensity = Math.max(0, 1.0 - dist / glowRadius);
      intensity = intensity * intensity; // Quadratic falloff

      // Trail glow
      let trailIntensity = 0;
      for (let i = 0; i < this.trail.length; i++) {
        const t = this.trail[i];
        const tdx = kx - t.x;
        const tdy = ky - t.y;
        const tdist = Math.sqrt(tdx * tdx + tdy * tdy);
        const tFade = (i + 1) / (this.trail.length + 1) * 0.5;
        const tGlow = Math.max(0, 1.0 - tdist / (glowRadius * 0.8)) * tFade;
        trailIntensity = Math.max(trailIntensity, tGlow);
      }

      const totalIntensity = Math.min(1.0, intensity + trailIntensity);

      if (totalIntensity > 0.005) {
        frame[key.id] = applyBrightness(ballColor, totalIntensity * this.params.brightness);
      } else {
        frame[key.id] = { r: 0, g: 0, b: 0 };
      }
    }

    return frame;
  }
}

export const DEFAULT_PONG_BOUNCE_PARAMS: PongBounceParams = {
  brightness: 1.0,
  speed: 1.0,
  primaryColor: { r: 0, g: 255, b: 120 },
  trailLength: 4,
};
