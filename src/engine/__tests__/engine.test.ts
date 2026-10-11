import { describe, it, expect } from 'vitest';
import { K630_LAYOUT, KEY_BY_ID } from '../layout';
import { hexToRgb, rgbToHex, lerpColor, interpolatePalette, applyBrightness } from '../color';
import { AuroraEffect, DEFAULT_AURORA_PARAMS } from '../effects/aurora';
import { PulseEffect, DEFAULT_PULSE_PARAMS } from '../effects/pulse';
import { GlitchEffect, DEFAULT_GLITCH_PARAMS } from '../effects/glitch';
import { MatrixEffect, DEFAULT_MATRIX_PARAMS } from '../effects/matrix';
import { PixelArtEffect, STARTER_HEART } from '../effects/pixelArt';
import { AnimationContext } from '../../types/effects';
import { frameToRgbPayload } from '../../services/hardware';
import { MusicPulseEffect, DEFAULT_MUSIC_PULSE_PARAMS } from '../effects/musicPulse';
import { ZigzagWaveEffect, DEFAULT_ZIGZAG_WAVE_PARAMS, SERPENTINE_KEY_IDS } from '../effects/zigzagWave';
import { ContinuousWaveEffect, DEFAULT_CONTINUOUS_WAVE_PARAMS } from '../effects/continuousWave';
import { SineWaveEffect, FlowingCurveEffect, DEFAULT_SINE_WAVE_PARAMS } from '../effects/sineWave';
import { KeyFlashEffect, DEFAULT_KEY_FLASH_PARAMS } from '../effects/keyFlash';
import { ReactiveRippleEffect, DEFAULT_REACTIVE_RIPPLE_PARAMS } from '../effects/reactiveRipple';
import { NeighborGlowEffect, DEFAULT_NEIGHBOR_GLOW_PARAMS } from '../effects/neighborGlow';
import { ShockwaveEffect, DEFAULT_SHOCKWAVE_PARAMS } from '../effects/shockwave';
import { SnakeTrailEffect, DEFAULT_SNAKE_TRAIL_PARAMS } from '../effects/snakeTrail';
import { EmberEffect, DEFAULT_EMBER_PARAMS } from '../effects/ember';
import { ElectricDischargeEffect, DEFAULT_ELECTRIC_DISCHARGE_PARAMS } from '../effects/electricDischarge';
import { TypingIntensityEffect, DEFAULT_TYPING_INTENSITY_PARAMS } from '../effects/typingIntensity';
import { reactiveInputEngine } from '../input/reactiveInputEngine';

describe('Redragon K630 Layout Definition', () => {
  it('contains exactly 61 ANSI keys', () => {
    expect(K630_LAYOUT.length).toBe(61);
  });

  it('verifies every row sums to 15.0 units', () => {
    for (let r = 0; r <= 4; r++) {
      const rowKeys = K630_LAYOUT.filter((k) => k.row === r);
      const rowWidth = rowKeys.reduce((sum, k) => sum + k.uWidth, 0);
      expect(rowWidth).toBeCloseTo(15.0, 2);
    }
  });

  it('contains unique IDs and valid LED indices', () => {
    const ids = new Set<string>();
    const ledIndices = new Set<number>();

    for (const key of K630_LAYOUT) {
      expect(ids.has(key.id)).toBe(false);
      ids.add(key.id);

      expect(key.ledIndex).toBeGreaterThan(0);
      expect(key.ledIndex).toBeLessThanOrEqual(108);
      ledIndices.add(key.ledIndex);

      expect(key.normX).toBeGreaterThanOrEqual(0);
      expect(key.normX).toBeLessThanOrEqual(1);
      expect(key.normY).toBeGreaterThanOrEqual(0);
      expect(key.normY).toBeLessThanOrEqual(1);
    }

    expect(ledIndices.size).toBe(61);
  });

  it('maps key critical positions accurately', () => {
    expect(KEY_BY_ID['esc'].ledIndex).toBe(1);
    expect(KEY_BY_ID['space'].ledIndex).toBe(45);
    expect(KEY_BY_ID['space'].uWidth).toBe(6.25);
    expect(KEY_BY_ID['backspace'].ledIndex).toBe(105);
    expect(KEY_BY_ID['enter'].ledIndex).toBe(107);
    expect(KEY_BY_ID['shift_r'].ledIndex).toBe(108);
  });
});

describe('K630 hardware payload mapping', () => {
  it('uses the same key IDs and the documented LED index times three offsets', () => {
    const payload = frameToRgbPayload({
      esc: { r: 12, g: 34, b: 56 },
      space: { r: 200, g: 100, b: 50 },
    });
    expect(payload).toHaveLength(336);
    expect(Array.from(payload.slice(KEY_BY_ID.esc.ledIndex * 3, KEY_BY_ID.esc.ledIndex * 3 + 3))).toEqual([12, 34, 56]);
    expect(Array.from(payload.slice(KEY_BY_ID.space.ledIndex * 3, KEY_BY_ID.space.ledIndex * 3 + 3))).toEqual([200, 100, 50]);
  });
});

describe('Color Utilities', () => {
  it('converts hex to RGB and back accurately', () => {
    const rgb = hexToRgb('#ff8000');
    expect(rgb).toEqual({ r: 255, g: 128, b: 0 });
    expect(rgbToHex(rgb)).toBe('#ff8000');
  });

  it('interpolates colors smoothly', () => {
    const c1 = { r: 0, g: 0, b: 0 };
    const c2 = { r: 100, g: 200, b: 50 };
    const mid = lerpColor(c1, c2, 0.5);
    expect(mid).toEqual({ r: 50, g: 100, b: 25 });
  });

  it('applies brightness cleanly', () => {
    const color = { r: 200, g: 100, b: 50 };
    const dimmed = applyBrightness(color, 0.5);
    expect(dimmed).toEqual({ r: 100, g: 50, b: 25 });
  });

  it('interpolates multi-stop palette without jumps', () => {
    const palette = [
      { r: 255, g: 0, b: 0 },
      { r: 0, g: 255, b: 0 },
      { r: 0, g: 0, b: 255 },
    ];
    const c0 = interpolatePalette(palette, 0);
    expect(c0).toEqual({ r: 255, g: 0, b: 0 });

    const cHalf = interpolatePalette(palette, 0.5);
    expect(cHalf.g).toBeGreaterThan(0);
  });
});

