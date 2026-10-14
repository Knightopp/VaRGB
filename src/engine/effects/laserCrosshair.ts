import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE, KEY_BY_ID, getKeyCenter } from '../layout';

export interface LaserCrosshairParams {
  brightness: number;
  beamDuration: number;    // Seconds (default 0.35)
  primaryColor: RGBColor;  // Beam color
  baseColor: RGBColor;
}

interface ActiveBeam {
  targetR: number;  // gridY of target
  targetC: number;  // gridX of target
  originX: number;  // Physical center X
  originY: number;  // Physical center Y
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

    const center = getKeyCenter(key);

    this.beams.push({
      targetR: key.gridY,
      targetC: key.gridX,
      originX: center.x,
      originY: center.y,
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

    // Synchronized outward travel: reaches edges in ~50% of the beam's total lifetime
    const sweepDuration = Math.max(0.14, maxAge * 0.52);
    const hSpeed = 15.0 / sweepDuration; // Columns per second to reach outer edge
    const vSpeed = 5.0 / sweepDuration;  // Rows per second to reach outer edge

    // Advance ages, prune expired
    this.beams = this.beams.filter(b => {
      b.age += dt;
      return b.age < maxAge;
    });

    const frame: KeyFrameColor = {};
    const base = this.params.baseColor;

    for (const key of keys) {
      const center = getKeyCenter(key);
      const kr = key.gridY;
      const kc = key.gridX;

      let rAccum = base.r;
      let gAccum = base.g;
      let bAccum = base.b;

      for (const beam of this.beams) {
        // Orthogonal alignment check
        const inRow = kr === beam.targetR;
        const inCol = key.id === 'space'
          ? (beam.targetC >= 3 && beam.targetC <= 9)
          : (kc === beam.targetC);

        if (!inRow && !inCol) continue;

        const distX = Math.abs(center.x - beam.originX);
        const colDiff = key.id === 'space'
          ? Math.max(0, Math.abs(6 - beam.targetC) - 1.5)
          : Math.abs(kc - beam.targetC);
        const distY = Math.abs(kr - beam.targetR) + colDiff;

        const dist = inRow ? distX : distY;
        const speed = inRow ? hSpeed : vSpeed;
        const currentReach = beam.age * speed;

        const overallLife = Math.max(0, 1.0 - (beam.age / maxAge));
        const distFade = Math.max(0, 1.0 - (dist / 15.0));

        // Subtle reticle guide line along orthogonal axes
        const reticleTrace = 0.05 * (overallLife ** 1.2);

        // Outward expanding laser projectile bolt
        let boltIntensity = 0;
        let isBoltHead = false;

        if (dist <= currentReach + 0.6) {
          const lagBehindHead = Math.max(0, currentReach - dist);
          const headPulse = Math.exp(-lagBehindHead * 1.8);
          if (headPulse > 0.45) {
            isBoltHead = true;
          }

          const trailIntensity = distFade * (overallLife ** 1.3) * 0.95;
          boltIntensity = headPulse * 1.35 + trailIntensity;
        }

        // Epicenter impact flash at the clicked/pressed key
        const isOrigin = Math.abs(center.x - beam.originX) < 0.7 && kr === beam.targetR;
        const epicenterFlash = isOrigin ? (overallLife ** 1.1) * 1.3 : 0;

        const combinedIntensity = Math.min(1.0, reticleTrace + boltIntensity + epicenterFlash) * this.params.brightness;

        if (combinedIntensity > 0.005) {
          // White-hot core at the leading laser head and epicenter burst
          const isHot = isBoltHead || (isOrigin && beam.age < 0.08);
          const beamR = isHot ? Math.min(255, beam.color.r + 100) : beam.color.r;
          const beamG = isHot ? Math.min(255, beam.color.g + 100) : beam.color.g;
          const beamB = isHot ? Math.min(255, beam.color.b + 100) : beam.color.b;

          rAccum = Math.min(255, rAccum + beamR * combinedIntensity);
          gAccum = Math.min(255, gAccum + beamG * combinedIntensity);
          bAccum = Math.min(255, bAccum + beamB * combinedIntensity);
        }
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
