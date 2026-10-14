import { AnimationContext, ILightingEffect, BinaryCounterParams } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE } from '../layout';
import { applyBrightness, lerpColor } from '../color';

export const DEFAULT_BINARY_COUNTER_PARAMS: BinaryCounterParams = {
  brightness: 1.0,
  speed: 1.0,
  primaryColor: { r: 0, g: 255, b: 102 },   // Phosphor terminal green '1'
  secondaryColor: { r: 0, g: 26, b: 8 },    // Dim background '0'
};

export class BinaryCounterEffect implements ILightingEffect {
  readonly type = 'binary_counter' as const;
  readonly name = 'Binary Counter';

  private counter: number = 0;
  private stepTimer: number = 0;
  // Smooth bit brightness buffer 5x14
  private bitBrightness: number[][] = [];

  constructor(public params: BinaryCounterParams = { ...DEFAULT_BINARY_COUNTER_PARAMS }) {
    this.reset();
  }

  reset(): void {
    this.counter = 0;
    this.stepTimer = 0;
    this.bitBrightness = Array.from({ length: 5 }, () => new Array(14).fill(0));
  }

  onKeyDown(code: string): void {
    const key = KEY_BY_CODE[code];
    if (key) {
      // Toggle or flip bits based on column
      const mask = 1 << (13 - key.gridX);
      this.counter ^= mask;
      this.bitBrightness[key.gridY][key.gridX] = 1.0;
    } else {
      this.counter += 64;
    }
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.min(ctx.dt, 0.1);
    const speed = Math.max(0.2, this.params.speed ?? 1.0);
    const stepInterval = 0.08 / speed;

    this.stepTimer += dt;
    while (this.stepTimer >= stepInterval) {
      this.stepTimer -= stepInterval;
      this.counter = (this.counter + 1) & 0x3fff; // 14-bit wrap (0 to 16383)
    }

    // Lerp bit brightness
    for (let r = 0; r < 5; r++) {
      const counter_r = (this.counter >> r) & 0x3fff;
      for (let c = 0; c < 14; c++) {
        const bit = (counter_r >> (13 - c)) & 1;
        const target = bit === 1 ? 1.0 : 0.0;
        this.bitBrightness[r][c] += (target - this.bitBrightness[r][c]) * Math.min(1.0, dt * 20.0);
      }
    }

    const frame: KeyFrameColor = {};
    const primary = this.params.primaryColor ?? DEFAULT_BINARY_COUNTER_PARAMS.primaryColor;
    const secondary = this.params.secondaryColor ?? DEFAULT_BINARY_COUNTER_PARAMS.secondaryColor;
    const brightness = Math.max(0, Math.min(1, this.params.brightness ?? 1.0));

    for (const key of K630_LAYOUT) {
      const r = key.gridY;
      const c = key.gridX;
      const t = this.bitBrightness[r][c];
      const col: RGBColor = lerpColor(secondary, primary, t);
      frame[key.id] = applyBrightness(col, brightness);
    }

    return frame;
  }
}
