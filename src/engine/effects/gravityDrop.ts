import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE, KEY_BY_ID } from '../layout';
import { applyBrightness, hslToRgb } from '../color';

export interface GravityDropParams {
  brightness: number;
  speed: number;          // Fall speed multiplier (default 1.0)
  primaryColor: RGBColor; // Particle color
}

interface FallingParticle {
  c: number;       // Column (gridX)
  y: number;       // Current vertical position (float, row units)
  color: RGBColor;
}

interface ColumnFlash {
  c: number;
  remaining: number; // Seconds remaining
}

export class GravityDropEffect implements ILightingEffect {
  readonly type = 'gravity_drop' as const;
  readonly name = 'Gravity Drop';

  private stackHeight: number[] = new Array(14).fill(0);
  private particles: FallingParticle[] = [];
  private flashes: ColumnFlash[] = [];
  private hueCounter: number = 0;

  constructor(public params: GravityDropParams = { ...DEFAULT_GRAVITY_DROP_PARAMS }) {}

  onKeyDown(code: string): void {
    const key = KEY_BY_CODE[code] || KEY_BY_ID[code];
    if (!key) return;
    const c = key.gridX;
    if (c < 0 || c >= 14) return;

    // Generate a slowly shifting rainbow hue for variety
    this.hueCounter = (this.hueCounter + 25) % 360;
    const color = this.params.primaryColor.r === 0 && this.params.primaryColor.g === 200 && this.params.primaryColor.b === 255
      ? hslToRgb(this.hueCounter, 1.0, 0.55)
      : this.params.primaryColor;

    this.particles.push({ c, y: 0.0, color });
  }

  reset(): void {
    this.stackHeight = new Array(14).fill(0);
    this.particles = [];
    this.flashes = [];
    this.hueCounter = 0;
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.max(0.001, Math.min(0.5, ctx.dt));
    const keys = ctx.keys ?? K630_LAYOUT;
    const fallSpeed = 12.0 * (this.params.speed ?? 1.0);

    // Advance flashes
    this.flashes = this.flashes
      .map(f => ({ ...f, remaining: f.remaining - dt }))
      .filter(f => f.remaining > 0);

    // Advance particles
    const locked: FallingParticle[] = [];
    this.particles = this.particles.filter(p => {
      p.y += fallSpeed * dt;
      const landRow = 4 - this.stackHeight[p.c];
      if (p.y >= landRow) {
        // Lock particle
        this.stackHeight[p.c]++;
        locked.push({ ...p, y: landRow });
        // Check for column overflow
        if (this.stackHeight[p.c] >= 5) {
          this.flashes.push({ c: p.c, remaining: 0.2 });
          this.stackHeight[p.c] = 0;
        }
        return false;
      }
      return true;
    });

    // Build per-grid-cell color map
    const cellColors: Record<string, RGBColor> = {};

    // Render stacked keys (bottom of column)
    for (let c = 0; c < 14; c++) {
      for (let i = 0; i < this.stackHeight[c] && i < 5; i++) {
        const r = 4 - i;
        const key = `${r}_${c}`;
        const stackFade = 0.4 + 0.6 * (i / 4);
        cellColors[key] = applyBrightness(this.params.primaryColor, stackFade * this.params.brightness);
      }
    }

    // Render active falling particles
    for (const p of this.particles) {
      const row = Math.floor(p.y);
      if (row >= 0 && row < 5) {
        const key = `${row}_${p.c}`;
        cellColors[key] = applyBrightness(p.color, this.params.brightness);
      }
    }

    // Render flashing columns
    for (const f of this.flashes) {
      const intensity = f.remaining / 0.2;
      for (let r = 0; r < 5; r++) {
        const key = `${r}_${f.c}`;
        cellColors[key] = applyBrightness({ r: 255, g: 255, b: 255 }, intensity * this.params.brightness);
      }
    }

    // Map to KeyFrameColor
    const frame: KeyFrameColor = {};
    for (const key of keys) {
      const cell = `${key.gridY}_${key.gridX}`;
      frame[key.id] = cellColors[cell] || { r: 0, g: 0, b: 0 };
    }
    return frame;
  }
}

export const DEFAULT_GRAVITY_DROP_PARAMS: GravityDropParams = {
  brightness: 1.0,
  speed: 1.0,
  primaryColor: { r: 0, g: 200, b: 255 },
};
