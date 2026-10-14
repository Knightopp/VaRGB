import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT } from '../layout';
import { applyBrightness, lerpColor } from '../color';

export interface DoomFireParams {
  brightness: number;
  speed: number;            // Simulation step rate
  coolingRate: number;      // 0.10 to 0.40 (default 0.20)
}

const FIRE_PALETTE: { t: number; color: RGBColor }[] = [
  { t: 0.00, color: { r: 0, g: 0, b: 0 } },         // Pitch black
  { t: 0.20, color: { r: 75, g: 0, b: 0 } },        // Dark crimson
  { t: 0.45, color: { r: 255, g: 50, b: 0 } },      // Molten orange
  { t: 0.75, color: { r: 255, g: 200, b: 0 } },     // Fiery yellow
  { t: 1.00, color: { r: 255, g: 255, b: 255 } },   // White hot
];

function sampleFirePalette(t: number): RGBColor {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < FIRE_PALETTE.length - 1; i++) {
    const s0 = FIRE_PALETTE[i];
    const s1 = FIRE_PALETTE[i + 1];
    if (clamped >= s0.t && clamped <= s1.t) {
      const frac = (clamped - s0.t) / (s1.t - s0.t);
      return lerpColor(s0.color, s1.color, frac);
    }
  }
  return FIRE_PALETTE[FIRE_PALETTE.length - 1].color;
}

export class DoomFireEffect implements ILightingEffect {
  readonly type = 'doom_fire' as const;
  readonly name = 'Doom Fire';

  private fire: number[][] = [];
  private stepTimer: number = 0;

  constructor(public params: DoomFireParams = { ...DEFAULT_DOOM_FIRE_PARAMS }) {
    this.reset();
  }

  reset(): void {
    this.fire = Array.from({ length: 5 }, () => new Array(14).fill(0));
    this.stepTimer = 0;
  }

  private step(): void {
    // Generate bottom heat source
    for (let c = 0; c < 14; c++) {
      this.fire[4][c] = 0.85 + Math.random() * 0.15;
    }

    const cooling = this.params.coolingRate ?? 0.20;

    // Propagate upward
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 14; c++) {
        const jitter = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        const srcC = Math.max(0, Math.min(13, c + jitter));
        const decay = cooling * (0.75 + Math.random() * 0.5);
        this.fire[r][c] = Math.max(0, this.fire[r + 1][srcC] - decay);
      }
    }
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.min(ctx.dt, 0.1);
    const stepInterval = (1.0 / 24.0) / Math.max(0.2, this.params.speed);
    this.stepTimer += dt;

    while (this.stepTimer >= stepInterval) {
      this.step();
      this.stepTimer -= stepInterval;
    }

    const frame: KeyFrameColor = {};
    const keys = ctx.keys ?? K630_LAYOUT;

    for (const key of keys) {
      const r = key.gridY;
      let heat = this.fire[r][key.gridX];

      if (key.id === 'space') {
        let sum = 0;
        for (let sc = 3; sc <= 9; sc++) sum += this.fire[4][sc];
        heat = sum / 7.0;
      }

      const col = sampleFirePalette(heat);
      frame[key.id] = applyBrightness(col, this.params.brightness);
    }

    return frame;
  }
}

export const DEFAULT_DOOM_FIRE_PARAMS: DoomFireParams = {
  brightness: 1.0,
  speed: 1.0,
  coolingRate: 0.20,
};
