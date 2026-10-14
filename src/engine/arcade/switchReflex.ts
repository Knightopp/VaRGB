import { MiniGame, GameEngine, KEYBOARD_GRID, GRID_COLS } from './gameEngine';
import { RGBColor } from '../../types/keyboard';

/**
 * Switch Reflex: Single random keys light up. Hit them before the timer runs out.
 * Speed increases over time. Streak multiplier for consecutive hits.
 */
export class SwitchReflexGame implements MiniGame {
  readonly name = 'Switch Reflex';
  readonly description = 'Hit the glowing key before time runs out!';
  readonly icon = '⚡';

  private engine: GameEngine | null = null;
  private score = 0;
  private streak = 0;
  private bestStreak = 0;
  private targetCode: string | null = null;
  private timeRemaining = 0;
  private maxTime = 2.0; // seconds per target
  private minTime = 0.5;
  private level = 1;
  private isGameOver = false;
  private lives = 3;
  private totalHits = 0;
  private allCodes: string[] = [];
  private pulsePhase = 0;

  // Colors
  private readonly TARGET_COLOR: RGBColor = { r: 0, g: 255, b: 120 };
  private readonly MISS_COLOR: RGBColor = { r: 255, g: 40, b: 40 };
  private readonly HIT_COLOR: RGBColor = { r: 255, g: 255, b: 80 };
  private readonly BG_DIM: RGBColor = { r: 8, g: 4, b: 12 };
  private readonly LIFE_COLOR: RGBColor = { r: 255, g: 60, b: 80 };

  start(engine: GameEngine): void {
    this.engine = engine;
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.lives = 3;
    this.totalHits = 0;
    this.level = 1;
    this.maxTime = 2.0;
    this.isGameOver = false;
    this.pulsePhase = 0;

    // Collect all playable key codes from grid
    this.allCodes = [];
    KEYBOARD_GRID.forEach((_, code) => {
      if (!this.allCodes.includes(code)) {
        this.allCodes.push(code);
      }
    });

    this.spawnTarget();
  }

  stop(): void {
    this.engine = null;
    this.targetCode = null;
  }

  onKey(code: string): void {
    if (!this.engine || this.isGameOver) return;

    if (code === this.targetCode) {
      // Hit!
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this.totalHits++;
      const multiplier = Math.min(4, 1 + Math.floor(this.streak / 5));
      this.score += 10 * multiplier;
      this.level = 1 + Math.floor(this.totalHits / 5);

      this.engine.flashBoard(this.HIT_COLOR, 80);

      // Reduce time as level increases
      this.maxTime = Math.max(this.minTime, 2.0 - (this.level - 1) * 0.15);
      this.spawnTarget();
    } else {
      // Wrong key
      this.streak = 0;
      this.lives--;
      this.engine.flashBoard(this.MISS_COLOR, 120);

      if (this.lives <= 0) {
        this.isGameOver = true;
        this.persistScore();
      }
    }
  }

  update(dt: number): void {
    if (!this.engine || this.isGameOver) {
      this.renderGameOver(dt);
      return;
    }

    this.pulsePhase += dt * 4;
    this.timeRemaining -= dt;

    if (this.timeRemaining <= 0) {
      // Time expired
      this.streak = 0;
      this.lives--;
      this.engine.flashBoard(this.MISS_COLOR, 100);

      if (this.lives <= 0) {
        this.isGameOver = true;
        this.persistScore();
        return;
      }
      this.spawnTarget();
    }

    this.render();
  }

  getScore(): number {
    return this.score;
  }

  getState(): Record<string, unknown> {
    return {
      score: this.score,
      streak: this.streak,
      bestStreak: this.bestStreak,
      level: this.level,
      lives: this.lives,
      isGameOver: this.isGameOver,
      timeRemaining: this.timeRemaining,
      maxTime: this.maxTime,
    };
  }

  // ─── Private ────────────────────────────────────────────────

  private spawnTarget(): void {
    const idx = Math.floor(Math.random() * this.allCodes.length);
    this.targetCode = this.allCodes[idx];
    this.timeRemaining = this.maxTime;
  }

  private render(): void {
    if (!this.engine || !this.targetCode) return;

    this.engine.clearBoard();

    // Dim background
    this.engine.fillBoard(this.BG_DIM);

    // Show lives on top-left keys (ESC, 1, 2)
    const lifeCodes = ['Escape', 'Digit1', 'Digit2'];
    for (let i = 0; i < 3; i++) {
      if (i < this.lives) {
        this.engine.setKeyColor(lifeCodes[i], this.LIFE_COLOR);
      }
    }

    // Target key pulses
    const pulse = 0.6 + 0.4 * Math.sin(this.pulsePhase);
    const urgency = 1 - (this.timeRemaining / this.maxTime);
    const r = Math.round(this.TARGET_COLOR.r * pulse + urgency * 120);
    const g = Math.round(this.TARGET_COLOR.g * pulse * (1 - urgency * 0.5));
    const b = Math.round(this.TARGET_COLOR.b * pulse * (1 - urgency * 0.3));

    this.engine.setKeyColor(this.targetCode, {
      r: Math.min(255, r),
      g: Math.max(0, g),
      b: Math.max(0, b),
    });

    // Timer bar on bottom row
    const progress = this.timeRemaining / this.maxTime;
    const barKeys = Math.round(progress * GRID_COLS);
    for (let c = 0; c < barKeys; c++) {
      const barR = Math.round(255 * (1 - progress));
      const barG = Math.round(255 * progress);
      this.engine.setGridColor(4, c, { r: barR, g: barG, b: 30 });
    }
  }

  private renderGameOver(dt: number): void {
    if (!this.engine) return;
    this.pulsePhase += dt * 2;
    const fade = 0.3 + 0.2 * Math.sin(this.pulsePhase);
    this.engine.fillBoard({
      r: Math.round(60 * fade),
      g: Math.round(10 * fade),
      b: Math.round(20 * fade),
    });
  }

  private persistScore(): void {
    try {
      const key = 'vargb_arcade_switch_reflex';
      const best = parseInt(localStorage.getItem(key) || '0', 10);
      if (this.score > best) {
        localStorage.setItem(key, String(this.score));
      }
    } catch {}
  }
}
