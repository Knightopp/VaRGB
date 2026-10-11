import { SineWaveParams, SineWaveColorMode, AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT, getKeyCenter } from '../layout';
import { applyBrightness, interpolatePalette, lerpColor } from '../color';

/**
 * Continuous 360-degree rainbow spectrum ribbon for Sine Wave.
 */
export const SINE_WAVE_RAINBOW: RGBColor[] = [
  { r: 255, g: 0, b: 40 },    // Red
  { r: 255, g: 130, b: 0 },   // Orange
  { r: 240, g: 240, b: 0 },   // Yellow
  { r: 0, g: 255, b: 80 },    // Green
  { r: 0, g: 255, b: 240 },   // Cyan
  { r: 0, g: 110, b: 255 },   // Blue
  { r: 160, g: 0, b: 255 },   // Purple
  { r: 255, g: 0, b: 180 },   // Magenta
  { r: 255, g: 0, b: 40 },    // Wrap back to Red
];

export const SINE_WAVE_PALETTES = SINE_WAVE_RAINBOW;

export const DEFAULT_SINE_WAVE_PARAMS: SineWaveParams = {
  speed: 1.0,
  wavelength: 15.0, // Approximately 1 complete cycle across the 15.0U keyboard
  colorMode: 'rainbow',
  primaryColor: { r: 0, g: 255, b: 240 },   // Electric Cyan
  secondaryColor: { r: 255, g: 0, b: 160 }, // Hot Magenta
  customPalette: [
    { r: 255, g: 0, b: 40 },    // Red
    { r: 255, g: 180, b: 0 },   // Amber
    { r: 0, g: 255, b: 200 },   // Aqua
    { r: 160, g: 0, b: 255 },   // Violet
    { r: 255, g: 0, b: 40 },    // Loop
  ],
  amplitude: 1.5,
  waveThickness: 0.80, // Defined glowing ribbon, keeping unlit background completely off
  direction: 'left-to-right',
  centerY: 2.0,
  brightness: 1.0,
  baseColor: { r: 0, g: 0, b: 0 }, // Off background
};

/**
 * Backward compatibility alias for legacy imports.
 */
export const DEFAULT_FLOWING_CURVE_PARAMS = DEFAULT_SINE_WAVE_PARAMS;

/**
 * Sine Wave RGB Lighting Effect for Redragon K630.
 *
 * Implements a genuine traveling sinusoidal function:
 *   waveY(x, t) = centerY - amplitude * sin(2 * PI * x / wavelength - omega * t + phase)
 *
 * Along with an animated color ribbon that travels along the actual curved path,
 * seamlessly riding over peaks, dipping into troughs, and wrapping at boundaries.
 */
export class SineWaveEffect implements ILightingEffect {
  readonly type = 'flowing_curve';
  readonly name = 'Sine Wave';

  // Continuous normalized traveling phase [0.0 .. 1.0)
  private phase: number = 0;
  public params: SineWaveParams;

  constructor(params?: Partial<SineWaveParams>) {
    this.params = { ...DEFAULT_SINE_WAVE_PARAMS, ...(params || {}) };
    this.normalizeLegacyParams();
  }

  /**
   * Translates any legacy Flowing Curve parameter names to Sine Wave equivalents.
   */
  private normalizeLegacyParams(): void {
    if (!this.params.colorMode) {
      if (this.params.paletteType === 'custom' && !this.params.useMulticolor) {
        this.params.colorMode = 'dual';
      } else if (this.params.paletteType && this.params.paletteType !== 'rainbow') {
        this.params.colorMode = 'custom';
      } else {
        this.params.colorMode = 'rainbow';
      }
    }
    if (!this.params.customPalette || this.params.customPalette.length < 2) {
      this.params.customPalette = [...DEFAULT_SINE_WAVE_PARAMS.customPalette];
    }
    if (!this.params.primaryColor) {
      this.params.primaryColor = { r: 0, g: 255, b: 240 };
    }
    if (!this.params.secondaryColor) {
      this.params.secondaryColor = { r: 255, g: 0, b: 160 };
    }
    this.params.baseColor = { r: 0, g: 0, b: 0 };
    if (this.params.speed === undefined && this.params.travelSpeed !== undefined) {
      this.params.speed = this.params.travelSpeed;
    }
    if (this.params.waveThickness === undefined && this.params.glowWidth !== undefined) {
      this.params.waveThickness = this.params.glowWidth;
    }
    if (this.params.centerY === undefined && this.params.curveOffset !== undefined) {
      this.params.centerY = this.params.curveOffset;
    }
    if (this.params.amplitude === undefined) {
      this.params.amplitude = 1.5;
    }
    if (this.params.brightness === undefined) {
      this.params.brightness = 1.0;
    }
  }

  reset(): void {
    this.phase = 0;
  }

  /**
   * Diagnostic getter for tests and phase continuity verification.
   */
  public getPhase(): number {
    return this.phase;
  }

