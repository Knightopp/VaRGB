import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor } from '../../types/keyboard';
import { K630_LAYOUT, TOTAL_U_WIDTH, TOTAL_U_HEIGHT } from '../layout';
import { applyBrightness } from '../color';

export interface ScreenAmbilightParams {
  brightness: number;
  smoothing: number;    // Lerp factor 0.05-0.8 (default 0.25)
  blackCutoff?: number; // 0-50 (default 15) threshold for complete LED shutoff (pitch black)
  gamma?: number;       // 1.0-2.8 (default 2.0) perceptual contrast & deep blacks
  saturation?: number;  // 0.5-2.5 (default 1.25) color vibrancy boost
}

/**
 * ScreenCaptureService manages the browser/Tauri Screen Capture stream
 * as a shared singleton. This prevents streams from closing on effect re-renders
 * or parameter changes, and allows user-gesture invocation from the UI.
 */
export class ScreenCaptureService {
  private static instance: ScreenCaptureService | null = null;
  private stream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private isCapturingActive = false;
  private trackLabel: string = '';
  private listeners: Set<(active: boolean) => void> = new Set();

  public static getInstance(): ScreenCaptureService {
    if (!ScreenCaptureService.instance) {
      ScreenCaptureService.instance = new ScreenCaptureService();
    }
    return ScreenCaptureService.instance;
  }

  public subscribe(listener: (active: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.isCapturingActive);
    return () => this.listeners.delete(listener);
  }

  public getTrackLabel(): string {
    return this.trackLabel;
  }

  public isCapturing(): boolean {
    return this.isCapturingActive;
  }

  public async startCapture(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      return false;
    }

    try {
      this.stopCapture();

      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: {
          cursor: 'never',
          frameRate: { ideal: 30, max: 60 },
        },
        audio: false,
      });

      this.stream = stream;
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        this.trackLabel = videoTrack.label || 'Display Sync';
        videoTrack.onended = () => {
          this.stopCapture();
        };
      }

      this.videoEl = document.createElement('video');
      this.videoEl.srcObject = stream;
      this.videoEl.muted = true;
      this.videoEl.playsInline = true;
      await this.videoEl.play();

      // 60x20 canvas perfectly matches 15u x 5u keyboard layout (4x4 pixels per 1u key)
      this.canvas = document.createElement('canvas');
      this.canvas.width = 60;
      this.canvas.height = 20;
      this.canvasCtx = this.canvas.getContext('2d', { willReadFrequently: true });
      if (this.canvasCtx) {
        this.canvasCtx.imageSmoothingEnabled = true;
        this.canvasCtx.imageSmoothingQuality = 'high';
      }

      this.isCapturingActive = true;
      this.notifyListeners();
      return true;
    } catch {
      this.isCapturingActive = false;
      this.notifyListeners();
      return false;
    }
  }

  public stopCapture(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.srcObject = null;
      this.videoEl = null;
    }
    this.canvas = null;
    this.canvasCtx = null;
    this.trackLabel = '';
    const wasActive = this.isCapturingActive;
    this.isCapturingActive = false;
    if (wasActive) {
      this.notifyListeners();
    }
  }

  public sampleImageData(): ImageData | null {
    if (!this.isCapturingActive || !this.videoEl || !this.canvasCtx || !this.canvas) {
      return null;
    }

    // Video must have valid dimensions and decoded frames
    if (this.videoEl.readyState < 2 || this.videoEl.videoWidth === 0) {
      return null;
    }

    try {
      this.canvasCtx.drawImage(this.videoEl, 0, 0, this.canvas.width, this.canvas.height);
      return this.canvasCtx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    } catch {
      return null;
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((fn) => fn(this.isCapturingActive));
  }
}

export const screenCaptureService = ScreenCaptureService.getInstance();

/**
 * Screen Ambilight effect.
 *
 * Uses the Screen Capture API to grab the display and maps every keyboard key
 * to its exact physical 2D location on screen with sub-region pixel integration.
 * Includes pitch black cutoff for true OLED-like black shutoff, gamma correction,
 * keycap diffuser saturation compensation, and zero-snap smoothing.
 */
export class ScreenAmbilightEffect implements ILightingEffect {
  readonly type = 'screen_ambilight' as const;
  readonly name = 'Screen Ambilight';

  private currentColors: Record<string, { r: number; g: number; b: number }> = {};
  private startAttempted = false;

  constructor(public params: ScreenAmbilightParams = { ...DEFAULT_SCREEN_AMBILIGHT_PARAMS }) {}

