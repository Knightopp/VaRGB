import { KeyDefinition, RGBColor } from '../../../types/keyboard';
import { AnimatableProperty, LayerType, StudioLayer } from '../../types/studio';
import { evaluateBaseColor } from './baseColor';
import { evaluateTravelingWave } from './travelingWave';
import { evaluatePulse } from './pulse';
import { evaluateColorCycle, DEFAULT_RAINBOW_STOPS } from './colorCycle';
import { evaluateRipple } from './ripple';

export {
  evaluateBaseColor,
  evaluateTravelingWave,
  evaluatePulse,
  evaluateColorCycle,
  evaluateRipple,
  DEFAULT_RAINBOW_STOPS,
};

export function evaluateLayerForSingleKey(
  layer: StudioLayer,
  time: number,
  key: KeyDefinition
): RGBColor {
  if (!layer.visible) {
    return { r: 0, g: 0, b: 0 };
  }

  // Check if this key is targeted by the layer
  if (layer.targetKeys !== 'all' && !layer.targetKeys.includes(key.id)) {
    return { r: 0, g: 0, b: 0 };
  }

  let rgb: RGBColor;
  switch (layer.type) {
    case 'base_color':
      rgb = evaluateBaseColor(layer, time, key);
      break;
    case 'traveling_wave':
      rgb = evaluateTravelingWave(layer, time, key);
      break;
    case 'pulse':
      rgb = evaluatePulse(layer, time, key);
      break;
    case 'color_cycle':
      rgb = evaluateColorCycle(layer, time, key);
      break;
    case 'ripple':
      rgb = evaluateRipple(layer, time, key);
      break;
    default:
      rgb = { r: 0, g: 0, b: 0 };
  }

  // Apply layer opacity (0..100)
  const op = Math.max(0, Math.min(100, layer.opacity ?? 100)) / 100;
  if (op < 1) {
    return {
      r: Math.round(rgb.r * op),
      g: Math.round(rgb.g * op),
      b: Math.round(rgb.b * op),
    };
  }

  return rgb;
}

/**
 * Creates default animatable properties for a given layer type
 */
