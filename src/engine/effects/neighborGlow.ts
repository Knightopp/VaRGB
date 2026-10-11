import { NeighborGlowParams, AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE, KEY_BY_ID, getKeyCenter } from '../layout';
import { applyBrightness, lerpColor } from '../color';

interface ActiveNeighborEvent {
  originX: number;
  originY: number;
  startTime: number;
}

export class NeighborGlowEffect implements ILightingEffect {
  readonly type = 'neighbor_glow';
  readonly name = 'Neighbor Glow';

  private events: ActiveNeighborEvent[] = [];
  private readonly maxEvents: number = 12;
  private currentTime: number = 0;

  constructor(public params: NeighborGlowParams = { ...DEFAULT_NEIGHBOR_GLOW_PARAMS }) {}

  onKeyDown(code: string): void {
    const key = KEY_BY_CODE[code] || KEY_BY_ID[code];
    if (key) {
      const center = getKeyCenter(key);
      this.triggerGlowAt(center.x, center.y);
    }
  }

  public triggerGlowAt(x: number, y: number): void {
    this.events.push({
      originX: x,
      originY: y,
      startTime: this.currentTime,
    });
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }

  reset(): void {
    this.events = [];
    this.currentTime = 0;
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.max(0.001, Math.min(0.5, ctx.dt));
    this.currentTime += dt;
    const now = this.currentTime;
    const keys = ctx.keys ?? K630_LAYOUT;
    const maxRadius = Math.max(1.0, this.params.glowRadius);
    const speed = Math.max(0.5, this.params.propagationSpeed) * 8.0; // Units per second
    const fadeSec = Math.max(0.1, this.params.fadeDuration / 1000);
    const maxLife = (maxRadius / speed) + fadeSec;

    // Prune finished events
    this.events = this.events.filter((e) => now - e.startTime < maxLife);

    const frame: KeyFrameColor = {};
    const baseColor = applyBrightness(this.params.baseColor, this.params.brightness);
    const glowColor = applyBrightness(this.params.color, this.params.brightness);

    for (const key of keys) {
      const center = getKeyCenter(key);
      let maxKeyIntensity = 0;

      for (const ev of this.events) {
        const elapsed = now - ev.startTime;
        const dx = center.x - ev.originX;
        const dy = center.y - ev.originY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > maxRadius) continue;

        // Radial propagation wavefront reaches key at time = dist / speed
        const reachTime = dist / speed;
        if (elapsed < reachTime) continue; // Wave hasn't arrived at this neighbor yet

        // Time since wavefront passed this neighbor
        const timeSinceArrived = elapsed - reachTime;
        if (timeSinceArrived >= fadeSec) continue;

        // Progressive distance-based falloff: direct key is 1.0, neighbors drop with distance
        const distanceFalloff = Math.max(0, 1.0 - (dist / maxRadius) ** 1.2);
        // Temporal decay: smooth fade down
        const temporalFade = Math.cos((Math.PI / 2) * (timeSinceArrived / fadeSec)) ** 2;

        const keyContribution = distanceFalloff * temporalFade;
        if (keyContribution > maxKeyIntensity) {
          maxKeyIntensity = keyContribution;
        }
      }

      if (maxKeyIntensity > 0.005) {
        frame[key.id] = lerpColor(baseColor, glowColor, Math.min(1.0, maxKeyIntensity));
      } else {
        frame[key.id] = baseColor;
      }
    }

    return frame;
  }
}

export const DEFAULT_NEIGHBOR_GLOW_PARAMS: NeighborGlowParams = {
  glowRadius: 2.8,                         // 2.8 keyboard units (covers 1-2 rings of physical neighbors)
  propagationSpeed: 2.0,                   // Progressive stage expansion speed
  fadeDuration: 450,                       // 450ms smooth decay
  color: { r: 180, g: 0, b: 255 },         // Electric Violet Halo
  brightness: 1.0,
  baseColor: { r: 0, g: 0, b: 0 },         // Dark base
};