  reset(): void {
    this.currentColors = {};
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const keys = ctx.keys ?? K630_LAYOUT;

    // Attempt auto-start once if capture is inactive
    if (!screenCaptureService.isCapturing() && !this.startAttempted) {
      this.startAttempted = true;
      void screenCaptureService.startCapture().catch(() => {});
    }

    const imageData = screenCaptureService.sampleImageData();

    // Fallback: subtle demo when stream is uninitialized or waiting for user gesture
    if (!imageData) {
      const frame: KeyFrameColor = {};
      const breath = 0.12 + 0.08 * Math.sin(ctx.totalTime * 1.5);
      const brightness = Math.max(0, Math.min(1.0, this.params.brightness ?? 1.0));
      for (const key of keys) {
        frame[key.id] = applyBrightness({ r: 20, g: 60, b: 160 }, breath * brightness);
      }
      return frame;
    }

    const { data } = imageData;
    const canvasW = 60;
    const canvasH = 20;

    const blackCutoff = Math.max(0, Math.min(60, this.params.blackCutoff ?? 15));
    const gamma = Math.max(1.0, Math.min(2.8, this.params.gamma ?? 2.0));
    const saturation = Math.max(0.5, Math.min(2.5, this.params.saturation ?? 1.25));
    const smoothing = Math.max(0.05, Math.min(0.85, this.params.smoothing ?? 0.25));
    const brightness = Math.max(0, Math.min(1.0, this.params.brightness ?? 1.0));

    const frame: KeyFrameColor = {};

    for (const key of keys) {
      // Calculate true physical 2D sample bounds on the 60x20 canvas
      const x0 = Math.max(0, Math.floor((key.x / TOTAL_U_WIDTH) * canvasW));
      const x1 = Math.min(canvasW, Math.ceil(((key.x + key.uWidth) / TOTAL_U_WIDTH) * canvasW));
      const y0 = Math.max(0, Math.floor((key.y / TOTAL_U_HEIGHT) * canvasH));
      const y1 = Math.min(canvasH, Math.ceil(((key.y + 1.0) / TOTAL_U_HEIGHT) * canvasH));

      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let count = 0;

      for (let y = y0; y < y1; y++) {
        const rowOffset = y * canvasW * 4;
        for (let x = x0; x < x1; x++) {
          const idx = rowOffset + x * 4;
          rSum += data[idx];
          gSum += data[idx + 1];
          bSum += data[idx + 2];
          count++;
        }
      }

      const rawR = count > 0 ? rSum / count : 0;
      const rawG = count > 0 ? gSum / count : 0;
      const rawB = count > 0 ? bSum / count : 0;

      let targetR = 0;
      let targetG = 0;
      let targetB = 0;

      const maxVal = Math.max(rawR, rawG, rawB);

      // Pitch black cutoff: if below blackCutoff, snap target strictly to 0 (LED completely off)
      if (maxVal > blackCutoff) {
        // Smoothly stretch range above cutoff to 0..255
        const scale = 255 / (255 - blackCutoff);
        let adjR = Math.max(0, Math.min(255, (rawR - blackCutoff) * scale));
        let adjG = Math.max(0, Math.min(255, (rawG - blackCutoff) * scale));
        let adjB = Math.max(0, Math.min(255, (rawB - blackCutoff) * scale));

        // Saturation boost for plastic keycap diffusers
        if (saturation !== 1.0) {
          const lum = 0.2126 * adjR + 0.7152 * adjG + 0.0722 * adjB;
          adjR = Math.max(0, Math.min(255, lum + saturation * (adjR - lum)));
          adjG = Math.max(0, Math.min(255, lum + saturation * (adjG - lum)));
          adjB = Math.max(0, Math.min(255, lum + saturation * (adjB - lum)));
        }

        // Perceptual gamma curve for deep shadows & monitor-accurate color contrast
        if (gamma !== 1.0) {
          adjR = Math.pow(adjR / 255, gamma) * 255;
          adjG = Math.pow(adjG / 255, gamma) * 255;
          adjB = Math.pow(adjB / 255, gamma) * 255;
        }

        targetR = adjR;
        targetG = adjG;
        targetB = adjB;
      }

      // Color smoothing with zero-snap
      let cur = this.currentColors[key.id];
      if (!cur) {
        cur = { r: targetR, g: targetG, b: targetB };
        this.currentColors[key.id] = cur;
      } else {
        if (targetR === 0 && targetG === 0 && targetB === 0) {
          // Approaching pitch black: snap when close so LEDs turn 100% off
          if (cur.r < 1.5 && cur.g < 1.5 && cur.b < 1.5) {
            cur.r = 0;
            cur.g = 0;
            cur.b = 0;
          } else {
            cur.r += (0 - cur.r) * smoothing;
            cur.g += (0 - cur.g) * smoothing;
            cur.b += (0 - cur.b) * smoothing;
            if (cur.r < 0.5) cur.r = 0;
            if (cur.g < 0.5) cur.g = 0;
            if (cur.b < 0.5) cur.b = 0;
          }
        } else {
          cur.r += (targetR - cur.r) * smoothing;
          cur.g += (targetG - cur.g) * smoothing;
          cur.b += (targetB - cur.b) * smoothing;
        }
      }

      const finalR = Math.round(cur.r * brightness);
      const finalG = Math.round(cur.g * brightness);
      const finalB = Math.round(cur.b * brightness);

      frame[key.id] = {
        r: Math.max(0, Math.min(255, finalR)),
        g: Math.max(0, Math.min(255, finalG)),
        b: Math.max(0, Math.min(255, finalB)),
      };
    }

    return frame;
  }
}

export const DEFAULT_SCREEN_AMBILIGHT_PARAMS: ScreenAmbilightParams = {
  brightness: 1.0,
  smoothing: 0.25,
  blackCutoff: 15,
  gamma: 2.0,
  saturation: 1.25,
};
