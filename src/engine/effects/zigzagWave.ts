import { ZigzagWaveParams, AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT } from '../layout';
import { applyBrightness, lerpColor, hslToRgb } from '../color';

/**
 * 61 physical keys of the Redragon K630 arranged in a true serpentine zigzag path:
 * Row 0: Left -> Right (esc -> backspace)
 * Row 1: Right -> Left (backslash -> tab)
 * Row 2: Left -> Right (caps -> enter)
 * Row 3: Right -> Left (shift_r -> shift_l)
 * Row 4: Left -> Right (ctrl_l -> ctrl_r)
 */
export const SERPENTINE_KEY_IDS: string[] = [
  // Row 0 (14 keys, Left -> Right)
  'esc', 'num_1', 'num_2', 'num_3', 'num_4', 'num_5', 'num_6', 'num_7', 'num_8', 'num_9', 'num_0', 'minus', 'equal', 'backspace',
  // Row 1 (14 keys, Right -> Left)
  'backslash', 'bracket_r', 'bracket_l', 'p', 'o', 'i', 'u', 'y', 't', 'r', 'e', 'w', 'q', 'tab',
  // Row 2 (13 keys, Left -> Right)
  'caps', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'semicolon', 'quote', 'enter',
  // Row 3 (12 keys, Right -> Left)
  'shift_r', 'slash', 'period', 'comma', 'm', 'n', 'b', 'v', 'c', 'x', 'z', 'shift_l',
  // Row 4 (8 keys, Left -> Right)
  'ctrl_l', 'win', 'alt_l', 'space', 'alt_r', 'fn', 'menu', 'ctrl_r',
];

/**
 * Precompute physical coordinate distances and normalized positions along the serpentine path [0.0 .. 1.0].
 * Accounts for actual physical centers, row spacing, staggered keys, and wide spacebar.
 */
function buildPathCoordinates(): Record<string, number> {
  const layoutMap = new Map(K630_LAYOUT.map((k) => [k.id, k]));
  const distances: number[] = [0];

  for (let i = 1; i < SERPENTINE_KEY_IDS.length; i++) {
    const prevKey = layoutMap.get(SERPENTINE_KEY_IDS[i - 1]);
    const currKey = layoutMap.get(SERPENTINE_KEY_IDS[i]);

    if (!prevKey || !currKey) {
      distances.push(distances[i - 1] + 1.0);
      continue;
    }

    const prevCenterX = prevKey.x + prevKey.uWidth / 2;
    const prevCenterY = prevKey.y + 0.5;
    const currCenterX = currKey.x + currKey.uWidth / 2;
    const currCenterY = currKey.y + 0.5;

    const dx = currCenterX - prevCenterX;
    const dy = currCenterY - prevCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    distances.push(distances[i - 1] + dist);
  }

  const totalLength = distances[distances.length - 1] || 1.0;
  const positions: Record<string, number> = {};

  SERPENTINE_KEY_IDS.forEach((id, idx) => {
    positions[id] = distances[idx] / totalLength;
  });

  return positions;
}

const PATH_POSITIONS = buildPathCoordinates();

export class ZigzagWaveEffect implements ILightingEffect {
  readonly type = 'zigzag_wave';
  readonly name = 'Zigzag Wave';

  // Persistent ping-pong animation state
  private position: number = 0.0; // [0.0 .. 1.0]
  private direction: 1 | -1 = 1;  // +1 forward, -1 backward

  constructor(public params: ZigzagWaveParams = { ...DEFAULT_ZIGZAG_WAVE_PARAMS }) {
    if (params.reverseStart) {
      this.position = 1.0;
      this.direction = -1;
    }
  }

  public getPosition(): number {
    return this.position;
  }

  public getDirection(): 1 | -1 {
    return this.direction;
  }

  public getPathKeys(): string[] {
    return [...SERPENTINE_KEY_IDS];
  }

  public getPathPositions(): Record<string, number> {
    return { ...PATH_POSITIONS };
  }