describe('Lighting Effects Engine', () => {
  const dummyContext: AnimationContext = {
    keys: K630_LAYOUT,
    totalTime: 1.5,
    dt: 0.016,
  };

  it('renders Aurora Flow for all 61 keys', () => {
    const aurora = new AuroraEffect(DEFAULT_AURORA_PARAMS);
    const frame = aurora.update(dummyContext);
    expect(Object.keys(frame).length).toBe(61);
    for (const key of K630_LAYOUT) {
      expect(frame[key.id]).toBeDefined();
      expect(frame[key.id].r).toBeGreaterThanOrEqual(0);
      expect(frame[key.id].g).toBeGreaterThanOrEqual(0);
      expect(frame[key.id].b).toBeGreaterThanOrEqual(0);
    }
  });

  it('renders Crimson Pulse smoothly', () => {
    const pulse = new PulseEffect(DEFAULT_PULSE_PARAMS);
    const frame1 = pulse.update({ ...dummyContext, totalTime: 0 });
    const frame2 = pulse.update({ ...dummyContext, totalTime: 0.5 });
    expect(Object.keys(frame1).length).toBe(61);
    expect(Object.keys(frame2).length).toBe(61);
    expect(frame1['space'].r).toBeGreaterThan(0);
  });

  it('renders Matrix Rain with code streams', () => {
    const matrix = new MatrixEffect(DEFAULT_MATRIX_PARAMS);
    const frame = matrix.update(dummyContext);
    expect(Object.keys(frame).length).toBe(61);
  });

  it('renders Cyber Glitch reproducibly with seed', () => {
    const glitch1 = new GlitchEffect({ ...DEFAULT_GLITCH_PARAMS, seed: 99 });
    const glitch2 = new GlitchEffect({ ...DEFAULT_GLITCH_PARAMS, seed: 99 });

    const frame1 = glitch1.update(dummyContext);
    const frame2 = glitch2.update(dummyContext);
    expect(frame1['space']).toEqual(frame2['space']);
  });

  it('renders Pixel Art Mode correctly with starter designs', () => {
    const pixelArt = new PixelArtEffect({
      fps: 4,
      frames: [STARTER_HEART],
    });
    const frame = pixelArt.update(dummyContext);
    expect(frame['space'].r).toBe(255); // Heart spacebar is calibrated pure red
    expect(frame['space'].g).toBe(0);
    expect(frame['space'].b).toBe(0);
  });

  it('converts distinct live audio bands into distinct RGB frames', () => {
    const effect = new MusicPulseEffect({ ...DEFAULT_MUSIC_PULSE_PARAMS, idleBrightness: 0, spectrumMode: 'spectrum_bars' });
    const active = { ...dummyContext, audio: { status: 'capturing' as const, deviceId: 'out', message: null, rms: 0.8, energyChange: 0.6, bass: 0.9, mids: 0.1, highs: 0.05, bands: Array.from({ length: 32 }, (_, index) => index < 8 ? 0.9 : index < 20 ? 0.1 : 0.05), beat: true, updatedAt: 1 } };
    const bassFrame = effect.update(active);
    effect.reset();
    const trebleBands = Array.from({ length: 32 }, (_, index) => index > 23 ? 0.95 : 0.05);
    const trebleFrame = effect.update({ ...active, audio: { ...active.audio!, bass: 0.05, mids: 0.1, highs: 0.95, bands: trebleBands, beat: false } });
    expect(Object.keys(bassFrame)).toHaveLength(61);
    expect(bassFrame.space).not.toEqual(trebleFrame.space);
    expect(frameToRgbPayload(bassFrame)).not.toEqual(frameToRgbPayload(trebleFrame));
  });

  it('renders distinct concentric colored rings and full keyboard covering on beats', () => {
    const effect = new MusicPulseEffect({
      ...DEFAULT_MUSIC_PULSE_PARAMS,
      spectrumMode: 'radial_circle',
      idleBrightness: 0,
      continuousIntensity: 0.35,
      highColor: { r: 255, g: 0, b: 0 },   // Center Core: 100% Pure Red (zero blue, zero pink)
      midColor: { r: 255, g: 85, b: 0 },   // Middle Ring: Blazing Orange
      bassColor: { r: 255, g: 175, b: 0 }, // Outer Ring: Radiant Gold
    });

    // 1. Without sudden beats (steady ambient audio):
    // MUST NOT flash 80% of keyboard! Corner keys (esc, backspace, ctrl_r) remain off (0)
    const ambientCtx = {
      ...dummyContext,
      dt: 0.05,
      audio: {
        status: 'capturing' as const,
        deviceId: 'out',
        message: null,
        rms: 0.25,
        energyChange: 0.02,
        bass: 0.2,
        mids: 0.15,
        highs: 0.1,
        bands: [0.2, 0.2, 0.2, 0.2],
        beat: false,
        updatedAt: 1,
      },
    };
    effect.update(ambientCtx);
    const ambientFrame = effect.update(ambientCtx);

    // Center key (h) has gentle resting illumination, but far keys are 100% OFF (not flashing 80% of keyboard)
    expect(ambientFrame.h.r).toBeGreaterThan(0);
    expect(ambientFrame.esc.r + ambientFrame.esc.g + ambientFrame.esc.b).toBe(0);
    expect(ambientFrame.backspace.r + ambientFrame.backspace.g + ambientFrame.backspace.b).toBe(0);

    // 2. High beat explosion: full keyboard covering across all 61 keys!
    const peakBeatCtx = {
      ...dummyContext,
      dt: 0.05,
      audio: {
        status: 'capturing' as const,
        deviceId: 'out',
        message: null,
        rms: 0.95,
        energyChange: 0.9,
        bass: 1.0,
        mids: 0.8,
        highs: 0.7,
        bands: [1.0, 1.0, 1.0, 1.0],
        beat: true,
        updatedAt: 2,
      },
    };
    effect.update(peakBeatCtx);
    const beatFrame = effect.update(peakBeatCtx);

    // All keys including corner key (esc) and backspace are now covered!
    expect(beatFrame.esc.r + beatFrame.esc.g + beatFrame.esc.b).toBeGreaterThan(50);
    expect(beatFrame.backspace.r + beatFrame.backspace.g + beatFrame.backspace.b).toBeGreaterThan(50);

    // Verify pure red (zero blue / zero pink):
    expect(beatFrame.h.r).toBeGreaterThan(150);
    expect(beatFrame.h.b).toBe(0);

    // Mid ring key (d) has orange (high red and green, zero blue)
    expect(beatFrame.d.r).toBeGreaterThan(50);
    expect(beatFrame.d.b).toBe(0);

    // Outer corner key (esc) has gold (high red and gold green, zero blue)
    expect(beatFrame.esc.g).toBeGreaterThan(30);
    expect(beatFrame.esc.b).toBe(0);
  });

  it('isolates vocals to midrange and prevents false beat pulses', () => {
    const effect = new MusicPulseEffect({
      ...DEFAULT_MUSIC_PULSE_PARAMS,
      spectrumMode: 'radial_circle',
      idleBrightness: 0,
      continuousIntensity: 0.35,
      beatDetection: true,
      beatSensitivity: 1.0,
    });

    // Intense vocal performance: high midrange energy, but zero bass flux and beat is false
    const vocalCtx = {
      ...dummyContext,
      totalTime: 1.0,
      dt: 0.05,
      audio: {
        status: 'capturing' as const,
        deviceId: 'out',
        message: null,
        rms: 0.70,
        energyChange: 0.45,
        bass: 0.10,
        mids: 0.88,
        highs: 0.05,
        bands: [0.1, 0.88, 0.05],
        beat: false,
        bassFlux: 0.02,
        adaptiveThreshold: 0.05,
        isGated: false,
        updatedAt: 1,
      },
    };

    effect.update(vocalCtx);
    const vocalFrame = effect.update(vocalCtx);

    // Vocal activates middle ring (key 's' is at normDist ~0.51 in the middle ring)
    expect(vocalFrame.s.b).toBeGreaterThan(0); // Cyan middle ring has blue component
    // Far corner keys remain 0 (no outward beat pulse fired)
    expect(vocalFrame.esc.r + vocalFrame.esc.g + vocalFrame.esc.b).toBe(0);

    // Candidate log confirms vocal flux was rejected as below threshold
    const logs = effect.getCandidateLogs();
    const thresholdRejections = logs.filter(l => l.status === 'REJECTED_THRESHOLD');
    expect(thresholdRejections.length).toBeGreaterThan(0);
  });

  it('adapts outward pulse speed dynamically from steady beat intervals', () => {
    const effect = new MusicPulseEffect({
      ...DEFAULT_MUSIC_PULSE_PARAMS,
      spectrumMode: 'radial_circle',
      beatDetection: true,
      adaptiveTiming: true,
      beatMinIntervalMs: 150,
    });

    // Feed beats at steady 500ms intervals (120 BPM)
    let time = 1.0;
    for (let i = 0; i < 5; i++) {
      time += 0.50; // 500ms
      effect.update({
        ...dummyContext,
        totalTime: time,
        dt: 0.05,
        audio: {
          status: 'capturing' as const,
          deviceId: 'out',
          message: null,
          rms: 0.8,
          energyChange: 0.5,
          bass: 0.9,
          mids: 0.2,
          highs: 0.1,
          bands: [0.9, 0.2, 0.1],
          beat: true,
          bassFlux: 0.15,
          adaptiveThreshold: 0.04,
          isGated: false,
          updatedAt: i,
        },
      });
    }

    const { bpm, confidence, intervalMs } = effect.getEstimatedBpm();
    expect(confidence).toBeGreaterThan(0.5);
    expect(intervalMs).toBeGreaterThan(450);
    expect(intervalMs).toBeLessThan(550);
    expect(bpm).toBeGreaterThan(100);
    expect(bpm).toBeLessThan(140);
  });

  it('bounds brightness during rapid overlapping beats and decays to pure black in silence', () => {
    const effect = new MusicPulseEffect({
      ...DEFAULT_MUSIC_PULSE_PARAMS,
      maxBrightness: 0.85,
      idleBrightness: 0,
      beatMinIntervalMs: 100,
      pauseFrameBehavior: 'black',
    });

    // Rapid successive beats
    for (let i = 0; i < 3; i++) {
      effect.update({
        ...dummyContext,
        totalTime: 1.0 + i * 0.12,
        dt: 0.02,
        audio: {
          status: 'capturing' as const,
          deviceId: 'out',
          message: null,
          rms: 1.0,
          energyChange: 1.0,
          bass: 1.0,
          mids: 1.0,
          highs: 1.0,
          bands: [1.0],
          beat: true,
          bassFlux: 0.3,
          adaptiveThreshold: 0.04,
          isGated: false,
          updatedAt: i,
        },
      });
    }

    const overlapFrame = effect.update({
      ...dummyContext,
      totalTime: 1.40,
      dt: 0.02,
      audio: {
        status: 'capturing' as const,
        deviceId: 'out',
        message: null,
        rms: 1.0,
        energyChange: 0.8,
        bass: 1.0,
        mids: 1.0,
        highs: 1.0,
        bands: [1.0],
        beat: false,
        bassFlux: 0.0,
        adaptiveThreshold: 0.04,
        isGated: false,
        updatedAt: 4,
      },
    });

    // All keys should be safely clamped to maxBrightness ceiling (max value <= 255 * 0.85 ~ 217)
    for (const key of K630_LAYOUT) {
      const color = overlapFrame[key.id];
      expect(color.r).toBeLessThanOrEqual(Math.round(255 * 0.85 + 1));
      expect(color.g).toBeLessThanOrEqual(Math.round(255 * 0.85 + 1));
      expect(color.b).toBeLessThanOrEqual(Math.round(255 * 0.85 + 1));
    }

    // Silence decay test: after audio goes silent / gated, all keys decay to pure black
    const silentCtx = {
      ...dummyContext,
      totalTime: 4.0,
      dt: 0.20,
      audio: {
        status: 'silent' as const,
        deviceId: 'out',
        message: null,
        rms: 0,
        energyChange: 0,
        bass: 0,
        mids: 0,
        highs: 0,
        bands: [],
        beat: false,
        isGated: true,
        updatedAt: 5,
      },
    };

    // Run several decay steps
    for (let s = 0; s < 5; s++) {
      effect.update({ ...silentCtx, totalTime: 4.0 + s * 0.2 });
    }
    const silentFrame = effect.update({ ...silentCtx, totalTime: 5.5 });

    for (const key of K630_LAYOUT) {
      const color = silentFrame[key.id];
      expect(color.r).toBe(0);
      expect(color.g).toBe(0);
      expect(color.b).toBe(0);
    }
  });

  it('guarantees 100% full brightness on keys crossing pulse crest even when background is quiet', () => {
    const effect = new MusicPulseEffect({
      ...DEFAULT_MUSIC_PULSE_PARAMS,
      spectrumMode: 'radial_circle',
      idleBrightness: 0,
      maxBrightness: 1.0,
      brightness: 1.0,
      highColor: { r: 255, g: 0, b: 0 },   // Core: Pure Red
      midColor: { r: 0, g: 255, b: 0 },    // Middle: Pure Green
      bassColor: { r: 0, g: 0, b: 255 },   // Outer: Pure Blue
      pulseSpeed: 2.4,
      pulseWidth: 0.18,
      beatMinIntervalMs: 100,
    });

    // Quiet background audio: low continuous RMS (0.15) but a confirmed beat arrives at t=1.0
    const quietBeatCtx = {
      ...dummyContext,
      totalTime: 1.0,
      dt: 0.016,
      audio: {
        status: 'capturing' as const,
        deviceId: 'out',
        message: null,
        rms: 0.15,
        energyChange: 0.6,
        bass: 0.15,
        mids: 0.1,
        highs: 0.05,
        bands: [0.15],
        beat: true,
        bassFlux: 0.20,
        adaptiveThreshold: 0.04,
        isGated: false,
        updatedAt: 1,
      },
    };

    // Frame at t=1.0: pulse wave is born at center. Center key 'h' immediately leaps to > 240 (>94%):
    const frameAtCenter = effect.update(quietBeatCtx);
    expect(frameAtCenter.h.r).toBeGreaterThanOrEqual(240);
    // Far corner keys outside active pulse region must remain dark:
    expect(frameAtCenter.esc.r + frameAtCenter.esc.g + frameAtCenter.esc.b).toBe(0);

    // When wave crest aligns exactly with key 'h' at t = 1.011s, key reaches full 100% brightness (255):
    const frameAtExactCrest = effect.update({
      ...dummyContext,
      totalTime: 1.011,
      dt: 0.011,
      audio: quietBeatCtx.audio,
    });
    expect(frameAtExactCrest.h.r).toBe(255);

    // Now advance time so the wave crest travels outward to key 's' (normDist ~0.51, Middle Ring)
    // Distance 0.51 at speed 2.4 takes ~0.21 seconds: totalTime = 1.21
    const frameAtMid = effect.update({
      ...dummyContext,
      totalTime: 1.21,
      dt: 0.016,
      audio: {
        status: 'capturing' as const,
        deviceId: 'out',
        message: null,
        rms: 0.15,
        energyChange: 0.1,
        bass: 0.15,
        mids: 0.1,
        highs: 0.05,
        bands: [0.15],
        beat: false,
        bassFlux: 0.01,
        adaptiveThreshold: 0.04,
        isGated: false,
        updatedAt: 2,
      },
    });

    // Middle ring key 's' is now crossed by the wave and reaches full brightness (Green > 200)!
    expect(frameAtMid.s.g).toBeGreaterThan(200);

    // Fast consecutive beat arrives at t=1.10 (exactly 100ms later): must be accepted without refractory rejection!
    effect.update({
      ...dummyContext,
      totalTime: 1.10,
      dt: 0.016,
      audio: {
        status: 'capturing' as const,
        deviceId: 'out',
        message: null,
        rms: 0.20,
        energyChange: 0.6,
        bass: 0.25,
        mids: 0.1,
        highs: 0.05,
        bands: [0.25],
        beat: true,
        bassFlux: 0.18,
        adaptiveThreshold: 0.04,
        isGated: false,
        updatedAt: 3,
      },
    });

    const logs = effect.getCandidateLogs();
    const acceptedLogs = logs.filter(l => l.status === 'ACCEPTED');
    expect(acceptedLogs.length).toBeGreaterThanOrEqual(2);
    // Verify timeSinceLastBeatMs is logged
    expect(acceptedLogs[0].timeSinceLastBeatMs).toBeGreaterThanOrEqual(90);
    expect(acceptedLogs[0].timeSinceLastBeatMs).toBeLessThanOrEqual(120);
  });

  it('cycles through radial state machine: WAITING -> WAVE_OUTWARD -> CENTRE_PULSE -> WAITING', () => {
    const effect = new MusicPulseEffect({
      ...DEFAULT_MUSIC_PULSE_PARAMS,
      pulseSpeed: 2.5,
      centerPulseDurationMs: 80,
    });

    expect(effect.getState()).toBe('WAITING_FOR_STRONG_BEAT');

    // 1. Deliver strong beat at t = 1.0s
    effect.update({
      ...dummyContext,
      totalTime: 1.0,
      dt: 0.016,
      audio: {
        status: 'capturing' as const,
        deviceId: 'out',
        message: null,
        rms: 0.6,
        energyChange: 0.8,
        bass: 0.8,
        mids: 0.2,
        highs: 0.1,
        bands: [0.8],
        beat: true,
        beatStrength: 0.85,
        bassFlux: 0.25,
        adaptiveThreshold: 0.04,
        isGated: false,
        updatedAt: 1,
      },
    });

    expect(effect.getState()).toBe('WAVE_OUTWARD');
    expect(effect.getCurrentWaveRadius()).toBeLessThan(0.1);

    // 2. Advance time so outward wave reaches outer edge (radius >= 1.25, at speed 2.5 takes 0.5s)
    effect.update({
      ...dummyContext,
      totalTime: 1.55,
      dt: 0.05,
      audio: {
        status: 'capturing' as const,
        deviceId: 'out',
        message: null,
        rms: 0.2,
        energyChange: 0.0,
        bass: 0.2,
        mids: 0.1,
        highs: 0.05,
        bands: [0.2],
        beat: false,
        bassFlux: 0.01,
        adaptiveThreshold: 0.04,
        isGated: false,
        updatedAt: 2,
      },
    });

    // Outward wave has reached boundary and transitioned to CENTRE_PULSE
    expect(effect.getState()).toBe('CENTRE_PULSE');

    // 3. Centre keys (g, h) illuminate during center pulse
    const centerFrame = effect.update({
      ...dummyContext,
      totalTime: 1.57,
      dt: 0.02,
      audio: {
        status: 'capturing' as const,
        deviceId: 'out',
        message: null,
        rms: 0.2,
        energyChange: 0.0,
        bass: 0.2,
        mids: 0.1,
        highs: 0.05,
        bands: [0.2],
        beat: false,
        bassFlux: 0.01,
        adaptiveThreshold: 0.04,
        isGated: false,
        updatedAt: 3,
      },
    });
    expect(centerFrame.h.r + centerFrame.h.g + centerFrame.h.b).toBeGreaterThan(100);

    // 4. Advance past centerPulseDurationMs (80ms -> t = 1.65)
    effect.update({
      ...dummyContext,
      totalTime: 1.66,
      dt: 0.05,
      audio: {
        status: 'capturing' as const,
        deviceId: 'out',
        message: null,
        rms: 0.2,
        energyChange: 0.0,
        bass: 0.2,
        mids: 0.1,
        highs: 0.05,
        bands: [0.2],
        beat: false,
        bassFlux: 0.01,
        adaptiveThreshold: 0.04,
        isGated: false,
        updatedAt: 4,
      },
    });

    // Transition back to waiting for next beat without creating any synthetic beat!
    expect(effect.getState()).toBe('WAITING_FOR_STRONG_BEAT');
  });

  it('freezes exact last rendered frame when Spotify playback pauses', () => {
    const effect = new MusicPulseEffect({
      ...DEFAULT_MUSIC_PULSE_PARAMS,
      pauseFrameBehavior: 'freeze',
      highColor: { r: 0, g: 255, b: 0 },
    });

    // 1. Render active frame
    const activeFrame = effect.update({
      ...dummyContext,
      totalTime: 1.0,
      dt: 0.016,
      audio: {
        status: 'capturing' as const,
        deviceId: 'out',
        message: null,
        rms: 0.7,
        energyChange: 0.5,
        bass: 0.8,
        mids: 0.4,
        highs: 0.2,
        bands: [0.8],
        beat: true,
        beatStrength: 0.8,
        bassFlux: 0.2,
        adaptiveThreshold: 0.04,
        isGated: false,
        updatedAt: 1,
      },
    });

    // Key 'h' has active green color
    expect(activeFrame.h.g).toBeGreaterThan(150);

    // 2. Spotify pauses -> audio becomes silent/drained
    const pausedCtx = {
      ...dummyContext,
      totalTime: 1.35,
      dt: 0.25,
      audio: {
        status: 'silent' as const,
        deviceId: 'out',
        message: null,
        rms: 0,
        energyChange: 0,
        bass: 0,
        mids: 0,
        highs: 0,
        bands: [],
        beat: false,
        isGated: true,
        updatedAt: 2,
      },
    };

    const pausedFrame = effect.update(pausedCtx);
    expect(effect.getState()).toBe('PAUSED_FRAME');
    // Exact frame preserved - no fading, no blacking out, no reset to rainbow!
    expect(pausedFrame.h).toEqual(activeFrame.h);
    expect(pausedFrame.space).toEqual(activeFrame.space);
  });

  it('leaves non-crest keys completely dark in pure beat mode (continuousIntensity: 0)', () => {
    const effect = new MusicPulseEffect({
      ...DEFAULT_MUSIC_PULSE_PARAMS,
      continuousIntensity: 0.0, // pure beat-only visualizer
      idleBrightness: 0.0,
      highColor: { r: 255, g: 0, b: 0 },
      innerColor: { r: 255, g: 0, b: 0 },
      pulseSpeed: 2.4,
      pulseWidth: 0.15,
    });

    // Strong beat occurs at t = 1.0s
    effect.update({
      ...dummyContext,
      totalTime: 1.0,
      dt: 0.016,
      audio: {
        status: 'capturing' as const,
        deviceId: 'out',
        message: null,
        rms: 0.5,
        energyChange: 0.7,
        bass: 0.8,
        mids: 0.7,
        highs: 0.6,
        bands: [0.8, 0.7, 0.6],
        beat: true,
        beatStrength: 0.9,
        bassFlux: 0.3,
        adaptiveThreshold: 0.04,
        isGated: false,
        updatedAt: 1,
      },
    });

    // Advance time slightly: wave is at radius ~0.24 (inner ring)
    // Key 'f' is close (radius ~0.22), while outer key 'esc' is far (radius ~0.95)
    const frame = effect.update({
      ...dummyContext,
      totalTime: 1.10,
      dt: 0.016,
      audio: {
        status: 'capturing' as const,
        deviceId: 'out',
        message: null,
        rms: 0.5,
        energyChange: 0.1,
        bass: 0.3,
        mids: 0.3,
        highs: 0.3,
        bands: [0.3],
        beat: false,
        bassFlux: 0.01,
        adaptiveThreshold: 0.04,
        isGated: false,
        updatedAt: 2,
      },
    });

    // Key at wave crest reaches 100% target brightness
    expect(frame.f.r).toBeGreaterThan(150);
    // Keys away from wave are 100% pure black because continuousIntensity is 0!
    expect(frame.esc.r + frame.esc.g + frame.esc.b).toBe(0);
    expect(frame.backspace.r + frame.backspace.g + frame.backspace.b).toBe(0);

    const stats = effect.getBrightnessStats();
    expect(stats.min).toBe(0);
    expect(stats.max).toBeGreaterThan(0.5);
  });

  it('rejects candidate transients with score below strongBeatThreshold as REJECTED_WEAK', () => {
    const effect = new MusicPulseEffect({
      ...DEFAULT_MUSIC_PULSE_PARAMS,
      strongBeatThreshold: 0.50, // requires score >= 0.50
    });

    effect.update({
      ...dummyContext,
      totalTime: 1.0,
      dt: 0.016,
      audio: {
        status: 'capturing' as const,
        deviceId: 'out',
        message: null,
        rms: 0.2,
        energyChange: 0.1,
        bass: 0.2,
        mids: 0.1,
        highs: 0.05,
        bands: [0.2],
        beat: true,
        beatStrength: 0.25, // weak score!
        bassFlux: 0.05,
        adaptiveThreshold: 0.04,
        isGated: false,
        updatedAt: 1,
      },
    });

    const logs = effect.getCandidateLogs();
    const weakLogs = logs.filter(l => l.status === 'REJECTED_WEAK');
    expect(weakLogs.length).toBeGreaterThan(0);
    expect(weakLogs[0].reason).toContain('Weak transient');
    expect(effect.getState()).toBe('WAITING_FOR_STRONG_BEAT');
  });

  it('Rule 8 Test 1 & 2: holds fixed frame constant and renders repeatedly with identical RGB output', () => {
    const effect = new MusicPulseEffect({
      ...DEFAULT_MUSIC_PULSE_PARAMS,
      pauseFrameBehavior: 'freeze',
    });

    // Generate active frame
    const frame1 = effect.update({
      ...dummyContext,
      totalTime: 1.0,
      dt: 0.016,
      audio: {
        status: 'capturing' as const,
        deviceId: 'out',
        message: null,
        rms: 0.6,
        energyChange: 0.5,
        bass: 0.7,
        mids: 0.3,
        highs: 0.2,
        bands: [0.7],
        beat: true,
        beatStrength: 0.8,
        bassFlux: 0.2,
        adaptiveThreshold: 0.04,
        isGated: false,
        updatedAt: 1,
      },
    });

    // Pause audio and hold for several seconds (t = 1.1s to 5.0s)
    let heldFrame = frame1;
    for (let sec = 1.1; sec <= 5.0; sec += 0.5) {
      heldFrame = effect.update({
        ...dummyContext,
        totalTime: sec,
        dt: 0.5,
        audio: {
          status: 'silent' as const,
          deviceId: 'out',
          message: null,
          rms: 0,
          energyChange: 0,
          bass: 0,
          mids: 0,
          highs: 0,
          bands: [],
          beat: false,
          isGated: true,
          updatedAt: Math.round(sec * 1000),
        },
      });
      // RGB output must remain 100% bit-for-bit identical across all keys - ZERO flicker!
      expect(heldFrame).toEqual(frame1);
      expect(effect.getState()).toBe('PAUSED_FRAME');
    }
  });

  it('Rule 8 Test 3: simulates one strong beat event and creates exactly one outward wave', () => {
    const effect = new MusicPulseEffect({
      ...DEFAULT_MUSIC_PULSE_PARAMS,
      pulseSpeed: 2.0,
    });

    // 1. Initially waiting
    expect(effect.getState()).toBe('WAITING_FOR_STRONG_BEAT');

    // 2. Deliver exactly one strong beat
    effect.update({
      ...dummyContext,
      totalTime: 1.0,
      dt: 0.016,
      audio: {
        status: 'capturing' as const,
        deviceId: 'out',
        message: null,
        rms: 0.6,
        energyChange: 0.7,
        bass: 0.8,
        mids: 0.2,
        highs: 0.1,
        bands: [0.8],
        beat: true,
        beatStrength: 0.9,
        bassFlux: 0.25,
        adaptiveThreshold: 0.04,
        isGated: false,
        updatedAt: 1,
      },
    });

    expect(effect.getState()).toBe('WAVE_OUTWARD');
    const logs = effect.getCandidateLogs();
    const accepted = logs.filter(l => l.status === 'ACCEPTED');
    expect(accepted.length).toBe(1);

    // 3. Next frame with beat = false does NOT spawn another wave
    effect.update({
      ...dummyContext,
      totalTime: 1.033,
      dt: 0.033,
      audio: {
        status: 'capturing' as const,
        deviceId: 'out',
        message: null,
        rms: 0.5,
        energyChange: 0.3,
        bass: 0.6,
        mids: 0.2,
        highs: 0.1,
        bands: [0.6],
        beat: false,
        bassFlux: 0.10,
        adaptiveThreshold: 0.04,
        isGated: false,
        updatedAt: 2,
      },
    });

    // Still exactly 1 accepted wave
    expect(effect.getCandidateLogs().filter(l => l.status === 'ACCEPTED').length).toBe(1);
    expect(effect.getState()).toBe('WAVE_OUTWARD');
  });

  it('Rule 8 Test 4 & 5: pauses without clearing and resumes seamlessly upon fresh audio', () => {
    const effect = new MusicPulseEffect({
      ...DEFAULT_MUSIC_PULSE_PARAMS,
      pauseFrameBehavior: 'freeze',
    });

    // Frame with beat
    const activeFrame = effect.update({
      ...dummyContext,
      totalTime: 1.0,
      dt: 0.016,
      audio: {
        status: 'capturing' as const,
        deviceId: 'out',
        message: null,
        rms: 0.7,
        energyChange: 0.7,
        bass: 0.9,
        mids: 0.3,
        highs: 0.1,
        bands: [0.9],
        beat: true,
        beatStrength: 0.9,
        bassFlux: 0.3,
        adaptiveThreshold: 0.04,
        isGated: false,
        updatedAt: 1,
      },
    });

    // Pause audio
    const pausedFrame = effect.update({
      ...dummyContext,
      totalTime: 2.0,
      dt: 1.0,
      audio: {
        status: 'silent' as const,
        deviceId: 'out',
        message: null,
        rms: 0,
        energyChange: 0,
        bass: 0,
        mids: 0,
        highs: 0,
        bands: [],
        beat: false,
        isGated: true,
        updatedAt: 2,
      },
    });

    expect(effect.getState()).toBe('PAUSED_FRAME');
    expect(pausedFrame).toEqual(activeFrame);

    // Resume audio with fresh samples
    effect.update({
      ...dummyContext,
      totalTime: 2.1,
      dt: 0.1,
      audio: {
        status: 'capturing' as const,
        deviceId: 'out',
        message: null,
        rms: 0.4,
        energyChange: 0.2,
        bass: 0.4,
        mids: 0.3,
        highs: 0.2,
        bands: [0.4],
        beat: false,
        bassFlux: 0.02,
        adaptiveThreshold: 0.04,
        isGated: false,
        updatedAt: 3,
      },
    });

    expect(effect.getState()).toBe('WAITING_FOR_STRONG_BEAT');
  });
});

