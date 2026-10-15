import { AnimationContext, ILightingEffect, SortVisualizerParams } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT } from '../layout';
import { applyBrightness, hslToRgb, lerpColor } from '../color';

export const DEFAULT_SORT_VISUALIZER_PARAMS: SortVisualizerParams = {
  brightness: 1.0,
  speed: 1.0,
  primaryColor: { r: 0, g: 255, b: 102 },   // Verification green / sorted
  secondaryColor: { r: 255, g: 255, b: 255 }, // Active compare/swap pointers
  backgroundColor: { r: 0, g: 0, b: 0 }, // Black Background
};

export class SortVisualizerEffect implements ILightingEffect {
  readonly type = 'sort_visualizer' as const;
  readonly name = 'Sort Visualizer';

  private values: number[] = [];
  private i: number = 0;
  private j: number = 0;
  private swappedInPass: boolean = false;
  private isSorted: boolean = false;
  private verifyCol: number = -1;
  private verifyTimer: number = 0;
  private stepTimer: number = 0;

  constructor(public params: SortVisualizerParams = { ...DEFAULT_SORT_VISUALIZER_PARAMS }) {
    this.reset();
  }

  reset(): void {
    this.values = Array.from({ length: 14 }, (_, idx) => (idx + 1) / 14);
    this.shuffle();
    this.i = 0;
    this.j = 0;
    this.swappedInPass = false;
    this.isSorted = false;
    this.verifyCol = -1;
    this.verifyTimer = 0;
    this.stepTimer = 0;
  }

  private shuffle(): void {
    for (let k = this.values.length - 1; k > 0; k--) {
      const r = Math.floor(Math.random() * (k + 1));
      [this.values[k], this.values[r]] = [this.values[r], this.values[k]];
    }
  }

  onKeyDown(_code: string): void {
    this.reset();
  }

  private stepSort(): void {
    if (this.isSorted) return;

    const n = this.values.length;
    if (this.j < n - this.i - 1) {
      if (this.values[this.j] > this.values[this.j + 1]) {
        [this.values[this.j], this.values[this.j + 1]] = [this.values[this.j + 1], this.values[this.j]];
        this.swappedInPass = true;
      }
      this.j++;
    } else {
      if (!this.swappedInPass) {
        // Fully sorted!
        this.isSorted = true;
        this.verifyCol = 0;
        this.verifyTimer = 0;
        return;
      }
      this.i++;
      this.j = 0;
      this.swappedInPass = false;
      if (this.i >= n - 1) {
        this.isSorted = true;
        this.verifyCol = 0;
        this.verifyTimer = 0;
      }
    }
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.min(ctx.dt, 0.1);
    const speed = Math.max(0.2, this.params.speed ?? 1.0);
    const stepInterval = 0.12 / speed;

    if (this.isSorted) {
      this.verifyTimer += dt;
      if (this.verifyTimer >= 0.05 / speed) {
        this.verifyTimer = 0;
        this.verifyCol++;
        if (this.verifyCol >= 14 + 5) {
          this.reset();
        }
      }
    } else {
      this.stepTimer += dt;
      while (this.stepTimer >= stepInterval && !this.isSorted) {
        this.stepTimer -= stepInterval;
        this.stepSort();
      }
    }

    const frame: KeyFrameColor = {};
    const primary = this.params.primaryColor ?? DEFAULT_SORT_VISUALIZER_PARAMS.primaryColor;
    const secondary = this.params.secondaryColor ?? DEFAULT_SORT_VISUALIZER_PARAMS.secondaryColor;
    const bgCol = this.params.backgroundColor ?? DEFAULT_SORT_VISUALIZER_PARAMS.backgroundColor;
    const brightness = Math.max(0, Math.min(1, this.params.brightness ?? 1.0));

    for (const key of K630_LAYOUT) {
      const c = key.gridX;
      const r = key.gridY;
      const val = this.values[c] ?? 0.5;
      const height = Math.ceil(val * 5); // 1 to 5 bars from bottom up
      const isLitInBar = r >= (5 - height);

      let col: RGBColor = bgCol;

      if (this.isSorted) {
        if (c <= this.verifyCol) {
          col = isLitInBar ? primary : lerpColor(primary, bgCol, 0.7);
        } else {
          col = isLitInBar ? hslToRgb(val * 240, 0.9, 0.5) : bgCol;
        }
      } else {
        if (c === this.j || c === this.j + 1) {
          col = isLitInBar ? secondary : lerpColor(secondary, bgCol, 0.6);
        } else if (isLitInBar) {
          col = lerpColor(primary, hslToRgb(val * 240, 0.9, 0.5), 0.7);
        }
      }

      frame[key.id] = applyBrightness(col, brightness);
    }

    return frame;
  }
}
