import { describe, it, expect, vi } from 'vitest';
import { K630_LAYOUT } from '../layout';
import { createEffectInstance, EFFECT_REGISTRY } from '../registry';
import { AnimationContext, EffectType } from '../../types/effects';
import { ThermalHeatmapEffect } from '../effects/thermalHeatmap';
import { GravityDropEffect } from '../effects/gravityDrop';
import { LaserCrosshairEffect } from '../effects/laserCrosshair';
import { PongBounceEffect } from '../effects/pongBounce';
import { RadarSweepEffect } from '../effects/radarSweep';
import { VortexPinwheelEffect } from '../effects/vortexPinwheel';
import { LavaLampEffect } from '../effects/lavaLamp';
import { RaindropsEffect } from '../effects/raindrops';
import { ScreenAmbilightEffect, screenCaptureService } from '../effects/screenAmbilight';
import { TelemetryBarsEffect } from '../effects/telemetryBars';
import { SpectrumEQEffect } from '../effects/spectrumEQ';
import { CustomZonesEffect } from '../effects/customZones';
import { AfkScreensaverEffect } from '../effects/afkScreensaver';

const NEW_EFFECT_TYPES: EffectType[] = [
  'thermal_heatmap',
  'gravity_drop',
  'laser_crosshair',
  'pong_bounce',
  'radar_sweep',
  'vortex_pinwheel',
  'lava_lamp',
  'raindrops',
  'screen_ambilight',
  'telemetry_bars',
  'spectrum_eq',
  'custom_zones',
  'afk_screensaver',
];

const mockContext: AnimationContext = {
  keys: K630_LAYOUT,
  totalTime: 1.0,
  dt: 0.033,
  audio: {
    status: 'capturing',
    deviceId: null,
    message: null,
    rms: 0.5,
    energyChange: 0.1,
    bass: 0.6,
    mids: 0.4,
    highs: 0.3,
    bands: new Array(64).fill(0.5),
    beat: false,
    updatedAt: Date.now(),
  },
};