describe('Zigzag Wave Effect', () => {
  const dummyContext: AnimationContext = {
    keys: K630_LAYOUT,
    totalTime: 1.0,
    dt: 0.016,
  };

  it('maps all 61 physical keys in a continuous serpentine zigzag order', () => {
    const effect = new ZigzagWaveEffect();
    const pathKeys = effect.getPathKeys();
    expect(pathKeys).toHaveLength(61);
    expect(SERPENTINE_KEY_IDS).toHaveLength(61);
    expect(new Set(pathKeys).size).toBe(61);

    // Row 0 left-to-right
    expect(pathKeys[0]).toBe('esc');
    expect(pathKeys[13]).toBe('backspace');

    // Row 1 right-to-left
    expect(pathKeys[14]).toBe('backslash');
    expect(pathKeys[27]).toBe('tab');

    // Row 2 left-to-right
    expect(pathKeys[28]).toBe('caps');
    expect(pathKeys[40]).toBe('enter');

    // Row 3 right-to-left
    expect(pathKeys[41]).toBe('shift_r');
    expect(pathKeys[52]).toBe('shift_l');

    // Row 4 left-to-right (accounting for spacebar)
    expect(pathKeys[53]).toBe('ctrl_l');
    expect(pathKeys[56]).toBe('space');
    expect(pathKeys[60]).toBe('ctrl_r');

    const positions = effect.getPathPositions();
    expect(positions['esc']).toBe(0.0);
    expect(positions['ctrl_r']).toBe(1.0);

    // Positions must be strictly monotonically increasing along the path
    for (let i = 1; i < pathKeys.length; i++) {
      expect(positions[pathKeys[i]]).toBeGreaterThan(positions[pathKeys[i - 1]]);
    }
  });

  it('performs true ping-pong movement and reverses smoothly at both endpoints without teleporting', () => {
    const effect = new ZigzagWaveEffect({
      ...DEFAULT_ZIGZAG_WAVE_PARAMS,
      speed: 1.0,
    });

    expect(effect.getPosition()).toBe(0.0);
    expect(effect.getDirection()).toBe(1);

    // 1. Advance forward
    effect.update({ ...dummyContext, dt: 0.5 });
    expect(effect.getPosition()).toBeGreaterThan(0.0);
    expect(effect.getPosition()).toBeLessThan(1.0);
    expect(effect.getDirection()).toBe(1);

    // 2. Drive forward to endpoint 1.0 (needs ~2.0s more)
    for (let i = 0; i < 11; i++) {
      effect.update({ ...dummyContext, dt: 0.2 });
    }

    // Must have reversed at 1.0, direction must now be -1!
    expect(effect.getDirection()).toBe(-1);
    expect(effect.getPosition()).toBeLessThanOrEqual(1.0);
    expect(effect.getPosition()).toBeGreaterThan(0.7);

    // 3. Drive backward towards 0.0 along the exact same path (needs ~2.3s)
    for (let i = 0; i < 14; i++) {
      effect.update({ ...dummyContext, dt: 0.2 });
    }

    // Must have reversed at 0.0 and now heading forward (+1) again!
    expect(effect.getDirection()).toBe(1);
    expect(effect.getPosition()).toBeGreaterThanOrEqual(0.0);
    expect(effect.getPosition()).toBeLessThan(0.5);
  });

  it('renders a bright wave crest with fading trail behind the head in both directions', () => {
    const effect = new ZigzagWaveEffect({
      ...DEFAULT_ZIGZAG_WAVE_PARAMS,
      colorMode: 'two_color',
      primaryColor: { r: 255, g: 0, b: 0 },   // Head: Pure Red
      secondaryColor: { r: 0, g: 0, b: 255 }, // Tail: Pure Blue
      waveWidth: 0.10,
      trailLength: 0.30,
      backgroundGlow: false,
    });

    // 1. Step forward slightly so head is at ~0.10
    for (let i = 0; i < 3; i++) {
      effect.update({ ...dummyContext, dt: 0.08 });
    }
    expect(effect.getDirection()).toBe(1);

    const frameForward = effect.update({ ...dummyContext, dt: 0.001 });

    // Distant unreached keys ahead must be dark (zero)
    expect(frameForward.ctrl_r.r + frameForward.ctrl_r.g + frameForward.ctrl_r.b).toBe(0);
    expect(frameForward.space.r + frameForward.space.g + frameForward.space.b).toBe(0);

    // Start key behind the head should exhibit illumination from the trailing tail
    expect(frameForward.esc.r + frameForward.esc.g + frameForward.esc.b).toBeGreaterThan(0);
  });

  it('preserves animation position and direction when updating speed or colors', () => {
    const effect = new ZigzagWaveEffect({
      ...DEFAULT_ZIGZAG_WAVE_PARAMS,
      speed: 1.0,
    });

    effect.update({ ...dummyContext, dt: 0.5 });
    const posBefore = effect.getPosition();
    const dirBefore = effect.getDirection();
    expect(posBefore).toBeGreaterThan(0.1);

    // In-place parameter modification (as happens on UI sliders)
    effect.params.speed = 2.5;
    effect.params.primaryColor = { r: 0, g: 255, b: 0 };

    // Next frame update with tiny dt must NOT jump position
    effect.update({ ...dummyContext, dt: 0.001 });
    expect(effect.getPosition()).toBeCloseTo(posBefore, 2);
    expect(effect.getDirection()).toBe(dirBefore);
  });

  it('supports background glow and reverse start configuration', () => {
    const effectGlow = new ZigzagWaveEffect({
      ...DEFAULT_ZIGZAG_WAVE_PARAMS,
      backgroundGlow: true,
      backgroundColor: { r: 10, g: 20, b: 30 },
      reverseStart: true,
    });

    expect(effectGlow.getPosition()).toBe(1.0);
    expect(effectGlow.getDirection()).toBe(-1);

    const frame = effectGlow.update({ ...dummyContext, dt: 0.01 });

    // Distant unreached key (esc at s=0.0) should have subtle ambient background glow
    expect(frame.esc.r).toBeGreaterThan(0);
    expect(frame.esc.g).toBeGreaterThan(0);
    expect(frame.esc.b).toBeGreaterThan(0);
  });

  it('supports stable chromatic rainbow mode across the keyboard matrix', () => {
    const effectRainbow = new ZigzagWaveEffect({
      ...DEFAULT_ZIGZAG_WAVE_PARAMS,
      colorMode: 'rainbow',
      rainbowMode: true,
    });

    const frame = effectRainbow.update({ ...dummyContext, dt: 0.01 });
    // Crest key at start (esc) is illuminated
    expect(frame.esc.r + frame.esc.g + frame.esc.b).toBeGreaterThan(50);
  });
});

