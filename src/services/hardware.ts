import { KeyFrameColor } from '../types/keyboard';
import { K630_LAYOUT } from '../engine/layout';
import { hexToRgb } from '../engine/color';
import { invoke } from '@tauri-apps/api/core';

export interface DeviceInfo {
  connected: boolean;
  vendor_id: number;
  product_id: number;
  device_name: string;
  path: string;
  interface_number: number;
  usage: number;
  manufacturer: string;
}

export function frameToRgbPayload(frame: KeyFrameColor): Uint8Array {
  const payload = new Uint8Array(336);
  for (const key of K630_LAYOUT) {
    const color = frame[key.id];
    if (!color) continue;
    const offset = key.ledIndex * 3;
    // Strict black cut-off threshold (< 4) to eliminate LED driver leakage / faint glow on unlit keys
    let r = Math.max(0, Math.min(255, Math.round(color.r)));
    let g = Math.max(0, Math.min(255, Math.round(color.g)));
    let b = Math.max(0, Math.min(255, Math.round(color.b)));

    if (r < 5 && g < 5 && b < 5) {
      r = 0;
      g = 0;
      b = 0;
    } else if (r > 100 && r > g * 2 && b < 50) {
      // Color channel purity: strictly eliminate blue/green crosstalk on dominant red
      // to keep physical red illumination 100% pure cherry red and eliminate pink shift
      b = 0;
      if (g < 25) g = 0;
    }

    payload[offset] = r;
    payload[offset + 1] = g;
    payload[offset + 2] = b;
  }
  return payload;
}

export interface HardwareDiagnostics {
  sequenceNumber: number;
  droppedFrames: number;
  transmissionErrors: number;
  lastChecksumHex: string;
  lastSendDurationMs: number;
  isTransmitting: boolean;
  status: 'connecting' | 'active' | 'error' | 'preview-only';
  lastPayloadSentAt: number;
}

function computePayloadChecksum(payload: Uint8Array): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload[i];
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

class HardwareBridge {
  private invoke: any = invoke;
  private isTransmitting: boolean = false;
  private pendingFrame: KeyFrameColor | null = null;
  private hardwareEnabled: boolean = false;
  private lastPayloadChecksum: number = 0;
  private lastPayloadSentAt: number = 0;
  private retryAt: number = 0;
  private sequenceNumber: number = 0;
  private droppedFrames: number = 0;
  private transmissionErrors: number = 0;
  private lastSendDurationMs: number = 0;

  // Controller pacing: EVision MCU requires at least 25ms between frame reports
  private readonly minIntervalBetweenSendsMs = 25;
  // Keep the K630 in software control so firmware never reverts to onboard factory rainbow
  private readonly unchangedFrameKeepaliveMs = 85;
  private statusListener: ((status: 'connecting' | 'active' | 'error' | 'preview-only', message?: string) => void) | null = null;
  private retryTimer: number | null = null;

  constructor() {}

