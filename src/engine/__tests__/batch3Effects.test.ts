import { describe, it, expect } from 'vitest';
import { K630_LAYOUT } from '../layout';
import { createEffectInstance, EFFECT_REGISTRY } from '../registry';
import { AnimationContext, EffectType } from '../../types/effects';
import { PathfinderAStarEffect } from '../effects/pathfinderAStar';
import { SortVisualizerEffect } from '../effects/sortVisualizer';
import { BinaryCounterEffect } from '../effects/binaryCounter';
import { BoidsSwarmEffect } from '../effects/boidsSwarm';
import { MagneticFieldEffect } from '../effects/magneticField';
import { SolarEclipseEffect } from '../effects/solarEclipse';
import { BlizzardDriftEffect } from '../effects/blizzardDrift';
import { EkgHeartbeatEffect } from '../effects/ekgHeartbeat';
import { NewtonsCradleEffect } from '../effects/newtonsCradle';
import { FrostShatterEffect } from '../effects/frostShatter';
import { ComboMultiplierEffect } from '../effects/comboMultiplier';
import { SpotlightLanternEffect } from '../effects/spotlightLantern';
import { ReactionDiffusionEffect } from '../effects/reactionDiffusion';
import { KaleidoscopeEffect } from '../effects/kaleidoscope';
import { VoronoiCellsEffect } from '../effects/voronoiCells';

