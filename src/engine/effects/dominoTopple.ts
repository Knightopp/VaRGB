import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE } from '../layout';
import { applyBrightness, lerpColor } from '../color';

export interface DominoToppleParams {
  brightness: number;
  speed: number;            // Wave propagation speed
  dominoColor: RGBColor;
}

interface DominoWave {
  originC: number;
  age: number;              // Seconds
}

export class DominoToppleEffect implements ILightingEffect {
  readonly type = 'domino_topple' as const;
  readonly name = 'Domino Topple';

  private waves: DominoWave[] = [];

  constructor(public params: DominoToppleParams = { ...DEFAULT_DOMINO_TOPPLE_PARAMS }) {}

  reset(): void {
    this.waves = [];
  }

  onKeyDown(code: string): void {
    const key = KEY_BY_CODE[code];
    const c = key ? key.gridX : 6;
    this.waves.push({ originC: c, age: 0 });
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.min(ctx.dt, 0.1);
    const speed = 18.0 * Math.max(0.2, this.params.speed); // Columns per second
    const maxDuration = 14.0 / speed + 0.5;

    for (const w of this.waves) {
      w.age += dt;
    }
    this.waves = this.waves.filter(w => w.age < maxDuration);

    const frame: KeyFrameColor = {};
    const keys = ctx.keys ?? K630_LAYOUT;
    const baseColor = this.params.dominoColor;
    const WHITE: RGBColor = { r: 255, g: 255, b: 255 };

    for (const key of keys) {
      const r = key.gridY;
      const c = key.gridX;

      let rAcc = 0;
      let gAcc = 0;
      let bAcc = 0;

      for (const w of this.waves) {
        // Distance in columns from wave origin
        let distC = Math.abs(c - w.originC);
        if (key.id === 'space') {
          distC = Math.min(Math.abs(4 - w.originC), Math.abs(6 - w.originC), Math.abs(8 - w.originC));
        }

        // Time when the wave hits this column
        const columnHitTime = distC / speed;
        const timeSinceColHit = w.age - columnHitTime;

        if (timeSinceColHit >= 0) {
          // Cascade down rows: row delay = r * 0.04s
          const rowDelay = r * 0.045;
          const timeSinceRowHit = timeSinceColHit - rowDelay;

          if (timeSinceRowHit >= 0 && timeSinceRowHit < 0.35) {
            const intensity = Math.max(0, 1.0 - timeSinceRowHit / 0.35);
            // Flash white on impact then fade to dominoColor
            const col = lerpColor(baseColor, WHITE, Math.max(0, 1.0 - timeSinceRowHit / 0.1));

            rAcc = Math.min(255, rAcc + col.r * intensity);
            gAcc = Math.min(255, gAcc + col.g * intensity);
            bAcc = Math.min(255, bAcc + col.b * intensity);
          }
        }
      }

      const col = {
        r: Math.round(rAcc),
        g: Math.round(gAcc),
        b: Math.round(bAcc),
      };
      frame[key.id] = applyBrightness(col, this.params.brightness);
    }

    return frame;
  }
}

export const DEFAULT_DOMINO_TOPPLE_PARAMS: DominoToppleParams = {
  brightness: 1.0,
  speed: 1.0,
  dominoColor: { r: 0, g: 220, b: 255 }, // Cyan
};
