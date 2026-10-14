import { AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT } from '../layout';
import { applyBrightness, lerpColor } from '../color';

export interface TelemetryBarsParams {
  brightness: number;
  pollInterval: number;   // ms between polls (default 500)
}

// The bar gradient: green -> yellow -> red across 14 columns
function barGradientColor(colNorm: number): RGBColor {
  // colNorm: 0.0 (leftmost) to 1.0 (rightmost)
  if (colNorm < 0.5) {
    // Green -> Yellow
    const t = colNorm / 0.5;
    return lerpColor({ r: 0, g: 220, b: 60 }, { r: 240, g: 220, b: 0 }, t);
  } else {
    // Yellow -> Red
    const t = (colNorm - 0.5) / 0.5;
    return lerpColor({ r: 240, g: 220, b: 0 }, { r: 255, g: 30, b: 30 }, t);
  }
}

/**
 * Telemetry Bars effect.
 *
 * Polls system metrics and visualizes them as horizontal bar graphs:
 * - Row 0: CPU usage (0-100%)
 * - Row 1: GPU temperature (simulated 30-90°C range)
 * - Row 2: RAM usage (0-100%)
 *
 * In a browser/Tauri WebView context, true system metrics require Tauri
 * commands or a sidecar. This implementation uses performance.memory
 * (if available) and falls back to animated simulated data that mimics
 * realistic system behavior.
 */
export class TelemetryBarsEffect implements ILightingEffect {
  readonly type = 'telemetry_bars' as const;
  readonly name = 'Telemetry Bars';

  private cpuPercent: number = 0;
  private gpuTemp: number = 45;
  private ramPercent: number = 0;
  private lastPoll: number = 0;

  // Simulated values that drift realistically
  private simCpu: number = 35;
  private simGpu: number = 48;
  private simRam: number = 55;

  constructor(public params: TelemetryBarsParams = { ...DEFAULT_TELEMETRY_BARS_PARAMS }) {}

  reset(): void {
    this.cpuPercent = 0;
    this.gpuTemp = 45;
    this.ramPercent = 0;
    this.lastPoll = 0;
  }

  private pollMetrics(time: number): void {
    const interval = (this.params.pollInterval ?? 500) / 1000;
    if (time - this.lastPoll < interval) return;
    this.lastPoll = time;

    // Try to get real memory info
    const mem = (performance as any).memory;
    if (mem && mem.usedJSHeapSize && mem.jsHeapSizeLimit) {
      this.ramPercent = (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100;
    } else {
      // Simulate RAM drifting
      this.simRam += (Math.random() - 0.48) * 4;
      this.simRam = Math.max(20, Math.min(95, this.simRam));
      this.ramPercent = this.simRam;
    }

    // CPU and GPU: simulated with realistic drift
    this.simCpu += (Math.random() - 0.47) * 8;
    this.simCpu = Math.max(5, Math.min(100, this.simCpu));
    this.cpuPercent = this.simCpu;

    this.simGpu += (Math.random() - 0.48) * 3;
    this.simGpu = Math.max(30, Math.min(90, this.simGpu));
    this.gpuTemp = this.simGpu;
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const keys = ctx.keys ?? K630_LAYOUT;
    this.pollMetrics(ctx.totalTime);

    const frame: KeyFrameColor = {};

    // Row configs: [row, value 0-1, maxCols]
    const rows: [number, number, number][] = [
      [0, this.cpuPercent / 100, 14],        // CPU -> Row 0, 14 cols
      [1, (this.gpuTemp - 30) / 60, 14],     // GPU temp -> Row 1, 14 cols
      [2, this.ramPercent / 100, 13],         // RAM -> Row 2, 13 cols
    ];

    // Which row/column each key belongs to
    for (const key of keys) {
      const r = key.gridY;
      const c = key.gridX;

      // Check if this key is in one of our bar rows
      const rowConfig = rows.find(([row]) => row === r);

      if (rowConfig) {
        const [, value, maxCols] = rowConfig;
        const litCols = Math.round(value * maxCols);

        if (c < litCols) {
          const colNorm = maxCols > 1 ? c / (maxCols - 1) : 0;
          const color = barGradientColor(colNorm);
          frame[key.id] = applyBrightness(color, this.params.brightness);
        } else {
          frame[key.id] = applyBrightness({ r: 15, g: 15, b: 20 }, this.params.brightness);
        }
      } else if (r === 3 || r === 4) {
        // Rows 3-4: dim label area
        frame[key.id] = applyBrightness({ r: 8, g: 8, b: 12 }, this.params.brightness);
      } else {
        frame[key.id] = { r: 0, g: 0, b: 0 };
      }
    }

    return frame;
  }
}

export const DEFAULT_TELEMETRY_BARS_PARAMS: TelemetryBarsParams = {
  brightness: 1.0,
  pollInterval: 500,
};
