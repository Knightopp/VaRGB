import { RGBColor } from '../../types/keyboard';
import {
  AnimatableProperty,
  ColorStop,
  KeyframeEasing,
  Point2D,
} from '../types/studio';

/**
 * Evaluates easing curve for progress factor in [0, 1]
 */
export function applyEasing(factor: number, easing: KeyframeEasing): number {
  const t = Math.max(0, Math.min(1, factor));
  switch (easing) {
    case 'hold':
      return t >= 1 ? 1 : 0;
    case 'linear':
      return t;
    case 'ease_in':
      // Cubic ease-in
      return t * t * t;
    case 'ease_out':
      // Cubic ease-out
      return 1 - Math.pow(1 - t, 3);
    case 'ease_in_out':
      // Smooth cubic ease-in-out
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    default:
      return t;
  }
}

/**
 * Linearly interpolates two numbers
 */
export function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Interpolates two RGB colors smoothly with channel clamping
 */
export function lerpRGB(c1: RGBColor, c2: RGBColor, t: number): RGBColor {
  const factor = Math.max(0, Math.min(1, t));
  return {
    r: Math.max(0, Math.min(255, Math.round(c1.r + (c2.r - c1.r) * factor))),
    g: Math.max(0, Math.min(255, Math.round(c1.g + (c2.g - c1.g) * factor))),
    b: Math.max(0, Math.min(255, Math.round(c1.b + (c2.b - c1.b) * factor))),
  };
}

/**
 * Interpolates 2D points
 */
export function lerpPoint(p1: Point2D, p2: Point2D, t: number): Point2D {
  return {
    x: lerpNumber(p1.x, p2.x, t),
    y: lerpNumber(p1.y, p2.y, t),
  };
}

/**
 * Interpolates color stops list
 */
export function lerpColorStops(s1: ColorStop[], s2: ColorStop[], t: number): ColorStop[] {
  if (!s1 || s1.length === 0) return s2 || [];
  if (!s2 || s2.length === 0) return s1 || [];
  const maxLen = Math.max(s1.length, s2.length);
  const result: ColorStop[] = [];

  for (let i = 0; i < maxLen; i++) {
    const a = s1[Math.min(i, s1.length - 1)];
    const b = s2[Math.min(i, s2.length - 1)];
    result.push({
      position: lerpNumber(a.position, b.position, t),
      color: lerpRGB(a.color, b.color, t),
    });
  }
  return result;
}

/**
 * Evaluates a color from a series of color stops at normalized position pos in [0, 1]
 */
export function sampleColorStops(stops: ColorStop[], pos: number): RGBColor {
  if (!stops || stops.length === 0) {
    return { r: 255, g: 255, b: 255 };
  }
  if (stops.length === 1) {
    return { ...stops[0].color };
  }

  // Wrap or clamp position into [0, 1]
  const p = ((pos % 1) + 1) % 1;

  // Sort stops by position
  const sorted = [...stops].sort((a, b) => a.position - b.position);

  if (p <= sorted[0].position) {
    return { ...sorted[0].color };
  }
  if (p >= sorted[sorted.length - 1].position) {
    return { ...sorted[sorted.length - 1].color };
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i];
    const next = sorted[i + 1];
    if (p >= curr.position && p <= next.position) {
      const span = next.position - curr.position;
      const t = span > 0.00001 ? (p - curr.position) / span : 0;
      return lerpRGB(curr.color, next.color, t);
    }
  }

  return { ...sorted[sorted.length - 1].color };
}

/**
 * Evaluates any typed value between two keyframes based on property type
 */
export function interpolateValues<T>(
  valA: T,
  valB: T,
  type: string,
  progress: number
): T {
  switch (type) {
    case 'number':
    case 'angle':
      return lerpNumber(valA as unknown as number, valB as unknown as number, progress) as unknown as T;
    case 'color':
      return lerpRGB(valA as unknown as RGBColor, valB as unknown as RGBColor, progress) as unknown as T;
    case 'point':
      return lerpPoint(valA as unknown as Point2D, valB as unknown as Point2D, progress) as unknown as T;
    case 'color_stops':
      return lerpColorStops(valA as unknown as ColorStop[], valB as unknown as ColorStop[], progress) as unknown as T;
    default:
      return progress < 1 ? valA : valB;
  }
}

/**
 * Evaluates an AnimatableProperty at a given timestamp in seconds
 */
export function evaluateProperty<T>(property: AnimatableProperty<T>, time: number): T {
  if (!property.animated || !property.keyframes || property.keyframes.length === 0) {
    return property.staticValue;
  }

  const kfs = [...property.keyframes].sort((a, b) => a.time - b.time);

  if (kfs.length === 1 || time <= kfs[0].time) {
    return kfs[0].value;
  }

  if (time >= kfs[kfs.length - 1].time) {
    return kfs[kfs.length - 1].value;
  }

  // Find surrounding keyframes
  for (let i = 0; i < kfs.length - 1; i++) {
    const prev = kfs[i];
    const next = kfs[i + 1];

    if (time >= prev.time && time <= next.time) {
      const duration = next.time - prev.time;
      const rawProgress = duration > 0 ? (time - prev.time) / duration : 0;
      const easedProgress = applyEasing(rawProgress, prev.easing);

      return interpolateValues<T>(prev.value, next.value, property.type, easedProgress);
    }
  }

  return kfs[kfs.length - 1].value;
}
