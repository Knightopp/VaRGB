import { GlitchParams, AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor } from '../../types/keyboard';
import { applyBrightness } from '../color';

// Fast Mulberry32 PRNG for reproducible seeds
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface GlitchEvent {
  keyIds: Set<string>;
  colorIndex: number;
  startTime: number;
  durationSec: number;
}

export class GlitchEffect implements ILightingEffect {
  readonly type = 'glitch';
  readonly name = 'Cyber Glitch';

  private prng: () => number;
  private currentSeed: number;
  private activeEvents: GlitchEvent[] = [];
  private lastSpawnTime: number = 0;

  constructor(public params: GlitchParams) {
    this.currentSeed = params.seed || 1337;
    this.prng = mulberry32(this.currentSeed);
  }

  update(ctx: AnimationContext): KeyFrameColor {
    // Re-seed if user modified seed in parameters
    if (this.params.seed !== this.currentSeed) {
      this.currentSeed = this.params.seed;
      this.prng = mulberry32(this.currentSeed);
    }

    const now = ctx.totalTime;
    const spawnInterval = Math.max(0.05, (1.1 - this.params.frequency) / (this.params.speed * 2));

    // Spawn new glitch clusters
    if (now - this.lastSpawnTime > spawnInterval) {
      this.lastSpawnTime = now;
      if (this.prng() < this.params.frequency) {
        const clusterSize = Math.max(1, Math.round(this.params.intensity * (1 + this.prng())));
        const startKeyIndex = Math.floor(this.prng() * ctx.keys.length);
        const centerKey = ctx.keys[startKeyIndex];

        // Find keys nearest to centerKey in physical coordinates
        const sorted = [...ctx.keys].sort((a, b) => {
          const da = Math.hypot((a.normX - centerKey.normX) * 3, a.normY - centerKey.normY);
          const db = Math.hypot((b.normX - centerKey.normX) * 3, b.normY - centerKey.normY);
          return da - db;
        });

        const selectedKeys = new Set(sorted.slice(0, clusterSize).map((k) => k.id));
        const colorIdx = Math.floor(this.prng() * this.params.palette.length);
        const durationSec = (this.params.duration / 1000) * (0.6 + this.prng() * 0.8) / this.params.speed;

        this.activeEvents.push({
          keyIds: selectedKeys,
          colorIndex: colorIdx,
          startTime: now,
          durationSec,
        });
      }
    }

    // Filter active events
    this.activeEvents = this.activeEvents.filter(
      (ev) => now - ev.startTime < ev.durationSec
    );

    const frame: KeyFrameColor = {};
    const baseOff = { r: 0, g: 0, b: 0 };

    // Default all keys to completely off
    for (const key of ctx.keys) {
      frame[key.id] = baseOff;
    }

    // Apply active glitches
    for (const ev of this.activeEvents) {
      const elapsed = now - ev.startTime;
      const progress = elapsed / ev.durationSec;
      // Strobe flash factor: quick flash at beginning then decay
      const strobe = Math.sin(progress * Math.PI * 6) > 0 ? 1.0 : 0.4;
      const color = this.params.palette[ev.colorIndex % this.params.palette.length];
      const lit = applyBrightness(color, this.params.brightness * strobe);

      for (const id of ev.keyIds) {
        frame[id] = lit;
      }
    }

    return frame;
  }

  reset(): void {
    this.activeEvents = [];
    this.lastSpawnTime = 0;
    this.prng = mulberry32(this.currentSeed);
  }
}

export const DEFAULT_GLITCH_PARAMS: GlitchParams = {
  speed: 1.4,
  brightness: 0.95,
  frequency: 0.75,
  intensity: 6,
  duration: 220,
  seed: 42,
  palette: [
    { r: 0, g: 255, b: 240 },   // Neon cyan
    { r: 255, g: 0, b: 120 },   // Neon pink
    { r: 255, g: 255, b: 255 }, // White burst
    { r: 140, g: 0, b: 255 },  // Electric violet
    { r: 0, g: 255, b: 100 },   // Neon green
  ],
};