  update(ctx: AnimationContext): KeyFrameColor {
    this.normalizeLegacyParams();

    const dt = Math.max(0.0005, Math.min(0.5, ctx.dt));
    const speed = Math.max(0.05, Math.min(5.0, this.params.speed ?? 1.0));
    const isL2R = this.params.direction !== 'right-to-left';

    // Advance traveling phase continuously:
    // Left-to-right travels in positive x direction (dirSign = 1)
    const dirSign = isL2R ? 1 : -1;
    this.phase = (this.phase + dirSign * speed * dt) % 1.0;
    if (this.phase < 0) {
      this.phase += 1.0;
    }

    const wavelength = Math.max(2.0, Math.min(30.0, this.params.wavelength ?? 15.0));
    const amplitude = Math.max(0.2, Math.min(2.5, this.params.amplitude ?? 1.5));
    const centerY = Math.max(0.5, Math.min(4.5, this.params.centerY ?? 2.0));
    const waveThickness = Math.max(0.3, Math.min(3.0, this.params.waveThickness ?? 0.80));
    const brightness = Math.max(0.0, Math.min(1.0, this.params.brightness ?? 1.0));

    const keys = ctx.keys ?? K630_LAYOUT;
    const frame: KeyFrameColor = {};

    // Spatial frequency k = 2 * PI / wavelength
    const k = (2 * Math.PI) / wavelength;
    // Traveling phase angle in radians: omega * t
    const omegaT = this.phase * 2 * Math.PI;

    // Standard deviation for Gaussian falloff:
    const sigma = waveThickness / 1.55;
    const twoSigmaSq = 2 * sigma * sigma;

    const mode: SineWaveColorMode = this.params.colorMode || 'rainbow';

    for (const key of keys) {
      const center = getKeyCenter(key);
      const x = center.x; // Physical horizontal key coordinate [0 .. 15.0]
      const y = center.y; // Physical vertical row coordinate [0 .. 5.0]

      // Phase argument for traveling wave:
      // theta = k * x - omega * t
      const theta = k * x - omegaT;

      // Vertical position of the wave centerline at this key's horizontal coordinate:
      // In physical layout, Row 0 is at the top. Subtracting A * sin(theta)
      // maps positive sine peaks upward towards Row 0.
      const waveY = centerY - amplitude * Math.sin(theta);

      // Derivative / slope of the sine wave: dy/dx = -A * k * cos(theta)
      const slope = -amplitude * k * Math.cos(theta);

      // Perpendicular distance to the curved sine wave centerline:
      // d_perp = |y - waveY| / sqrt(1 + slope^2)
      // Normalizing by the tangent vector maintains uniform perceived thickness
      // across peaks, steep slopes, and troughs alike.
      const normalizer = Math.sqrt(1 + slope * slope);
      const dPerp = Math.abs(y - waveY) / normalizer;

      // Gaussian falloff for the illuminated band:
      const rawIntensity = Math.exp(-(dPerp * dPerp) / twoSigmaSq);

      // Strictly extinguish background keys so ONLY keys on the wave are lit:
      // Keys outside the glowing wave band are completely OFF (0, 0, 0)
      const CUTOFF = 0.05;
      if (rawIntensity <= CUTOFF) {
        frame[key.id] = { r: 0, g: 0, b: 0 };
        continue;
      }

      // Smooth normalized falloff reaching 0 at the cutoff threshold:
      const intensity = (rawIntensity - CUTOFF) / (1.0 - CUTOFF);

      // Color mapping along the curved sine path:
      // u represents position along the periodic wave cycle [0.0 .. 1.0)
      // As the wave travels, color stops ride the actual curved path,
      // moving up peaks, down troughs, and wrapping seamlessly.
      let u = (theta / (2 * Math.PI)) % 1.0;
      if (u < 0) {
        u += 1.0;
      }

      let waveColor: RGBColor;
      if (mode === 'single') {
        // Single color following the wave
        waveColor = this.params.primaryColor || { r: 0, g: 255, b: 240 };
      } else if (mode === 'dual') {
        // Dual color: crest shines with primaryColor, trough shines with secondaryColor
        const crestFactor = (Math.sin(theta) + 1.0) * 0.5; // 0 at trough, 1 at crest
        waveColor = lerpColor(
          this.params.secondaryColor || { r: 255, g: 0, b: 160 },
          this.params.primaryColor || { r: 0, g: 255, b: 240 },
          crestFactor
        );
      } else if (mode === 'custom') {
        // Custom gradient palette flowing along the curved path
        const pal = this.params.customPalette && this.params.customPalette.length >= 2
          ? this.params.customPalette
          : DEFAULT_SINE_WAVE_PARAMS.customPalette;
        waveColor = interpolatePalette(pal, u);
      } else {
        // Default Rainbow mode: full spectrum flowing along the wave path
        waveColor = interpolatePalette(SINE_WAVE_RAINBOW, u);
      }

      // Render glowing key color; smoothly fades to pure black at the wave boundary
      frame[key.id] = applyBrightness(waveColor, intensity * brightness);
    }

    return frame;
  }
}

/**
 * Backward compatibility alias for legacy tests and imports.
 */
export const FlowingCurveEffect = SineWaveEffect;
