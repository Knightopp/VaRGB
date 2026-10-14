import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT } from '../layout';
import { applyBrightness } from '../color';

export interface RadarSweepParams {
  brightness: number;
  speed: number;           // Sweep speed multiplier
  primaryColor: RGBColor;  // Sweep color (default phosphor green)
  trailWidth: number;      // Trail arc width in radians (default 1.4)
}

const TWO_PI = Math.PI * 2;

export class RadarSweepEffect implements ILightingEffect {
  readonly type = 'radar_sweep' as const;
  readonly name = 'Radar Sweep';

  constructor(public params: RadarSweepParams = { ...DEFAULT_RADAR_SWEEP_PARAMS }) {}

  reset(): void {}

  update(ctx: AnimationContext): KeyFrameColor {
    const keys = ctx.keys ?? K630_LAYOUT;
    const time = ctx.totalTime;
    const sweepSpeed = 2.5 * (this.params.speed ?? 1.0);
    const trailWidth = Math.max(0.3, this.params.trailWidth);

    const thetaSweep = (time * sweepSpeed) % TWO_PI;

    const frame: KeyFrameColor = {};
    const cx = 6.5;
    const cy = 2.0;
    const color = this.params.primaryColor;

    for (const key of keys) {
      const dx = key.gridX - cx;
      const dy = key.gridY - cy;
      const thetaKey = Math.atan2(dy, dx);

      // Angular trail distance (how far behind the sweep line)
      let delta = (thetaSweep - thetaKey + TWO_PI) % TWO_PI;

      if (delta < trailWidth) {
        const intensity = 1.0 - (delta / trailWidth);
        // Add slight distance-based attenuation for depth feel
        const dist = Math.sqrt(dx * dx + dy * dy);
        const distFade = Math.min(1.0, 0.3 + dist / 8.0);
        const finalIntensity = intensity * intensity * distFade; // Quadratic falloff for smooth trail

        frame[key.id] = applyBrightness(color, finalIntensity * this.params.brightness);
      } else {
        // Faint grid dots for "radar screen" look
        const dist = Math.sqrt(dx * dx + dy * dy);
        const gridGlow = 0.04 * Math.min(1.0, dist / 8.0);
        frame[key.id] = applyBrightness(color, gridGlow * this.params.brightness);
      }
    }

    return frame;
  }
}

export const DEFAULT_RADAR_SWEEP_PARAMS: RadarSweepParams = {
  brightness: 1.0,
  speed: 1.0,
  primaryColor: { r: 0, g: 255, b: 68 }, // Phosphor green #00FF44
  trailWidth: 1.4,
};
