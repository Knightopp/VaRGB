import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE } from '../layout';
import { applyBrightness, hslToRgb, lerpColor } from '../color';

export interface WpmOverdriveParams {
  brightness: number;
}

interface Spark {
  keyId: string;
  age: number; // Seconds
}

export class WpmOverdriveEffect implements ILightingEffect {
  readonly type = 'wpm_overdrive' as const;
  readonly name = 'WPM Overdrive';

  private keyTimestamps: number[] = [];
  private sparks: Spark[] = [];
  private currentWpm: number = 0;

  constructor(public params: WpmOverdriveParams = { ...DEFAULT_WPM_OVERDRIVE_PARAMS }) {}

  reset(): void {
    this.keyTimestamps = [];
    this.sparks = [];
    this.currentWpm = 0;
  }

  onKeyDown(code: string): void {
    const now = performance.now() / 1000.0;
    this.keyTimestamps.push(now);

    const key = KEY_BY_CODE[code];
    if (key) {
      this.sparks.push({ keyId: key.id, age: 0 });
    }
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.min(ctx.dt, 0.1);
    const now = performance.now() / 1000.0;

    // Filter keystrokes in last 5.0 seconds
    this.keyTimestamps = this.keyTimestamps.filter(t => now - t <= 5.0);
    const keysIn5s = this.keyTimestamps.length;
    // WPM = (keystrokes / 5) * 12 = keysIn5s * 2.4
    // Smooth towards calculated WPM
    const targetWpm = (keysIn5s / 5.0) * 60.0 / 5.0; // Standard: 5 chars per word -> keysIn5s / 5 * 12
    this.currentWpm += (targetWpm - this.currentWpm) * Math.min(1.0, dt * 5.0);

    // Update sparks
    for (const s of this.sparks) {
      s.age += dt;
    }
    this.sparks = this.sparks.filter(s => s.age < 0.35);

    const frame: KeyFrameColor = {};
    const keys = ctx.keys ?? K630_LAYOUT;
    const wpm = this.currentWpm;

    // Palette constants
    const C_CYAN: RGBColor = { r: 0, g: 220, b: 255 };
    const C_CYAN_DIM: RGBColor = { r: 0, g: 30, b: 70 };
    const C_PURPLE: RGBColor = { r: 180, g: 0, b: 255 };
    const C_MAGENTA: RGBColor = { r: 255, g: 0, b: 120 };
    const C_WHITE: RGBColor = { r: 255, g: 255, b: 255 };

    if (wpm < 35) {
      // Tier 1: Calm cyan breathing
      const breath = (Math.sin(ctx.totalTime * 1.5) + 1.0) / 2.0;
      const baseCol = lerpColor(C_CYAN_DIM, C_CYAN, breath * 0.7);

      for (const key of keys) {
        frame[key.id] = applyBrightness(baseCol, this.params.brightness);
      }
    } else if (wpm < 75) {
      // Tier 2: Neon purple pulse + horizontal speed lines inward
      const pulseSpeed = 3.0 + (wpm - 35) * 0.1;
      const pulse = (Math.sin(ctx.totalTime * pulseSpeed) + 1.0) / 2.0;
      const baseCol = lerpColor(C_PURPLE, C_MAGENTA, pulse);

      // Speed lines moving inward from column 0 and column 13
      const lineProgress = (ctx.totalTime * 6.0) % 7.0; // 0..7

      for (const key of keys) {
        const c = key.gridX;
        const distFromEdge = Math.min(c, 13 - c);
        const lineIntensity = Math.max(0, 1.0 - Math.abs(distFromEdge - lineProgress));

        const finalCol = lerpColor(baseCol, C_WHITE, lineIntensity * 0.85);
        frame[key.id] = applyBrightness(finalCol, this.params.brightness);
      }
    } else {
      // Tier 3: Full nitro mode! High-speed chroma shift + spark bursts
      const chromaHue = (ctx.totalTime * 2.5 + wpm * 0.01) % 1.0;

      for (const key of keys) {
        const keyHue = (chromaHue + key.normX * 0.4 + key.normY * 0.3) % 1.0;
        let col = hslToRgb(keyHue, 1.0, 0.55);

        // Check if key has an active spark
        for (const s of this.sparks) {
          if (s.keyId === key.id) {
            const sparkInt = Math.max(0, 1.0 - s.age / 0.35);
            col = lerpColor(col, C_WHITE, sparkInt);
            break;
          }
        }

        frame[key.id] = applyBrightness(col, this.params.brightness);
      }
    }

    return frame;
  }
}

export const DEFAULT_WPM_OVERDRIVE_PARAMS: WpmOverdriveParams = {
  brightness: 1.0,
};
