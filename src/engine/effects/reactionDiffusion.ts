import { AnimationContext, ILightingEffect, ReactionDiffusionParams } from '../../types/effects';
import { KeyFrameColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE } from '../layout';
import { applyBrightness, lerpColor } from '../color';

export const DEFAULT_REACTION_DIFFUSION_PARAMS: ReactionDiffusionParams = {
  brightness: 1.0,
  speed: 1.0,
  primaryColor: { r: 0, g: 255, b: 170 },   // Morphogen B organic coral
  secondaryColor: { r: 17, g: 0, b: 51 },   // Substrate chemical A
};

export class ReactionDiffusionEffect implements ILightingEffect {
  readonly type = 'reaction_diffusion' as const;
  readonly name = 'Reaction Diffusion';

  private gridA: number[][] = [];
  private gridB: number[][] = [];
  private nextA: number[][] = [];
  private nextB: number[][] = [];
  private simTimer: number = 0;

  constructor(public params: ReactionDiffusionParams = { ...DEFAULT_REACTION_DIFFUSION_PARAMS }) {
    this.reset();
  }

  reset(): void {
    this.gridA = Array.from({ length: 5 }, () => new Array(14).fill(1.0));
    this.gridB = Array.from({ length: 5 }, () => new Array(14).fill(0.0));
    this.nextA = Array.from({ length: 5 }, () => new Array(14).fill(1.0));
    this.nextB = Array.from({ length: 5 }, () => new Array(14).fill(0.0));
    this.simTimer = 0;

    // Seed center spot
    this.gridB[2][6] = 1.0;
    this.gridB[2][7] = 1.0;
    this.gridB[1][6] = 0.8;
  }

  onKeyDown(code: string): void {
    const key = KEY_BY_CODE[code];
    if (!key) return;

    const r = key.gridY;
    const c = key.gridX;

    // Deposit chemical B in radius
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = (r + dr + 5) % 5;
        const nc = (c + dc + 14) % 14;
        this.gridB[nr][nc] = 1.0;
        this.gridA[nr][nc] = 0.2;
      }
    }
  }

  private stepSimulation(): void {
    const Da = 1.0;
    const Db = 0.5;
    const f = 0.055;
    const k = 0.062;
    const dt = 0.9;

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 14; c++) {
        const a = this.gridA[r][c];
        const b = this.gridB[r][c];

        // Laplacian with toroidal boundary wrap
        const top = (r + 4) % 5;
        const bottom = (r + 1) % 5;
        const left = (c + 13) % 14;
        const right = (c + 1) % 14;

        const lapA =
          (this.gridA[top][c] + this.gridA[bottom][c] + this.gridA[r][left] + this.gridA[r][right]) * 0.25 - a;
        const lapB =
          (this.gridB[top][c] + this.gridB[bottom][c] + this.gridB[r][left] + this.gridB[r][right]) * 0.25 - b;

        const reaction = a * b * b;
        this.nextA[r][c] = Math.max(0, Math.min(1.0, a + (Da * lapA - reaction + f * (1.0 - a)) * dt));
        this.nextB[r][c] = Math.max(0, Math.min(1.0, b + (Db * lapB + reaction - (k + f) * b) * dt));
      }
    }

    // Swap buffers
    const tempA = this.gridA;
    this.gridA = this.nextA;
    this.nextA = tempA;

    const tempB = this.gridB;
    this.gridB = this.nextB;
    this.nextB = tempB;
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.min(ctx.dt, 0.1);
    const speed = Math.max(0.2, this.params.speed ?? 1.0);

    this.simTimer += dt * speed;
    const stepInterval = 0.04;
    while (this.simTimer >= stepInterval) {
      this.simTimer -= stepInterval;
      this.stepSimulation();
    }

    const frame: KeyFrameColor = {};
    const primary = this.params.primaryColor ?? DEFAULT_REACTION_DIFFUSION_PARAMS.primaryColor;
    const secondary = this.params.secondaryColor ?? DEFAULT_REACTION_DIFFUSION_PARAMS.secondaryColor;
    const brightness = Math.max(0, Math.min(1, this.params.brightness ?? 1.0));

    for (const key of K630_LAYOUT) {
      const c = key.gridX;
      const r = key.gridY;

      const bVal = Math.max(0, Math.min(1, this.gridB[r][c] * 2.2));
      const col = lerpColor(secondary, primary, bVal);

      frame[key.id] = applyBrightness(col, brightness);
    }

    return frame;
  }
}
