import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT } from '../layout';
import { applyBrightness } from '../color';

export interface PacmanArcadeParams {
  brightness: number;
  speed: number;            // Speed multiplier (base 6 keys/sec)
}

interface PathNode {
  r: number;
  c: number;
}

export class PacmanArcadeEffect implements ILightingEffect {
  readonly type = 'pacman_arcade' as const;
  readonly name = 'Pac-Man Arcade';

  private progress: number = 0; // Float index along serpentine path (0 to 78)
  private path: PathNode[] = [];

  constructor(public params: PacmanArcadeParams = { ...DEFAULT_PACMAN_ARCADE_PARAMS }) {
    this.buildPath();
  }

  private buildPath(): void {
    this.path = [];
    // Serpentine path across rows 0 to 4
    for (let r = 0; r < 5; r++) {
      if (r % 2 === 0) {
        for (let c = 0; c < 14; c++) {
          this.path.push({ r, c });
        }
      } else {
        for (let c = 13; c >= 0; c--) {
          this.path.push({ r, c });
        }
      }
    }
  }

  reset(): void {
    this.progress = 0;
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.min(ctx.dt, 0.1);
    const speed = 6.0 * Math.max(0.2, this.params.speed);
    const totalSteps = this.path.length; // 70
    const ghostTrailer = 12; // Extra steps for ghosts to clear the board

    this.progress = (this.progress + speed * dt) % (totalSteps + ghostTrailer);

    const pacmanIdx = Math.floor(this.progress);
    const blinkyIdx = pacmanIdx - 2;
    const pinkyIdx = pacmanIdx - 4;
    const inkyIdx = pacmanIdx - 6;
    const clydeIdx = pacmanIdx - 8;

    const PACMAN_COLOR: RGBColor = { r: 255, g: 255, b: 0 };    // Yellow
    const BLINKY_COLOR: RGBColor = { r: 255, g: 0, b: 0 };      // Red
    const PINKY_COLOR: RGBColor = { r: 255, g: 184, b: 255 };   // Pink
    const INKY_COLOR: RGBColor = { r: 0, g: 255, b: 255 };      // Cyan
    const CLYDE_COLOR: RGBColor = { r: 255, g: 184, b: 82 };    // Orange
    const PELLET_COLOR: RGBColor = { r: 50, g: 50, b: 50 };     // Dim white pellet

    // Build a 5x14 map of colors
    const gridColors: (RGBColor | null)[][] = Array.from({ length: 5 }, () => new Array(14).fill(null));

    // Pellets on keys ahead of Pac-Man
    for (let i = Math.max(0, pacmanIdx + 1); i < totalSteps; i++) {
      const node = this.path[i];
      gridColors[node.r][node.c] = PELLET_COLOR;
    }

    // Clyde
    if (clydeIdx >= 0 && clydeIdx < totalSteps) {
      const node = this.path[clydeIdx];
      gridColors[node.r][node.c] = CLYDE_COLOR;
    }
    // Inky
    if (inkyIdx >= 0 && inkyIdx < totalSteps) {
      const node = this.path[inkyIdx];
      gridColors[node.r][node.c] = INKY_COLOR;
    }
    // Pinky
    if (pinkyIdx >= 0 && pinkyIdx < totalSteps) {
      const node = this.path[pinkyIdx];
      gridColors[node.r][node.c] = PINKY_COLOR;
    }
    // Blinky
    if (blinkyIdx >= 0 && blinkyIdx < totalSteps) {
      const node = this.path[blinkyIdx];
      gridColors[node.r][node.c] = BLINKY_COLOR;
    }
    // Pac-Man
    if (pacmanIdx >= 0 && pacmanIdx < totalSteps) {
      const node = this.path[pacmanIdx];
      gridColors[node.r][node.c] = PACMAN_COLOR;
    }

    const frame: KeyFrameColor = {};
    const keys = ctx.keys ?? K630_LAYOUT;

    for (const key of keys) {
      const r = key.gridY;
      const c = key.gridX;

      let col = gridColors[r][c];

      // For spacebar (r=4, cols 3..9), sample if any spacebar column has a character or pellet
      if (key.id === 'space') {
        let activeActor: RGBColor | null = null;
        let hasPellet = false;
        for (let sc = 3; sc <= 9; sc++) {
          const scCol = gridColors[4][sc];
          if (scCol && scCol !== PELLET_COLOR) {
            activeActor = scCol;
            break;
          }
          if (scCol === PELLET_COLOR) hasPellet = true;
        }
        col = activeActor ?? (hasPellet ? PELLET_COLOR : null);
      }

      const finalColor = col ?? { r: 0, g: 0, b: 0 };
      frame[key.id] = applyBrightness(finalColor, this.params.brightness);
    }

    return frame;
  }
}

export const DEFAULT_PACMAN_ARCADE_PARAMS: PacmanArcadeParams = {
  brightness: 1.0,
  speed: 1.0,
};
