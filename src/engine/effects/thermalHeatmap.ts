import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE, KEY_BY_ID } from '../layout';
import { applyBrightness, lerpColor } from '../color';

export interface ThermalHeatmapParams {
  brightness: number;       // 0.0 to 1.0
  decayRate: number;        // Heat decay per second (default 0.08)
  hitStrength: number;      // Heat added on keypress (default 0.25)
  bleedStrength: number;    // Heat bleed to neighbors (default 0.06)
}

// 5-stop thermal gradient
const THERMAL_STOPS: { t: number; color: RGBColor }[] = [
  { t: 0.00, color: { r: 0, g: 0, b: 0 } },         // Off
  { t: 0.25, color: { r: 0, g: 34, b: 255 } },       // Deep Blue
  { t: 0.50, color: { r: 0, g: 255, b: 102 } },      // Cyan/Green
  { t: 0.75, color: { r: 255, g: 136, b: 0 } },      // Orange
  { t: 1.00, color: { r: 255, g: 255, b: 255 } },    // White-Hot
];

function sampleThermalGradient(t: number): RGBColor {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < THERMAL_STOPS.length - 1; i++) {
    const s0 = THERMAL_STOPS[i];
    const s1 = THERMAL_STOPS[i + 1];
    if (clamped >= s0.t && clamped <= s1.t) {
      const frac = (clamped - s0.t) / (s1.t - s0.t);
      return lerpColor(s0.color, s1.color, frac);
    }
  }
  return THERMAL_STOPS[THERMAL_STOPS.length - 1].color;
}

export class ThermalHeatmapEffect implements ILightingEffect {
  readonly type = 'thermal_heatmap' as const;
  readonly name = 'Thermal Heatmap';

  private heat: number[][] = [];

  constructor(public params: ThermalHeatmapParams = { ...DEFAULT_THERMAL_HEATMAP_PARAMS }) {
    this.initHeat();
  }

  private initHeat(): void {
    this.heat = [];
    for (let r = 0; r < 5; r++) {
      this.heat[r] = new Array(14).fill(0.0);
    }
  }

  onKeyDown(code: string): void {
    const key = KEY_BY_CODE[code] || KEY_BY_ID[code];
    if (!key) return;
    const r = key.gridY;
    const c = key.gridX;
    if (r < 0 || r >= 5 || c < 0 || c >= 14) return;

    this.heat[r][c] = Math.min(1.0, this.heat[r][c] + this.params.hitStrength);

    // Bleed to orthogonal + diagonal neighbors
    const bleed = this.params.bleedStrength;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 5 && nc >= 0 && nc < 14) {
          this.heat[nr][nc] = Math.min(1.0, this.heat[nr][nc] + bleed);
        }
      }
    }
  }

  reset(): void {
    this.initHeat();
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.max(0.001, Math.min(0.5, ctx.dt));
    const keys = ctx.keys ?? K630_LAYOUT;
    const decay = this.params.decayRate;

    // Decay all cells
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 14; c++) {
        this.heat[r][c] = Math.max(0.0, this.heat[r][c] - decay * dt);
      }
    }

    const frame: KeyFrameColor = {};
    for (const key of keys) {
      const r = key.gridY;
      const c = key.gridX;
      const h = (r >= 0 && r < 5 && c >= 0 && c < 14) ? this.heat[r][c] : 0;
      const color = sampleThermalGradient(h);
      frame[key.id] = applyBrightness(color, this.params.brightness);
    }
    return frame;
  }
}

export const DEFAULT_THERMAL_HEATMAP_PARAMS: ThermalHeatmapParams = {
  brightness: 1.0,
  decayRate: 0.08,
  hitStrength: 0.25,
  bleedStrength: 0.06,
};
