import { ContinuousWaveParams, AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor } from '../../types/keyboard';
import { K630_LAYOUT } from '../layout';
import { applyBrightness, interpolatePalette, lerpColor } from '../color';

/**
 * Continuous Wave Effect for Redragon K630 RGB Keyboard.
 *
 * Implements a silky smooth, continuous periodic wave traveling horizontally
 * from left to right across physical key layout coordinates.
 *
 * Key Design Guarantees:
 * 1. Accumulative time-delta phase: Speed adjustments never cause a sudden phase reset, jump, or discontinuity.
 * 2. Unbroken periodicity: New waves seamlessly enter on the left while old waves exit on the right.
 * 3. Consistent wavelength & amplitude throughout playback across arbitrary frame rates.
 * 4. Distinct peaks and troughs with smooth sinusoidal gradients.
 * 5. Full support for two-tone gradient blending and multicolor rainbow spectrums.
 */
export class ContinuousWaveEffect implements ILightingEffect {
  readonly type = 'continuous_wave';
  readonly name = 'Continuous Wave';

  // Accumulated phase angle in radians [0 .. 2*PI)
  private phase: number = 0;

  constructor(public params: ContinuousWaveParams = { ...DEFAULT_CONTINUOUS_WAVE_PARAMS }) {}

  reset(): void {
    this.phase = 0;
  }

  /**
   * Returns current phase angle in radians (used for diagnostics & deterministic testing).
   */
  public getPhase(): number {
    return this.phase;
  }

  update(ctx: AnimationContext): KeyFrameColor {
    // Bound dt to prevent huge leaps during tab switches or window suspends
    const dt = Math.max(0.0005, Math.min(0.2, ctx.dt));
    const speed = Math.max(0.05, this.params.speed);

    // Advance phase smoothly in radians: phase += 2*PI * speed * dt
    // Left-to-right propagation: spatial term is k*x, time term is -omega*t
    const TWO_PI = 2 * Math.PI;
    this.phase = (this.phase + TWO_PI * speed * dt) % TWO_PI;

    const keys = ctx.keys ?? K630_LAYOUT;
    const wavelength = Math.max(0.05, this.params.wavelength);
    const amplitude = Math.max(0.0, Math.min(1.0, this.params.amplitude));
    const brightness = Math.max(0.0, Math.min(1.0, this.params.brightness));

    // Spatial frequency: k = 2*PI / wavelength
    const k = TWO_PI / wavelength;

    const frame: KeyFrameColor = {};
    const baseColor = applyBrightness(this.params.baseColor, brightness);

    for (const key of keys) {
      // Use physical normalized horizontal position (left = 0.0, right = 1.0)
      const normX = key.normX;

      // Travelling wave equation: theta = k*x - phase
      // As phase advances (+), the crest moves towards higher x (left-to-right)
      const theta = k * normX - this.phase;
      const sineVal = Math.sin(theta); // [-1.0 .. +1.0]

      // Normalised peak/trough height [0.0 .. 1.0]
      const rawHeight = 0.5 + 0.5 * sineVal;

      // Apply amplitude to modulate contrast between peaks and troughs
      const contrastHeight = Math.max(0.0, Math.min(1.0, 0.5 + (rawHeight - 0.5) * amplitude));

      if (this.params.useMulticolor && this.params.palette && this.params.palette.length > 0) {
        // Continuous smooth cycle across physical keyboard with rolling crests
        const cycleProgress = (((normX - this.phase / TWO_PI) % 1.0) + 1.0) % 1.0;
        const sampledColor = interpolatePalette(this.params.palette, cycleProgress);
        const waveIntensity = 0.25 + 0.75 * contrastHeight;
        const waveColor = lerpColor(baseColor, applyBrightness(sampledColor, brightness), waveIntensity);
        frame[key.id] = waveColor;
      } else {
        // Smooth transition between valley (secondaryColor) and crest (primaryColor)
        const crestColor = applyBrightness(this.params.primaryColor, brightness);
        const troughColor = applyBrightness(this.params.secondaryColor, brightness);
        const interpolatedWave = lerpColor(troughColor, crestColor, rawHeight);
        const finalColor = lerpColor(baseColor, interpolatedWave, contrastHeight);
        frame[key.id] = finalColor;
      }
    }

    return frame;
  }
}

export const DEFAULT_CONTINUOUS_WAVE_PARAMS: ContinuousWaveParams = {
  wavelength: 0.40, // ~2.5 full wave cycles across keyboard width (multiple visible peaks & troughs)
  speed: 1.2,       // 1.2 wave cycles per second left-to-right propagation
  amplitude: 1.0,   // High-contrast, vivid crests and valleys
  brightness: 1.0,  // Full 100% LED output
  primaryColor: { r: 0, g: 235, b: 255 },    // Vivid Cyan crest
  secondaryColor: { r: 140, g: 0, b: 255 },  // Deep Electric Violet trough
  baseColor: { r: 0, g: 0, b: 0 },          // Black floor
  useMulticolor: false,
  palette: [
    { r: 255, g: 0, b: 90 },   // Neon Magenta
    { r: 255, g: 150, b: 0 },  // Amber Orange
    { r: 0, g: 255, b: 180 },  // Mint Green
    { r: 0, g: 160, b: 255 },  // Deep Cyan
    { r: 170, g: 0, b: 255 },  // Electric Purple
  ],
};