  public reset(): void {
    if (this.params.reverseStart) {
      this.position = 1.0;
      this.direction = -1;
    } else {
      this.position = 0.0;
      this.direction = 1;
    }
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.max(0.001, Math.min(0.5, ctx.dt));
    // Calibrated speed factor: 1.0 = ~2.5s per full traversal (forward or backward)
    const travelSpeed = Math.max(0.05, this.params.speed) * 0.40;

    // 1. Advance position with true ping-pong reversal at endpoints
    this.position += this.direction * travelSpeed * dt;

    if (this.position >= 1.0) {
      this.position = 1.0;
      this.direction = -1;
    } else if (this.position <= 0.0) {
      this.position = 0.0;
      this.direction = 1;
    }

    const waveWidth = Math.max(0.02, Math.min(0.40, this.params.waveWidth ?? 0.10));
    const trailLength = Math.max(0.05, Math.min(0.80, this.params.trailLength ?? 0.28));
    const halfWidth = waveWidth / 2;
    const masterBrightness = Math.max(0, Math.min(1, this.params.brightness ?? 1.0));

    const isRainbow = this.params.colorMode === 'rainbow' || Boolean(this.params.rainbowMode);
    const colorMode = isRainbow ? 'rainbow' : (this.params.colorMode ?? 'two_color');
    const primary = this.params.primaryColor ?? { r: 0, g: 229, b: 255 };
    const secondary = this.params.secondaryColor ?? { r: 157, g: 0, b: 255 };
    const bgGlow = Boolean(this.params.backgroundGlow);
    const bgColor = this.params.backgroundColor ?? { r: 0, g: 0, b: 0 };

    const head = this.position;
    const dir = this.direction;

    const frame: KeyFrameColor = {};
    const keys = ctx.keys ?? K630_LAYOUT;

    for (const key of keys) {
      const s = PATH_POSITIONS[key.id] ?? 0.0;

      // Distance ahead in direction of travel
      const dAhead = (s - head) * dir;
      // Distance behind along current direct line
      const dBehind = (head - s) * dir;
      // Distance behind wrapped smoothly around the turnaround endpoint
      const dTurn = dir === -1
        ? (2.0 - head - s) // wrapped around endpoint 1.0
        : (head + s);       // wrapped around endpoint 0.0

      let brightness = 0.0;
      let trailFraction = 0.0; // 0.0 = at head crest, 1.0 = at tail tip

      if (dAhead > 0 && dAhead <= halfWidth) {
        // Leading edge of the wave head crest
        brightness = Math.cos((Math.PI / 2) * (dAhead / halfWidth)) ** 2;
        trailFraction = 0.0;
      } else if (dAhead > halfWidth) {
        // Ahead of the wave head: completely unreached
        brightness = 0.0;
      } else {
        // Behind the wave head (or at exact center)
        const dBehindMin = Math.min(
          dBehind >= 0 ? dBehind : Infinity,
          dTurn >= 0 ? dTurn : Infinity
        );

        if (dBehindMin <= halfWidth) {
          // Inside peak crest
          brightness = 1.0;
          trailFraction = 0.0;
        } else if (dBehindMin <= halfWidth + trailLength) {
          // Inside smooth fading trail
          trailFraction = (dBehindMin - halfWidth) / trailLength;
          brightness = Math.cos((Math.PI / 2) * trailFraction) ** 2;
        } else {
          // Beyond trail end
          brightness = 0.0;
        }
      }

      // Compute color based on scheme
      let keyColor: RGBColor;
      if (colorMode === 'rainbow') {
        // Stable chromatic rainbow mapped to key's physical path position
        const hue = (s * 360) % 360;
        keyColor = hslToRgb(hue, 1.0, 0.5);
      } else if (colorMode === 'two_color') {
        // Smooth gradient from primary (head) to secondary (tail)
        keyColor = lerpColor(primary, secondary, trailFraction);
      } else {
        // Single color
        keyColor = primary;
      }

      if (brightness > 0.002) {
        frame[key.id] = applyBrightness(keyColor, brightness * masterBrightness);
      } else if (bgGlow || (bgColor.r > 0 || bgColor.g > 0 || bgColor.b > 0)) {
        frame[key.id] = applyBrightness(bgColor, (bgGlow ? 0.15 : 1.0) * masterBrightness);
      } else {
        frame[key.id] = { r: 0, g: 0, b: 0 };
      }
    }

    return frame;
  }
}

export const DEFAULT_ZIGZAG_WAVE_PARAMS: ZigzagWaveParams = {
  speed: 1.2,
  waveWidth: 0.10,
  trailLength: 0.28,
  brightness: 1.0,
  colorMode: 'two_color',
  primaryColor: { r: 0, g: 229, b: 255 },    // Neon Cyan head
  secondaryColor: { r: 157, g: 0, b: 255 },  // Electric Violet tail
  rainbowMode: false,
  backgroundGlow: false,
  backgroundColor: { r: 0, g: 0, b: 0 },     // True black background
  reverseStart: false,
};
