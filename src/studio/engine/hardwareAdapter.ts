import { KeyFrameColor } from '../../types/keyboard';
import { hardwareService, DeviceInfo } from '../../services/hardware';

export class StudioHardwareAdapter {
  private isEnabled: boolean = false;
  private lastStreamTime: number = 0;
  private minIntervalMs: number = 33; // ~30 fps cap for USB transmission

  constructor() {}

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      // Send black frame to clear keyboard hardware cleanly
      const offFrame: KeyFrameColor = {};
      hardwareService.pushFrame(offFrame);
    }
  }

  public get enabled(): boolean {
    return this.isEnabled;
  }

  public async getStatus(): Promise<DeviceInfo> {
    return hardwareService.getStatus();
  }

  public pushFrame(frame: KeyFrameColor): void {
    if (!this.isEnabled) return;

    const now = performance.now();
    if (now - this.lastStreamTime >= this.minIntervalMs) {
      this.lastStreamTime = now;
      hardwareService.pushFrame(frame);
    }
  }

  public dispose(): void {
    if (this.isEnabled) {
      this.setEnabled(false);
    }
  }
}

export const studioHardwareAdapter = new StudioHardwareAdapter();
