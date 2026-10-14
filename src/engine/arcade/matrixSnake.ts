import { MiniGame, GameEngine, GRID_COLS, GRID_ROW_COUNT } from './gameEngine';
import { RGBColor } from '../../types/keyboard';

interface SnakeSegment {
  row: number;
  col: number;
}

/**
 * Matrix Snake: Classic snake game played on the keyboard grid.
 * Control with WASD. Eat food (glowing key) to grow. Don't hit yourself or the walls.
 */
export class MatrixSnakeGame implements MiniGame {
  readonly name = 'Matrix Snake';
  readonly description = 'Guide the snake with WASD. Eat to grow!';
  readonly icon = '🐍';

  private engine: GameEngine | null = null;
  private score = 0;
  private snake: SnakeSegment[] = [];
  private direction: { dr: number; dc: number } = { dr: 0, dc: 1 };
  private nextDirection: { dr: number; dc: number } = { dr: 0, dc: 1 };
  private food: SnakeSegment | null = null;
  private isGameOver = false;
  private moveTimer = 0;
  private moveInterval = 0.25; // seconds between moves
  private minMoveInterval = 0.08;
  private pulsePhase = 0;
  private gridOccupied: boolean[][] = [];

  // Colors
  private readonly HEAD_COLOR: RGBColor = { r: 0, g: 255, b: 100 };
  private readonly BODY_COLOR: RGBColor = { r: 0, g: 180, b: 60 };
  private readonly TAIL_COLOR: RGBColor = { r: 0, g: 80, b: 30 };
  private readonly FOOD_COLOR: RGBColor = { r: 255, g: 60, b: 60 };
  private readonly FOOD_GLOW: RGBColor = { r: 255, g: 120, b: 40 };
  private readonly BG_DIM: RGBColor = { r: 3, g: 6, b: 3 };

  start(engine: GameEngine): void {
    this.engine = engine;
    this.score = 0;
    this.isGameOver = false;
    this.moveTimer = 0;
    this.moveInterval = 0.25;
    this.pulsePhase = 0;

    // Initialize grid occupancy
    this.gridOccupied = Array.from({ length: GRID_ROW_COUNT }, () =>
      Array(GRID_COLS).fill(false)
    );

    // Start snake in middle of row 2
    this.snake = [
      { row: 2, col: 7 },
      { row: 2, col: 6 },
      { row: 2, col: 5 },
    ];
    this.direction = { dr: 0, dc: 1 };
    this.nextDirection = { dr: 0, dc: 1 };

    this.updateOccupancy();
    this.spawnFood();
  }

  stop(): void {
    this.engine = null;
    this.snake = [];
    this.food = null;
  }

  onKey(code: string): void {
    if (this.isGameOver) {
      // Restart on any key
      if (this.engine) {
        this.start(this.engine);
      }
      return;
    }

    // WASD controls
    switch (code) {
      case 'KeyW':
        if (this.direction.dr !== 1) this.nextDirection = { dr: -1, dc: 0 };
        break;
      case 'KeyA':
        if (this.direction.dc !== 1) this.nextDirection = { dr: 0, dc: -1 };
        break;
      case 'KeyS':
        if (this.direction.dr !== -1) this.nextDirection = { dr: 1, dc: 0 };
        break;
      case 'KeyD':
        if (this.direction.dc !== -1) this.nextDirection = { dr: 0, dc: 1 };
        break;
      // Arrow key alternates
      case 'ArrowUp':
        if (this.direction.dr !== 1) this.nextDirection = { dr: -1, dc: 0 };
        break;
      case 'ArrowLeft':
        if (this.direction.dc !== 1) this.nextDirection = { dr: 0, dc: -1 };
        break;
      case 'ArrowDown':
        if (this.direction.dr !== -1) this.nextDirection = { dr: 1, dc: 0 };
        break;
      case 'ArrowRight':
        if (this.direction.dc !== -1) this.nextDirection = { dr: 0, dc: 1 };
        break;
    }
  }

  update(dt: number): void {
    if (!this.engine) return;

    this.pulsePhase += dt * 5;

    if (this.isGameOver) {
      this.renderGameOver(dt);
      return;
    }

    this.moveTimer += dt;
    if (this.moveTimer >= this.moveInterval) {
      this.moveTimer -= this.moveInterval;
      this.moveSnake();
    }

    this.render();
  }

  getScore(): number {
    return this.score;
  }

  getState(): Record<string, unknown> {
    return {
      score: this.score,
      length: this.snake.length,
      isGameOver: this.isGameOver,
      speed: (1 / this.moveInterval).toFixed(1),
    };
  }

  // ─── Private ────────────────────────────────────────────────

