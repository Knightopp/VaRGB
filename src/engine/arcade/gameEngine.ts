import { RGBColor, KeyFrameColor, KeyDefinition } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE, PHYSICAL_ADJACENCY } from '../layout';
import { reactiveInputEngine, ReactiveKeyEvent } from '../input/reactiveInputEngine';

/**
 * KEYBOARD_GRID: Maps event.code → normalized (row, col) on 60% ANSI layout.
 * 5 rows × 14 columns.
 */
const GRID_ROWS: string[][] = [
  ['Escape', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'Backspace'],
  ['Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash'],
  ['CapsLock', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Enter', 'Enter'],
  ['ShiftLeft', 'ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', 'ShiftRight', 'ShiftRight'],
  ['ControlLeft', 'MetaLeft', 'AltLeft', 'Space', 'Space', 'Space', 'Space', 'Space', 'Space', 'Space', 'AltRight', 'Fn', 'ContextMenu', 'ControlRight'],
];

export const KEYBOARD_GRID: Map<string, { row: number; col: number }> = new Map();
GRID_ROWS.forEach((row, r) => {
  row.forEach((code, c) => {
    if (!KEYBOARD_GRID.has(code)) {
      KEYBOARD_GRID.set(code, { row: r, col: c });
    }
  });
});

export const GRID_COLS = 14;
export const GRID_ROW_COUNT = 5;

export type GameKeyHandler = (code: string, gridPos: { row: number; col: number } | undefined) => void;

export interface MiniGame {
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  start(engine: GameEngine): void;
  stop(): void;
  onKey(code: string, gridPos: { row: number; col: number } | undefined): void;
  update(dt: number): void;
  getScore(): number;
  getState(): Record<string, unknown>;
}

/**
 * GameEngine: Bridge between minigames and the keyboard LED matrix.
 * Provides APIs for games to control key colors and read input.
 */
export class GameEngine {
  private frameBuffer: KeyFrameColor = {};
  private flashTimer: number | null = null;
  private activeGame: MiniGame | null = null;
  private unsubscribeInput: (() => void) | null = null;
  private animFrameId: number | null = null;
  private lastTimestamp: number = 0;
  private isRunning: boolean = false;
  private frameListeners: Set<(frame: KeyFrameColor) => void> = new Set();
  private keyListeners: Set<GameKeyHandler> = new Set();
  private rolloverCount: number = 0;
  private pressedKeys: Set<string> = new Set();

  constructor() {
    this.clearBoard();
  }

  // ─── LED Control API ────────────────────────────────────────

  /** Set a single key's color by its code (e.g. 'KeyA') */
  setKeyColor(code: string, color: RGBColor): void {
    const key = KEY_BY_CODE[code];
    if (key) {
      this.frameBuffer[key.id] = { ...color };
    }
  }

  /** Set a key color by grid position (row, col) */
  setGridColor(row: number, col: number, color: RGBColor): void {
    if (row >= 0 && row < GRID_ROW_COUNT && col >= 0 && col < GRID_COLS) {
      const code = GRID_ROWS[row]?.[col];
      if (code) this.setKeyColor(code, color);
    }
  }

  /** Fill entire keyboard with a single color */
  fillBoard(color: RGBColor): void {
    for (const key of K630_LAYOUT) {
      this.frameBuffer[key.id] = { ...color };
    }
  }

  /** Clear all keys to black */
  clearBoard(): void {
    this.fillBoard({ r: 0, g: 0, b: 0 });
  }

  /** Flash all keys with a color for durationMs, then revert */
  flashBoard(color: RGBColor, durationMs: number = 150): void {
    if (this.flashTimer !== null) {
      clearTimeout(this.flashTimer);
    }
    const savedFrame = { ...this.frameBuffer };
    this.fillBoard(color);
    this.emitFrame();
    this.flashTimer = window.setTimeout(() => {
      this.frameBuffer = savedFrame;
      this.emitFrame();
      this.flashTimer = null;
    }, durationMs);
  }

  /** Get currently active (pressed) keys */
  get activeKeys(): ReadonlySet<string> {
    return this.pressedKeys;
  }

  /** Get current NKRO count */
  get currentRollover(): number {
    return this.rolloverCount;
  }

  /** Get current frame buffer (read-only snapshot) */
  getFrame(): KeyFrameColor {
    return { ...this.frameBuffer };
  }

  /** Get the full keyboard layout */
  getLayout(): KeyDefinition[] {
    return K630_LAYOUT;
  }

  /** Get grid position for a code */
  getGridPos(code: string): { row: number; col: number } | undefined {
    return KEYBOARD_GRID.get(code);
  }

  /** Get physical neighbors of a key */
  getNeighbors(keyId: string): string[] {
    return PHYSICAL_ADJACENCY[keyId] || [];
  }

  // ─── Lifecycle ──────────────────────────────────────────────

  /** Start the game loop */
  start(game: MiniGame): void {
    this.stop();
    this.activeGame = game;
    this.clearBoard();
    this.isRunning = true;
    this.lastTimestamp = performance.now();

    // Subscribe to global keystrokes
    this.unsubscribeInput = reactiveInputEngine.subscribe((event: ReactiveKeyEvent) => {
      this.pressedKeys.add(event.code);
      this.rolloverCount = this.pressedKeys.size;

      const gridPos = KEYBOARD_GRID.get(event.code);
      this.activeGame?.onKey(event.code, gridPos);
      for (const listener of this.keyListeners) {
        listener(event.code, gridPos);
      }

      // Auto-release after 200ms (keyup detection)
      setTimeout(() => {
        this.pressedKeys.delete(event.code);
        this.rolloverCount = this.pressedKeys.size;
      }, 200);
    });

    // Start game
    game.start(this);

    // Start render loop
    this.animFrameId = requestAnimationFrame(this.tick);
  }

  /** Stop the current game and clean up */
  stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.unsubscribeInput) {
      this.unsubscribeInput();
      this.unsubscribeInput = null;
    }
    if (this.flashTimer !== null) {
      clearTimeout(this.flashTimer);
      this.flashTimer = null;
    }
    if (this.activeGame) {
      this.activeGame.stop();
      this.activeGame = null;
    }
    this.pressedKeys.clear();
    this.rolloverCount = 0;
    this.clearBoard();
    this.emitFrame();
  }

  /** Subscribe to frame updates for rendering on the virtual keyboard */
  onFrame(listener: (frame: KeyFrameColor) => void): () => void {
    this.frameListeners.add(listener);
    return () => this.frameListeners.delete(listener);
  }

  /** Subscribe to key events */
  onKey(listener: GameKeyHandler): () => void {
    this.keyListeners.add(listener);
    return () => this.keyListeners.delete(listener);
  }

  // ─── Internal ───────────────────────────────────────────────

  private tick = (timestamp: number): void => {
    this.animFrameId = null;
    if (!this.isRunning) return;

    const rawDt = (timestamp - this.lastTimestamp) / 1000;
    const dt = Math.min(0.1, Math.max(0.001, rawDt));
    this.lastTimestamp = timestamp;

    if (this.activeGame) {
      this.activeGame.update(dt);
    }

    this.emitFrame();
    this.animFrameId = requestAnimationFrame(this.tick);
  };

  private emitFrame(): void {
    const frame = { ...this.frameBuffer };
    for (const listener of this.frameListeners) {
      listener(frame);
    }
  }
}
