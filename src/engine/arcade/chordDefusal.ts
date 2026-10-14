import { MiniGame, GameEngine, KEYBOARD_GRID, GRID_COLS } from './gameEngine';
import { RGBColor } from '../../types/keyboard';

/**
 * Chord Defusal: Multiple keys light up simultaneously.
 * Press ALL of them together (chord) within the time limit to "defuse the bomb".
 * Difficulty increases by adding more keys to the chord.
 */
export class ChordDefusalGame implements MiniGame {
  readonly name = 'Chord Defusal';
  readonly description = 'Press all glowing keys at once to defuse!';
  readonly icon = '💣';

  private engine: GameEngine | null = null;
  private score = 0;
  private round = 1;
  private chordSize = 2;
  private maxChordSize = 6;
  private timeRemaining = 0;
  private maxTime = 4.0;
  private targetCodes: string[] = [];
  private pressedTargets: Set<string> = new Set();
  private isGameOver = false;
  private lives = 3;
  private pulsePhase = 0;
  private allCodes: string[] = [];
  private defuseFlashTime = 0;

  // Colors
  private readonly WIRE_COLORS: RGBColor[] = [
    { r: 255, g: 50, b: 50 },   // Red wire
    { r: 50, g: 100, b: 255 },  // Blue wire
    { r: 50, g: 255, b: 100 },  // Green wire
    { r: 255, g: 200, b: 50 },  // Yellow wire
    { r: 255, g: 80, b: 200 },  // Pink wire
    { r: 100, g: 255, b: 255 }, // Cyan wire
  ];
  private readonly DEFUSE_COLOR: RGBColor = { r: 50, g: 255, b: 50 };
  private readonly BOMB_COLOR: RGBColor = { r: 255, g: 30, b: 10 };
  private readonly BG_DIM: RGBColor = { r: 6, g: 3, b: 8 };
  private readonly PRESSED_COLOR: RGBColor = { r: 200, g: 200, b: 255 };

  start(engine: GameEngine): void {
    this.engine = engine;
    this.score = 0;
    this.round = 1;
    this.chordSize = 2;
    this.lives = 3;
    this.isGameOver = false;
    this.maxTime = 4.0;
    this.pulsePhase = 0;

    this.allCodes = [];
    KEYBOARD_GRID.forEach((_, code) => {
      if (!this.allCodes.includes(code)) {
        this.allCodes.push(code);
      }
    });

    this.spawnChord();
  }

  stop(): void {
    this.engine = null;
    this.targetCodes = [];
    this.pressedTargets.clear();
  }

  onKey(code: string): void {
    if (!this.engine || this.isGameOver) return;

    if (this.targetCodes.includes(code)) {
      this.pressedTargets.add(code);

      // Check if all chord keys are pressed
      if (this.pressedTargets.size >= this.targetCodes.length) {
        // Defused!
        const timeBonus = Math.round(this.timeRemaining * 5);
        const chordBonus = this.chordSize * 5;
        this.score += 20 + timeBonus + chordBonus;
        this.round++;

        // Increase difficulty every 3 rounds
        if (this.round % 3 === 0 && this.chordSize < this.maxChordSize) {
          this.chordSize++;
        }
        this.maxTime = Math.max(2.0, 4.0 - (this.round - 1) * 0.2);

        this.defuseFlashTime = 0.3;
        this.engine.flashBoard(this.DEFUSE_COLOR, 120);

        this.spawnChord();
      }
    } else {
      // Wrong key - penalty
      this.lives--;
      this.engine.flashBoard(this.BOMB_COLOR, 150);

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

    this.pulsePhase += dt * 3;
    this.timeRemaining -= dt;
    this.defuseFlashTime = Math.max(0, this.defuseFlashTime - dt);

    if (this.timeRemaining <= 0) {
      // Boom!
      this.lives--;
      this.engine.flashBoard(this.BOMB_COLOR, 200);

      if (this.lives <= 0) {
        this.isGameOver = true;
        this.persistScore();
        return;
      }
      this.spawnChord();
    }

    // Auto-release tracking for chord detection
    this.pressedTargets = new Set(
      [...this.pressedTargets].filter(c => this.engine!.activeKeys.has(c))
    );

    this.render();
  }

  getScore(): number {
    return this.score;
  }

  getState(): Record<string, unknown> {
    return {
      score: this.score,
      round: this.round,
      chordSize: this.chordSize,
      lives: this.lives,
      isGameOver: this.isGameOver,
      timeRemaining: this.timeRemaining,
      pressedCount: this.pressedTargets.size,
      targetCount: this.targetCodes.length,
    };
  }

  // ─── Private ────────────────────────────────────────────────

  private spawnChord(): void {
    this.pressedTargets.clear();
    this.timeRemaining = this.maxTime;

    // Pick random unique keys
    const available = [...this.allCodes];
    this.targetCodes = [];
    for (let i = 0; i < this.chordSize && available.length > 0; i++) {
      const idx = Math.floor(Math.random() * available.length);
      this.targetCodes.push(available[idx]);
      available.splice(idx, 1);
    }
  }

  private render(): void {
    if (!this.engine) return;

    this.engine.fillBoard(this.BG_DIM);

    // Lives indicator
    const lifeCodes = ['Escape', 'Digit1', 'Digit2'];
    for (let i = 0; i < 3; i++) {
      if (i < this.lives) {
        this.engine.setKeyColor(lifeCodes[i], { r: 255, g: 60, b: 80 });
      }
    }

    // Target keys with individual wire colors
    const pulse = 0.5 + 0.5 * Math.sin(this.pulsePhase);
    const urgency = 1 - (this.timeRemaining / this.maxTime);

    this.targetCodes.forEach((code, i) => {
      if (this.pressedTargets.has(code)) {
        this.engine!.setKeyColor(code, this.PRESSED_COLOR);
      } else {
        const wireColor = this.WIRE_COLORS[i % this.WIRE_COLORS.length];
        const blinkRate = urgency > 0.7 ? (Math.sin(this.pulsePhase * 4) > 0 ? 1 : 0.2) : pulse;
        this.engine!.setKeyColor(code, {
          r: Math.round(wireColor.r * blinkRate),
          g: Math.round(wireColor.g * blinkRate),
          b: Math.round(wireColor.b * blinkRate),
        });
      }
    });

    // Timer bar
    const progress = this.timeRemaining / this.maxTime;
    const barKeys = Math.round(progress * GRID_COLS);
    for (let c = 0; c < barKeys; c++) {
      this.engine.setGridColor(4, c, {
        r: Math.round(255 * (1 - progress)),
        g: Math.round(200 * progress),
        b: 30,
      });
    }
  }

  private renderGameOver(dt: number): void {
    if (!this.engine) return;
    this.pulsePhase += dt * 1.5;
    const fade = 0.2 + 0.15 * Math.sin(this.pulsePhase);
    this.engine.fillBoard({
      r: Math.round(80 * fade),
      g: Math.round(5 * fade),
      b: Math.round(5 * fade),
    });
  }

  private persistScore(): void {
    try {
      const key = 'vargb_arcade_chord_defusal';
      const best = parseInt(localStorage.getItem(key) || '0', 10);
      if (this.score > best) {
        localStorage.setItem(key, String(this.score));
      }
    } catch {}
  }
}