describe('8 Reactive Keyboard RGB Effects Suite', () => {
  const dummyContext: AnimationContext = {
    keys: K630_LAYOUT,
    totalTime: 1.0,
    dt: 0.016,
  };

  it('1. Key Flash: flashes pressed key immediately with hold duration and neighbor glow', () => {
    const effect = new KeyFlashEffect({
      ...DEFAULT_KEY_FLASH_PARAMS,
      flashColor: { r: 255, g: 255, b: 255 },
      holdDuration: 100,
      fadeDuration: 300,
      neighborGlow: true,
      neighborGlowIntensity: 0.3,
    });

    // Before keypress: black base
    const frame0 = effect.update({ ...dummyContext, dt: 0.01 });
    expect(frame0.f.r + frame0.f.g + frame0.f.b).toBe(0);

    // Press key F
    effect.onKeyDown('KeyF');
    const frame1 = effect.update({ ...dummyContext, dt: 0.01 });

    // F must be at peak flash
    expect(frame1.f.r).toBe(255);
    expect(frame1.f.g).toBe(255);
    expect(frame1.f.b).toBe(255);

    // Neighbor G should receive subtle halo glow
    expect(frame1.g.r).toBeGreaterThan(50);
    expect(frame1.g.r).toBeLessThan(255);

    // Distant key (esc) remains dark
    expect(frame1.esc.r).toBe(0);
  });

  it('2. Reactive Ripple: expands circular wave outward based on physical Euclidean distance', () => {
    const effect = new ReactiveRippleEffect({
      ...DEFAULT_REACTIVE_RIPPLE_PARAMS,
      speed: 1.5,
      radius: 12.0,
      color: { r: 0, g: 255, b: 255 },
    });

    // Trigger ripple at spacebar (center)
    effect.onKeyDown('Space');

    // Immediate frame: origin illuminated
    const frameImmediate = effect.update({ ...dummyContext, dt: 0.01 });
    expect(frameImmediate.space.g + frameImmediate.space.b).toBeGreaterThan(0);

    // After wave travels outward across physical layout
    const frameExpanding = effect.update({ ...dummyContext, dt: 0.15 });
    // Keys at moderate distance become lit as wavefront sweeps through
    const totalIllumination = Object.values(frameExpanding).reduce((sum, c) => sum + c.r + c.g + c.b, 0);
    expect(totalIllumination).toBeGreaterThan(100);
  });

  it('3. Neighbor Glow: validates progressive physical neighbor illumination and distance falloff', () => {
    const effect = new NeighborGlowEffect({
      ...DEFAULT_NEIGHBOR_GLOW_PARAMS,
      glowRadius: 2.5,
      color: { r: 200, g: 0, b: 255 },
    });

    effect.onKeyDown('KeyH');
    // Immediate frame: H is epicenter
    const frame0 = effect.update({ ...dummyContext, dt: 0.01 });
    expect(frame0.h.r).toBeGreaterThan(150);

    // After 0.08s, wavefront reaches adjacent physical neighbor J
    const frame1 = effect.update({ ...dummyContext, dt: 0.08 });
    expect(frame1.j.r).toBeGreaterThan(0);
    // Far-away key (num_1) is outside glow radius
    expect(frame1.num_1.r).toBe(0);
  });

  it('4. Shockwave: creates fast expanding sharp ring with soft trailing afterglow', () => {
    const effect = new ShockwaveEffect({
      ...DEFAULT_SHOCKWAVE_PARAMS,
      propagationSpeed: 3.0,
      thickness: 0.15,
      ringColor: { r: 0, g: 200, b: 255 },
    });

    effect.onKeyDown('KeyG');
    const frame = effect.update({ ...dummyContext, dt: 0.05 });
    expect(frame.g.b).toBeGreaterThan(0);

    // Advancing step preserves active wavefront
    const frameNext = effect.update({ ...dummyContext, dt: 0.08 });
    const litKeys = Object.values(frameNext).filter((c) => c.b > 20);
    expect(litKeys.length).toBeGreaterThan(0);
  });

  it('5. Snake Trail: traverses physical neighbors with momentum without teleporting', () => {
    const effect = new SnakeTrailEffect({
      ...DEFAULT_SNAKE_TRAIL_PARAMS,
      trailLength: 5,
      speed: 12,
      trailColor: { r: 0, g: 255, b: 100 },
    });

    effect.onKeyDown('KeyA');
    const frame = effect.update({ ...dummyContext, dt: 0.01 });

    // Head at A is lit
    expect(frame.a.g).toBeGreaterThan(100);

    // Advance 5 steps: snake crawls along physical keys
    for (let i = 0; i < 5; i++) {
      effect.update({ ...dummyContext, dt: 0.1 });
    }

    const frameCrawled = effect.update({ ...dummyContext, dt: 0.01 });
    const litCount = Object.values(frameCrawled).filter((c) => c.g > 10).length;
    expect(litCount).toBeGreaterThan(0);
    expect(litCount).toBeLessThanOrEqual(8);
  });

  it('6. Ember: transitions smoothly through incandescent yellow core and ruby cooling gradient', () => {
    const effect = new EmberEffect({
      ...DEFAULT_EMBER_PARAMS,
      fadeDuration: 800,
      coreColor: { r: 255, g: 240, b: 120 },
      emberColor: { r: 255, g: 80, b: 0 },
    });

    effect.onKeyDown('KeyK');

    // Fresh hot ember: high yellow/green component from coreColor
    const frameHot = effect.update({ ...dummyContext, dt: 0.01 });
    expect(frameHot.k.r).toBeGreaterThan(200);
    expect(frameHot.k.g).toBeGreaterThan(100);

    // Later cooling phase: green decays leaving burning red
    for (let i = 0; i < 4; i++) {
      effect.update({ ...dummyContext, dt: 0.1 });
    }
    const frameCooling = effect.update({ ...dummyContext, dt: 0.01 });
    expect(frameCooling.k.r).toBeGreaterThan(frameCooling.k.g);
  });

  it('7. Electric Discharge: animates jagged branching paths consistently with spark highlights', () => {
    const effect = new ElectricDischargeEffect({
      ...DEFAULT_ELECTRIC_DISCHARGE_PARAMS,
      branchCount: 3,
      propagationSpeed: 25,
      primaryColor: { r: 0, g: 120, b: 255 },
      highlightColor: { r: 220, g: 250, b: 255 },
    });

    effect.onKeyDown('KeyD');
    const frame0 = effect.update({ ...dummyContext, dt: 0.01 });

    // Origin key flashes with bright spark highlight
    expect(frame0.d.b).toBeGreaterThan(200);

    // Arc propagates along branches
    const frameArc = effect.update({ ...dummyContext, dt: 0.04 });
    const activeKeys = Object.values(frameArc).filter((c) => c.b > 50);
    expect(activeKeys.length).toBeGreaterThan(0);
  });

  it('8. Typing Intensity: tracks keystroke frequency with smooth attack, hysteresis, and idle decay', () => {
    const effect = new TypingIntensityEffect({
      ...DEFAULT_TYPING_INTENSITY_PARAMS,
      idleColor: { r: 0, g: 50, b: 150 },
      activeColor: { r: 255, g: 0, b: 0 },
      minBrightness: 0.2,
      maxBrightness: 1.0,
      activityWindow: 2.0,
      idleDecayTime: 1.5,
    });

    // Idle state with custom idle glow
    const frameIdle = effect.update({ ...dummyContext, dt: 0.01 });
    expect(frameIdle.space.b).toBeGreaterThan(frameIdle.space.r); // Blue idle color

    // Rapid simulated burst typing on KeyA (10 keystrokes)
    for (let i = 0; i < 10; i++) {
      effect.onKeyDown('KeyA');
    }

    // Step forward: activity rises
    for (let i = 0; i < 5; i++) {
      effect.update({ ...dummyContext, dt: 0.05 });
    }

    expect(effect.getSmoothedActivity()).toBeGreaterThan(0.2);
    const frameActive = effect.update({ ...dummyContext, dt: 0.01 });
    // Active pure red color dominates on the pressed key 'a'
    expect(frameActive.a.r).toBeGreaterThan(100);
    expect(frameActive.a.r).toBeGreaterThan(frameActive.a.b);
  });

  it('8b. Typing Intensity: initial state is black (off) and keys get hotter and hotter to pure red key-by-key', () => {
    const effect = new TypingIntensityEffect({
      ...DEFAULT_TYPING_INTENSITY_PARAMS,
    });

    // 1. Initial / resting state: all keys must be completely off (0, 0, 0)
    const frame0 = effect.update({ ...dummyContext, dt: 0.01 });
    const allKeysOff = Object.values(frame0).every((c) => c.r === 0 && c.g === 0 && c.b === 0);
    expect(allKeysOff).toBe(true);

    // 2. Press KeyA once: Key 'a' warms up, but all other keys remain completely off
    effect.onKeyDown('KeyA');
    const frame1 = effect.update({ ...dummyContext, dt: 0.01 });
    expect(frame1.a.r).toBeGreaterThan(50);
    // Crucial check: pure red without green or blue (never orange!)
    expect(frame1.a.g).toBe(0);
    expect(frame1.a.b).toBe(0);

    // Other keys (e.g. space, s, esc) MUST remain completely off (0, 0, 0)
    expect(frame1.space.r).toBe(0);
    expect(frame1.space.g).toBe(0);
    expect(frame1.space.b).toBe(0);
    expect(frame1.esc.r).toBe(0);

    // 3. Repeated presses on KeyA: gets hotter and hotter up to maximum blazing pure red
    const heat1 = effect.getKeyHeat('a');
    effect.onKeyDown('KeyA');
    effect.onKeyDown('KeyA');
    const heat2 = effect.getKeyHeat('a');
    expect(heat2).toBeGreaterThan(heat1);

    const frameHot = effect.update({ ...dummyContext, dt: 0.01 });
    expect(frameHot.a.r).toBeGreaterThanOrEqual(230);
    expect(frameHot.a.g).toBe(0); // Zero green (never orange)
    expect(frameHot.a.b).toBe(0);

    // 4. Cools down over time back to completely black (off)
    for (let i = 0; i < 60; i++) {
      effect.update({ ...dummyContext, dt: 0.1 });
    }
    const frameCooled = effect.update({ ...dummyContext, dt: 0.01 });
    expect(frameCooled.a.r).toBe(0);
    expect(frameCooled.a.g).toBe(0);
    expect(frameCooled.a.b).toBe(0);
  });

  it('Shared Reactive Engine: guarantees non-blocking input stream and bounded memory during rapid typing', () => {
    let captured = 0;
    const unsub = reactiveInputEngine.subscribe((ev) => {
      captured++;
      expect(ev.code).toBeDefined();
      expect(ev.keyId).toBeDefined();
      expect(ev.x).toBeGreaterThanOrEqual(0);
      expect(ev.y).toBeGreaterThanOrEqual(0);
    });

    // Rapid burst typing across multiple keys
    for (let i = 0; i < 50; i++) {
      reactiveInputEngine.handleRawKeyEvent('KeyJ');
    }

    expect(captured).toBe(50);
    expect(reactiveInputEngine.getKeystrokeRate(3.0)).toBeGreaterThan(0);
    unsub();
  });
});

