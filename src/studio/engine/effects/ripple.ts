import { KeyDefinition, RGBColor } from '../../../types/keyboard';
import { Point2D, StudioLayer } from '../../types/studio';
import { evaluateProperty } from '../interpolation';

export function evaluateRipple(
  layer: StudioLayer,
  time: number,
  key: KeyDefinition
): RGBColor {
  const originProp = layer.properties.origin;
  const speedProp = layer.properties.speed;
  const widthProp = layer.properties.width;
  const decayProp = layer.properties.decay;
  const colorProp = layer.properties.color;
  const brightnessProp = layer.properties.brightness;

  const origin: Point2D = originProp ? evaluateProperty<Point2D>(originProp, time) : { x: 0.5, y: 0.5 };
  const speed: number = speedProp ? evaluateProperty<number>(speedProp, time) : 0.8;
  const width: number = Math.max(0.02, widthProp ? evaluateProperty<number>(widthProp, time) : 0.18);
  const decay: number = decayProp ? evaluateProperty<number>(decayProp, time) : 40;
  const color: RGBColor = colorProp ? evaluateProperty<RGBColor>(colorProp, time) : { r: 0, g: 242, b: 255 };
  const brightness: number = brightnessProp ? evaluateProperty<number>(brightnessProp, time) : 100;

  // Aspect-corrected distance from origin in normalized space (K630 aspect ratio is ~15:5 = 3:1)
  const dx = (key.normX - origin.x) * 2.0; // scale X so ripple appears circular
  const dy = (key.normY - origin.y);
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Expanding ripple front
  const phase = dist / width - time * speed;
  const cycleFrac = ((phase % 1) + 1) % 1;

  // Crest intensity: sine bell curve
  const bell = Math.sin(cycleFrac * Math.PI);
  const waveIntensity = Math.pow(Math.max(0, bell), 3);

  // Distance decay
  const falloff = Math.exp(-dist * (decay / 15));
  const intensity = waveIntensity * falloff;

  const scale = Math.max(0, Math.min(1, (brightness / 100) * intensity));
  return {
    r: Math.max(0, Math.min(255, Math.round(color.r * scale))),
    g: Math.max(0, Math.min(255, Math.round(color.g * scale))),
    b: Math.max(0, Math.min(255, Math.round(color.b * scale))),
  };
}
