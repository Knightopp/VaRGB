import { KeyDefinition, RGBColor } from '../../../types/keyboard';
import { StudioLayer } from '../../types/studio';
import { evaluateProperty } from '../interpolation';

export function evaluatePulse(
  layer: StudioLayer,
  time: number,
  _key: KeyDefinition
): RGBColor {
  const colorProp = layer.properties.color;
  const speedProp = layer.properties.speed;
  const minBrightnessProp = layer.properties.minBrightness;
  const maxBrightnessProp = layer.properties.maxBrightness;
  const phaseProp = layer.properties.phase;

  const color: RGBColor = colorProp ? evaluateProperty<RGBColor>(colorProp, time) : { r: 255, g: 50, b: 80 };
  const speed: number = speedProp ? evaluateProperty<number>(speedProp, time) : 1.0;
  const minB: number = minBrightnessProp ? evaluateProperty<number>(minBrightnessProp, time) : 5;
  const maxB: number = maxBrightnessProp ? evaluateProperty<number>(maxBrightnessProp, time) : 100;
  const phaseDeg: number = phaseProp ? evaluateProperty<number>(phaseProp, time) : 0;

  // Sine wave oscillation between minB and maxB
  const phaseRad = (phaseDeg * Math.PI) / 180;
  const wave = (Math.sin(2 * Math.PI * speed * time + phaseRad) + 1) / 2; // 0 to 1
  const currentBrightness = minB + (maxB - minB) * wave;

  const scale = Math.max(0, Math.min(1, currentBrightness / 100));
  return {
    r: Math.max(0, Math.min(255, Math.round(color.r * scale))),
    g: Math.max(0, Math.min(255, Math.round(color.g * scale))),
    b: Math.max(0, Math.min(255, Math.round(color.b * scale))),
  };
}
