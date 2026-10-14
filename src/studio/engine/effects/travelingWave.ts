import { KeyDefinition, RGBColor } from '../../../types/keyboard';
import { ColorStop, StudioLayer } from '../../types/studio';
import { evaluateProperty, sampleColorStops } from '../interpolation';

export function evaluateTravelingWave(
  layer: StudioLayer,
  time: number,
  key: KeyDefinition
): RGBColor {
  const directionProp = layer.properties.direction;
  const speedProp = layer.properties.speed;
  const widthProp = layer.properties.width;
  const colorProp = layer.properties.color;
  const colorStopsProp = layer.properties.colorStops;
  const brightnessProp = layer.properties.brightness;
  const phaseProp = layer.properties.phase;

  const directionDeg = directionProp ? evaluateProperty<number>(directionProp, time) : 0;
  const speed = speedProp ? evaluateProperty<number>(speedProp, time) : 1.0;
  const width = Math.max(0.05, widthProp ? evaluateProperty<number>(widthProp, time) : 0.5);
  const brightness = Math.max(0, Math.min(100, brightnessProp ? evaluateProperty<number>(brightnessProp, time) : 100));
  const phaseDeg = phaseProp ? evaluateProperty<number>(phaseProp, time) : 0;

  // Use normX and normY (keyboard normalized coordinates [0, 1])
  const nx = key.normX;
  const ny = key.normY;

  // Convert direction to radians
  const rad = (directionDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Projection along wave direction
  const projection = nx * cos + ny * sin;

  // Wave phase over time
  const phaseOffset = phaseDeg / 360;
  const waveCoord = (projection / width) - (time * speed) - phaseOffset;

  // Normalized wave cycle in [0, 1]
  const cycleFrac = ((waveCoord % 1) + 1) % 1;

  let baseRgb: RGBColor;

  if (colorStopsProp && colorStopsProp.staticValue && (colorStopsProp.staticValue as ColorStop[]).length > 0) {
    const stops = evaluateProperty<ColorStop[]>(colorStopsProp, time);
    baseRgb = sampleColorStops(stops, cycleFrac);
  } else {
    // Single wave color with smooth sinusoidal crest
    const waveColor = colorProp ? evaluateProperty<RGBColor>(colorProp, time) : { r: 0, g: 242, b: 255 };
    // Smooth bell curve intensity centered on wave crest (cycleFrac = 0.5)
    const bell = Math.sin(cycleFrac * Math.PI);
    const intensity = Math.pow(Math.max(0, bell), 2); // sharper crest

    baseRgb = {
      r: Math.round(waveColor.r * intensity),
      g: Math.round(waveColor.g * intensity),
      b: Math.round(waveColor.b * intensity),
    };
  }

  const bScale = brightness / 100;
  return {
    r: Math.max(0, Math.min(255, Math.round(baseRgb.r * bScale))),
    g: Math.max(0, Math.min(255, Math.round(baseRgb.g * bScale))),
    b: Math.max(0, Math.min(255, Math.round(baseRgb.b * bScale))),
  };
}
