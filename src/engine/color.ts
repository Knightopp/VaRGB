import { RGBColor } from '../types/keyboard';

export function hexToRgb(hex: string): RGBColor {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16) || 0,
      g: parseInt(clean[1] + clean[1], 16) || 0,
      b: parseInt(clean[2] + clean[2], 16) || 0,
    };
  }
  const num = parseInt(clean, 16) || 0;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(c: RGBColor): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(c.r).toString(16).padStart(2, '0');
  const g = clamp(c.g).toString(16).padStart(2, '0');
  const b = clamp(c.b).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

export function lerpColor(c1: RGBColor, c2: RGBColor, t: number): RGBColor {
  const factor = Math.max(0, Math.min(1, t));
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * factor),
    g: Math.round(c1.g + (c2.g - c1.g) * factor),
    b: Math.round(c1.b + (c2.b - c1.b) * factor),
  };
}

export function interpolatePalette(palette: RGBColor[], t: number): RGBColor {
  if (palette.length === 0) return { r: 0, g: 0, b: 0 };
  if (palette.length === 1) return palette[0];

  // Normalized t wrapped to [0, 1)
  let norm = t % 1;
  if (norm < 0) norm += 1;

  const segmentCount = palette.length;
  const scaled = norm * segmentCount;
  const index = Math.floor(scaled);
  const nextIndex = (index + 1) % segmentCount;
  const fraction = scaled - index;

  return lerpColor(palette[index], palette[nextIndex], fraction);
}

export function applyBrightness(color: RGBColor, brightness: number): RGBColor {
  const factor = Math.max(0, Math.min(1, brightness));
  return {
    r: Math.round(color.r * factor),
    g: Math.round(color.g * factor),
    b: Math.round(color.b * factor),
  };
}

export function hslToRgb(h: number, s: number, l: number): RGBColor {
  // h: 0-360, s: 0-1, l: 0-1
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function rgbToCss(color: RGBColor): string {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}