export function createDefaultLayerProperties(type: LayerType): Record<string, AnimatableProperty<any>> {
  switch (type) {
    case 'base_color':
      return {
        color: {
          id: 'color',
          name: 'Color',
          type: 'color',
          animated: false,
          staticValue: { r: 0, g: 242, b: 255 },
          keyframes: [],
        },
        brightness: {
          id: 'brightness',
          name: 'Brightness',
          type: 'number',
          animated: false,
          staticValue: 100,
          keyframes: [],
          min: 0,
          max: 100,
          step: 1,
          unit: '%',
        },
      };

    case 'traveling_wave':
      return {
        direction: {
          id: 'direction',
          name: 'Direction',
          type: 'angle',
          animated: false,
          staticValue: 0,
          keyframes: [],
          min: 0,
          max: 360,
          step: 5,
          unit: '°',
        },
        speed: {
          id: 'speed',
          name: 'Speed',
          type: 'number',
          animated: false,
          staticValue: 1.0,
          keyframes: [],
          min: 0.1,
          max: 5.0,
          step: 0.1,
          unit: 'x',
        },
        width: {
          id: 'width',
          name: 'Wave Width',
          type: 'number',
          animated: false,
          staticValue: 0.45,
          keyframes: [],
          min: 0.1,
          max: 1.5,
          step: 0.05,
        },
        color: {
          id: 'color',
          name: 'Wave Color',
          type: 'color',
          animated: false,
          staticValue: { r: 0, g: 242, b: 255 },
          keyframes: [],
        },
        brightness: {
          id: 'brightness',
          name: 'Brightness',
          type: 'number',
          animated: false,
          staticValue: 100,
          keyframes: [],
          min: 0,
          max: 100,
          step: 1,
          unit: '%',
        },
        phase: {
          id: 'phase',
          name: 'Phase',
          type: 'number',
          animated: false,
          staticValue: 0,
          keyframes: [],
          min: 0,
          max: 360,
          step: 5,
          unit: '°',
        },
      };

    case 'pulse':
      return {
        color: {
          id: 'color',
          name: 'Color',
          type: 'color',
          animated: false,
          staticValue: { r: 255, g: 45, b: 85 },
          keyframes: [],
        },
        speed: {
          id: 'speed',
          name: 'Pulse Frequency',
          type: 'number',
          animated: false,
          staticValue: 1.0,
          keyframes: [],
          min: 0.2,
          max: 5.0,
          step: 0.1,
          unit: 'Hz',
        },
        minBrightness: {
          id: 'minBrightness',
          name: 'Min Intensity',
          type: 'number',
          animated: false,
          staticValue: 0,
          keyframes: [],
          min: 0,
          max: 100,
          step: 1,
          unit: '%',
        },
        maxBrightness: {
          id: 'maxBrightness',
          name: 'Max Intensity',
          type: 'number',
          animated: false,
          staticValue: 100,
          keyframes: [],
          min: 0,
          max: 100,
          step: 1,
          unit: '%',
        },
        phase: {
          id: 'phase',
          name: 'Phase Offset',
          type: 'number',
          animated: false,
          staticValue: 0,
          keyframes: [],
          min: 0,
          max: 360,
          step: 5,
          unit: '°',
        },
      };

    case 'color_cycle':
      return {
        speed: {
          id: 'speed',
          name: 'Cycle Speed',
          type: 'number',
          animated: false,
          staticValue: 0.5,
          keyframes: [],
          min: 0.05,
          max: 3.0,
          step: 0.05,
          unit: 'x',
        },
        spread: {
          id: 'spread',
          name: 'Spatial Spread',
          type: 'number',
          animated: false,
          staticValue: 1.0,
          keyframes: [],
          min: 0,
          max: 3.0,
          step: 0.1,
        },
        direction: {
          id: 'direction',
          name: 'Direction',
          type: 'angle',
          animated: false,
          staticValue: 0,
          keyframes: [],
          min: 0,
          max: 360,
          step: 5,
          unit: '°',
        },
        brightness: {
          id: 'brightness',
          name: 'Brightness',
          type: 'number',
          animated: false,
          staticValue: 100,
          keyframes: [],
          min: 0,
          max: 100,
          step: 1,
          unit: '%',
        },
      };

    case 'ripple':
      return {
        origin: {
          id: 'origin',
          name: 'Origin Center',
          type: 'point',
          animated: false,
          staticValue: { x: 0.5, y: 0.5 },
          keyframes: [],
        },
        speed: {
          id: 'speed',
          name: 'Expansion Speed',
          type: 'number',
          animated: false,
          staticValue: 0.8,
          keyframes: [],
          min: 0.1,
          max: 3.0,
          step: 0.1,
          unit: 'x',
        },
        width: {
          id: 'width',
          name: 'Ripple Width',
          type: 'number',
          animated: false,
          staticValue: 0.15,
          keyframes: [],
          min: 0.02,
          max: 0.5,
          step: 0.01,
        },
        decay: {
          id: 'decay',
          name: 'Distance Decay',
          type: 'number',
          animated: false,
          staticValue: 35,
          keyframes: [],
          min: 0,
          max: 100,
          step: 1,
          unit: '%',
        },
        color: {
          id: 'color',
          name: 'Color',
          type: 'color',
          animated: false,
          staticValue: { r: 0, g: 242, b: 255 },
          keyframes: [],
        },
        brightness: {
          id: 'brightness',
          name: 'Brightness',
          type: 'number',
          animated: false,
          staticValue: 100,
          keyframes: [],
          min: 0,
          max: 100,
          step: 1,
          unit: '%',
        },
      };
  }
}