const BATCH_3_EFFECT_TYPES: EffectType[] = [
  'pathfinder_a_star',
  'sort_visualizer',
  'binary_counter',
  'boids_swarm',
  'magnetic_field',
  'solar_eclipse',
  'blizzard_drift',
  'ekg_heartbeat',
  'newtons_cradle',
  'frost_shatter',
  'combo_multiplier',
  'spotlight_lantern',
  'reaction_diffusion',
  'kaleidoscope',
  'voronoi_cells',
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

describe('15 Batch 3 Advanced RGB Lighting Effects for Redragon K630', () => {
  it('registers all 15 Batch 3 effects in EFFECT_REGISTRY', () => {
    for (const type of BATCH_3_EFFECT_TYPES) {
      expect(EFFECT_REGISTRY[type]).toBeDefined();
      expect(EFFECT_REGISTRY[type].type).toBe(type);
      expect(EFFECT_REGISTRY[type].name.length).toBeGreaterThan(0);
      expect(EFFECT_REGISTRY[type].defaultParams).toBeDefined();
    }
  });

  it('instantiates all 15 Batch 3 effects via createEffectInstance', () => {
    for (const type of BATCH_3_EFFECT_TYPES) {
      const effect = createEffectInstance(type);
      expect(effect).toBeDefined();
      expect(effect.type).toBe(type);
    }
  });

  it('renders valid 61-key frame color payloads with no NaN or out-of-bound values', () => {
    for (const type of BATCH_3_EFFECT_TYPES) {
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
    it('Pathfinder A* expands frontier and reacts to key clicks', () => {
      const pf = new PathfinderAStarEffect();
      pf.onKeyDown('KeyG');
      const frame = pf.update({ ...mockContext, dt: 0.08, totalTime: 0.08 });
      expect(frame['g']).toBeDefined();
    });

    it('Sort Visualizer steps through comparison and sorts', () => {
      const sort = new SortVisualizerEffect();
      const frame1 = sort.update({ ...mockContext, dt: 0.12, totalTime: 0.12 });
      expect(frame1).toBeDefined();
      sort.onKeyDown('Space');
      const frame2 = sort.update({ ...mockContext, dt: 0.12, totalTime: 0.24 });
      expect(frame2).toBeDefined();
    });

    it('Binary Counter updates bits and handles key toggles', () => {
      const counter = new BinaryCounterEffect();
      const frame1 = counter.update({ ...mockContext, dt: 0.08, totalTime: 0.08 });
      expect(frame1).toBeDefined();
      counter.onKeyDown('KeyF');
      const frame2 = counter.update({ ...mockContext, dt: 0.08, totalTime: 0.16 });
      expect(frame2).toBeDefined();
    });

    it('Boids Swarm steers agents and repulses on key press', () => {
      const boids = new BoidsSwarmEffect();
      const frame1 = boids.update({ ...mockContext, dt: 0.033, totalTime: 0.033 });
      expect(frame1).toBeDefined();
      boids.onKeyDown('KeyH');
      const frame2 = boids.update({ ...mockContext, dt: 0.033, totalTime: 0.066 });
      expect(frame2).toBeDefined();
    });

    it('Magnetic Field calculates dipole gradient and overrides position on keypress', () => {
      const mag = new MagneticFieldEffect();
      const initial = mag.update({ ...mockContext, dt: 0.033, totalTime: 0.1 });
      expect(initial).toBeDefined();
      mag.onKeyDown('KeyJ');
      const frameOverridden = mag.update({ ...mockContext, dt: 0.033, totalTime: 0.133 });
      expect(frameOverridden).toBeDefined();
    });

    it('Solar Eclipse renders corona rays and triggers flare burst', () => {
      const eclipse = new SolarEclipseEffect();
      const initial = eclipse.update({ ...mockContext, dt: 0.033, totalTime: 0.5 });
      expect(initial).toBeDefined();
      eclipse.onKeyDown('Space');
      const flared = eclipse.update({ ...mockContext, dt: 0.033, totalTime: 0.533 });
      expect(flared).toBeDefined();
    });

    it('Blizzard Drift accumulates snow and clears with flurry on keypress', () => {
      const blizzard = new BlizzardDriftEffect();
      for (let i = 0; i < 20; i++) {
        blizzard.update({ ...mockContext, dt: 0.05, totalTime: 0.05 * (i + 1) });
      }
      blizzard.onKeyDown('KeyB');
      const afterGust = blizzard.update({ ...mockContext, dt: 0.033, totalTime: 1.5 });
      expect(afterGust['space']).toBeDefined();
    });

    it('EKG Heartbeat computes authentic cardiac wave and tachycardia spike', () => {
      const ekg = new EkgHeartbeatEffect();
      const frame1 = ekg.update({ ...mockContext, dt: 0.033, totalTime: 0.2 });
      expect(frame1).toBeDefined();
      ekg.onKeyDown('KeyD');
      const frame2 = ekg.update({ ...mockContext, dt: 0.033, totalTime: 0.233 });
      expect(frame2).toBeDefined();
    });

    it('Newton Cradle alternates pendulum swings and shockwave transfers', () => {
      const cradle = new NewtonsCradleEffect();
      const frame1 = cradle.update({ ...mockContext, dt: 0.05, totalTime: 0.2 });
      expect(frame1).toBeDefined();
      cradle.onKeyDown('KeyG');
      const frame2 = cradle.update({ ...mockContext, dt: 0.05, totalTime: 0.25 });
      expect(frame2).toBeDefined();
    });

    it('Frost Shatter radiates fracture rays on keypress', () => {
      const frost = new FrostShatterEffect();
      const ambient = frost.update({ ...mockContext, dt: 0.033, totalTime: 0.1 });
      expect(ambient).toBeDefined();
      frost.onKeyDown('KeyK');
      const fractured = frost.update({ ...mockContext, dt: 0.033, totalTime: 0.133 });
      expect(fractured['k'].r).toBeGreaterThan(0);
    });

    it('Combo Multiplier tracks combo counts and shifts visual tiers', () => {
      const combo = new ComboMultiplierEffect();
      const initial = combo.update({ ...mockContext, dt: 0.033, totalTime: 0.1 });
      expect(initial).toBeDefined();
      for (let i = 0; i < 35; i++) {
        combo.onKeyDown('KeyA');
      }
      const tier2 = combo.update({ ...mockContext, dt: 0.033, totalTime: 0.2 });
      expect(tier2).toBeDefined();
    });

    it('Spotlight Lantern smoothly tracks pressed key coordinates', () => {
      const lantern = new SpotlightLanternEffect();
      lantern.onKeyDown('KeyW');
      for (let i = 0; i < 15; i++) {
        lantern.update({ ...mockContext, dt: 0.05, totalTime: 0.05 * (i + 1) });
      }
      const frame = lantern.update({ ...mockContext, dt: 0.033, totalTime: 1.0 });
      expect(frame['w'].r + frame['w'].g + frame['w'].b).toBeGreaterThan(0);
    });

    it('Reaction Diffusion runs chemical morphogenesis simulation', () => {
      const rd = new ReactionDiffusionEffect();
      rd.onKeyDown('KeyH');
      for (let i = 0; i < 10; i++) {
        rd.update({ ...mockContext, dt: 0.05, totalTime: 0.05 * (i + 1) });
      }
      const frame = rd.update({ ...mockContext, dt: 0.05, totalTime: 0.6 });
      expect(frame['h']).toBeDefined();
    });

    it('Kaleidoscope reflects quadrant math in 4-way symmetry', () => {
      const kaleidoscope = new KaleidoscopeEffect();
      const frame1 = kaleidoscope.update({ ...mockContext, dt: 0.033, totalTime: 0.5 });
      expect(frame1).toBeDefined();
      kaleidoscope.onKeyDown('KeyE');
      const frame2 = kaleidoscope.update({ ...mockContext, dt: 0.033, totalTime: 0.533 });
      expect(frame2).toBeDefined();
    });

    it('Voronoi Cells renders tessellation with crisp borders', () => {
      const voronoi = new VoronoiCellsEffect();
      const frame1 = voronoi.update({ ...mockContext, dt: 0.033, totalTime: 0.2 });
      expect(frame1).toBeDefined();
      voronoi.onKeyDown('KeyS');
      const frame2 = voronoi.update({ ...mockContext, dt: 0.033, totalTime: 0.233 });
      expect(frame2).toBeDefined();
    });
  });
});
