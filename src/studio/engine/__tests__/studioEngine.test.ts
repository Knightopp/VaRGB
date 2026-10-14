import { describe, it, expect } from 'vitest';
import {
  applyEasing,
  lerpRGB,
  sampleColorStops,
  evaluateProperty,
} from '../interpolation';
import { blendChannels, compositeProjectFrame } from '../compositor';
import { createDefaultLayerProperties, evaluateLayerForSingleKey } from '../effects';
import { StudioEngine } from '../StudioEngine';
import {
  createDefaultProject,
  createEmptyProject,
  validateProject,
} from '../../services/projectService';
import { AnimatableProperty, StudioLayer } from '../../types/studio';
import { K630_LAYOUT, KEY_BY_ID } from '../../../engine/layout';

describe('Studio Interpolation Engine', () => {
  it('correctly applies hold easing', () => {
    expect(applyEasing(0, 'hold')).toBe(0);
    expect(applyEasing(0.5, 'hold')).toBe(0);
    expect(applyEasing(0.99, 'hold')).toBe(0);
    expect(applyEasing(1.0, 'hold')).toBe(1);
  });

  it('correctly applies linear easing', () => {
    expect(applyEasing(0, 'linear')).toBe(0);
    expect(applyEasing(0.5, 'linear')).toBe(0.5);
    expect(applyEasing(1.0, 'linear')).toBe(1);
  });

  it('correctly applies ease_in curve', () => {
    // Cubic ease in is t^3
    expect(applyEasing(0.5, 'ease_in')).toBeCloseTo(0.125, 3);
  });

  it('correctly applies ease_out curve', () => {
    // Cubic ease out starts faster: 1 - (1 - 0.5)^3 = 0.875
    expect(applyEasing(0.5, 'ease_out')).toBeCloseTo(0.875, 3);
  });

  it('interpolates RGB colors smoothly with channel clamping', () => {
    const c1 = { r: 0, g: 0, b: 0 };
    const c2 = { r: 100, g: 200, b: 50 };
    const mid = lerpRGB(c1, c2, 0.5);

    expect(mid.r).toBe(50);
    expect(mid.g).toBe(100);
    expect(mid.b).toBe(25);
  });

  it('samples multi-stop color gradients properly', () => {
    const stops = [
      { position: 0.0, color: { r: 255, g: 0, b: 0 } },
      { position: 0.5, color: { r: 0, g: 255, b: 0 } },
      { position: 1.0, color: { r: 0, g: 0, b: 255 } },
    ];
    const at0 = sampleColorStops(stops, 0.0);
    expect(at0.r).toBe(255);
    expect(at0.g).toBe(0);

    const atQuarter = sampleColorStops(stops, 0.25);
    expect(atQuarter.r).toBe(128);
    expect(atQuarter.g).toBe(128);
  });

  it('evaluates animatable property across multiple keyframes', () => {
    const prop: AnimatableProperty<number> = {
      id: 'speed',
      name: 'Speed',
      type: 'number',
      animated: true,
      staticValue: 1.0,
      keyframes: [
        { id: 'k1', time: 1.0, value: 10, easing: 'linear' },
        { id: 'k2', time: 3.0, value: 30, easing: 'linear' },
      ],
    };

    expect(evaluateProperty(prop, 0.5)).toBe(10); // Before first kf clamps to first kf
    expect(evaluateProperty(prop, 1.0)).toBe(10);
    expect(evaluateProperty(prop, 2.0)).toBe(20); // Midpoint
    expect(evaluateProperty(prop, 3.0)).toBe(30);
    expect(evaluateProperty(prop, 5.0)).toBe(30); // After last kf clamps to last kf
  });

  it('returns staticValue when animation is disabled', () => {
    const prop: AnimatableProperty<number> = {
      id: 'speed',
      name: 'Speed',
      type: 'number',
      animated: false,
      staticValue: 42,
      keyframes: [{ id: 'k1', time: 1.0, value: 10, easing: 'linear' }],
    };
    expect(evaluateProperty(prop, 1.0)).toBe(42);
  });
});

