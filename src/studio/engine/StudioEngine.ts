import { KeyDefinition, KeyFrameColor } from '../../types/keyboard';
import { K630_LAYOUT } from '../../engine/layout';
import { StudioProject } from '../types/studio';
import { compositeProjectFrame } from './compositor';
import { studioHardwareAdapter } from './hardwareAdapter';

function safeRequestAnimationFrame(callback: (timestamp: number) => void): number {
  if (typeof requestAnimationFrame !== 'undefined') {
    return requestAnimationFrame(callback);
  }
  return setTimeout(() => callback(performance.now()), 16) as unknown as number;
}

function safeCancelAnimationFrame(id: number): void {
  if (typeof cancelAnimationFrame !== 'undefined') {
    cancelAnimationFrame(id);
    return;
  }
  clearTimeout(id);
}

export type StudioFrameListener = (frame: KeyFrameColor, time: number) => void;
export type StudioTimeListener = (time: number) => void;

export class StudioEngine {
  private project: StudioProject;
  private currentTime: number = 0;
  private isPlaying: boolean = false;
  private isLooping: boolean = true;
  private animFrameId: number | null = null;
  private lastTimestamp: number = 0;
  private keys: KeyDefinition[] = K630_LAYOUT;

  private frameListeners: Set<StudioFrameListener> = new Set();
  private timeListeners: Set<StudioTimeListener> = new Set();
  private isDisposed: boolean = false;

  constructor(initialProject: StudioProject) {
    this.project = initialProject;
    this.isLooping = initialProject.loop ?? true;
  }

  public setProject(project: StudioProject): void {
    this.project = project;
    this.isLooping = project.loop ?? true;
    // Re-evaluate current frame with updated project data
    this.renderCurrentTime();
  }

  public getProject(): StudioProject {
    return this.project;
  }

  public getCurrentTime(): number {
    return this.currentTime;
  }

  public get playing(): boolean {
    return this.isPlaying;
  }

  public setLoop(loop: boolean): void {
    this.isLooping = loop;
  }

  public subscribe(listener: StudioFrameListener): () => void {
    this.frameListeners.add(listener);
    // Immediately emit current frame to new subscriber
    const frame = this.evaluateCurrentFrame();
    listener(frame, this.currentTime);
    return () => this.frameListeners.delete(listener);
  }

  public subscribeTime(listener: StudioTimeListener): () => void {
    this.timeListeners.add(listener);
    listener(this.currentTime);
    return () => this.timeListeners.delete(listener);
  }

  public play(): void {
    if (this.isDisposed || this.isPlaying) return;
    this.isPlaying = true;

    // If playhead is at or past work area end, loop back to start
    if (this.currentTime >= this.project.workArea.end) {
      this.currentTime = this.project.workArea.start;
    }

    this.lastTimestamp = performance.now();
    this.animFrameId = safeRequestAnimationFrame(this.tick);
  }

  public pause(): void {
    if (this.animFrameId !== null) {
      safeCancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.isPlaying = false;
  }

  public togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public stop(): void {
    this.pause();
    this.seek(this.project.workArea.start);
  }

  public seek(time: number): void {
    const clamped = Math.max(0, Math.min(this.project.duration, time));
    this.currentTime = clamped;
    this.renderCurrentTime();
  }

  public evaluateCurrentFrame(): KeyFrameColor {
    return compositeProjectFrame(this.project.layers, this.currentTime, this.keys);
  }

  private renderCurrentTime(): void {
    const frame = this.evaluateCurrentFrame();
    for (const listener of this.frameListeners) {
      listener(frame, this.currentTime);
    }
    for (const listener of this.timeListeners) {
      listener(this.currentTime);
    }

    if (studioHardwareAdapter.enabled) {
      studioHardwareAdapter.pushFrame(frame);
    }
  }

  private tick = (timestamp: number): void => {
    if (this.isDisposed || !this.isPlaying) return;

    const dt = Math.min(0.1, (timestamp - this.lastTimestamp) / 1000);
    this.lastTimestamp = timestamp;

    this.currentTime += dt;

    const workArea = this.project.workArea;
    const workDuration = workArea.end - workArea.start;

    if (this.currentTime >= workArea.end) {
      if (this.isLooping && workDuration > 0.001) {
        this.currentTime = workArea.start + ((this.currentTime - workArea.start) % workDuration);
      } else {
        this.currentTime = workArea.end;
        this.pause();
        this.renderCurrentTime();
        return;
      }
    }

    this.renderCurrentTime();
    this.animFrameId = safeRequestAnimationFrame(this.tick);
  };

  public dispose(): void {
    this.isDisposed = true;
    this.pause();
    studioHardwareAdapter.dispose();
    this.frameListeners.clear();
    this.timeListeners.clear();
  }
}
