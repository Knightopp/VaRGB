import { AnimationContext, ILightingEffect, ComboMultiplierParams } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE } from '../layout';
import { applyBrightness, lerpColor } from '../color';

export const DEFAULT_COMBO_MULTIPLIER_PARAMS: ComboMultiplierParams = {
  brightness: 1.0,
  speed: 1.0,
  primaryColor: { r: 255, g: 215, b: 0 },   // Tier 2 (30-59) Golden ring
  secondaryColor: { r: 0, g: 255, b: 136 }, // Tier 1 (10-29) Emerald glow
  overdriveColor: { r: 255, g: 0, b: 102 }, // Tier 3 (60+) Overdrive Magenta
};

interface KeyHit {
  r: number;
  c: number;
  age: number;
}

export class ComboMultiplierEffect implements ILightingEffect {
  readonly type = 'combo_multiplier' as const;
  readonly name = 'Combo Multiplier';

  private comboCount: number = 0;
  private timeSinceLastKey: number = 0;
  private recentHits: KeyHit[] = [];

  constructor(public params: ComboMultiplierParams = { ...DEFAULT_COMBO_MULTIPLIER_PARAMS }) {
    this.reset();
  }

  reset(): void {
    this.comboCount = 0;
    this.timeSinceLastKey = 0;
    this.recentHits = [];
  }

  onKeyDown(code: string): void {
    const key = KEY_BY_CODE[code];
    this.comboCount++;
    this.timeSinceLastKey = 0;

    if (key) {
      this.recentHits.push({
        r: key.gridY,
        c: key.gridX,
        age: 0,
      });
      if (this.recentHits.length > 20) {
        this.recentHits.shift();
      }
    }
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.min(ctx.dt, 0.1);
    const speed = Math.max(0.2, this.params.speed ?? 1.0);
    const time = ctx.totalTime * speed;

    this.timeSinceLastKey += dt;
    if (this.timeSinceLastKey > 1.5) {
      this.comboCount = 0;
    }

    for (let i = this.recentHits.length - 1; i >= 0; i--) {
      this.recentHits[i].age += dt * 3.0;
      if (this.recentHits[i].age > 1.0) {
        this.recentHits.splice(i, 1);
      }
    }

    const frame: KeyFrameColor = {};
    const primary = this.params.primaryColor ?? DEFAULT_COMBO_MULTIPLIER_PARAMS.primaryColor;
    const secondary = this.params.secondaryColor ?? DEFAULT_COMBO_MULTIPLIER_PARAMS.secondaryColor;
    const overdrive = this.params.overdriveColor ?? DEFAULT_COMBO_MULTIPLIER_PARAMS.overdriveColor;
    const brightness = Math.max(0, Math.min(1, this.params.brightness ?? 1.0));

    const combo = this.comboCount;

    for (const key of K630_LAYOUT) {
      const c = key.gridX;
      const r = key.gridY;

      let col: RGBColor = { r: 5, g: 5, b: 8 };

      if (combo >= 60) {
        // Tier 3: 60+ Full-board Nitro Plasma + White shocks
        const plasmaVal = Math.sin(c * 0.5 + time * 6.0) + Math.cos(r * 0.8 - time * 5.0);
        const norm = (plasmaVal + 2.0) / 4.0;
        col = lerpColor(overdrive, primary, norm);
      } else if (combo >= 30) {
        // Tier 2: 30-59 Golden Border Ring + Column Sparks
        const isBorder = r === 0 || r === 4 || c === 0 || c === 13;
        if (isBorder) {
          const pulse = Math.sin(time * 6.0) * 0.25 + 0.75;
          col = lerpColor({ r: 0, g: 0, b: 0 }, primary, pulse);
        } else {
          // Subtle inner shimmer
          const spark = Math.sin(c * 1.2 + time * 8.0) > 0.8 ? 0.7 : 0.05;
          col = lerpColor({ r: 5, g: 5, b: 5 }, primary, spark);
        }
      } else if (combo >= 10) {
        // Tier 1: 10-29 Emerald Edge Glow pulsing at 2Hz
        const isBorder = r === 0 || r === 4 || c === 0 || c === 13;
        if (isBorder) {
          const pulse = (Math.sin(time * (2 * Math.PI * 2.0)) + 1.0) * 0.5;
          col = lerpColor({ r: 0, g: 15, b: 5 }, secondary, pulse * 0.9);
        }
      }

      // Overlay recent key hits
      for (const hit of this.recentHits) {
        if (hit.r === r && hit.c === c) {
          const hitFade = Math.max(0, 1.0 - hit.age);
          const flashCol = combo >= 60 ? { r: 255, g: 255, b: 255 } : primary;
          col = lerpColor(col, flashCol, hitFade);
        }
      }

      frame[key.id] = applyBrightness(col, brightness);
    }

    return frame;
  }
}