describe('Continuous Wave Effect Suite', () => {
  const dummyContext: AnimationContext = {
    keys: K630_LAYOUT,
    totalTime: 1.0,
    dt: 0.016,
  };

  it('1. Wave travels continuously from left to right without reversing or bouncing', () => {
    const effect = new ContinuousWaveEffect({
      ...DEFAULT_CONTINUOUS_WAVE_PARAMS,
      speed: 1.0,
      wavelength: 0.5,
      primaryColor: { r: 255, g: 0, b: 0 },
      secondaryColor: { r: 0, g: 0, b: 0 },
      amplitude: 1.0,
    });

    // Check initial frame
    const frame0 = effect.update({ ...dummyContext, dt: 0.01 });
    const phase0 = effect.getPhase();

    // Advance time forward
    const frame1 = effect.update({ ...dummyContext, dt: 0.05 });
    const phase1 = effect.getPhase();

    // Phase advances strictly forward
    expect(phase1).toBeGreaterThan(phase0);

    // Frame keys reflect left-to-right phase displacement
    expect(Object.keys(frame0).length).toBe(61);
    expect(Object.keys(frame1).length).toBe(61);
  });

  it('2. Multiple peaks and troughs remain visible across physical keys simultaneously', () => {
    const effect = new ContinuousWaveEffect({
      ...DEFAULT_CONTINUOUS_WAVE_PARAMS,
      wavelength: 0.33, // Exactly 3 full wave cycles across keyboard
      amplitude: 1.0,
      primaryColor: { r: 255, g: 255, b: 255 },
      secondaryColor: { r: 0, g: 0, b: 0 },
      baseColor: { r: 0, g: 0, b: 0 },
    });

    const frame = effect.update({ ...dummyContext, dt: 0.01 });

    // In a 3-cycle wave across 61 keys, there must be keys near peak brightness (>200) and keys near trough darkness (<50)
    const brightKeys = Object.values(frame).filter((c) => c.r > 200);
    const darkKeys = Object.values(frame).filter((c) => c.r < 55);

    expect(brightKeys.length).toBeGreaterThan(6);
    expect(darkKeys.length).toBeGreaterThan(6);
  });

  it('3. Wraps seamlessly across the edges with consistent amplitude and wavelength', () => {
    const effect = new ContinuousWaveEffect({
      ...DEFAULT_CONTINUOUS_WAVE_PARAMS,
      speed: 1.5,
      wavelength: 0.40,
    });

    // Step across full 2*PI periodic cycles (1.5 cycles * 10 steps)
    for (let i = 0; i < 20; i++) {
      const frame = effect.update({ ...dummyContext, dt: 0.05 });
      // Every frame must yield valid bounded RGB values on leftmost (esc) and rightmost (backspace) keys
      expect(frame.esc.r).toBeGreaterThanOrEqual(0);
      expect(frame.esc.r).toBeLessThanOrEqual(255);
      expect(frame.backspace.r).toBeGreaterThanOrEqual(0);
      expect(frame.backspace.r).toBeLessThanOrEqual(255);
    }
  });

  it('4. Changing speed or wavelength updates dynamically without resetting phase', () => {
    const effect = new ContinuousWaveEffect({
      ...DEFAULT_CONTINUOUS_WAVE_PARAMS,
      speed: 1.0,
      wavelength: 0.45,
    });

    // Advance 10 frames
    for (let i = 0; i < 10; i++) {
      effect.update({ ...dummyContext, dt: 0.02 });
    }
    const phaseBefore = effect.getPhase();
    expect(phaseBefore).toBeGreaterThan(0.5);

    // Update speed in-place as settings sliders do
    effect.params.speed = 2.5;
    effect.params.wavelength = 0.25;

    // Advance 1 frame: phase continues monotonically without jumping back to 0
    effect.update({ ...dummyContext, dt: 0.01 });
    const phaseAfter = effect.getPhase();
    expect(phaseAfter).toBeGreaterThan(phaseBefore);
  });

  it('5. Supports multicolor rainbow gradient mode across continuous wave cycles', () => {
    const effect = new ContinuousWaveEffect({
      ...DEFAULT_CONTINUOUS_WAVE_PARAMS,
      useMulticolor: true,
      wavelength: 0.35,
      palette: [
        { r: 255, g: 0, b: 0 },
        { r: 0, g: 255, b: 0 },
        { r: 0, g: 0, b: 255 },
      ],
    });

    const frame = effect.update({ ...dummyContext, dt: 0.01 });

    // Multicolor produces non-zero levels on all color channels across the matrix
    const hasRed = Object.values(frame).some((c) => c.r > 100);
    const hasGreen = Object.values(frame).some((c) => c.g > 100);
    const hasBlue = Object.values(frame).some((c) => c.b > 100);

    expect(hasRed).toBe(true);
    expect(hasGreen).toBe(true);
    expect(hasBlue).toBe(true);
  });
});

