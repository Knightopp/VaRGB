import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT } from '../layout';
import { applyBrightness, lerpColor } from '../color';

export interface ScreenAmbilightParams {
  brightness: number;
  smoothing: number;    // Lerp factor 0.05-0.6 (default 0.25)
}

/**
 * Screen Ambilight effect.
 *
 * Uses the Screen Capture API (getDisplayMedia) to grab the primary display
 * and downsample it into a 14×5 pixel buffer mapped to the keyboard grid.
 * Frame-to-frame linear interpolation prevents harsh screen cuts.
 *
 * NOTE: getDisplayMedia requires a user gesture to start and will show a
 * browser/Tauri permission dialog. The effect gracefully shows a dim blue
 * "waiting" state until capture begins.
 */
export class ScreenAmbilightEffect implements ILightingEffect {
  readonly type = 'screen_ambilight' as const;
  readonly name = 'Screen Ambilight';

  private prevBuffer: RGBColor[][] | null = null;
  private currentBuffer: RGBColor[][] | null = null;
  private captureActive = false;
  private videoEl: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private stream: MediaStream | null = null;
  private captureTimer: number | null = null;
  private startAttempted = false;

  constructor(public params: ScreenAmbilightParams = { ...DEFAULT_SCREEN_AMBILIGHT_PARAMS }) {
    this.initBuffers();
  }

  private initBuffers(): void {
    this.prevBuffer = [];
    this.currentBuffer = [];
    for (let r = 0; r < 5; r++) {
      this.prevBuffer[r] = new Array(14).fill(null).map(() => ({ r: 0, g: 0, b: 0 }));
      this.currentBuffer[r] = new Array(14).fill(null).map(() => ({ r: 0, g: 0, b: 0 }));
    }
  }

  private async startCapture(): Promise<void> {
    if (this.startAttempted) return;
    this.startAttempted = true;

    try {
      // Check if API is available (won't be in some Tauri / Node contexts)
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        // Fallback: show a gentle animated pattern instead
        return;
      }

      this.stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 112, height: 40, frameRate: 20 },
        audio: false,
      });

      this.videoEl = document.createElement('video');
      this.videoEl.srcObject = this.stream;
      this.videoEl.muted = true;
      this.videoEl.playsInline = true;
      await this.videoEl.play();

      this.canvas = document.createElement('canvas');
      this.canvas.width = 14;
      this.canvas.height = 5;
      this.canvasCtx = this.canvas.getContext('2d', { willReadFrequently: true });

      this.captureActive = true;

      // Capture loop at ~25 FPS
      this.captureTimer = window.setInterval(() => this.captureFrame(), 40);
    } catch {
      // User denied or API unavailable — fail silently
      this.captureActive = false;
    }
  }

  private captureFrame(): void {
    if (!this.captureActive || !this.videoEl || !this.canvasCtx || !this.canvas) return;

    this.canvasCtx.drawImage(this.videoEl, 0, 0, 14, 5);
    const imageData = this.canvasCtx.getImageData(0, 0, 14, 5);
    const data = imageData.data;

    if (!this.currentBuffer) this.initBuffers();

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 14; c++) {
        const idx = (r * 14 + c) * 4;
        this.currentBuffer![r][c] = {
          r: data[idx],
          g: data[idx + 1],
          b: data[idx + 2],
        };
      }
    }
  }

  private stopCapture(): void {
    if (this.captureTimer !== null) {
      clearInterval(this.captureTimer);
      this.captureTimer = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.srcObject = null;
      this.videoEl = null;
    }
    this.canvas = null;
    this.canvasCtx = null;
    this.captureActive = false;
  }

  reset(): void {
    this.stopCapture();
    this.startAttempted = false;
    this.initBuffers();
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const keys = ctx.keys ?? K630_LAYOUT;
    const smoothing = Math.max(0.05, Math.min(0.6, this.params.smoothing ?? 0.25));

    // Attempt screen capture on first update
    if (!this.startAttempted) {
      this.startCapture();
    }

    // Smooth blending: lerp previous toward current
    if (this.prevBuffer && this.currentBuffer) {
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 14; c++) {
          this.prevBuffer[r][c] = lerpColor(
            this.prevBuffer[r][c],
            this.currentBuffer[r][c],
            smoothing,
          );
        }
      }
    }

    const frame: KeyFrameColor = {};

    if (!this.captureActive || !this.prevBuffer) {
      // Fallback: gentle blue breathing when capture is not available
      const breath = 0.15 + 0.1 * Math.sin(ctx.totalTime * 1.5);
      for (const key of keys) {
        frame[key.id] = applyBrightness({ r: 20, g: 60, b: 160 }, breath * this.params.brightness);
      }
      return frame;
    }

    for (const key of keys) {
      const r = key.gridY;
      const c = key.gridX;
      if (r >= 0 && r < 5 && c >= 0 && c < 14) {
        frame[key.id] = applyBrightness(this.prevBuffer[r][c], this.params.brightness);
      } else {
        frame[key.id] = { r: 0, g: 0, b: 0 };
      }
    }

    return frame;
  }
}

export const DEFAULT_SCREEN_AMBILIGHT_PARAMS: ScreenAmbilightParams = {
  brightness: 1.0,
  smoothing: 0.25,
};
