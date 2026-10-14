import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT } from '../layout';
import { applyBrightness, lerpColor } from '../color';

export interface PomodoroBarParams {
  brightness: number;
  durationMinutes: number;  // Default 25
  isRunning: boolean;       // Active countdown
}

export class PomodoroBarEffect implements ILightingEffect {
  readonly type = 'pomodoro_bar' as const;
  readonly name = 'Pomodoro Bar';

  private remainingSeconds: number = 25 * 60;
  private isPaused: boolean = false;

  constructor(public params: PomodoroBarParams = { ...DEFAULT_POMODORO_BAR_PARAMS }) {
    this.remainingSeconds = (params.durationMinutes ?? 25) * 60;
  }

  reset(): void {
    this.remainingSeconds = (this.params.durationMinutes ?? 25) * 60;
    this.isPaused = false;
  }

  onKeyDown(_code: string): void {
    if (this.remainingSeconds <= 0) {
      this.reset();
    } else {
      this.isPaused = !this.isPaused;
    }
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.min(ctx.dt, 0.1);
    if (!this.isPaused && this.params.isRunning !== false && this.remainingSeconds > 0) {
      this.remainingSeconds = Math.max(0, this.remainingSeconds - dt);
    }

    const totalSeconds = Math.max(60, (this.params.durationMinutes ?? 25) * 60);
    const fractionRemaining = this.remainingSeconds / totalSeconds; // 1.0 down to 0.0

    const totalKeys = K630_LAYOUT.length; // 61
    const activeKeyCount = Math.ceil(fractionRemaining * totalKeys);
    const leadingKeyIndex = Math.max(0, activeKeyCount - 1);

    // Color gradient across stages:
    // 1.0 -> 0.5: Emerald Green (#00FF66) -> Amber (#FFBB00)
    // 0.5 -> 0.0: Amber (#FFBB00) -> Crimson (#FF1122)
    const C_GREEN: RGBColor = { r: 0, g: 255, b: 102 };
    const C_AMBER: RGBColor = { r: 255, g: 187, b: 0 };
    const C_RED: RGBColor = { r: 255, g: 20, b: 34 };
    const C_DIM: RGBColor = { r: 15, g: 15, b: 20 };

    let stageColor: RGBColor;
    if (fractionRemaining > 0.5) {
      stageColor = lerpColor(C_AMBER, C_GREEN, (fractionRemaining - 0.5) / 0.5);
    } else {
      stageColor = lerpColor(C_RED, C_AMBER, fractionRemaining / 0.5);
    }

    // Gentle pulse on the leading edge key
    const pulse = 0.65 + 0.35 * Math.sin(ctx.totalTime * 4.0);

    const frame: KeyFrameColor = {};
    const keys = ctx.keys ?? K630_LAYOUT;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      let col: RGBColor;

      if (i < activeKeyCount) {
        if (i === leadingKeyIndex) {
          col = {
            r: Math.round(stageColor.r * pulse),
            g: Math.round(stageColor.g * pulse),
            b: Math.round(stageColor.b * pulse),
          };
        } else {
          col = stageColor;
        }
      } else {
        col = C_DIM;
      }

      frame[key.id] = applyBrightness(col, this.params.brightness);
    }

    return frame;
  }
}

export const DEFAULT_POMODORO_BAR_PARAMS: PomodoroBarParams = {
  brightness: 1.0,
  durationMinutes: 25,
  isRunning: true,
};
