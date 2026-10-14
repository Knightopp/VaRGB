import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE, KEY_BY_ID } from '../layout';

export interface LaserCrosshairParams {
  brightness: number;
  beamDuration: number;    // Seconds (default 0.35)
  primaryColor: RGBColor;  // Beam color
  baseColor: RGBColor;
}

interface ActiveBeam {
  targetR: number;  // gridY of target
  targetC: number;  // gridX of target
  age: number;
  color: RGBColor;
}

export class LaserCrosshairEffect implements ILightingEffect {
  readonly type = 'laser_crosshair' as const;
  readonly name = 'Laser Crosshair';

  private beams: ActiveBeam[] = [];
  private readonly maxBeams = 20;

  constructor(public params: LaserCrosshairParams = { ...DEFAULT_LASER_CROSSHAIR_PARAMS }) {}

  onKeyDown(code: string): void {
    const key = KEY_BY_CODE[code] || KEY_BY_ID[code];
    if (!key) return;

    this.beams.push({
      targetR: key.gridY,
      targetC: key.gridX,
      age: 0,
      color: { ...this.params.primaryColor },
    });

    if (this.beams.length > this.maxBeams) {
      this.beams.shift();
    }
  }

  reset(): void {
    this.beams = [];
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.max(0.001, Math.min(0.5, ctx.dt));
    const keys = ctx.keys ?? K630_LAYOUT;
    const maxAge = Math.max(0.1, this.params.beamDuration);

    // Advance ages, prune expired
    this.beams = this.beams.filter(b => {
      b.age += dt;
      return b.age < maxAge;
    });

    const frame: KeyFrameColor = {};
    const base = this.params.baseColor;

    for (const key of keys) {
      const kr = key.gridY;
      const kc = key.gridX;

      let rAccum = base.r;
      let gAccum = base.g;
      let bAccum = base.b;

      for (const beam of this.beams) {
        // Check if key is on the same row or same column
        // Spacebar is 6.25U wide and spans columns 3 to 9 on the 60% matrix
        const inRow = kr === beam.targetR;
        const inCol = key.id === 'space'
          ? (beam.targetC >= 3 && beam.targetC <= 9)
          : (kc === beam.targetC);

        if (!inRow && !inCol) continue;

        const timeFade = Math.max(0, 1.0 - (beam.age / maxAge));
        const colDiff = key.id === 'space'
          ? Math.max(0, Math.abs(6 - beam.targetC) - 1.5)
          : Math.abs(kc - beam.targetC);
        const dist = Math.abs(kr - beam.targetR) + colDiff;
        const distFade = Math.max(0, 1.0 - dist / 14.0);
        const intensity = timeFade * distFade * this.params.brightness;

        // Additive blending
        rAccum = Math.min(255, rAccum + beam.color.r * intensity);
        gAccum = Math.min(255, gAccum + beam.color.g * intensity);
        bAccum = Math.min(255, bAccum + beam.color.b * intensity);
      }

      frame[key.id] = {
        r: Math.round(rAccum),
        g: Math.round(gAccum),
        b: Math.round(bAccum),
      };
    }
    return frame;
  }
}

export const DEFAULT_LASER_CROSSHAIR_PARAMS: LaserCrosshairParams = {
  brightness: 1.0,
  beamDuration: 0.35,
  primaryColor: { r: 255, g: 0, b: 60 },
  baseColor: { r: 0, g: 0, b: 0 },
};
