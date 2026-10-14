import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT } from '../layout';
import { applyBrightness, hslToRgb } from '../color';

export interface SpectrumEQParams {
  brightness: number;
  sensitivity: number;      // Audio sensitivity multiplier (default 1.5)
  primaryColor: RGBColor;  // Bar color (or use rainbow if useRainbow)
  useRainbow: boolean;      // Rainbow column gradient
}

/**
 * Spectrum EQ effect.
 *
 * Uses the AudioAnalysis context (system audio loopback via existing MusicPulse
 * infrastructure) to display a 14-band frequency spectrum as vertical bars.
 *
 * Each column c (0..13) maps to a logarithmic frequency band from bass (left)
 * to treble (right). Band amplitude (0.0..1.0) is mapped to vertical height
 * h = round(amp * 5), lighting keys from bottom row (r=4) up to r = 5-h.
 *
 * When no audio data is available, shows a smoothly animated demo pattern.
 */
export class SpectrumEQEffect implements ILightingEffect {
  readonly type = 'spectrum_eq' as const;
  readonly name = 'Spectrum EQ';

  private smoothBands: number[] = new Array(14).fill(0);

  constructor(public params: SpectrumEQParams = { ...DEFAULT_SPECTRUM_EQ_PARAMS }) {}

  reset(): void {
    this.smoothBands = new Array(14).fill(0);
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const keys = ctx.keys ?? K630_LAYOUT;
    const dt = Math.max(0.001, Math.min(0.5, ctx.dt));
    const sensitivity = this.params.sensitivity ?? 1.5;

    // Get band data from audio context
    let rawBands: number[] | null = null;
    if (ctx.audio && ctx.audio.status === 'capturing' && ctx.audio.bands && ctx.audio.bands.length > 0) {
      rawBands = this.resampleBands(ctx.audio.bands, 14);
    }

    // If no audio, generate animated demo bars
    if (!rawBands) {
      rawBands = [];
      for (let i = 0; i < 14; i++) {
        const phase = ctx.totalTime * 2.0 + i * 0.4;
        rawBands.push(0.2 + 0.35 * Math.sin(phase) + 0.15 * Math.sin(phase * 2.3 + 1.0));
      }
    }

    // Smooth bands with attack/release
    for (let i = 0; i < 14; i++) {
      const target = Math.min(1.0, (rawBands[i] ?? 0) * sensitivity);
      if (target > this.smoothBands[i]) {
        // Fast attack
        this.smoothBands[i] += (target - this.smoothBands[i]) * Math.min(1, 12 * dt);
      } else {
        // Slower release
        this.smoothBands[i] += (target - this.smoothBands[i]) * Math.min(1, 4 * dt);
      }
      this.smoothBands[i] = Math.max(0, Math.min(1, this.smoothBands[i]));
    }

    const frame: KeyFrameColor = {};

    // Build a lookup: gridX -> bar height
    const barHeights: number[] = [];
    for (let c = 0; c < 14; c++) {
      barHeights[c] = Math.round(this.smoothBands[c] * 5);
    }

    for (const key of keys) {
      const c = key.gridX;
      const r = key.gridY;
      const h = barHeights[c] ?? 0;
      const topRow = 5 - h; // Keys from r=4 upwards to r=topRow are lit

      if (r >= topRow && h > 0) {
        // Lit: compute color
        let color: RGBColor;
        if (this.params.useRainbow) {
          const hue = (c / 14) * 300; // 0° red to 300° magenta
          color = hslToRgb(hue, 1.0, 0.5);
        } else {
          color = this.params.primaryColor;
        }

        // Vertical gradient: brighter at bottom
        const vertFade = 0.5 + 0.5 * ((r - topRow) / Math.max(1, 4 - topRow));
        frame[key.id] = applyBrightness(color, vertFade * this.params.brightness);
      } else {
        frame[key.id] = applyBrightness({ r: 5, g: 5, b: 8 }, this.params.brightness);
      }
    }

    return frame;
  }

  /**
   * Resample N audio bands into exactly 14 logarithmically-spaced bands.
   */
  private resampleBands(bands: number[], targetCount: number): number[] {
    const result: number[] = [];
    const srcLen = bands.length;
    for (let i = 0; i < targetCount; i++) {
      // Logarithmic mapping: bass bands get more resolution
      const logStart = Math.pow(i / targetCount, 1.5) * srcLen;
      const logEnd = Math.pow((i + 1) / targetCount, 1.5) * srcLen;
      const start = Math.floor(logStart);
      const end = Math.min(srcLen, Math.ceil(logEnd));

      let sum = 0;
      let count = 0;
      for (let j = start; j < end; j++) {
        sum += bands[j];
        count++;
      }
      result.push(count > 0 ? sum / count : 0);
    }
    return result;
  }
}

export const DEFAULT_SPECTRUM_EQ_PARAMS: SpectrumEQParams = {
  brightness: 1.0,
  sensitivity: 1.5,
  primaryColor: { r: 0, g: 200, b: 255 },
  useRainbow: true,
};