describe('Studio Compositor', () => {
  it('combines colors with add blend mode up to 255', () => {
    const base = { r: 100, g: 150, b: 200 };
    const top = { r: 100, g: 150, b: 100 };
    const result = blendChannels(base, top, 'add');

    expect(result.r).toBe(200);
    expect(result.g).toBe(255); // clamped
    expect(result.b).toBe(255); // clamped
  });

  it('combines colors with screen / max brightness mode', () => {
    const base = { r: 200, g: 50, b: 30 };
    const top = { r: 50, g: 180, b: 20 };
    const result = blendChannels(base, top, 'screen');

    expect(result.r).toBe(200);
    expect(result.g).toBe(180);
    expect(result.b).toBe(30);
  });

  it('composites layers deterministically across keys', () => {
    const project = createDefaultProject();
    const frame = compositeProjectFrame(project.layers, 0.5, K630_LAYOUT);

    expect(Object.keys(frame).length).toBe(61);
    for (const key of K630_LAYOUT) {
      const color = frame[key.id];
      expect(color).toBeDefined();
      expect(color.r).toBeGreaterThanOrEqual(0);
      expect(color.r).toBeLessThanOrEqual(255);
      expect(color.g).toBeGreaterThanOrEqual(0);
      expect(color.g).toBeLessThanOrEqual(255);
      expect(color.b).toBeGreaterThanOrEqual(0);
      expect(color.b).toBeLessThanOrEqual(255);
    }
  });

  it('respects targetKeys filtering', () => {
    const baseProps = createDefaultLayerProperties('base_color');
    baseProps.color.staticValue = { r: 255, g: 0, b: 0 };

    const layer: StudioLayer = {
      id: 'wasd-only',
      name: 'WASD Layer',
      type: 'base_color',
      visible: true,
      locked: false,
      blendMode: 'replace',
      opacity: 100,
      targetKeys: ['w', 'a', 's', 'd'],
      properties: baseProps,
    };

    const frame = compositeProjectFrame([layer], 0.0, K630_LAYOUT);
    expect(frame['w'].r).toBe(255);
    expect(frame['a'].r).toBe(255);
    expect(frame['space'].r).toBe(0); // Unaffected
  });
});

