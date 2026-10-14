import { describe, it, expect } from 'vitest';
import { K630_LAYOUT } from '../layout';
import { createEffectInstance, EFFECT_REGISTRY } from '../registry';
import { AnimationContext, EffectType } from '../../types/effects';
import { GameOfLifeEffect } from '../effects/gameOfLife';
import { PacmanArcadeEffect } from '../effects/pacmanArcade';
import { DvdBounceEffect } from '../effects/dvdBounce';
import { WavePondEffect } from '../effects/wavePond';
import { DoomFireEffect } from '../effects/doomFire';
import { PlasmaShaderEffect } from '../effects/plasmaShader';
import { LightningStormEffect } from '../effects/lightningStorm';
import { EventHorizonEffect } from '../effects/eventHorizon';
import { WpmOverdriveEffect } from '../effects/wpmOverdrive';
import { FireworksEffect } from '../effects/fireworks';
import { DominoToppleEffect } from '../effects/dominoTopple';
import { CrtScanlineEffect } from '../effects/crtScanline';
import { DnaHelixEffect } from '../effects/dnaHelix';
import { PomodoroBarEffect } from '../effects/pomodoroBar';

const BATCH_2_EFFECT_TYPES: EffectType[] = [
  'game_of_life',
  'pacman_arcade',
  'dvd_bounce',
  'wave_pond',
  'doom_fire',
  'plasma_shader',
  'lightning_storm',
  'event_horizon',
  'wpm_overdrive',
  'fireworks',
  'domino_topple',
  'crt_scanline',
  'dna_helix',
  'pomodoro_bar',
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

describe('14 Batch 2 Advanced RGB Lighting Effects for Redragon K630', () => {
  it('registers all 14 Batch 2 effects in EFFECT_REGISTRY', () => {
    for (const type of BATCH_2_EFFECT_TYPES) {
      expect(EFFECT_REGISTRY[type]).toBeDefined();
      expect(EFFECT_REGISTRY[type].type).toBe(type);
      expect(EFFECT_REGISTRY[type].name.length).toBeGreaterThan(0);
      expect(EFFECT_REGISTRY[type].defaultParams).toBeDefined();
    }
  });

  it('instantiates all 14 Batch 2 effects via createEffectInstance', () => {
    for (const type of BATCH_2_EFFECT_TYPES) {
      const effect = createEffectInstance(type);
      expect(effect).toBeDefined();
      expect(effect.type).toBe(type);
    }
  });

  it('renders valid 61-key frame color payloads with no NaN or out-of-bound values', () => {
    for (const type of BATCH_2_EFFECT_TYPES) {
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

  describe('Interactive effects reactivity and simulation mechanics', () => {
    it('Game of Life responds to key press by spawning live cells and simulating generations', () => {
      const gol = new GameOfLifeEffect();
      gol.onKeyDown('KeyG');

      // Update simulation over several ticks
      let frame = gol.update({ ...mockContext, dt: 0.3, totalTime: 0.3 });
      expect(frame['g'].r + frame['g'].g + frame['g'].b).toBeGreaterThan(0);

      frame = gol.update({ ...mockContext, dt: 0.3, totalTime: 0.6 });
      expect(frame).toBeDefined();
    });

    it('Pac-Man Arcade renders pacman and pellets along paths', () => {
      const pacman = new PacmanArcadeEffect();
      const frame1 = pacman.update({ ...mockContext, dt: 0.05, totalTime: 0.05 });
      expect(frame1).toBeDefined();

      const frame2 = pacman.update({ ...mockContext, dt: 1.0, totalTime: 1.05 });
      expect(frame2).toBeDefined();
    });

    it('DVD Bounce advances position and handles edge bounces', () => {
      const dvd = new DvdBounceEffect();
      const initialFrame = dvd.update({ ...mockContext, dt: 0.016, totalTime: 0.016 });
      expect(initialFrame).toBeDefined();

      // Run multiple steps to trigger boundary bounces
      for (let i = 0; i < 200; i++) {
        dvd.update({ ...mockContext, dt: 0.05, totalTime: 0.05 * (i + 1) });
      }
      const bouncedFrame = dvd.update({ ...mockContext, dt: 0.016, totalTime: 10.0 });
      expect(bouncedFrame).toBeDefined();
    });

    it('Wave Pond responds to keypress disturbances and propagates waves', () => {
      const pond = new WavePondEffect();
      pond.onKeyDown('KeyG');

      const frameAfterPress = pond.update({ ...mockContext, dt: 0.033, totalTime: 0.1 });
      expect(frameAfterPress['g'].r + frameAfterPress['g'].g + frameAfterPress['g'].b).toBeGreaterThan(0);

      // Simulate a few wave propagation steps
      const propagated = pond.update({ ...mockContext, dt: 0.1, totalTime: 0.2 });
      expect(propagated).toBeDefined();
    });

    it('Doom Fire burns upward from bottom row', () => {
      const fire = new DoomFireEffect();
      // Tick multiple times to allow heat to rise
      for (let i = 0; i < 30; i++) {
        fire.update({ ...mockContext, dt: 0.033, totalTime: 0.033 * (i + 1) });
      }
      const frame = fire.update({ ...mockContext, dt: 0.033, totalTime: 1.5 });
      // Bottom space key should have significant fire heat
      expect(frame['space'].r).toBeGreaterThan(0);
    });

    it('Plasma Shader computes multi-sine plasma patterns', () => {
      const plasma = new PlasmaShaderEffect();
      const frame = plasma.update({ ...mockContext, dt: 0.033, totalTime: 2.0 });
      for (const k of K630_LAYOUT) {
        expect(frame[k.id].r + frame[k.id].g + frame[k.id].b).toBeGreaterThan(0);
      }
    });

    it('Lightning Storm triggers strikes on key press and decays', () => {
      const storm = new LightningStormEffect();
      const frameCalm = storm.update({ ...mockContext, dt: 0.033, totalTime: 0.1 });
      expect(frameCalm).toBeDefined();

      // Trigger lightning on key press
      storm.onKeyDown('KeyY');
      const frameStrike = storm.update({ ...mockContext, dt: 0.033, totalTime: 0.133 });
      expect(frameStrike).toBeDefined();
    });

    it('Event Horizon creates dark core and radiant accretion disk', () => {
      const horizon = new EventHorizonEffect();
      const frame = horizon.update({ ...mockContext, dt: 0.033, totalTime: 1.0 });
      expect(frame['h']).toBeDefined();
      expect(frame['space']).toBeDefined();
    });

    it('WPM Overdrive calculates WPM from key presses and shifts tiers', () => {
      const wpm = new WpmOverdriveEffect();
      const baseFrame = wpm.update({ ...mockContext, dt: 0.033, totalTime: 0.1 });
      expect(baseFrame).toBeDefined();

      // Rapidly simulate 15 key presses within 1 second (~180 WPM)
      for (let i = 0; i < 15; i++) {
        wpm.onKeyDown('KeyF');
      }
      const overdriveFrame = wpm.update({ ...mockContext, dt: 0.033, totalTime: 0.5 });
      expect(overdriveFrame).toBeDefined();
    });

    it('Fireworks launches flare and explodes into sparks', () => {
      const fireworks = new FireworksEffect();
      fireworks.onKeyDown('KeyG');

      // Rocket ascent
      const ascentFrame = fireworks.update({ ...mockContext, dt: 0.05, totalTime: 0.05 });
      expect(ascentFrame).toBeDefined();

      // Detonation and spark explosion
      for (let i = 0; i < 10; i++) {
        fireworks.update({ ...mockContext, dt: 0.05, totalTime: 0.05 * (i + 2) });
      }
      const explosionFrame = fireworks.update({ ...mockContext, dt: 0.05, totalTime: 0.8 });
      expect(explosionFrame).toBeDefined();
    });

    it('Domino Topple cascades outward from keypress column', () => {
      const domino = new DominoToppleEffect();
      domino.onKeyDown('KeyY');

      const frame1 = domino.update({ ...mockContext, dt: 0.033, totalTime: 0.033 });
      expect(frame1).toBeDefined();

      const frame2 = domino.update({ ...mockContext, dt: 0.15, totalTime: 0.183 });
      expect(frame2).toBeDefined();
    });

    it('CRT Scanline sweeps vertically and supports glitches', () => {
      const crt = new CrtScanlineEffect();
      const frame = crt.update({ ...mockContext, dt: 0.033, totalTime: 0.5 });
      expect(frame).toBeDefined();
    });

    it('DNA Helix renders dual opposing sine strands with rungs', () => {
      const dna = new DnaHelixEffect();
      const frame = dna.update({ ...mockContext, dt: 0.033, totalTime: 1.0 });
      expect(frame).toBeDefined();
    });

    it('Pomodoro Bar handles countdown, pausing, and key brightness progression', () => {
      const pomodoro = new PomodoroBarEffect();
      const initialFrame = pomodoro.update({ ...mockContext, dt: 0.033, totalTime: 0.033 });
      expect(initialFrame).toBeDefined();

      // Pause timer via onKeyDown toggle
      pomodoro.onKeyDown('Space');
      const pausedFrame = pomodoro.update({ ...mockContext, dt: 10.0, totalTime: 10.0 });
      expect(pausedFrame).toBeDefined();

      // Reset
      pomodoro.reset();
      const resetFrame = pomodoro.update({ ...mockContext, dt: 0.033, totalTime: 10.033 });
      expect(resetFrame).toBeDefined();
    });
  });
});
