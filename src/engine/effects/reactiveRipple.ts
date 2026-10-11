import { ReactiveRippleParams, AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE, KEY_BY_ID, getKeyCenter } from '../layout';
import { applyBrightness, lerpColor } from '../color';

interface ActiveRipple {
  originX: number; // Physical center X
  originY: number; // Physical center Y
  startTime: number;
}

export class ReactiveRippleEffect implements ILightingEffect {
  readonly type = 'reactive_ripple';
  readonly name = 'Reactive Ripple';

  private activeRipples: ActiveRipple[] = [];
  private readonly maxRipples: number = 12;
  private currentTime: number = 0;

  constructor(public params: ReactiveRippleParams = { ...DEFAULT_REACTIVE_RIPPLE_PARAMS }) {}

  onKeyDown(code: string): void {
    const key = KEY_BY_CODE[code] || KEY_BY_ID[code];
    if (key) {
      const center = getKeyCenter(key);
      this.triggerRippleAt(center.x, center.y);
    }
  }

  public triggerRippleAt(x: number, y: number): void {
    this.activeRipples.push({
      originX: x,
      originY: y,
      startTime: this.currentTime,
    });
    if (this.activeRipples.length > this.maxRipples) {
      this.activeRipples.shift();
    }
  }

  reset(): void {
    this.activeRipples = [];
    this.currentTime = 0;
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.max(0.001, Math.min(0.5, ctx.dt));
    this.currentTime += dt;
    const now = this.currentTime;
    const keys = ctx.keys ?? K630_LAYOUT;
    const speed = Math.max(0.1, this.params.speed) * 8.0; // Units per second
    const maxRadius = Math.max(1.0, this.params.radius);
    const duration = maxRadius / speed;

    // Prune expired ripples
    this.activeRipples = this.activeRipples.filter((r) => now - r.startTime < duration);

    const frame: KeyFrameColor = {};
    const baseColor = applyBrightness(this.params.baseColor, this.params.intensity);
    const waveColor = applyBrightness(this.params.color, this.params.intensity);
    const ringThickness = 1.6; // Units thickness of the expanding wave crest

    for (const key of keys) {
      const center = getKeyCenter(key);
      let maxWaveContribution = 0;

      for (const ripple of this.activeRipples) {
        const elapsed = now - ripple.startTime;
        const currentRadius = elapsed * speed;
        const dx = center.x - ripple.originX;
        const dy = center.y - ripple.originY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Sustained origin illumination: epicenter keycap lights up and smoothly fades over natural duration
        const originLife = 0.45;
        if (dist < 1.4 && elapsed < originLife) {
          const originFade = Math.max(0, 1.0 - elapsed / originLife) ** 1.5;
          maxWaveContribution = Math.max(maxWaveContribution, originFade);
        }

        // Circular wavefront evaluation with smooth cosine falloff
        const delta = Math.abs(dist - currentRadius);
        if (delta < ringThickness) {
          // Normalised distance across the crest [0, 1]
          const crestFraction = delta / ringThickness;
          const crestIntensity = Math.cos((Math.PI / 2) * crestFraction) ** 2;
          // Global radial decay: waves weaken as they expand to maxRadius
          const radialDecay = Math.max(0, 1.0 - (currentRadius / maxRadius) ** 1.5);
          const contribution = crestIntensity * radialDecay;

          if (contribution > maxWaveContribution) {
            maxWaveContribution = contribution;
          }
        }
      }

      if (maxWaveContribution > 0.005) {
        frame[key.id] = lerpColor(baseColor, waveColor, maxWaveContribution);
      } else {
        frame[key.id] = baseColor;
      }
    }

    return frame;
  }
}

export const DEFAULT_REACTIVE_RIPPLE_PARAMS: ReactiveRippleParams = {
  speed: 1.4,
  radius: 12.0,
  color: { r: 0, g: 230, b: 255 },     // Vivid Aqua Wave
  intensity: 1.0,
  baseColor: { r: 0, g: 0, b: 0 },     // Deep dark base
};
