import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE } from '../layout';
import { applyBrightness, lerpColor } from '../color';

export interface WavePondParams {
  brightness: number;
  damping: number;          // 0.85 to 0.98 (default 0.92)
  speed: number;            // Simulation rate multiplier
}

export class WavePondEffect implements ILightingEffect {
  readonly type = 'wave_pond' as const;
  readonly name = 'Wave Pond';

  private curr: number[][] = [];
  private prev: number[][] = [];
  private stepTimer: number = 0;

  constructor(public params: WavePondParams = { ...DEFAULT_WAVE_POND_PARAMS }) {
    this.reset();
  }

  reset(): void {
    this.curr = Array.from({ length: 5 }, () => new Array(14).fill(0));
    this.prev = Array.from({ length: 5 }, () => new Array(14).fill(0));
    this.stepTimer = 0;
  }

  onKeyDown(code: string): void {
    const key = KEY_BY_CODE[code];
    if (!key) return;

    if (key.id === 'space') {
      for (let sc = 4; sc <= 8; sc++) {
        this.curr[4][sc] = 1.0;
      }
    } else {
      const r = key.gridY;
      const c = key.gridX;
      this.curr[r][c] = 1.0;
    }
  }

  private step(): void {
    const next: number[][] = Array.from({ length: 5 }, () => new Array(14).fill(0));
    const damp = Math.max(0.80, Math.min(0.98, this.params.damping));

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 14; c++) {
        const top = r > 0 ? this.curr[r - 1][c] : this.curr[r][c];
        const bottom = r < 4 ? this.curr[r + 1][c] : this.curr[r][c];
        const left = c > 0 ? this.curr[r][c - 1] : this.curr[r][c];
        const right = c < 13 ? this.curr[r][c + 1] : this.curr[r][c];

        next[r][c] = ((top + bottom + left + right) / 2.0 - this.prev[r][c]) * damp;
      }
    }

    this.prev = this.curr;
    this.curr = next;
  }

  private sampleWaveColor(val: number): RGBColor {
    // val is in [-1.0, 1.0]
    const clamped = Math.max(-1.0, Math.min(1.0, val));
    const norm = (clamped + 1.0) / 2.0; // [0.0, 1.0]

    const C_DEEP: RGBColor = { r: 0, g: 17, b: 51 };    // #001133 Deep ocean blue
    const C_MID: RGBColor = { r: 0, g: 68, b: 136 };    // Ocean blue
    const C_CYAN: RGBColor = { r: 0, g: 204, b: 255 };  // #00CCFF Cyan wave
    const C_FOAM: RGBColor = { r: 255, g: 255, b: 255 };// #FFFFFF White foam

    if (norm < 0.35) {
      return lerpColor(C_DEEP, C_MID, norm / 0.35);
    } else if (norm < 0.75) {
      return lerpColor(C_MID, C_CYAN, (norm - 0.35) / 0.40);
    } else {
      return lerpColor(C_CYAN, C_FOAM, (norm - 0.75) / 0.25);
    }
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.min(ctx.dt, 0.1);
    const stepInterval = (1.0 / 30.0) / Math.max(0.2, this.params.speed);
    this.stepTimer += dt;

    while (this.stepTimer >= stepInterval) {
      this.step();
      this.stepTimer -= stepInterval;
    }

    const frame: KeyFrameColor = {};
    const keys = ctx.keys ?? K630_LAYOUT;

    for (const key of keys) {
      const r = key.gridY;
      let val = this.curr[r][key.gridX];

      if (key.id === 'space') {
        let maxV = -1;
        for (let sc = 3; sc <= 9; sc++) {
          if (this.curr[4][sc] > maxV) maxV = this.curr[4][sc];
        }
        val = maxV;
      }

      const col = this.sampleWaveColor(val);
      frame[key.id] = applyBrightness(col, this.params.brightness);
    }

    return frame;
  }
}

export const DEFAULT_WAVE_POND_PARAMS: WavePondParams = {
  brightness: 1.0,
  damping: 0.92,
  speed: 1.0,
};