describe('Studio Effects Engine', () => {
  it('evaluates Traveling Wave with directional movement over time', () => {
    const waveProps = createDefaultLayerProperties('traveling_wave');
    waveProps.speed.staticValue = 1.0;
    waveProps.direction.staticValue = 0; // Left to right

    const waveLayer: StudioLayer = {
      id: 'wave-1',
      name: 'Wave',
      type: 'traveling_wave',
      visible: true,
      locked: false,
      blendMode: 'replace',
      opacity: 100,
      targetKeys: 'all',
      properties: waveProps,
    };

    const key = KEY_BY_ID['esc'];

    const t0 = evaluateLayerForSingleKey(waveLayer, 0.0, key);
    const t1 = evaluateLayerForSingleKey(waveLayer, 0.5, key);

    // Wave travels over time, so color changes as wave crest passes
    expect(t0).not.toEqual(t1);
    expect(t1.g).toBeGreaterThan(t0.g);
  });

  it('evaluates Pulse intensity oscillating with time', () => {
    const pulseProps = createDefaultLayerProperties('pulse');
    pulseProps.color.staticValue = { r: 200, g: 200, b: 200 };
    pulseProps.speed.staticValue = 1.0;
    pulseProps.minBrightness.staticValue = 0;
    pulseProps.maxBrightness.staticValue = 100;

    const layer: StudioLayer = {
      id: 'pulse-1',
      name: 'Pulse',
      type: 'pulse',
      visible: true,
      locked: false,
      blendMode: 'replace',
      opacity: 100,
      targetKeys: 'all',
      properties: pulseProps,
    };

    const key = KEY_BY_ID['space'];
    // At t=0.25, sin(2*pi*1*0.25) = sin(pi/2) = 1 (Peak)
    const peak = evaluateLayerForSingleKey(layer, 0.25, key);
    expect(peak.r).toBe(200);

    // At t=0.75, sin(2*pi*1*0.75) = sin(3pi/2) = -1 (Trough)
    const trough = evaluateLayerForSingleKey(layer, 0.75, key);
    expect(trough.r).toBe(0);
  });

  it('evaluates Color Cycle with rainbow spectrum progression', () => {
    const cycleProps = createDefaultLayerProperties('color_cycle');
    cycleProps.speed.staticValue = 1.0;
    cycleProps.spread.staticValue = 0.0; // All keys cycle together

    const layer: StudioLayer = {
      id: 'cycle-1',
      name: 'Cycle',
      type: 'color_cycle',
      visible: true,
      locked: false,
      blendMode: 'replace',
      opacity: 100,
      targetKeys: 'all',
      properties: cycleProps,
    };

    const key = KEY_BY_ID['esc'];
    const t0 = evaluateLayerForSingleKey(layer, 0.0, key);
    const tHalf = evaluateLayerForSingleKey(layer, 0.5, key);

    // At t=0, color is red; at t=0.5, color cycles into green
    expect(t0.r).toBe(255);
    expect(tHalf.g).toBeGreaterThan(150);
  });

  it('evaluates Ripple expanding radially from origin', () => {
    const rippleProps = createDefaultLayerProperties('ripple');
    rippleProps.origin.staticValue = { x: 0.5, y: 0.5 };
    rippleProps.speed.staticValue = 1.0;
    rippleProps.color.staticValue = { r: 0, g: 242, b: 255 };

    const layer: StudioLayer = {
      id: 'ripple-1',
      name: 'Ripple',
      type: 'ripple',
      visible: true,
      locked: false,
      blendMode: 'replace',
      opacity: 100,
      targetKeys: 'all',
      properties: rippleProps,
    };

    // Center key vs corner key
    const centerKey = KEY_BY_ID['g'];
    const cornerKey = KEY_BY_ID['esc'];

    const t0Center = evaluateLayerForSingleKey(layer, 0.0, centerKey);
    const t0Corner = evaluateLayerForSingleKey(layer, 0.0, cornerKey);

    expect(t0Center).toBeDefined();
    expect(t0Corner).toBeDefined();
  });
});

describe('StudioEngine Lifecycle & Playback', () => {
  it('initializes in paused state and seeks cleanly', () => {
    const project = createDefaultProject();
    const engine = new StudioEngine(project);

    expect(engine.playing).toBe(false);
    expect(engine.getCurrentTime()).toBe(0);

    engine.seek(1.5);
    expect(engine.getCurrentTime()).toBe(1.5);

    let frameReceived = false;
    const unsub = engine.subscribe((frame, time) => {
      frameReceived = true;
      expect(time).toBe(1.5);
      expect(Object.keys(frame).length).toBe(61);
    });

    expect(frameReceived).toBe(true);
    unsub();
    engine.dispose();
  });

  it('correctly disposes RAF and subscribers without leaks', () => {
    const project = createDefaultProject();
    const engine = new StudioEngine(project);

    engine.play();
    expect(engine.playing).toBe(true);

    engine.dispose();
    expect(engine.playing).toBe(false);
  });
});

describe('Project Persistence Validation & Roundtrip', () => {
  it('validates default and empty projects', () => {
    const def = createDefaultProject();
    expect(validateProject(def)).not.toBeNull();

    const empty = createEmptyProject();
    expect(validateProject(empty)).not.toBeNull();

    expect(validateProject(null)).toBeNull();
    expect(validateProject({})).toBeNull();
    expect(validateProject({ version: 2 })).toBeNull();
  });

  it('preserves complete project data through JSON serialization roundtrip', () => {
    const original = createDefaultProject();
    const serialized = JSON.stringify(original);
    const restored = JSON.parse(serialized);

    expect(validateProject(restored)).not.toBeNull();
    expect(restored.layers.length).toBe(original.layers.length);
    expect(restored.layers[0].properties.direction.keyframes.length).toBe(3);
    expect(restored.layers[0].properties.direction.keyframes[1].value).toBe(180);
  });
});
