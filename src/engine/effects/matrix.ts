import { MatrixParams, AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor } from '../../types/keyboard';
import { lerpColor, applyBrightness } from '../color';

interface MatrixDrop {
  laneNormX: number; // Center of lane in [0, 1]
  headY: number;     // Normalized vertical position (-0.2 to 1.5)
  speed: number;     // Vertical fall speed
  trailLength: number;// Normalized length of tail (e.g. 0.3 to 0.7)
}

export class MatrixEffect implements ILightingEffect {
  readonly type = 'matrix';
  readonly name = 'Matrix Rain';

  private drops: MatrixDrop[] = [];
  private readonly LANES = 14;

  constructor(public params: MatrixParams) {
    this.initDrops();
  }

  private initDrops(): void {
    this.drops = [];
    for (let i = 0; i < this.LANES; i++) {
      if (Math.random() < this.params.density) {
        this.drops.push({
          laneNormX: (i + 0.5) / this.LANES,
          headY: Math.random() * 1.2 - 0.2,
          speed: (0.4 + Math.random() * 0.6) * this.params.speed,
          trailLength: 0.25 + Math.random() * 0.3 * (this.params.trailLength / 3),
        });
      }
    }
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = ctx.dt;

    // Advance drops
    for (const drop of this.drops) {
      drop.headY += drop.speed * dt * this.params.speed;
      // Respawn at top if fallen beyond bottom
      if (drop.headY - drop.trailLength > 1.1) {
        drop.headY = -0.15 - Math.random() * 0.3;
        drop.speed = (0.5 + Math.random() * 0.5) * this.params.speed;
      }
    }

    const frame: KeyFrameColor = {};
    const laneWidth = 1.0 / this.LANES;

    for (const key of ctx.keys) {
      let maxIntensity = 0;
      let isHead = false;

      for (const drop of this.drops) {
        // Check if key is within horizontal influence of this drop lane
        const dx = Math.abs(key.normX - drop.laneNormX);
        if (dx < laneWidth * 0.85) {
          const dy = drop.headY - key.normY;
          if (dy >= -0.05 && dy <= drop.trailLength) {
            if (dy < 0.08) {
              // At the bright head
              isHead = true;
              maxIntensity = Math.max(maxIntensity, 1.0);
            } else {
              // In the fading tail
              const tailRatio = 1 - (dy / drop.trailLength);
              maxIntensity = Math.max(maxIntensity, tailRatio * 0.85);
            }
          }
        }
      }

      if (maxIntensity > 0) {
        let baseColor = this.params.trailColor;
        if (isHead) {
          baseColor = lerpColor(this.params.trailColor, this.params.headColor, 0.85);
        }
        const illuminated = lerpColor(this.params.backgroundColor, baseColor, maxIntensity);
        frame[key.id] = applyBrightness(illuminated, this.params.brightness);
      } else {
        frame[key.id] = applyBrightness(this.params.backgroundColor, this.params.brightness);
      }
    }

    return frame;
  }

  reset(): void {
    this.initDrops();
  }
}

export const DEFAULT_MATRIX_PARAMS: MatrixParams = {
  speed: 1.2,
  brightness: 0.9,
  density: 0.85,
  trailLength: 3.5,
  intensity: 1.2,
  headColor: { r: 215, g: 255, b: 220 }, // Bright luminescent head
  trailColor: { r: 0, g: 220, b: 40 },   // Deep phosphor green
  backgroundColor: { r: 0, g: 0, b: 0 }, // Fully off black background
};
