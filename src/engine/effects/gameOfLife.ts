import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE } from '../layout';
import { applyBrightness, lerpColor } from '../color';

export interface GameOfLifeParams {
  brightness: number;
  speed: number;            // Step speed multiplier (base 0.25s per step)
  aliveColor: RGBColor;     // Base color of alive cells
  accentColor: RGBColor;    // Color for user-spawned cells
  fadeSpeed: number;        // Smooth transition lerp speed
}

export class GameOfLifeEffect implements ILightingEffect {
  readonly type = 'game_of_life' as const;
  readonly name = 'Game of Life';

  private currentGen: boolean[][] = [];
  private nextGen: boolean[][] = [];
  private brightnessBuf: number[][] = [];
  private isAccent: boolean[][] = [];
  private timeSinceStep: number = 0;
  private staticCount: number = 0;

  constructor(public params: GameOfLifeParams = { ...DEFAULT_GAME_OF_LIFE_PARAMS }) {
    this.reset();
  }

  reset(): void {
    this.currentGen = Array.from({ length: 5 }, () => new Array(14).fill(false));
    this.nextGen = Array.from({ length: 5 }, () => new Array(14).fill(false));
    this.brightnessBuf = Array.from({ length: 5 }, () => new Array(14).fill(0));
    this.isAccent = Array.from({ length: 5 }, () => new Array(14).fill(false));
    this.timeSinceStep = 0;
    this.staticCount = 0;
    this.seedRandomCells(12);
  }

  private seedRandomCells(count: number): void {
    let placed = 0;
    while (placed < count) {
      const r = Math.floor(Math.random() * 5);
      const c = Math.floor(Math.random() * 14);
      if (!this.currentGen[r][c]) {
        this.currentGen[r][c] = true;
        this.brightnessBuf[r][c] = 1.0;
        placed++;
      }
    }
  }

  onKeyDown(code: string): void {
    const key = KEY_BY_CODE[code];
    if (!key) return;

    const r = key.gridY;
    const c = key.gridX;

    this.currentGen[r][c] = true;
    this.brightnessBuf[r][c] = 1.0;
    this.isAccent[r][c] = true;

    // Revive 3 random neighbors
    const deltas = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1],
    ];
    // Shuffle and pick 3
    deltas.sort(() => Math.random() - 0.5);
    for (let i = 0; i < 3; i++) {
      const [dr, dc] = deltas[i];
      const nr = (r + dr + 5) % 5;
      const nc = (c + dc + 14) % 14;
      this.currentGen[nr][nc] = true;
      this.brightnessBuf[nr][nc] = 1.0;
      this.isAccent[nr][nc] = true;
    }
  }

  private countNeighbors(r: number, c: number): number {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = (r + dr + 5) % 5;
        const nc = (c + dc + 14) % 14;
        if (this.currentGen[nr][nc]) count++;
      }
    }
    return count;
  }

  private step(): void {
    let totalAlive = 0;
    let diff = 0;

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 14; c++) {
        const neighbors = this.countNeighbors(r, c);
        const alive = this.currentGen[r][c];
        let next = false;

        if (alive) {
          next = neighbors === 2 || neighbors === 3;
        } else {
          next = neighbors === 3;
        }

        if (next) totalAlive++;
        if (next !== alive) diff++;
        this.nextGen[r][c] = next;
      }
    }

    if (diff === 0 || totalAlive === 0) {
      this.staticCount++;
      if (this.staticCount >= 3) {
        this.seedRandomCells(12);
        this.staticCount = 0;
        return;
      }
    } else {
      this.staticCount = 0;
    }

    // Swap
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 14; c++) {
        this.currentGen[r][c] = this.nextGen[r][c];
        if (!this.nextGen[r][c]) {
          this.isAccent[r][c] = false;
        }
      }
    }
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.min(ctx.dt, 0.1);
    const stepInterval = Math.max(0.08, 0.25 / Math.max(0.1, this.params.speed));
    this.timeSinceStep += dt;

    if (this.timeSinceStep >= stepInterval) {
      this.step();
      this.timeSinceStep -= stepInterval;
    }

    // Lerp brightness toward target (1 for alive, 0 for dead)
    const lerpRate = Math.min(1.0, dt * (this.params.fadeSpeed || 8.0));
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 14; c++) {
        const target = this.currentGen[r][c] ? 1.0 : 0.0;
        this.brightnessBuf[r][c] += (target - this.brightnessBuf[r][c]) * lerpRate;
      }
    }

    const frame: KeyFrameColor = {};
    const keys = ctx.keys ?? K630_LAYOUT;
    const baseColor = this.params.aliveColor;
    const accentColor = this.params.accentColor;

    for (const key of keys) {
      const r = key.gridY;
      const c = key.gridX;

      let bVal = this.brightnessBuf[r][c];
      // For spacebar spanning cols 3..9, take max brightness of covered cells
      if (key.id === 'space') {
        let maxB = 0;
        for (let sc = 3; sc <= 9; sc++) {
          if (this.brightnessBuf[4][sc] > maxB) maxB = this.brightnessBuf[4][sc];
        }
        bVal = maxB;
      }

      const activeColor = this.isAccent[r][c] ? accentColor : baseColor;
      const keyColor = lerpColor({ r: 0, g: 0, b: 0 }, activeColor, bVal);
      frame[key.id] = applyBrightness(keyColor, this.params.brightness);
    }

    return frame;
  }
}

export const DEFAULT_GAME_OF_LIFE_PARAMS: GameOfLifeParams = {
  brightness: 1.0,
  speed: 1.0,
  aliveColor: { r: 0, g: 255, b: 120 },    // Cyber emerald
  accentColor: { r: 255, g: 0, b: 180 },   // Neon pink
  fadeSpeed: 9.0,
};