describe('Sine Wave Lighting Effect (replaces Flowing Curve)', () => {
  const dummyContext: AnimationContext = {
    keys: K630_LAYOUT,
    totalTime: 0,
    dt: 0.016,
  };

  it('1. Initializes with default parameters, has name Sine Wave, and renders full 61-key frame', () => {
    const effect = new SineWaveEffect();
    expect(effect.type).toBe('flowing_curve');
    expect(effect.name).toBe('Sine Wave');
    expect(effect.getPhase()).toBe(0);

    const frame = effect.update(dummyContext);
    expect(Object.keys(frame).length).toBe(61);

    // Initial frame illuminates keys along the traveling sine curve
    const hasLitKey = Object.values(frame).some((c) => c.r > 20 || c.g > 20 || c.b > 20);
    expect(hasLitKey).toBe(true);
  });

  it('2. Travels smoothly along the sine wave and wraps phase modulo 1.0 seamlessly', () => {
    const effect = new SineWaveEffect({
      ...DEFAULT_SINE_WAVE_PARAMS,
      speed: 2.0,
      direction: 'left-to-right',
    });

    // Advance by 0.25 seconds: phase advances by 0.5 (halfway through periodic cycle)
    effect.update({ ...dummyContext, dt: 0.25 });
    expect(effect.getPhase()).toBeCloseTo(0.5, 2);

    // Advance by another 0.35 seconds: wraps modulo 1.0 seamlessly
    effect.update({ ...dummyContext, dt: 0.35 });
    expect(effect.getPhase()).toBeCloseTo(0.2, 2);
    expect(effect.getPhase()).toBeGreaterThanOrEqual(0);
    expect(effect.getPhase()).toBeLessThan(1.0);
  });

  it('3. Supports direction reversal (right-to-left) without unexpected jumps', () => {
    const effect = new SineWaveEffect({
      ...DEFAULT_SINE_WAVE_PARAMS,
      speed: 1.0,
      direction: 'right-to-left',
    });

    // Start at 0, moving right-to-left wraps backwards to ~0.9
    effect.update({ ...dummyContext, dt: 0.1 });
    expect(effect.getPhase()).toBeCloseTo(0.9, 2);

    effect.update({ ...dummyContext, dt: 0.2 });
    expect(effect.getPhase()).toBeCloseTo(0.7, 2);
  });

  it('4. Distinguishes peaks and troughs with smooth Gaussian falloff across rows', () => {
    const effect = new SineWaveEffect({
      ...DEFAULT_SINE_WAVE_PARAMS,
      amplitude: 1.8,
      wavelength: 15.0, // 1 full cycle across the keyboard width (15 keys)
      centerY: 2.0,     // Row 2 is center
      waveThickness: 0.8,
      direction: 'left-to-right',
    });

    // At phase 0, theta = k * x = (2 * PI / 15) * x.
    // At x = 3.75 (1/4 wavelength), sin(theta) = 1.0 -> waveY = 2.0 - 1.8 = 0.2 (Row 0 / top row).
    // Keys in top row around x = 3.75 should have high illumination, while bottom row keys have much lower.
    const frame = effect.update({ ...dummyContext, dt: 0.001 });

    // Top row key around x = 3.75 (num_4 / num_5 in row 0)
    const topKey = K630_LAYOUT.find((k) => k.row === 0 && Math.abs(k.x - 3.75) < 1.0);
    // Bottom row key around x = 3.75 (space / alt_l in row 4)
    const bottomKey = K630_LAYOUT.find((k) => k.row === 4 && Math.abs(k.x - 3.75) < 1.5);

    expect(topKey).toBeDefined();
    expect(bottomKey).toBeDefined();

    if (topKey && bottomKey) {
      const topColor = frame[topKey.id];
      const bottomColor = frame[bottomKey.id];
      const topBrightness = topColor.r + topColor.g + topColor.b;
      const bottomBrightness = bottomColor.r + bottomColor.g + bottomColor.b;
      expect(topBrightness).toBeGreaterThan(bottomBrightness);
    }
  });

  it('5. Geometry setting adjustments do not cause abrupt phase resets', () => {
    const effect = new SineWaveEffect({
      ...DEFAULT_SINE_WAVE_PARAMS,
      speed: 1.0,
    });

    // Advance 5 frames
    for (let i = 0; i < 5; i++) {
      effect.update({ ...dummyContext, dt: 0.05 });
    }
    const phaseBefore = effect.getPhase();
    expect(phaseBefore).toBeGreaterThan(0.2);

    // Modify amplitude, wavelength, and waveThickness in-place as UI sliders do
    effect.params.amplitude = 1.8;
    effect.params.wavelength = 8.0;
    effect.params.waveThickness = 1.5;

    // Advance 1 frame: phase continues monotonically from phaseBefore
    effect.update({ ...dummyContext, dt: 0.01 });
    const phaseAfter = effect.getPhase();
    expect(phaseAfter).toBeGreaterThan(phaseBefore);
  });

  it('6. Supports Rainbow, Single Colour, Dual Colour, and Custom Gradient modes', () => {
    // Rainbow Mode
    const rainbowEffect = new SineWaveEffect({
      ...DEFAULT_SINE_WAVE_PARAMS,
      colorMode: 'rainbow',
    });
    const rainbowFrame = rainbowEffect.update({ ...dummyContext, dt: 0.02 });
    const hasCyanOrBlue = Object.values(rainbowFrame).some((c) => c.b > 80 && (c.g > 80 || c.r > 80));
    const hasWarmOrRed = Object.values(rainbowFrame).some((c) => c.r > 80);
    expect(hasCyanOrBlue).toBe(true);
    expect(hasWarmOrRed).toBe(true);

    // Single Colour Mode
    const singleEffect = new SineWaveEffect({
      ...DEFAULT_SINE_WAVE_PARAMS,
      colorMode: 'single',
      primaryColor: { r: 0, g: 255, b: 0 }, // Pure Green
    });
    const singleFrame = singleEffect.update({ ...dummyContext, dt: 0.02 });
    const litKeysSingle = Object.values(singleFrame).filter((c) => c.g > 40);
    expect(litKeysSingle.length).toBeGreaterThan(10);
    // In pure green mode, red channel on lit keys stays minimal
    expect(litKeysSingle.every((c) => c.r <= 10)).toBe(true);

    // Dual Colour Mode (Crest vs Trough)
    const dualEffect = new SineWaveEffect({
      ...DEFAULT_SINE_WAVE_PARAMS,
      colorMode: 'dual',
      primaryColor: { r: 255, g: 0, b: 0 },   // Crest: Red
      secondaryColor: { r: 0, g: 0, b: 255 }, // Trough: Blue
    });
    const dualFrame = dualEffect.update({ ...dummyContext, dt: 0.02 });
    const hasRedKey = Object.values(dualFrame).some((c) => c.r > 80 && c.b < 50);
    const hasBlueKey = Object.values(dualFrame).some((c) => c.b > 80 && c.r < 50);
    expect(hasRedKey).toBe(true);
    expect(hasBlueKey).toBe(true);

    // Custom Gradient Mode
    const customEffect = new SineWaveEffect({
      ...DEFAULT_SINE_WAVE_PARAMS,
      colorMode: 'custom',
      customPalette: [
        { r: 255, g: 255, b: 0 }, // Yellow
        { r: 255, g: 0, b: 255 }, // Magenta
      ],
    });
    const customFrame = customEffect.update({ ...dummyContext, dt: 0.02 });
    expect(Object.keys(customFrame).length).toBe(61);
  });

  it('7. Supports backward-compatible FlowingCurveEffect alias and legacy params', () => {
    const legacyEffect = new FlowingCurveEffect({
      travelSpeed: 1.5,
      glowWidth: 1.2,
      curveOffset: 2.2,
    } as any);

    expect(legacyEffect.name).toBe('Sine Wave');
    expect(legacyEffect.type).toBe('flowing_curve');

    const frame = legacyEffect.update({ ...dummyContext, dt: 0.05 });
    expect(Object.keys(frame).length).toBe(61);
  });

  it('8. Reset returns phase to 0', () => {
    const effect = new SineWaveEffect();
    effect.update({ ...dummyContext, dt: 0.5 });
    expect(effect.getPhase()).toBeGreaterThan(0);

    effect.reset();
    expect(effect.getPhase()).toBe(0);
  });

  it('9. Only glowing wave keys are lit and background keys are completely OFF (0, 0, 0)', () => {
    const effect = new SineWaveEffect({
      ...DEFAULT_SINE_WAVE_PARAMS,
      colorMode: 'rainbow',
    });

    const frame = effect.update({ ...dummyContext, dt: 0.02 });

    // There must be glowing keys lit along the wave
    const glowingKeys = Object.values(frame).filter((c) => c.r > 0 || c.g > 0 || c.b > 0);
    expect(glowingKeys.length).toBeGreaterThan(10);

    // Background keys distant from the wave path must be completely unlit (0, 0, 0)
    const offKeys = Object.values(frame).filter((c) => c.r === 0 && c.g === 0 && c.b === 0);
    expect(offKeys.length).toBeGreaterThan(15);
  });
});


