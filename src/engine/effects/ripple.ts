import { RippleParams, AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor } from '../../types/keyboard';
import { KEY_BY_CODE } from '../layout';
import { applyBrightness } from '../color';

interface ActiveWave {
  centerX: number;
  centerY: number;
  startTime: number;
}

export class RippleEffect implements ILightingEffect {
  readonly type = 'ripple';
  readonly name = 'Keystroke Ripple';

  private activeWaves: ActiveWave[] = [];
  private lastDemoTrigger = 0;
  private readonly ambientOrigin = { x: 0.5, y: 0.9 };
  private readonly overlapSeconds = 0.12;

  constructor(public params: RippleParams) {}

  onKeyDown(code: string): void {
    const key = KEY_BY_CODE[code];
    if (key) this.triggerWaveAt(key.normX, key.normY);
  }

  triggerWaveAt(normX: number, normY: number): void {
    this.activeWaves.push({ centerX: normX, centerY: normY, startTime: performance.now() / 1000 });
    if (this.activeWaves.length > 10) this.activeWaves.shift();
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const now = performance.now() / 1000;
    const sweepDuration = Math.max(0.2, this.params.fadeDuration / 1000) / Math.max(0.1, this.params.speed);
    const ambientInterval = Math.max(0.1, sweepDuration - this.overlapSeconds);

    // Keep ambient ripples continuous: start the next before this sweep completes.
    if (this.lastDemoTrigger === 0 || now - this.lastDemoTrigger >= ambientInterval) {
      this.triggerWaveAt(this.ambientOrigin.x, this.ambientOrigin.y);
      this.lastDemoTrigger = now;
    }

    const maxDistances = new Map<ActiveWave, number>();
    this.activeWaves = this.activeWaves.filter((wave) => {
      const maxDistance = this.getMaxDistance(wave, ctx.keys);
      maxDistances.set(wave, maxDistance);
      return now - wave.startTime < sweepDuration;
    });

    const frame: KeyFrameColor = {};
    const litColor = applyBrightness(this.params.waveColor, this.params.brightness);
    const ringThickness = 0.15;

    for (const key of ctx.keys) {
      let reachedByWave = false;
      for (const wave of this.activeWaves) {
        const elapsed = now - wave.startTime;
        const currentRadius = (maxDistances.get(wave) ?? 0) * Math.min(1, elapsed / sweepDuration);
        const dx = (key.normX - wave.centerX) * 3;
        const dy = key.normY - wave.centerY;
        const distanceFromFront = Math.abs(Math.sqrt(dx * dx + dy * dy) - currentRadius);
        if (currentRadius > ringThickness / 2 && distanceFromFront <= ringThickness / 2) {
          reachedByWave = true;
          break;
        }
      }

      // Only keys on the circular front glow; its center and the area behind it stay black.
      frame[key.id] = reachedByWave ? litColor : { r: 0, g: 0, b: 0 };
    }

    return frame;
  }

  private getMaxDistance(wave: ActiveWave, keys: AnimationContext['keys']): number {
    return Math.max(...keys.map((key) => {
      const dx = (key.normX - wave.centerX) * 3;
      const dy = key.normY - wave.centerY;
      return Math.sqrt(dx * dx + dy * dy);
    }));
  }

  reset(): void {
    this.activeWaves = [];
    this.lastDemoTrigger = 0;
  }
}

export const DEFAULT_RIPPLE_PARAMS: RippleParams = {
  speed: 1.2,
  brightness: 1,
  fadeDuration: 1200,
  maxRadius: 1.2,
  waveColor: { r: 255, g: 255, b: 255 },
};
