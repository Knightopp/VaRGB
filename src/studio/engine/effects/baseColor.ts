import { KeyDefinition, RGBColor } from '../../../types/keyboard';
import { StudioLayer } from '../../types/studio';
import { evaluateProperty } from '../interpolation';

export function evaluateBaseColor(
  layer: StudioLayer,
  time: number,
  _key: KeyDefinition
): RGBColor {
  const colorProp = layer.properties.color;
  const brightnessProp = layer.properties.brightness;

  const color: RGBColor = colorProp ? evaluateProperty<RGBColor>(colorProp, time) : { r: 0, g: 242, b: 255 };
  const brightness: number = brightnessProp ? evaluateProperty<number>(brightnessProp, time) : 100;

  const scale = Math.max(0, Math.min(1, brightness / 100));
  return {
    r: Math.round(color.r * scale),
    g: Math.round(color.g * scale),
    b: Math.round(color.b * scale),
  };
}
