import { KeyDefinition, KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT } from '../../engine/layout';
import { LayerBlendMode, StudioLayer } from '../types/studio';
import { evaluateLayerForSingleKey } from './effects';

export function blendChannels(
  base: RGBColor,
  top: RGBColor,
  mode: LayerBlendMode
): RGBColor {
  // If top layer is dark black (unlit), preserve base
  if (top.r === 0 && top.g === 0 && top.b === 0) {
    return base;
  }

  switch (mode) {
    case 'replace':
      return top;

    case 'add':
      return {
        r: Math.min(255, base.r + top.r),
        g: Math.min(255, base.g + top.g),
        b: Math.min(255, base.b + top.b),
      };

    case 'screen':
      // Maximum channel brightness (lighten/screen)
      return {
        r: Math.max(base.r, top.r),
        g: Math.max(base.g, top.g),
        b: Math.max(base.b, top.b),
      };

    case 'multiply':
      return {
        r: Math.round((base.r * top.r) / 255),
        g: Math.round((base.g * top.g) / 255),
        b: Math.round((base.b * top.b) / 255),
      };

    default:
      return top;
  }
}

/**
 * Evaluates an entire project at a given timestamp and returns composite KeyFrameColor for all keys.
 * Layers are ordered such that layer[0] is topmost (composited on top of layer[1], etc.).
 */
export function compositeProjectFrame(
  layers: StudioLayer[],
  time: number,
  keys: KeyDefinition[] = K630_LAYOUT
): KeyFrameColor {
  const result: KeyFrameColor = {};

  // Initialize all keys to black
  for (const key of keys) {
    result[key.id] = { r: 0, g: 0, b: 0 };
  }

  // Filter visible layers
  const visibleLayers = layers.filter((l) => l.visible);
  if (visibleLayers.length === 0) {
    return result;
  }

  // Composite from bottom layer (last in array) up to top layer (first in array)
  for (let i = visibleLayers.length - 1; i >= 0; i--) {
    const layer = visibleLayers[i];

    for (const key of keys) {
      // Check target keys
      if (layer.targetKeys !== 'all' && !layer.targetKeys.includes(key.id)) {
        continue;
      }

      const layerColor = evaluateLayerForSingleKey(layer, time, key);
      const currentColor = result[key.id] || { r: 0, g: 0, b: 0 };

      result[key.id] = blendChannels(currentColor, layerColor, layer.blendMode);
    }
  }

  // Ensure strict clamping
  for (const key of keys) {
    const c = result[key.id];
    result[key.id] = {
      r: Math.max(0, Math.min(255, Math.round(c.r))),
      g: Math.max(0, Math.min(255, Math.round(c.g))),
      b: Math.max(0, Math.min(255, Math.round(c.b))),
    };
  }

  return result;
}
