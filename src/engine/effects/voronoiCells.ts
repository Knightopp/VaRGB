import { AnimationContext, ILightingEffect, VoronoiCellsParams } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE } from '../layout';
import { applyBrightness, lerpColor } from '../color';

export const DEFAULT_VORONOI_CELLS_PARAMS: VoronoiCellsParams = {
  brightness: 1.0,
  speed: 1.0,
  primaryColor: { r: 255, g: 0, b: 85 },    // Neon pink-red cell
  secondaryColor: { r: 0, g: 204, b: 255 }, // Cyan cell
  borderColor: { r: 0, g: 0, b: 0 },        // Crisp cell boundaries
};

interface VoronoiSeed {
  x: number;
  y: number;
  vx: number;
  vy: number;
  paletteFactor: number;
}

export class VoronoiCellsEffect implements ILightingEffect {
  readonly type = 'voronoi_cells' as const;
  readonly name = 'Voronoi Cells';

  private seeds: VoronoiSeed[] = [];

  constructor(public params: VoronoiCellsParams = { ...DEFAULT_VORONOI_CELLS_PARAMS }) {
    this.reset();
  }

  reset(): void {
    this.seeds = Array.from({ length: 5 }, (_, i) => ({
      x: 1 + Math.random() * 12,
      y: 0.5 + Math.random() * 3.5,
      vx: (Math.random() - 0.5) * 1.8,
      vy: (Math.random() - 0.5) * 1.2,
      paletteFactor: i / 4.0,
    }));
  }

  onKeyDown(code: string): void {
    const key = KEY_BY_CODE[code];
    if (!key) return;

    // Move first seed to clicked key
    if (this.seeds.length > 0) {
      this.seeds[0].x = key.gridX;
      this.seeds[0].y = key.gridY;
      this.seeds[0].vx = (Math.random() - 0.5) * 2;
      this.seeds[0].vy = (Math.random() - 0.5) * 2;
    }
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.min(ctx.dt, 0.1);
    const speed = Math.max(0.2, this.params.speed ?? 1.0);

    // Drift seeds with boundary bouncing
    for (const s of this.seeds) {
      s.x += s.vx * dt * speed;
      s.y += s.vy * dt * speed;

      if (s.x < 0) {
        s.x = 0;
        s.vx = Math.abs(s.vx);
      } else if (s.x > 13) {
        s.x = 13;
        s.vx = -Math.abs(s.vx);
      }

      if (s.y < 0) {
        s.y = 0;
        s.vy = Math.abs(s.vy);
      } else if (s.y > 4) {
        s.y = 4;
        s.vy = -Math.abs(s.vy);
      }
    }

    const frame: KeyFrameColor = {};
    const primary = this.params.primaryColor ?? DEFAULT_VORONOI_CELLS_PARAMS.primaryColor;
    const secondary = this.params.secondaryColor ?? DEFAULT_VORONOI_CELLS_PARAMS.secondaryColor;
    const borderCol = this.params.borderColor ?? DEFAULT_VORONOI_CELLS_PARAMS.borderColor;
    const brightness = Math.max(0, Math.min(1, this.params.brightness ?? 1.0));

    for (const key of K630_LAYOUT) {
      const c = key.gridX;
      const r = key.gridY;

      let d1 = Infinity;
      let d2 = Infinity;
      let closestSeed = this.seeds[0];

      for (const s of this.seeds) {
        const d = Math.hypot(c - s.x, r - s.y);
        if (d < d1) {
          d2 = d1;
          d1 = d;
          closestSeed = s;
        } else if (d < d2) {
          d2 = d;
        }
      }

      // Base color based on closest seed
      const cellColor = lerpColor(primary, secondary, closestSeed.paletteFactor);

      // Check distance difference to draw cell boundaries
      // (d2 - d1) < 0.45 draws crisp borders
      const borderDelta = d2 - d1;
      let col: RGBColor;
      if (borderDelta < 0.45) {
        const edgeFactor = borderDelta / 0.45;
        col = lerpColor(borderCol, cellColor, edgeFactor);
      } else {
        // Subtle interior depth
        const centerProximity = Math.max(0.7, 1.0 - d1 * 0.08);
        col = {
          r: Math.round(cellColor.r * centerProximity),
          g: Math.round(cellColor.g * centerProximity),
          b: Math.round(cellColor.b * centerProximity),
        };
      }

      frame[key.id] = applyBrightness(col, brightness);
    }

    return frame;
  }
}
