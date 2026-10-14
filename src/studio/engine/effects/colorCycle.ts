import { KeyDefinition, RGBColor } from '../../../types/keyboard';
import { ColorStop, StudioLayer } from '../../types/studio';
import { evaluateProperty, sampleColorStops } from '../interpolation';

export const DEFAULT_RAINBOW_STOPS: ColorStop[] = [
  { position: 0.0, color: { r: 255, g: 0, b: 0 } },       // Red
  { position: 0.17, color: { r: 255, g: 140, b: 0 } },    // Orange
  { position: 0.33, color: { r: 255, g: 230, b: 0 } },    // Yellow
  { position: 0.5, color: { r: 0, g: 255, b: 120 } },     // Green
  { position: 0.67, color: { r: 0, g: 220, b: 255 } },    // Cyan
  { position: 0.83, color: { r: 80, g: 60, b: 255 } },    // Indigo/Blue
  { position: 1.0, color: { r: 255, g: 0, b: 0 } },       // Loop back to Red
];

export function evaluateColorCycle(
  layer: StudioLayer,
  time: number,
  key: KeyDefinition
): RGBColor {
  const speedProp = layer.properties.speed;
  const spreadProp = layer.properties.spread;
  const directionProp = layer.properties.direction;
  const brightnessProp = layer.properties.brightness;
  const colorStopsProp = layer.properties.colorStops;

  const speed: number = speedProp ? evaluateProperty<number>(speedProp, time) : 0.5;
  const spread: number = spreadProp ? evaluateProperty<number>(spreadProp, time) : 1.0;
  const directionDeg: number = directionProp ? evaluateProperty<number>(directionProp, time) : 0;
  const brightness: number = brightnessProp ? evaluateProperty<number>(brightnessProp, time) : 100;
  const stops: ColorStop[] = colorStopsProp
    ? evaluateProperty<ColorStop[]>(colorStopsProp, time)
    : DEFAULT_RAINBOW_STOPS;

  const rad = (directionDeg * Math.PI) / 180;
  const spatialOffset = (key.normX * Math.cos(rad) + key.normY * Math.sin(rad)) * spread;

  const samplePos = time * speed + spatialOffset;
  const color = sampleColorStops(stops, samplePos);

  const scale = Math.max(0, Math.min(1, brightness / 100));
  return {
    r: Math.max(0, Math.min(255, Math.round(color.r * scale))),
    g: Math.max(0, Math.min(255, Math.round(color.g * scale))),
    b: Math.max(0, Math.min(255, Math.round(color.b * scale))),
  };
}