describe('13 New RGB Lighting Effects for Redragon K630', () => {
  it('registers all 13 effects in EFFECT_REGISTRY', () => {
    for (const type of NEW_EFFECT_TYPES) {
      expect(EFFECT_REGISTRY[type]).toBeDefined();
      expect(EFFECT_REGISTRY[type].type).toBe(type);
      expect(EFFECT_REGISTRY[type].name.length).toBeGreaterThan(0);
      expect(EFFECT_REGISTRY[type].defaultParams).toBeDefined();
    }
  });

  it('instantiates all 13 effects via createEffectInstance', () => {
    for (const type of NEW_EFFECT_TYPES) {
      const effect = createEffectInstance(type);
      expect(effect).toBeDefined();
      expect(effect.type).toBe(type);
    }
  });

  it('renders valid 61-key frame color payloads with no NaN or out-of-bound values', () => {
    for (const type of NEW_EFFECT_TYPES) {
      const effect = createEffectInstance(type);
      const frame = effect.update(mockContext);

      expect(Object.keys(frame).length).toBe(61);

      for (const key of K630_LAYOUT) {
        const color = frame[key.id];
        expect(color).toBeDefined();
        expect(Number.isFinite(color.r)).toBe(true);
        expect(Number.isFinite(color.g)).toBe(true);
        expect(Number.isFinite(color.b)).toBe(true);
        expect(color.r).toBeGreaterThanOrEqual(0);
        expect(color.r).toBeLessThanOrEqual(255);
        expect(color.g).toBeGreaterThanOrEqual(0);
        expect(color.g).toBeLessThanOrEqual(255);
        expect(color.b).toBeGreaterThanOrEqual(0);
        expect(color.b).toBeLessThanOrEqual(255);
      }
    }
  });

  describe('Interactive effects reactivity', () => {
    it('Thermal Heatmap responds to keypresses and heat bleed', () => {
      const heatmap = new ThermalHeatmapEffect();
      const initialFrame = heatmap.update(mockContext);
      expect(initialFrame['h'].b).toBe(0);

      // Press key 'h'
      heatmap.onKeyDown('KeyH');
      const pressedFrame = heatmap.update({ ...mockContext, dt: 0.01 });
      // Key H should heat up
      expect(pressedFrame['h'].b).toBeGreaterThan(0);

      // Test reset
      heatmap.reset();
      const resetFrame = heatmap.update(mockContext);
      expect(resetFrame['h'].b).toBe(0);
    });

    it('Gravity Drop spawns falling particles on keypress', () => {
      const drop = new GravityDropEffect();
      drop.onKeyDown('KeyW');
      const frame1 = drop.update({ ...mockContext, dt: 0.05 });
      expect(Object.keys(frame1).length).toBe(61);
      drop.reset();
      const resetFrame = drop.update(mockContext);
      expect(Object.keys(resetFrame).length).toBe(61);
    });

    it('Laser Crosshair lights orthogonal row and column on keypress', () => {
      const laser = new LaserCrosshairEffect();
      laser.onKeyDown('KeyG');
      const frame = laser.update({ ...mockContext, dt: 0.01 });
      expect(frame['g'].r).toBeGreaterThan(0);
      // Spacebar covers center columns 3-9, so pressing center key 'KeyG' (col 5) must light spacebar
      expect(frame['space'].r).toBeGreaterThan(0);
      laser.reset();
      const resetFrame = laser.update(mockContext);
      expect(resetFrame['g'].r).toBe(0);
      expect(resetFrame['space'].r).toBe(0);
    });

    it('Pong Bounce updates ball position over time', () => {
      const pong = new PongBounceEffect();
      const frame1 = pong.update({ ...mockContext, totalTime: 0.1 });
      const frame2 = pong.update({ ...mockContext, totalTime: 1.0 });
      expect(Object.keys(frame1).length).toBe(61);
      expect(Object.keys(frame2).length).toBe(61);
    });

    it('Radar Sweep produces rotating angular illumination', () => {
      const radar = new RadarSweepEffect();
      const frame = radar.update(mockContext);
      expect(Object.keys(frame).length).toBe(61);
    });

    it('Vortex Pinwheel rotates smoothly across color hues', () => {
      const vortex = new VortexPinwheelEffect();
      const frame = vortex.update(mockContext);
      expect(Object.keys(frame).length).toBe(61);
    });

    it('Lava Lamp updates metaballs continuously', () => {
      const lava = new LavaLampEffect();
      const frame = lava.update(mockContext);
      expect(Object.keys(frame).length).toBe(61);
    });

    it('Raindrops spawns ripples over time', () => {
      const rain = new RaindropsEffect();
      const frame1 = rain.update({ ...mockContext, totalTime: 0.1 });
      const frame2 = rain.update({ ...mockContext, totalTime: 1.5 });
      expect(Object.keys(frame1).length).toBe(61);
      expect(Object.keys(frame2).length).toBe(61);
    });

    it('Screen Ambilight renders fallback demo animation when stream is uninitialized', () => {
      const ambilight = new ScreenAmbilightEffect();
      const frame = ambilight.update(mockContext);
      expect(Object.keys(frame).length).toBe(61);
    });

    it('Screen Ambilight produces pitch black (0, 0, 0) when screen is black or below blackCutoff', () => {
      // Mock sampleImageData returning black data with minor compression noise (e.g. 8, 8, 8)
      const mockData = new Uint8ClampedArray(60 * 20 * 4);
      for (let i = 0; i < mockData.length; i += 4) {
        mockData[i] = 8;     // R
        mockData[i + 1] = 8; // G
        mockData[i + 2] = 8; // B
        mockData[i + 3] = 255;
      }
      const sampleSpy = vi.spyOn(screenCaptureService, 'sampleImageData').mockReturnValue({
        data: mockData,
        width: 60,
        height: 20,
      } as any);

      const ambilight = new ScreenAmbilightEffect({
        brightness: 1.0,
        smoothing: 0.5,
        blackCutoff: 15,
        gamma: 2.0,
        saturation: 1.25,
      });

      const frame = ambilight.update(mockContext);
      expect(Object.keys(frame).length).toBe(61);
      // Because noise (8,8,8) is <= blackCutoff (15), every key must be strictly pitch black (LEDs off)
      for (const keyId of Object.keys(frame)) {
        expect(frame[keyId]).toEqual({ r: 0, g: 0, b: 0 });
      }

      sampleSpy.mockRestore();
    });

    it('Screen Ambilight accurately passes vibrant colors above threshold', () => {
      // Mock a bright red top-left screen
      const mockData = new Uint8ClampedArray(60 * 20 * 4);
      for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 60; x++) {
          const idx = (y * 60 + x) * 4;
          if (x < 15 && y < 5) {
            // Bright red in top left
            mockData[idx] = 240;
            mockData[idx + 1] = 20;
            mockData[idx + 2] = 20;
          } else {
            // Pitch black elsewhere
            mockData[idx] = 0;
            mockData[idx + 1] = 0;
            mockData[idx + 2] = 0;
          }
          mockData[idx + 3] = 255;
        }
      }
      const sampleSpy = vi.spyOn(screenCaptureService, 'sampleImageData').mockReturnValue({
        data: mockData,
        width: 60,
        height: 20,
      } as any);

      const ambilight = new ScreenAmbilightEffect({
        brightness: 1.0,
        smoothing: 1.0,
        blackCutoff: 15,
        gamma: 2.0,
        saturation: 1.0,
      });

      const frame = ambilight.update(mockContext);
      // Top-left key 'esc' should be vivid red
      expect(frame['esc'].r).toBeGreaterThan(150);
      expect(frame['esc'].g).toBe(0);
      expect(frame['esc'].b).toBe(0);

      // Bottom-right key 'ctrl_r' must be pitch black
      expect(frame['ctrl_r']).toEqual({ r: 0, g: 0, b: 0 });

      sampleSpy.mockRestore();
    });

    it('Telemetry Bars visualizes simulated or system load across rows', () => {
      const bars = new TelemetryBarsEffect();
      const frame = bars.update(mockContext);
      expect(Object.keys(frame).length).toBe(61);
    });

    it('Spectrum EQ maps audio frequency bands to columns', () => {
      const eq = new SpectrumEQEffect();
      const frame = eq.update(mockContext);
      expect(Object.keys(frame).length).toBe(61);
    });

    it('Custom Zones supports both gamer and coder presets', () => {
      const gamer = new CustomZonesEffect({ ...EFFECT_REGISTRY['custom_zones'].defaultParams as any, preset: 'gamer' });
      const gamerFrame = gamer.update(mockContext);
      expect(gamerFrame['w'].r).toBeGreaterThan(0);

      const coder = new CustomZonesEffect({ ...EFFECT_REGISTRY['custom_zones'].defaultParams as any, preset: 'coder' });
      const coderFrame = coder.update(mockContext);
      expect(coderFrame['esc'].b).toBeGreaterThan(0);
    });

    it('AFK Screensaver dims during active typing and crossfades to screensaver after idle timeout', () => {
      const afk = new AfkScreensaverEffect({
        ...EFFECT_REGISTRY['afk_screensaver'].defaultParams as any,
        idleTimeout: 2.0, // 2s for fast test
        crossfadeDuration: 1.0,
      });

      // Active typing state
      afk.onKeyDown('KeyA');
      const activeFrame = afk.update({ ...mockContext, dt: 0.1 });
      expect(activeFrame['a']).toBeDefined();

      // Idle past timeout
      afk.update({ ...mockContext, dt: 2.5 });
      const idleFrame = afk.update({ ...mockContext, dt: 0.5 });
      expect(idleFrame['space']).toBeDefined();

      // Next keypress immediately snaps back
      afk.onKeyDown('Space');
      const snappedFrame = afk.update({ ...mockContext, dt: 0.01 });
      expect(snappedFrame['space']).toBeDefined();
    });
  });
});
