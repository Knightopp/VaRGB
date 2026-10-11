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

  constructor(private keys: KeyDefinition[] = K630_LAYOUT) {
    this.setupKeyEventListener();
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
    this.effect = effect;
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
    this.tick(this.lastTimestamp);
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    if (!this.isRunning) {
      this.start();
      return;
    }
    this.isPaused = false;
    this.lastTimestamp = performance.now();
  }

  public stop(): void {
    this.isRunning = false;
    this.isPaused = false;
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
    if (!this.isRunning) return;

    if (!this.isPaused && this.effect) {
      const dt = Math.min(0.1, (timestamp - this.lastTimestamp) / 1000);
      this.accumulatedTime += dt;
      this.lastTimestamp = timestamp;

      const ctx: AnimationContext = {
        keys: this.keys,
        totalTime: this.accumulatedTime,
        dt,
        audio: this.audioAnalysis,
      };

      const frame = this.effect.update(ctx);
      this.notifySubscribers(frame);

      // Hardware rate limiter: only push to USB when interval has elapsed
      if (this.hardwareListener && timestamp - this.lastHardwarePushTime >= this.hardwareIntervalMs) {
        this.lastHardwarePushTime = timestamp;
        this.hardwareListener(frame);
      }
    } else {
      this.lastTimestamp = timestamp;
    }

    this.animFrameId = requestAnimationFrame(this.tick);
  };

  private notifySubscribers(frame: KeyFrameColor): void {
    for (const listener of this.listeners) {
      listener(frame);
    }
  }
}
