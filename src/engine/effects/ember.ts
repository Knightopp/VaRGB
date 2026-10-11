import { EmberParams, AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE, KEY_BY_ID, getKeyCenter } from '../layout';
import { applyBrightness, lerpColor } from '../color';

interface ActiveEmber {
  originKeyId: string;
  originX: number;
  originY: number;
  startTime: number;
}

export class EmberEffect implements ILightingEffect {
  readonly type = 'ember';
  readonly name = 'Ember';

  private embers: ActiveEmber[] = [];
  private readonly maxEmbers: number = 15;
  private currentTime: number = 0;

  constructor(public params: EmberParams = { ...DEFAULT_EMBER_PARAMS }) {}

  onKeyDown(code: string): void {
    const key = KEY_BY_CODE[code] || KEY_BY_ID[code];
    if (key) {
      const center = getKeyCenter(key);
      this.triggerEmber(key.id, center.x, center.y);
    }
  }

  public triggerEmber(keyId: string, x: number, y: number): void {
    this.embers.push({
      originKeyId: keyId,
      originX: x,
      originY: y,
      startTime: this.currentTime,
    });
    if (this.embers.length > this.maxEmbers) {
      this.embers.shift();
    }
  }

  reset(): void {
    this.embers = [];
    this.currentTime = 0;
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.max(0.001, Math.min(0.5, ctx.dt));
    this.currentTime += dt;
    const now = this.currentTime;
    const keys = ctx.keys ?? K630_LAYOUT;
    const fadeSec = Math.max(0.2, this.params.fadeDuration / 1000);

    // Prune cold embers
    this.embers = this.embers.filter((e) => now - e.startTime < fadeSec);

    const frame: KeyFrameColor = {};
    const baseColor = applyBrightness(this.params.baseColor, this.params.brightness);
    const deepCharcoalRed: RGBColor = { r: 160, g: 15, b: 0 };
    const spreadRadius = Math.max(0.0, this.params.glowSpread);

    // Precalculate thermal temperatures per key
    const keyTemp: Record<string, number> = {};

    for (const ember of this.embers) {
      const elapsed = now - ember.startTime;
      const emberLife = 1.0 - (elapsed / fadeSec); // [1.0 -> 0.0]
      if (emberLife <= 0) continue;

      // Direct temperature on pressed key
      keyTemp[ember.originKeyId] = Math.max(keyTemp[ember.originKeyId] || 0, emberLife);

      // Thermal radiation to neighboring keys if glowSpread > 0
      if (spreadRadius > 0.1) {
        for (const key of keys) {
          if (key.id === ember.originKeyId) continue;
          const center = getKeyCenter(key);
          const dx = center.x - ember.originX;
          const dy = center.y - ember.originY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist <= spreadRadius) {
            const spreadRatio = (1.0 - dist / spreadRadius) ** 1.8;
            const neighborTemp = emberLife * spreadRatio * 0.55;
            keyTemp[key.id] = Math.max(keyTemp[key.id] || 0, neighborTemp);
          }
        }
      }
    }

    // Render keys along thermal cooling gradient
    for (const key of keys) {
      const temp = keyTemp[key.id] || 0;

      if (temp <= 0.005) {
        frame[key.id] = baseColor;
        continue;
      }

      // Smooth color transitions based on temperature:
      // temp in [0.7, 1.0]: Incandescent coreColor (yellow-white) -> emberColor (blazing orange)
      // temp in [0.25, 0.7]: emberColor (orange) -> deepCharcoalRed (dark ruby)
      // temp in [0.0, 0.25]: deepCharcoalRed -> baseColor
      let thermalColor: RGBColor;
      let thermalBrightness = temp;

      if (temp >= 0.7) {
        const factor = (temp - 0.7) / 0.3;
        thermalColor = lerpColor(this.params.emberColor, this.params.coreColor, factor);
      } else if (temp >= 0.25) {
        const factor = (temp - 0.25) / 0.45;
        thermalColor = lerpColor(deepCharcoalRed, this.params.emberColor, factor);
      } else {
        const factor = temp / 0.25;
        thermalColor = lerpColor(baseColor, deepCharcoalRed, factor);
      }

      const litColor = applyBrightness(thermalColor, this.params.brightness * thermalBrightness);
      frame[key.id] = lerpColor(baseColor, litColor, Math.min(1.0, thermalBrightness));
    }

    return frame;
  }
}

export const DEFAULT_EMBER_PARAMS: EmberParams = {
  coreColor: { r: 255, g: 240, b: 130 },  // Incandescent Yellow-White Core
  emberColor: { r: 255, g: 90, b: 0 },    // Burning Molten Ember Orange
  glowSpread: 1.6,                       // Physical thermal radiation radius
  fadeDuration: 1200,                    // 1200ms cooling cycle
  brightness: 1.0,
  baseColor: { r: 0, g: 0, b: 0 },       // Dark resting base
};
