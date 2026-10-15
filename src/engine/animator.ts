import { ILightingEffect, AnimationContext } from '../types/effects';
import type { AudioAnalysis } from '../types/effects';
import { KeyFrameColor, KeyDefinition } from '../types/keyboard';
import { K630_LAYOUT } from './layout';

import { reactiveInputEngine } from './input/reactiveInputEngine';

export type FrameListener = (frame: KeyFrameColor) => void;

export class AnimationEngine {
  private effect: ILightingEffect | null = null;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private animFrameId: number | null = null;
  private lastTimestamp: number = 0;
  private accumulatedTime: number = 0;
  private audioAnalysis: AudioAnalysis | undefined;

  private listeners: Set<FrameListener> = new Set();
  private hardwareListener: ((frame: KeyFrameColor) => void) | null = null;
  private lastHardwarePushTime: number = 0;
  private hardwareIntervalMs: number = 33; // ~30 fps cap for USB transmission
  private inputUnsubscribe: (() => void) | null = null;
  private backgroundTimerId: number | null = null;
  private lastFrame: KeyFrameColor = {};

  constructor(private keys: KeyDefinition[] = K630_LAYOUT) {
    this.setupKeyEventListener();
    this.setupVisibilityListener();
  }

  private handleVisibilityChange = (): void => {
    if (!this.isRunning || this.isPaused) return;

    if (typeof document !== 'undefined' && document.hidden) {
      this.switchToBackground();
    } else {
      this.switchToForeground();
    }
  };

  private handleWindowFocus = (): void => {
    if (!this.isRunning || this.isPaused) return;
    this.lastTimestamp = performance.now();
    if (typeof document !== 'undefined' && !document.hidden) {
      this.switchToForeground();
    }
  };

