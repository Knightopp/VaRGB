import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT } from '../layout';
import { applyBrightness, lerpColor } from '../color';

export interface EventHorizonParams {
  brightness: number;
  speed: number;            // Rotation speed multiplier
}

export class EventHorizonEffect implements ILightingEffect {
  readonly type = 'event_horizon' as const;
  readonly name = 'Event Horizon';

  constructor(public params: EventHorizonParams = { ...DEFAULT_EVENT_HORIZON_PARAMS }) {}

  reset(): void {}

  update(ctx: AnimationContext): KeyFrameColor {
    const t = ctx.totalTime * Math.max(0.1, this.params.speed);
    const frame: KeyFrameColor = {};
    const keys = ctx.keys ?? K630_LAYOUT;

    const cx = 6.5;
    const cy = 2.0;

    const C_BLACK: RGBColor = { r: 0, g: 0, b: 0 };
    const C_FIRE_ORANGE: RGBColor = { r: 255, g: 80, b: 0 };   // #FF5000
    const C_FIRE_GOLD: RGBColor = { r: 255, g: 210, b: 30 };   // #FFD21E
    const C_VOID_PURPLE: RGBColor = { r: 40, g: 0, b: 90 };    // Deep cosmic violet
    const C_STAR_BLUE: RGBColor = { r: 0, g: 150, b: 255 };    // Stardust cyan

    for (const key of keys) {
      let c = key.gridX;
      const r = key.gridY;

      // Spacebar is centered at ~6.5
      if (key.id === 'space') {
        c = 6.5;
      }

      const dx = c - cx;
      const dy = (r - cy) * 1.4; // Slightly stretch vertical aspect
      const d = Math.hypot(dx, dy);
      const theta = Math.atan2(dy, dx);

      let keyColor: RGBColor;

      if (d < 1.1) {
        // Black hole core / event horizon singularity
        keyColor = C_BLACK;
      } else if (d <= 2.4) {
        // Swirling relativistic accretion disk
        const rot = Math.sin(theta * 2.0 + t * 6.0);
        const diskInt = (rot + 1.0) / 2.0; // 0..1
        const rimFade = Math.sin(((d - 1.1) / (2.4 - 1.1)) * Math.PI); // Peak in center of disk
        keyColor = lerpColor(C_FIRE_ORANGE, C_FIRE_GOLD, diskInt);
        keyColor = lerpColor(C_BLACK, keyColor, rimFade);
      } else {
        // Outer gravitational lensing / infalling stardust spiral
        const spiral = Math.sin(theta * 3.0 + d * 1.8 - t * 4.0);
        const spiralNorm = Math.max(0, (spiral + 1.0) / 2.0);
        const distanceFade = Math.max(0, 1.0 - (d - 2.4) / 5.5);
        const dustColor = lerpColor(C_VOID_PURPLE, C_STAR_BLUE, spiralNorm);
        keyColor = lerpColor(C_BLACK, dustColor, distanceFade * spiralNorm);
      }

      frame[key.id] = applyBrightness(keyColor, this.params.brightness);
    }

    return frame;
  }
}

export const DEFAULT_EVENT_HORIZON_PARAMS: EventHorizonParams = {
  brightness: 1.0,
  speed: 1.0,
};
