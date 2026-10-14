import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE } from '../layout';
import { applyBrightness, lerpColor } from '../color';

export interface LightningStormParams {
  brightness: number;
  strikeInterval: number;   // Average seconds between random strikes (default 2.5)
  boltColor: RGBColor;      // Electric violet default
}

interface ActiveBolt {
  nodes: { r: number; c: number }[];
  age: number;             // Seconds
  flashDuration: number;   // Ambient flash duration (0.08s)
  decayDuration: number;   // Bolt decay duration (0.45s)
}

export class LightningStormEffect implements ILightingEffect {
  readonly type = 'lightning_storm' as const;
  readonly name = 'Lightning Storm';

  private timeUntilNextStrike: number = 2.0;
  private bolts: ActiveBolt[] = [];

  constructor(public params: LightningStormParams = { ...DEFAULT_LIGHTNING_STORM_PARAMS }) {}

  reset(): void {
    this.timeUntilNextStrike = 2.0;
    this.bolts = [];
  }

  private triggerStrike(startCol?: number): void {
    let col = typeof startCol === 'number' ? startCol : Math.floor(Math.random() * 14);
    const nodes: { r: number; c: number }[] = [];

    for (let r = 0; r < 5; r++) {
      nodes.push({ r, c: col });
      const jitter = Math.floor(Math.random() * 3) - 1; // -1, 0, +1
      col = Math.max(0, Math.min(13, col + jitter));
    }

    this.bolts.push({
      nodes,
      age: 0,
      flashDuration: 0.08,
      decayDuration: 0.45,
    });
  }

  onKeyDown(code: string): void {
    const key = KEY_BY_CODE[code];
    if (key) {
      this.triggerStrike(key.gridX);
    } else {
      this.triggerStrike();
    }
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.min(ctx.dt, 0.1);

    // Countdown to next automatic storm strike
    this.timeUntilNextStrike -= dt;
    if (this.timeUntilNextStrike <= 0) {
      this.triggerStrike();
      const baseInterval = this.params.strikeInterval ?? 2.5;
      this.timeUntilNextStrike = baseInterval * (0.6 + Math.random() * 0.8);
    }

    // Age active bolts
    for (const b of this.bolts) {
      b.age += dt;
    }
    this.bolts = this.bolts.filter(b => b.age < b.decayDuration);

    // Compute ambient storm cloud breathing
    const breath = (Math.sin(ctx.totalTime * 1.2) + 1.0) / 2.0; // 0..1
    const C_DARK_SKY: RGBColor = { r: 5, g: 11, b: 26 };   // #050B1A
    const C_LIGHT_SKY: RGBColor = { r: 15, g: 30, b: 54 };  // #0F1E36
    let ambientColor = lerpColor(C_DARK_SKY, C_LIGHT_SKY, breath);

    // Check if any bolt is in white-flash window
    let ambientFlash = false;
    for (const b of this.bolts) {
      if (b.age < b.flashDuration) {
        ambientFlash = true;
        break;
      }
    }
    if (ambientFlash) {
      ambientColor = { r: 51, g: 68, b: 119 }; // #334477 sky flash
    }

    // Map bolt intensity per grid cell
    const boltGrid: { color: RGBColor; intensity: number }[][] = Array.from(
      { length: 5 },
      () => Array.from({ length: 14 }, () => ({ color: { r: 0, g: 0, b: 0 }, intensity: 0 }))
    );

    const boltColor = this.params.boltColor ?? { r: 136, g: 0, b: 255 };
    const WHITE: RGBColor = { r: 255, g: 255, b: 255 };

    for (const b of this.bolts) {
      const frac = b.age / b.decayDuration; // 0..1
      const isInitialFlash = b.age < b.flashDuration;
      const cellColor = isInitialFlash ? WHITE : lerpColor(WHITE, boltColor, Math.min(1.0, frac * 2.0));
      const intensity = Math.max(0, 1.0 - frac);

      for (const node of b.nodes) {
        const cur = boltGrid[node.r][node.c];
        if (intensity > cur.intensity) {
          cur.intensity = intensity;
          cur.color = cellColor;
        }
      }
    }

    const frame: KeyFrameColor = {};
    const keys = ctx.keys ?? K630_LAYOUT;

    for (const key of keys) {
      const r = key.gridY;
      let cell = boltGrid[r][key.gridX];

      if (key.id === 'space') {
        // If bolt passes through spacebar columns 3..9
        let maxInt = 0;
        let bestCol = WHITE;
        for (let sc = 3; sc <= 9; sc++) {
          if (boltGrid[4][sc].intensity > maxInt) {
            maxInt = boltGrid[4][sc].intensity;
            bestCol = boltGrid[4][sc].color;
          }
        }
        cell = { color: bestCol, intensity: maxInt };
      }

      let keyColor: RGBColor;
      if (cell.intensity > 0) {
        keyColor = lerpColor(ambientColor, cell.color, cell.intensity);
      } else {
        keyColor = ambientColor;
      }

      frame[key.id] = applyBrightness(keyColor, this.params.brightness);
    }

    return frame;
  }
}

export const DEFAULT_LIGHTNING_STORM_PARAMS: LightningStormParams = {
  brightness: 1.0,
  strikeInterval: 2.5,
  boltColor: { r: 136, g: 0, b: 255 }, // Electric violet #8800FF
};
