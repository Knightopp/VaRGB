import { AnimationContext, ILightingEffect, PathfinderAStarParams } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE } from '../layout';
import { applyBrightness, lerpColor } from '../color';

export const DEFAULT_PATHFINDER_A_STAR_PARAMS: PathfinderAStarParams = {
  brightness: 1.0,
  speed: 1.0,
  primaryColor: { r: 255, g: 215, b: 0 },   // Bright Gold shortest path
  secondaryColor: { r: 0, g: 136, b: 170 }, // Cyan frontier
  goalColor: { r: 255, g: 0, b: 85 },       // Bright Red/Pink goal
  obstacleColor: { r: 26, g: 26, b: 46 },   // Dim obstacle
};

interface NodePos {
  r: number;
  c: number;
}

export class PathfinderAStarEffect implements ILightingEffect {
  readonly type = 'pathfinder_a_star' as const;
  readonly name = 'Pathfinder A*';

  private start: NodePos = { r: 0, c: 0 };
  private goal: NodePos = { r: 4, c: 13 };
  private obstacles: boolean[][] = [];
  private openSet: NodePos[] = [];
  private cameFrom: Map<string, NodePos> = new Map();
  private gScore: number[][] = [];
  private fScore: number[][] = [];
  private closedSet: boolean[][] = [];
  private shortestPath: NodePos[] = [];
  private isFinished: boolean = false;
  private flashTimer: number = 0;
  private stepTimer: number = 0;

  constructor(public params: PathfinderAStarParams = { ...DEFAULT_PATHFINDER_A_STAR_PARAMS }) {
    this.reset();
  }

  reset(): void {
    this.initGrid();
  }

  private keyOf(r: number, c: number): string {
    return `${r},${c}`;
  }

  private heuristic(a: NodePos, b: NodePos): number {
    return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
  }

  private initGrid(): void {
    this.obstacles = Array.from({ length: 5 }, () => new Array(14).fill(false));
    this.closedSet = Array.from({ length: 5 }, () => new Array(14).fill(false));
    this.gScore = Array.from({ length: 5 }, () => new Array(14).fill(Infinity));
    this.fScore = Array.from({ length: 5 }, () => new Array(14).fill(Infinity));
    this.cameFrom.clear();
    this.openSet = [];
    this.shortestPath = [];
    this.isFinished = false;
    this.flashTimer = 0;
    this.stepTimer = 0;

    // Pick random start and goal
    this.start = {
      r: Math.floor(Math.random() * 5),
      c: Math.floor(Math.random() * 5),
    };
    this.goal = {
      r: Math.floor(Math.random() * 5),
      c: 9 + Math.floor(Math.random() * 5),
    };

    // Place 12 obstacles avoiding start & goal
    let placed = 0;
    while (placed < 12) {
      const r = Math.floor(Math.random() * 5);
      const c = Math.floor(Math.random() * 14);
      if (
        (r !== this.start.r || c !== this.start.c) &&
        (r !== this.goal.r || c !== this.goal.c) &&
        !this.obstacles[r][c]
      ) {
        this.obstacles[r][c] = true;
        placed++;
      }
    }

    this.gScore[this.start.r][this.start.c] = 0;
    this.fScore[this.start.r][this.start.c] = this.heuristic(this.start, this.goal);
    this.openSet.push({ ...this.start });
  }

  onKeyDown(code: string): void {
    const key = KEY_BY_CODE[code];
    if (!key) return;

    // Direct goal to clicked key and instantly restart search
    this.goal = { r: key.gridY, c: key.gridX };
    this.obstacles[key.gridY][key.gridX] = false;
    this.closedSet = Array.from({ length: 5 }, () => new Array(14).fill(false));
    this.gScore = Array.from({ length: 5 }, () => new Array(14).fill(Infinity));
    this.fScore = Array.from({ length: 5 }, () => new Array(14).fill(Infinity));
    this.cameFrom.clear();
    this.openSet = [{ ...this.start }];
    this.gScore[this.start.r][this.start.c] = 0;
    this.fScore[this.start.r][this.start.c] = this.heuristic(this.start, this.goal);
    this.shortestPath = [];
    this.isFinished = false;
    this.flashTimer = 0;
  }

