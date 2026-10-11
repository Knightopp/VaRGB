import { SnakeTrailParams, AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE, KEY_BY_ID, PHYSICAL_ADJACENCY, KEY_BY_ID as KEY_MAP } from '../layout';
import { applyBrightness, lerpColor } from '../color';

interface ActiveSnake {
  path: string[];        // Sequence of visited key IDs [head, prev1, prev2, ...]
  lastStepTime: number;  // Seconds of last step
  stepFraction: number;  // [0, 1] interpolation progress towards next step
  nextKeyId: string;     // Key being transitioned into
  dxPreferred: number;   // Preferred horizontal momentum (-1, 0, or 1)
  dyPreferred: number;   // Preferred vertical momentum (-1, 0, or 1)
  remainingSteps: number;// Total steps this snake will take before naturally dissipating
}

export class SnakeTrailEffect implements ILightingEffect {
  readonly type = 'snake_trail';
  readonly name = 'Snake Trail';

  private snakes: ActiveSnake[] = [];
  private readonly maxActiveSnakes: number = 8;
  private currentTime: number = 0;

  constructor(public params: SnakeTrailParams = { ...DEFAULT_SNAKE_TRAIL_PARAMS }) {}

  onKeyDown(code: string): void {
    const key = KEY_BY_CODE[code] || KEY_BY_ID[code];
    if (key) {
      this.spawnSnake(key.id);
    }
  }

  public spawnSnake(startKeyId: string): void {
    const now = performance.now() / 1000;
    const neighbors = PHYSICAL_ADJACENCY[startKeyId] || [];
    if (neighbors.length === 0) return;

    // Pick an initial direction towards the nearest neighbor
    const firstNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)] || neighbors[0];
    const kStart = KEY_MAP[startKeyId];
    const kNext = KEY_MAP[firstNeighbor];
    const dx = kNext ? Math.sign(kNext.x - kStart.x) : 1;
    const dy = kNext ? Math.sign(kNext.y - kStart.y) : 0;

    const snake: ActiveSnake = {
      path: [startKeyId],
      lastStepTime: now,
      stepFraction: 0.0,
      nextKeyId: firstNeighbor,
      dxPreferred: dx || 1,
      dyPreferred: dy || 0,
      remainingSteps: 24, // Crawls across keyboard for ~24 steps
    };

    this.snakes.push(snake);
    if (this.snakes.length > this.maxActiveSnakes) {
      this.snakes.shift();
    }
  }

  reset(): void {
    this.snakes = [];
    this.currentTime = 0;
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.max(0.001, Math.min(0.1, ctx.dt));
    this.currentTime += dt;
    const keys = ctx.keys ?? K630_LAYOUT;
    const stepRate = Math.max(2.0, this.params.speed); // Steps per second
    const maxTrailLen = Math.max(2, Math.round(this.params.trailLength));

    // Advance each active snake along the physical keyboard graph
    for (let sIdx = this.snakes.length - 1; sIdx >= 0; sIdx--) {
      const snake = this.snakes[sIdx];
      snake.stepFraction += stepRate * dt;

      while (snake.stepFraction >= 1.0) {
        snake.stepFraction -= 1.0;
        snake.remainingSteps--;

        if (snake.remainingSteps <= 0) {
          this.snakes.splice(sIdx, 1);
          break;
        }

        // Commit step: push new head to front of path
        snake.path.unshift(snake.nextKeyId);
        if (snake.path.length > maxTrailLen + 2) {
          snake.path.pop();
        }

        // Select the next physical adjacent neighbor
        const currentHead = snake.nextKeyId;
        const neighbors = PHYSICAL_ADJACENCY[currentHead] || [];
        if (neighbors.length === 0) {
          this.snakes.splice(sIdx, 1);
          break;
        }

        // Pick next neighbor respecting current momentum to prevent immediate doubling back
        const prevKey = snake.path[1];
        const forwardCandidates = neighbors.filter((n) => n !== prevKey);
        const candidates = forwardCandidates.length > 0 ? forwardCandidates : neighbors;

        // Choose neighbor best matching preferred momentum
        const currDef = KEY_MAP[currentHead];
        let chosenNeighbor = candidates[0];
        let bestScore = -999;

        for (const cand of candidates) {
          const candDef = KEY_MAP[cand];
          if (!candDef || !currDef) continue;
          const dx = candDef.x - currDef.x;
          const dy = candDef.y - currDef.y;
          // Score alignment with momentum
          const alignment = (dx * snake.dxPreferred) + (dy * snake.dyPreferred * 2.0);
          if (alignment > bestScore) {
            bestScore = alignment;
            chosenNeighbor = cand;
          }
        }

        // If hitting edge or turning, update momentum
        const nextDef = KEY_MAP[chosenNeighbor];
        if (nextDef && currDef) {
          snake.dxPreferred = Math.sign(nextDef.x - currDef.x) || snake.dxPreferred;
          snake.dyPreferred = Math.sign(nextDef.y - currDef.y);
        }

        snake.nextKeyId = chosenNeighbor;
      }
    }

    // Accumulate lighting across all keys
    const frame: KeyFrameColor = {};
    const baseColor = applyBrightness(this.params.baseColor, this.params.brightness);
    const trailColor = applyBrightness(this.params.trailColor, this.params.brightness);

    const keyIntensity: Record<string, number> = {};

    for (const snake of this.snakes) {
      // Interpolated illumination of the leading transitioning head
      const headKeyId = snake.path[0];
      const nextKeyId = snake.nextKeyId;
      const frac = Math.max(0, Math.min(1, snake.stepFraction));

      // Current head intensity
      const headIntensity = (1.0 - frac * 0.4);
      keyIntensity[headKeyId] = Math.max(keyIntensity[headKeyId] || 0, headIntensity);

      // Approaching next key intensity
      const nextIntensity = frac * 0.9;
      keyIntensity[nextKeyId] = Math.max(keyIntensity[nextKeyId] || 0, nextIntensity);

      // Trailing keys
      for (let i = 1; i < snake.path.length; i++) {
        const keyId = snake.path[i];
        const distanceAlongTail = i + (1.0 - frac);
        if (distanceAlongTail < maxTrailLen) {
          const tailFade = Math.max(0, (1.0 - distanceAlongTail / maxTrailLen) ** 1.3);
          keyIntensity[keyId] = Math.max(keyIntensity[keyId] || 0, tailFade);
        }
      }
    }

    for (const key of keys) {
      const val = keyIntensity[key.id] || 0;
      if (val > 0.005) {
        frame[key.id] = lerpColor(baseColor, trailColor, Math.min(1.0, val));
      } else {
        frame[key.id] = baseColor;
      }
    }

    return frame;
  }
}

export const DEFAULT_SNAKE_TRAIL_PARAMS: SnakeTrailParams = {
  trailLength: 6,                     // 6 keys in trailing tail
  trailColor: { r: 50, g: 255, b: 120 }, // Emerald Viper Neon Green
  speed: 10,                          // 10 key traversals per second
  brightness: 1.0,
  baseColor: { r: 0, g: 0, b: 0 },    // Black resting background
};