  public setHardwareEnabled(enabled: boolean): void {
    this.hardwareEnabled = enabled;
    if (this.retryTimer !== null) {
      window.clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (!enabled) {
      this.pendingFrame = null;
      this.lastPayloadChecksum = 0;
      this.lastPayloadSentAt = 0;
      this.retryAt = 0;
      this.notifyStatus('preview-only');
      void invoke('disconnect_k630').catch(() => undefined);
    } else {
      this.notifyStatus('connecting');
    }
  }

  public setStatusListener(listener: ((status: 'connecting' | 'active' | 'error' | 'preview-only', message?: string) => void) | null): void {
    this.statusListener = listener;
  }

  public get isHardwareEnabled(): boolean {
    return this.hardwareEnabled;
  }

  public getDiagnostics(): HardwareDiagnostics {
    return {
      sequenceNumber: this.sequenceNumber,
      droppedFrames: this.droppedFrames,
      transmissionErrors: this.transmissionErrors,
      lastChecksumHex: this.lastPayloadChecksum.toString(16).padStart(8, '0'),
      lastSendDurationMs: this.lastSendDurationMs,
      isTransmitting: this.isTransmitting,
      status: this.currentStatus,
      lastPayloadSentAt: this.lastPayloadSentAt,
    };
  }

  public async getStatus(): Promise<DeviceInfo> {
    try {
      return await invoke<DeviceInfo>('get_device_status');
    } catch (e) {
      console.warn('Failed to query device status:', e);
    }

    // Fallback simulation state
    return {
      connected: false,
      vendor_id: 0x320f,
      product_id: 0x5000,
      device_name: 'Redragon K630 RGB (Simulator Mode)',
      path: '',
      interface_number: 1,
      usage: 0x0092,
      manufacturer: 'Shenzhen Evision / Simulated',
    };
  }

  public async testDeviceFrame(hexColor: string): Promise<string> {
    const rgb = hexToRgb(hexColor);
    try {
      this.statusListener?.('connecting');
      const result = await invoke<string>('test_device_frame', {
        r: rgb.r,
        g: rgb.g,
        b: rgb.b,
      });
      this.statusListener?.('active');
      return result;
    } catch (err: any) {
      const message = typeof err === 'string' ? err : err.message || 'HID transmission error';
      this.statusListener?.('error', message);
      throw new Error(message);
    }
  }

  private currentStatus: 'connecting' | 'active' | 'error' | 'preview-only' = 'preview-only';
  private currentErrorMessage: string | undefined = undefined;

  private notifyStatus(status: 'connecting' | 'active' | 'error' | 'preview-only', message?: string): void {
    if (this.currentStatus !== status || this.currentErrorMessage !== message) {
      this.currentStatus = status;
      this.currentErrorMessage = message;
      this.statusListener?.(status, message);
    }
  }

  public pushFrame(frame: KeyFrameColor): void {
    if (!this.hardwareEnabled) return;

    if (this.pendingFrame !== null) {
      this.droppedFrames++;
    }
    // Stale frame dropping: retain newest desired frame
    this.pendingFrame = frame;

    if (this.retryTimer !== null && Date.now() >= this.retryAt) {
      window.clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }

    if (!this.isTransmitting && Date.now() >= this.retryAt) {
      void this.transmitLoop();
    }
  }

  private async transmitLoop(): Promise<void> {
    if (this.isTransmitting) return;
    this.isTransmitting = true;

    while (this.pendingFrame && this.hardwareEnabled) {
      const frameToSend = this.pendingFrame;
      this.pendingFrame = null;

      const rgbData = frameToRgbPayload(frameToSend);
      const checksum = computePayloadChecksum(rgbData);
      const now = Date.now();

      // Skip identical frames unless keepalive interval has elapsed
      const isIdentical = checksum === this.lastPayloadChecksum;
      if (isIdentical && now - this.lastPayloadSentAt < this.unchangedFrameKeepaliveMs) {
        continue;
      }

      // Controller pacing: ensure at least minInterval has passed since previous frame transmission
      const elapsedSinceLast = now - this.lastPayloadSentAt;
      if (elapsedSinceLast < this.minIntervalBetweenSendsMs) {
        await new Promise((r) => setTimeout(r, this.minIntervalBetweenSendsMs - elapsedSinceLast));
        if (!this.hardwareEnabled) break;
      }

      const sendStart = performance.now();
      try {
        if (this.currentStatus !== 'active') {
          this.notifyStatus('connecting');
        }
        await this.invoke('send_rgb_packet', {
          rgbData: Array.from(rgbData),
        });
        if (this.hardwareEnabled) {
          this.sequenceNumber++;
          this.lastPayloadChecksum = checksum;
          this.lastPayloadSentAt = Date.now();
          this.lastSendDurationMs = Math.round(performance.now() - sendStart);
          this.notifyStatus('active');
        }
      } catch (err) {
        this.transmissionErrors++;
        const message = typeof err === 'string' ? err : (err as Error)?.message || 'K630 HID transmission error';
        console.warn('K630 frame transmission failed:', message);
        this.retryAt = Date.now() + 35;
        this.notifyStatus('error', message);

        if (this.retryTimer === null && this.hardwareEnabled) {
          this.retryTimer = window.setTimeout(() => {
            this.retryTimer = null;
            if (this.hardwareEnabled && this.pendingFrame) {
              void this.transmitLoop();
            }
          }, 40);
        }
        break;
      }
    }

    this.isTransmitting = false;
  }
}

export const hardwareService = new HardwareBridge();
