import { KeyDefinition } from '../../types/keyboard';
import { KEY_BY_CODE, KEY_BY_ID, getKeyCenter } from '../layout';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

export interface ReactiveKeyEvent {
  code: string;
  keyId: string;
  key: KeyDefinition;
  timestamp: number; // Seconds (high-resolution performance.now() / 1000)
  x: number;         // Physical center X in keyboard units (0 to 15)
  y: number;         // Physical center Y in keyboard units (0 to 5)
  normX: number;     // Normalized [0, 1]
  normY: number;     // Normalized [0, 1]
}

export type KeyEventListener = (event: ReactiveKeyEvent) => void;

/**
 * Shared Reactive Input Engine for VaRGB.
 *
 * Provides a single, authoritative, non-blocking input event pipeline across all reactive RGB effects.
 * 
 * Guarantees:
 * 1. Zero sensitive character storage: Only records physical key identity (e.code / key.id) and timestamps.
 * 2. Never blocks typing or modifies keyboard behavior.
 * 3. Exactly one global listener attached to window and OS hook, properly cleaned up on destroy().
 * 4. Bounded keystroke rate estimator using sliding time windows for activity/intensity effects.
 * 5. Full mapping to physical key centers and normalized coordinates.
 */
export class ReactiveInputEngine {
  private static instance: ReactiveInputEngine | null = null;

  private listeners: Set<KeyEventListener> = new Set();
  private isListening: boolean = false;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private unlistenGlobal: UnlistenFn | null = null;

  // Circular timestamp buffer for typing activity tracking (max 100 recent timestamps)
  private readonly timestampHistory: number[] = [];
  private readonly maxHistorySize: number = 100;

  private lastDomEventTime: Map<string, number> = new Map();

  private constructor() {
    this.startListening();
  }

  public static getInstance(): ReactiveInputEngine {
    if (!ReactiveInputEngine.instance) {
      ReactiveInputEngine.instance = new ReactiveInputEngine();
    }
    return ReactiveInputEngine.instance;
  }

  /**
   * Attach global key listener safely to window and system-wide OS hook.
   */
  public startListening(): void {
    if (this.isListening || typeof window === 'undefined') return;

    this.keydownHandler = (e: KeyboardEvent) => {
      // Discard OS auto-repeats so holding down keys (e.g. Space) doesn't spam
      if (e.repeat) return;

      // Prevent Space from activating focused UI buttons or scrolling the window
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
      }

      const now = performance.now() / 1000;
      this.lastDomEventTime.set(e.code, now);
      this.handleRawKeyEvent(e.code);
    };

    window.addEventListener('keydown', this.keydownHandler);

    // Listen to system-wide OS key events from Tauri backend (works while typing in any other app)
    try {
      void listen<string>('global_key_press', (event) => {
        const now = performance.now() / 1000;
        // If window keydown handled this exact key in the last 40ms, skip duplicate
        if (now - (this.lastDomEventTime.get(event.payload) || 0) < 0.04) return;
        this.handleRawKeyEvent(event.payload);
      }).then((unlisten) => {
        this.unlistenGlobal = unlisten;
      });
    } catch {
      // Running in unit test or non-Tauri browser context
    }

    this.isListening = true;
  }

  /**
   * Process a key code from window keydown or simulated event.
   */
  public handleRawKeyEvent(codeOrId: string): ReactiveKeyEvent | null {
    const now = performance.now() / 1000;
    // Resolve key from layout mapping by code (e.g. 'KeyA') or id (e.g. 'a')
    const key = KEY_BY_CODE[codeOrId] || KEY_BY_ID[codeOrId];
    if (!key) return null;

    const center = getKeyCenter(key);

    const event: ReactiveKeyEvent = {
      code: key.code,
      keyId: key.id,
      key,
      timestamp: now,
      x: center.x,
      y: center.y,
      normX: key.normX,
      normY: key.normY,
    };

    // Track timestamp in sliding history
    this.recordKeystroke(now);

    // Dispatch to all subscribers
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in reactive key listener:', err);
      }
    }

    return event;
  }

  /**
   * Record timestamp in bounded sliding window.
   */
  private recordKeystroke(now: number): void {
    this.timestampHistory.push(now);
    if (this.timestampHistory.length > this.maxHistorySize) {
      this.timestampHistory.shift();
    }
  }

  /**
   * Calculate smoothed keystroke rate (keystrokes per second) within a sliding window.
   */
  public getKeystrokeRate(windowSeconds: number = 3.0): number {
    const now = performance.now() / 1000;
    const cutoff = now - Math.max(0.2, windowSeconds);

    let count = 0;
    for (let i = this.timestampHistory.length - 1; i >= 0; i--) {
      if (this.timestampHistory[i] >= cutoff) {
        count++;
      } else {
        break;
      }
    }

    return count / windowSeconds;
  }

  /**
   * Subscribe an effect or observer to the reactive event stream.
   */
  public subscribe(listener: KeyEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Detach all listeners and clean up global resources.
   */
  public destroy(): void {
    if (this.keydownHandler && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
    if (this.unlistenGlobal) {
      this.unlistenGlobal();
      this.unlistenGlobal = null;
    }
    this.listeners.clear();
    this.timestampHistory.length = 0;
    this.isListening = false;
  }
}

export const reactiveInputEngine = ReactiveInputEngine.getInstance();