  private setupVisibilityListener(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      window.addEventListener('focus', this.handleWindowFocus);
    }
  }

  private setupKeyEventListener(): void {
    this.inputUnsubscribe = reactiveInputEngine.subscribe((event) => {
      // Safe event propagation: only forward to active effect
      // Never store or inspect typed characters
      if (this.isRunning && !this.isPaused && this.effect && this.effect.onKeyDown) {
        this.effect.onKeyDown(event.code);
      }
    });
  }

  public setEffect(effect: ILightingEffect): void {
    // Clean up previous effect state to prevent mode-switching bleed
    if (this.effect && this.effect !== effect) {
      try {
        this.effect.reset();
      } catch (err) {
        console.warn('Error resetting previous effect:', err);
      }
    }
    this.effect = effect;
    // Reset accumulated time so new effect starts at t=0
    this.accumulatedTime = 0;
    this.lastTimestamp = performance.now();

    // Clean baseline frame on effect switch so prior effect keys don't linger
    if (this.keys && this.keys.length > 0) {
      const offFrame: KeyFrameColor = {};
      for (const k of this.keys) {
        offFrame[k.id] = { r: 0, g: 0, b: 0 };
      }
      this.notifySubscribers(offFrame);
      if (this.hardwareListener) {
        this.hardwareListener(offFrame);
      }
    }
  }

  public setAudioAnalysis(analysis: AudioAnalysis | undefined): void {
    this.audioAnalysis = analysis;
  }

  public getEffect(): ILightingEffect | null {
    return this.effect;
  }

  public subscribe(listener: FrameListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public setHardwareStreamer(streamer: ((frame: KeyFrameColor) => void) | null): void {
    this.hardwareListener = streamer;
  }

  public setHardwareFrameRateLimit(fps: number): void {
    const safeFps = Number.isFinite(fps) ? Math.max(1, Math.min(60, fps)) : 30;
    this.hardwareIntervalMs = 1000 / safeFps;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.lastTimestamp = performance.now();
    this.accumulatedTime = 0;

    if (typeof document !== 'undefined' && document.hidden) {
      this.switchToBackground();
    } else {
      this.switchToForeground();
    }
  }

  private switchToBackground(): void {
    // 1. Cancel active RAF so it doesn't queue callbacks or fight with background loop
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    // 2. Start background interval if not already running
    this.startBackgroundLoop();
  }

  private switchToForeground(): void {
    // 1. Stop background interval immediately
    this.stopBackgroundLoop();
    // 2. Refresh timestamp so dt is not a giant jump
    this.lastTimestamp = performance.now();
    // 3. Ensure any existing RAF is cancelled so we never duplicate
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    // 4. Start single foreground RAF loop
    this.animFrameId = requestAnimationFrame(this.tick);
  }

  private startBackgroundLoop(): void {
    if (this.backgroundTimerId !== null || typeof window === 'undefined') return;
    this.backgroundTimerId = window.setInterval(
      this.backgroundTick,
      Math.max(16, Math.floor(this.hardwareIntervalMs))
    );
  }

  private stopBackgroundLoop(): void {
    if (this.backgroundTimerId !== null) {
      clearInterval(this.backgroundTimerId);
      this.backgroundTimerId = null;
    }
  }

  private backgroundTick = (): void => {
    if (!this.isRunning || this.isPaused) return;
    const now = performance.now();
    const rawDt = (now - this.lastTimestamp) / 1000;
    const dt = Number.isFinite(rawDt) ? Math.min(0.1, Math.max(0.001, rawDt)) : 0.033;
    this.accumulatedTime += dt;
    this.lastTimestamp = now;

    if (this.effect) {
      const ctx: AnimationContext = {
        keys: this.keys,
        totalTime: this.accumulatedTime,
        dt,
        audio: this.audioAnalysis,
      };

      const frame = this.effect.update(ctx);

      // In background, stream directly to USB hardware controller without touching DOM
      if (this.hardwareListener && now - this.lastHardwarePushTime >= this.hardwareIntervalMs) {
        this.lastHardwarePushTime = now;
        this.hardwareListener(frame);
      }
    }
  };

  public pause(): void {
    this.isPaused = true;
    this.stopBackgroundLoop();
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public resume(): void {
    if (!this.isRunning) {
      this.start();
      return;
    }
    this.isPaused = false;
    this.lastTimestamp = performance.now();
    if (typeof document !== 'undefined' && document.hidden) {
      this.switchToBackground();
    } else {
      this.switchToForeground();
    }
  }

  public stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.stopBackgroundLoop();
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.effect) {
      this.effect.reset();
    }
    // Emit dark frame on stop
    const offFrame: KeyFrameColor = {};
    for (const k of this.keys) {
      offFrame[k.id] = { r: 0, g: 0, b: 0 };
    }
    this.notifySubscribers(offFrame);
    if (this.hardwareListener) {
      this.hardwareListener(offFrame);
    }
  }

  public destroy(): void {
    this.stop();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      window.removeEventListener('focus', this.handleWindowFocus);
    }
    if (this.inputUnsubscribe) {
      this.inputUnsubscribe();
      this.inputUnsubscribe = null;
    }
    this.listeners.clear();
  }

  public get active(): boolean {
    return this.isRunning && !this.isPaused;
  }

  private tick = (timestamp: number): void => {
    // Clear animFrameId since this frame callback is executing now
    this.animFrameId = null;

    if (!this.isRunning) return;

    // If window became hidden, switch cleanly to background loop and stop RAF
    if (typeof document !== 'undefined' && document.hidden) {
      this.switchToBackground();
      return;
    }

    if (!this.isPaused && this.effect) {
      // Clamped delta time: prevents physics/animation explosions on frame drops or focus restores
      const rawDt = (timestamp - this.lastTimestamp) / 1000;
      const dt = Number.isFinite(rawDt) ? Math.min(0.05, Math.max(0.001, rawDt)) : 0.016;
      this.accumulatedTime += dt;
      this.lastTimestamp = timestamp;

      const ctx: AnimationContext = {
        keys: this.keys,
        totalTime: this.accumulatedTime,
        dt,
        audio: this.audioAnalysis,
      };

      const frame = this.effect.update(ctx);
      this.lastFrame = frame;
      this.notifySubscribers(frame);

      // Hardware rate limiter: only push to USB when interval has elapsed
      if (this.hardwareListener && timestamp - this.lastHardwarePushTime >= this.hardwareIntervalMs) {
        this.lastHardwarePushTime = timestamp;
        this.hardwareListener(frame);
      }
    } else {
      this.lastTimestamp = timestamp;
    }

    // Schedule next frame ONLY if running, not paused, and window is visible
    if (this.isRunning && !this.isPaused) {
      this.animFrameId = requestAnimationFrame(this.tick);
    }
  };

  public getLastFrame(): KeyFrameColor {
    return this.lastFrame;
  }

  private notifySubscribers(frame: KeyFrameColor): void {
    for (const listener of this.listeners) {
      listener(frame);
    }
  }
}
