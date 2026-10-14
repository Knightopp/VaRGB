import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT } from '../layout';
import { applyBrightness, lerpColor } from '../color';

export interface LavaLampParams {
  brightness: number;
  speed: number;            // Blob movement speed multiplier
  backgroundColor: RGBColor;
  foregroundColor: RGBColor;
  blobCount: number;        // Number of metaballs (2-6)
}

interface Metaball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export class LavaLampEffect implements ILightingEffect {
  readonly type = 'lava_lamp' as const;
  readonly name = 'Lava Lamp';

  private blobs: Metaball[] = [];

  constructor(public params: LavaLampParams = { ...DEFAULT_LAVA_LAMP_PARAMS }) {
    this.initBlobs();
  }

  private initBlobs(): void {
    const count = Math.max(2, Math.min(6, this.params.blobCount ?? 4));
    this.blobs = [];
    for (let i = 0; i < count; i++) {
      this.blobs.push({
        x: 2 + Math.random() * 9,
        y: 0.5 + Math.random() * 3,
        vx: (Math.random() - 0.5) * 3.0,
        vy: (Math.random() - 0.5) * 2.0,
        radius: 1.6 + Math.random() * 1.0,
      });
    }
  }

  reset(): void {
    this.initBlobs();
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.max(0.001, Math.min(0.5, ctx.dt));
    const keys = ctx.keys ?? K630_LAYOUT;
    const speedMul = 1.5 * (this.params.speed ?? 1.0);

    // Advance blob positions
    for (const blob of this.blobs) {
      blob.x += blob.vx * speedMul * dt;
      blob.y += blob.vy * speedMul * dt;

      // Soft bounce off boundaries
      if (blob.x < 0) { blob.x = 0; blob.vx = Math.abs(blob.vx) * (0.8 + Math.random() * 0.4); }
      if (blob.x > 13) { blob.x = 13; blob.vx = -Math.abs(blob.vx) * (0.8 + Math.random() * 0.4); }
      if (blob.y < 0) { blob.y = 0; blob.vy = Math.abs(blob.vy) * (0.8 + Math.random() * 0.4); }
      if (blob.y > 4) { blob.y = 4; blob.vy = -Math.abs(blob.vy) * (0.8 + Math.random() * 0.4); }
    }

    const frame: KeyFrameColor = {};
    const bgColor = this.params.backgroundColor;
    const fgColor = this.params.foregroundColor;

    for (const key of keys) {
      const kx = key.gridX;
      const ky = key.gridY;

      // Sum scalar field from all metaballs
      let field = 0;
      for (const blob of this.blobs) {
        const dx = kx - blob.x;
        const dy = ky - blob.y;
        const distSq = dx * dx + dy * dy + 0.15; // +0.15 to prevent division by zero
        field += (blob.radius * blob.radius) / distSq;
      }

      const t = smoothstep(0.7, 1.4, field);
      const color = lerpColor(bgColor, fgColor, t);
      frame[key.id] = applyBrightness(color, this.params.brightness);
    }

    return frame;
  }
}

export const DEFAULT_LAVA_LAMP_PARAMS: LavaLampParams = {
  brightness: 1.0,
  speed: 1.0,
  backgroundColor: { r: 26, g: 0, b: 51 },   // #1A0033 Deep Purple
  foregroundColor: { r: 255, g: 51, b: 0 },    // #FF3300 Molten Orange-Red
  blobCount: 4,
};