  private stepSearch(): void {
    if (this.openSet.length === 0) {
      // No path found or done, restart
      this.initGrid();
      return;
    }

    // Find node with lowest fScore
    let lowestIdx = 0;
    for (let i = 1; i < this.openSet.length; i++) {
      const a = this.openSet[i];
      const b = this.openSet[lowestIdx];
      if (this.fScore[a.r][a.c] < this.fScore[b.r][b.c]) {
        lowestIdx = i;
      }
    }

    const current = this.openSet.splice(lowestIdx, 1)[0];

    if (current.r === this.goal.r && current.c === this.goal.c) {
      // Reconstruct path
      this.shortestPath = [];
      let currKey: string | undefined = this.keyOf(current.r, current.c);
      while (currKey) {
        const [r, c] = currKey.split(',').map(Number);
        this.shortestPath.push({ r, c });
        const prev = this.cameFrom.get(currKey);
        currKey = prev ? this.keyOf(prev.r, prev.c) : undefined;
      }
      this.isFinished = true;
      this.flashTimer = 0.6;
      return;
    }

    this.closedSet[current.r][current.c] = true;

    const neighbors = [
      { r: current.r - 1, c: current.c },
      { r: current.r + 1, c: current.c },
      { r: current.r, c: current.c - 1 },
      { r: current.r, c: current.c + 1 },
    ];

    for (const n of neighbors) {
      if (n.r < 0 || n.r >= 5 || n.c < 0 || n.c >= 14) continue;
      if (this.obstacles[n.r][n.c] || this.closedSet[n.r][n.c]) continue;

      const tentativeG = this.gScore[current.r][current.c] + 1;
      if (tentativeG < this.gScore[n.r][n.c]) {
        this.cameFrom.set(this.keyOf(n.r, n.c), current);
        this.gScore[n.r][n.c] = tentativeG;
        this.fScore[n.r][n.c] = tentativeG + this.heuristic(n, this.goal);

        if (!this.openSet.some((node) => node.r === n.r && node.c === n.c)) {
          this.openSet.push(n);
        }
      }
    }
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.min(ctx.dt, 0.1);
    const speed = Math.max(0.2, this.params.speed ?? 1.0);
    const stepInterval = 0.08 / speed;

    if (this.isFinished) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.initGrid();
      }
    } else {
      this.stepTimer += dt;
      while (this.stepTimer >= stepInterval && !this.isFinished) {
        this.stepTimer -= stepInterval;
        this.stepSearch();
      }
    }

    const frame: KeyFrameColor = {};
    const primary = this.params.primaryColor ?? DEFAULT_PATHFINDER_A_STAR_PARAMS.primaryColor;
    const secondary = this.params.secondaryColor ?? DEFAULT_PATHFINDER_A_STAR_PARAMS.secondaryColor;
    const goalCol = this.params.goalColor ?? DEFAULT_PATHFINDER_A_STAR_PARAMS.goalColor;
    const obstacleCol = this.params.obstacleColor ?? DEFAULT_PATHFINDER_A_STAR_PARAMS.obstacleColor;
    const brightness = Math.max(0, Math.min(1, this.params.brightness ?? 1.0));

    const pathSet = new Set(this.shortestPath.map((p) => this.keyOf(p.r, p.c)));

    for (const key of K630_LAYOUT) {
      const r = key.gridY;
      const c = key.gridX;
      let col: RGBColor = { r: 5, g: 5, b: 12 };

      if (r === this.start.r && c === this.start.c) {
        col = { r: 255, g: 255, b: 255 };
      } else if (r === this.goal.r && c === this.goal.c) {
        col = goalCol;
      } else if (this.isFinished && pathSet.has(this.keyOf(r, c))) {
        // Flash gold
        const flashIntensity = 0.8 + 0.2 * Math.sin(ctx.totalTime * 20);
        col = lerpColor(primary, { r: 255, g: 255, b: 255 }, flashIntensity * 0.4);
      } else if (this.obstacles[r][c]) {
        col = obstacleCol;
      } else if (this.closedSet[r][c]) {
        col = secondary;
      } else if (this.openSet.some((node) => node.r === r && node.c === c)) {
        col = lerpColor(secondary, { r: 255, g: 255, b: 255 }, 0.5);
      }

      frame[key.id] = applyBrightness(col, brightness);
    }

    return frame;
  }
}
