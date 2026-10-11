import { PixelArtParams, PixelArtFrame, AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { applyBrightness } from '../color';

export class PixelArtEffect implements ILightingEffect {
  readonly type = 'pixel_art';
  readonly name = 'Pixel Art';

  private frameIndex: number = 0;
  private lastFrameTime: number = 0;

  constructor(public params: PixelArtParams, public brightness: number = 1.0) {}

  getCurrentFrame(): PixelArtFrame | null {
    if (!this.params.frames || this.params.frames.length === 0) return null;
    return this.params.frames[this.frameIndex % this.params.frames.length];
  }

  setFrameIndex(index: number): void {
    if (this.params.frames.length > 0) {
      this.frameIndex = index % this.params.frames.length;
    }
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const frameCount = this.params.frames.length;
    if (frameCount === 0) return {};

    const frameDuration = 1.0 / Math.max(1, this.params.fps);
    const now = ctx.totalTime;

    if (now - this.lastFrameTime >= frameDuration) {
      this.lastFrameTime = now;
      this.frameIndex = (this.frameIndex + 1) % frameCount;
    }

    const current = this.params.frames[this.frameIndex % frameCount];
    const frame: KeyFrameColor = {};
    const defaultOff: RGBColor = { r: 0, g: 0, b: 0 };

    for (const key of ctx.keys) {
      const color = current.pixels[key.id] || defaultOff;
      frame[key.id] = applyBrightness(color, this.brightness);
    }

    return frame;
  }

  reset(): void {
    this.frameIndex = 0;
    this.lastFrameTime = 0;
  }
}

// Starter Designs - Calibrated pure RGB primaries
const RED: RGBColor = { r: 255, g: 0, b: 0 };
const PINK: RGBColor = { r: 255, g: 20, b: 150 };
const WHITE: RGBColor = { r: 255, g: 255, b: 255 };
const CYAN: RGBColor = { r: 0, g: 255, b: 255 };
const GREEN: RGBColor = { r: 0, g: 255, b: 0 };
const YELLOW: RGBColor = { r: 255, g: 220, b: 0 };

export const STARTER_BLANK: PixelArtFrame = {
  id: 'blank-canvas',
  pixels: {},
};

export const STARTER_HEART: PixelArtFrame = {
  id: 'heart-f1',
  pixels: {
    num_3: RED, num_4: RED, num_8: RED, num_9: RED,
    w: RED, e: PINK, r: RED, t: RED, y: RED, u: RED, i: PINK, o: RED,
    s: RED, d: RED, f: RED, g: RED, h: RED, j: RED, k: RED, l: RED,
    x: RED, c: RED, v: RED, b: RED, n: RED, m: RED, comma: RED,
    space: RED,
  },
};

export const STARTER_SKULL: PixelArtFrame = {
  id: 'skull-f1',
  pixels: {
    num_4: WHITE, num_5: WHITE, num_6: WHITE, num_7: WHITE, num_8: WHITE, num_9: WHITE,
    w: WHITE, e: CYAN, r: WHITE, t: WHITE, y: WHITE, u: WHITE, i: CYAN, o: WHITE,
    s: WHITE, d: WHITE, g: WHITE, h: WHITE, k: WHITE, l: WHITE,
    x: WHITE, c: WHITE, v: WHITE, b: WHITE, n: WHITE, m: WHITE, comma: WHITE,
    space: WHITE,
  },
};

export const STARTER_SMILEY: PixelArtFrame = {
  id: 'smiley-f1',
  pixels: {
    num_4: YELLOW, num_5: YELLOW, num_6: YELLOW, num_7: YELLOW, num_8: YELLOW, num_9: YELLOW,
    w: YELLOW, e: CYAN, r: YELLOW, t: YELLOW, y: YELLOW, u: YELLOW, i: CYAN, o: YELLOW,
    caps: YELLOW, a: YELLOW, s: YELLOW, d: YELLOW, g: YELLOW, h: YELLOW, k: YELLOW, l: YELLOW, quote: YELLOW,
    shift_l: YELLOW, z: YELLOW, c: RED, v: RED, b: RED, n: RED, m: RED, slash: YELLOW, shift_r: YELLOW,
    ctrl_l: YELLOW, win: YELLOW, alt_l: YELLOW, space: RED, alt_r: YELLOW, fn: YELLOW, ctrl_r: YELLOW,
  },
};

export const STARTER_INVADER_F1: PixelArtFrame = {
  id: 'invader-f1',
  pixels: {
    num_4: GREEN, num_9: GREEN,
    e: GREEN, r: GREEN, t: GREEN, y: GREEN, u: GREEN, i: GREEN,
    s: GREEN, d: GREEN, g: GREEN, h: GREEN, k: GREEN, l: GREEN,
    x: GREEN, c: GREEN, v: GREEN, b: GREEN, n: GREEN, m: GREEN, comma: GREEN,
    alt_l: GREEN, space: GREEN, alt_r: GREEN,
  },
};

export const STARTER_INVADER_F2: PixelArtFrame = {
  id: 'invader-f2',
  pixels: {
    num_3: GREEN, num_10: GREEN,
    w: GREEN, e: GREEN, r: GREEN, t: GREEN, y: GREEN, u: GREEN, i: GREEN, o: GREEN,
    a: GREEN, d: GREEN, f: GREEN, g: GREEN, h: GREEN, j: GREEN, k: GREEN, semicolon: GREEN,
    z: GREEN, v: GREEN, b: GREEN, slash: GREEN,
    win: GREEN, space: GREEN, menu: GREEN,
  },
};

export const DEFAULT_PIXEL_ART_PARAMS: PixelArtParams = {
  fps: 1,
  frames: [STARTER_BLANK],
};
