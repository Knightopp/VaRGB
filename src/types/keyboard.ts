export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface KeyDefinition {
  id: string;
  label: string;
  subLabel?: string;
  row: number;
  col: number;
  uWidth: number;
  x: number;       // In unit coordinates (0 to 15)
  y: number;       // In unit coordinates (0 to 5)
  normX: number;   // In [0, 1] normalized coordinates
  normY: number;   // In [0, 1] normalized coordinates
  gridX: number;   // Grid column (0 to 13) for pixel art matrix
  gridY: number;   // Grid row (0 to 4) for pixel art matrix
  ledIndex: number;// Hardware EVision LED index (from official K630 map)
  code: string;    // Browser KeyboardEvent.code for ripple detection
}

export interface KeyFrameColor {
  [keyId: string]: RGBColor;
}
