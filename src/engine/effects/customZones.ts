import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT } from '../layout';
import { applyBrightness } from '../color';

export type CustomZonePreset = 'gamer' | 'coder' | 'custom';

export interface CustomZonesParams {
  brightness: number;
  preset: CustomZonePreset;
  primaryColor: RGBColor;    // Highlight color for preset keys
  accentColor: RGBColor;     // Secondary accent color
  dimLevel: number;           // Dim intensity for non-highlighted keys (0.0 to 0.3)
}

// Key IDs highlighted in each preset (matching K630 layout key ids)
const GAMER_KEYS = new Set([
  'w', 'a', 's', 'd',          // WASD
  'space',                      // Spacebar
  'shift_l',                    // Left Shift
  'ctrl_l',                     // Left Ctrl
  'num_1', 'num_2', 'num_3', 'num_4', // 1-4
  'esc',                        // Esc for menu
  'tab',                        // Tab
  'q', 'e', 'r', 'f', 'g',     // Common gaming keys
]);

const CODER_KEYS = new Set([
  'esc',                        // Esc
  'tab',                        // Tab
  'shift_l', 'shift_r',        // Shifts
  'ctrl_l', 'ctrl_r',          // Ctrls
  'alt_l', 'alt_r',            // Alts
  'enter',                      // Enter
  'backspace',                  // Backspace
  'fn',                         // Fn
  // Fn + IJKL arrow cluster
  'i', 'j', 'k', 'l',
  // Brackets and common code symbols
  'bracket_l', 'bracket_r',
  'semicolon', 'quote',
  'backslash', 'slash',
  'minus', 'equal',
]);

export class CustomZonesEffect implements ILightingEffect {
  readonly type = 'custom_zones' as const;
  readonly name = 'Custom Zones';

  constructor(public params: CustomZonesParams = { ...DEFAULT_CUSTOM_ZONES_PARAMS }) {}

  reset(): void {}

  update(ctx: AnimationContext): KeyFrameColor {
    const keys = ctx.keys ?? K630_LAYOUT;
    const frame: KeyFrameColor = {};

    const preset = this.params.preset ?? 'gamer';
    const highlightSet = preset === 'gamer' ? GAMER_KEYS : preset === 'coder' ? CODER_KEYS : new Set<string>();
    const highlightColor = preset === 'coder' ? this.params.accentColor : this.params.primaryColor;
    const dimLevel = Math.max(0, Math.min(0.3, this.params.dimLevel ?? 0.1));

    for (const key of keys) {
      if (highlightSet.has(key.id)) {
        frame[key.id] = applyBrightness(highlightColor, this.params.brightness);
      } else {
        // Dim non-highlighted keys
        frame[key.id] = applyBrightness(highlightColor, dimLevel * this.params.brightness);
      }
    }

    return frame;
  }
}

export const DEFAULT_CUSTOM_ZONES_PARAMS: CustomZonesParams = {
  brightness: 1.0,
  preset: 'gamer',
  primaryColor: { r: 255, g: 50, b: 50 },   // Vibrant red for gamer
  accentColor: { r: 0, g: 200, b: 255 },     // Cyan for coder
  dimLevel: 0.1,
};
