import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT } from '../layout';
import { applyBrightness, lerpColor } from '../color';

export interface DnaHelixParams {
  brightness: number;
  speed: number;            // Rotation speed multiplier
}

export class DnaHelixEffect implements ILightingEffect {
  readonly type = 'dna_helix' as const;
  readonly name = 'DNA Helix';

  constructor(public params: DnaHelixParams = { ...DEFAULT_DNA_HELIX_PARAMS }) {}

  reset(): void {}

  update(ctx: AnimationContext): KeyFrameColor {
    const t = ctx.totalTime * 3.0 * Math.max(0.1, this.params.speed);
    const frame: KeyFrameColor = {};
    const keys = ctx.keys ?? K630_LAYOUT;

    const C_CYAN: RGBColor = { r: 0, g: 255, b: 255 };      // #00FFFF Strand 1
    const C_MAGENTA: RGBColor = { r: 255, g: 0, b: 170 };   // #FF00AA Strand 2
    const C_RUNG: RGBColor = { r: 160, g: 140, b: 220 };    // Violet-white DNA rungs
    const C_BLACK: RGBColor = { r: 0, g: 0, b: 0 };

    for (const key of keys) {
      let c = key.gridX;
      const r = key.gridY;

      // Handle spacebar at center column ~6.5
      if (key.id === 'space') {
        c = 6.5;
      }

      // Compute strand vertical positions
      const y1 = 2.0 + 1.8 * Math.sin(c * 0.55 - t);
      const y2 = 2.0 - 1.8 * Math.sin(c * 0.55 - t);

      // Distance to strands
      const d1 = Math.abs(r - y1);
      const d2 = Math.abs(r - y2);

      const int1 = Math.max(0, 1.0 - d1 / 0.9);
      const int2 = Math.max(0, 1.0 - d2 / 0.9);

      let keyColor: RGBColor = C_BLACK;

      // Strand 1 (Cyan)
      if (int1 > 0) {
        keyColor = lerpColor(keyColor, C_CYAN, int1);
      }
      // Strand 2 (Magenta)
      if (int2 > 0) {
        keyColor = lerpColor(keyColor, C_MAGENTA, int2);
      }

      // Base-pair rungs on even columns connecting between y1 and y2
      const isEvenCol = Math.round(c) % 2 === 0;
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);

      if (isEvenCol && r >= minY - 0.2 && r <= maxY + 0.2) {
        const rungIntensity = 0.45;
        keyColor = lerpColor(keyColor, C_RUNG, rungIntensity);
      }

      frame[key.id] = applyBrightness(keyColor, this.params.brightness);
    }

    return frame;
  }
}

export const DEFAULT_DNA_HELIX_PARAMS: DnaHelixParams = {
  brightness: 1.0,
  speed: 1.0,
};