  private moveSnake(): void {
    this.direction = { ...this.nextDirection };
    const head = this.snake[0];
    const newHead: SnakeSegment = {
      row: head.row + this.direction.dr,
      col: head.col + this.direction.dc,
    };

    // Wall collision (wrap around)
    if (newHead.row < 0) newHead.row = GRID_ROW_COUNT - 1;
    if (newHead.row >= GRID_ROW_COUNT) newHead.row = 0;
    if (newHead.col < 0) newHead.col = GRID_COLS - 1;
    if (newHead.col >= GRID_COLS) newHead.col = 0;

    // Self collision
    if (this.gridOccupied[newHead.row][newHead.col]) {
      this.isGameOver = true;
      this.persistScore();
      this.engine?.flashBoard({ r: 255, g: 20, b: 20 }, 200);
      return;
    }

    this.snake.unshift(newHead);

    // Check food
    if (this.food && newHead.row === this.food.row && newHead.col === this.food.col) {
      this.score += 10;
      this.food = null;
      this.spawnFood();

      // Speed up
      this.moveInterval = Math.max(this.minMoveInterval, this.moveInterval - 0.008);

      this.engine?.flashBoard({ r: 0, g: 255, b: 80 }, 60);
    } else {
      // Remove tail
      this.snake.pop();
    }

    this.updateOccupancy();
  }

  private updateOccupancy(): void {
    for (let r = 0; r < GRID_ROW_COUNT; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        this.gridOccupied[r][c] = false;
      }
    }
    for (const seg of this.snake) {
      if (seg.row >= 0 && seg.row < GRID_ROW_COUNT && seg.col >= 0 && seg.col < GRID_COLS) {
        this.gridOccupied[seg.row][seg.col] = true;
      }
    }
  }

  private spawnFood(): void {
    const freeCells: SnakeSegment[] = [];
    for (let r = 0; r < GRID_ROW_COUNT; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (!this.gridOccupied[r][c]) {
          freeCells.push({ row: r, col: c });
        }
      }
    }
    if (freeCells.length > 0) {
      this.food = freeCells[Math.floor(Math.random() * freeCells.length)];
    }
  }

  private render(): void {
    if (!this.engine) return;

    this.engine.fillBoard(this.BG_DIM);

    // Render snake body with gradient
    const len = this.snake.length;
    this.snake.forEach((seg, i) => {
      let color: RGBColor;
      if (i === 0) {
        // Head
        color = this.HEAD_COLOR;
      } else {
        // Body fades toward tail
        const t = i / Math.max(1, len - 1);
        color = {
          r: Math.round(this.BODY_COLOR.r * (1 - t) + this.TAIL_COLOR.r * t),
          g: Math.round(this.BODY_COLOR.g * (1 - t) + this.TAIL_COLOR.g * t),
          b: Math.round(this.BODY_COLOR.b * (1 - t) + this.TAIL_COLOR.b * t),
        };
      }
      this.engine!.setGridColor(seg.row, seg.col, color);
    });

    // Render food with pulse
    if (this.food) {
      const pulse = 0.5 + 0.5 * Math.sin(this.pulsePhase);
      const foodColor: RGBColor = {
        r: Math.round(this.FOOD_COLOR.r * (1 - pulse) + this.FOOD_GLOW.r * pulse),
        g: Math.round(this.FOOD_COLOR.g * (1 - pulse) + this.FOOD_GLOW.g * pulse),
        b: Math.round(this.FOOD_COLOR.b * (1 - pulse) + this.FOOD_GLOW.b * pulse),
      };
      this.engine.setGridColor(this.food.row, this.food.col, foodColor);
    }

    // Score display: light up keys in top row proportional to score (every 50 pts = 1 key)
    const scoreKeys = Math.min(GRID_COLS, Math.floor(this.score / 50));
    for (let c = GRID_COLS - 1; c >= GRID_COLS - scoreKeys; c--) {
      this.engine.setGridColor(0, c, { r: 180, g: 180, b: 255 });
    }
  }

  private renderGameOver(dt: number): void {
    if (!this.engine) return;
    this.pulsePhase += dt * 2;

    // Show dead snake fading
    const fade = 0.2 + 0.15 * Math.sin(this.pulsePhase);
    this.engine.fillBoard({
      r: Math.round(40 * fade),
      g: Math.round(15 * fade),
      b: Math.round(5 * fade),
    });

    // Flash snake position
    for (const seg of this.snake) {
      this.engine.setGridColor(seg.row, seg.col, {
        r: Math.round(100 * fade),
        g: Math.round(40 * fade),
        b: Math.round(20 * fade),
      });
    }
  }

  private persistScore(): void {
    try {
      const key = 'vargb_arcade_matrix_snake';
      const best = parseInt(localStorage.getItem(key) || '0', 10);
      if (this.score > best) {
        localStorage.setItem(key, String(this.score));
      }
    } catch {}
  }
}
