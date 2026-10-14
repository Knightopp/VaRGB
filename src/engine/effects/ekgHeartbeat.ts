import { AnimationContext, ILightingEffect, EkgHeartbeatParams } from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { K630_LAYOUT } from '../layout';
import { applyBrightness, lerpColor } from '../color';

export const DEFAULT_EKG_HEARTBEAT_PARAMS: EkgHeartbeatParams = {
  brightness: 1.0,
  speed: 1.0,
  primaryColor: { r: 0, g: 255, b: 136 },   // Monitor trace beam green
  secondaryColor: { r: 0, g: 45, b: 20 },   // Monitor phosphor decay
};

export class EkgHeartbeatEffect implements ILightingEffect {
  readonly type = 'ekg_heartbeat' as const;
  readonly name = 'EKG Heartbeat';

  private keypressTachycardia: number = 0;
  private trails: number[][] = [];

  constructor(public params: EkgHeartbeatParams = { ...DEFAULT_EKG_HEARTBEAT_PARAMS }) {
    this.reset();
  }

  reset(): void {
    this.keypressTachycardia = 0;
    this.trails = Array.from({ length: 5 }, () => new Array(14).fill(0));
  }

  onKeyDown(_code: string): void {
    this.keypressTachycardia = Math.min(2.0, this.keypressTachycardia + 0.6);
  }

  private getEkgRow(phase: number): number {
    // phase: 0.0 to 1.0 across the 14-column cycle
    // Normal ECG wave:
    // 0.00-0.20: Flat isoelectric line at row 2.0
    // 0.20-0.30: P-wave (gentle hump row 1.5)
    // 0.30-0.40: PR segment (row 2.0)
    // 0.40-0.45: Q dip (row 2.5)
    // 0.45-0.52: R spike (row 0.0)
    // 0.52-0.58: S trough (row 4.0)
    // 0.58-0.65: ST segment (row 2.0)
    // 0.65-0.80: T-wave (rounded hump row 1.2)
    // 0.80-1.00: Isoelectric baseline (row 2.0)
    if (phase < 0.20) return 2.0;
    if (phase < 0.30) {
      const p = (phase - 0.20) / 0.10;
      return 2.0 - 0.7 * Math.sin(p * Math.PI);
    }
    if (phase < 0.40) return 2.0;
    if (phase < 0.45) {
      const q = (phase - 0.40) / 0.05;
      return 2.0 + 0.6 * Math.sin(q * Math.PI);
    }
    if (phase < 0.52) {
      const r = (phase - 0.45) / 0.07;
      return 2.0 - 2.0 * Math.sin(r * Math.PI); // Spikes to row 0.0
    }
    if (phase < 0.58) {
      const s = (phase - 0.52) / 0.06;
      return 2.0 + 2.0 * Math.sin(s * Math.PI); // Dips to row 4.0
    }
    if (phase < 0.65) return 2.0;
    if (phase < 0.80) {
      const t = (phase - 0.65) / 0.15;
      return 2.0 - 1.0 * Math.sin(t * Math.PI);
    }
    return 2.0;
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.min(ctx.dt, 0.1);
    const speed = Math.max(0.2, this.params.speed ?? 1.0);

    if (this.keypressTachycardia > 0) {
      this.keypressTachycardia = Math.max(0, this.keypressTachycardia - dt * 1.5);
    }

    const bpmSpeed = (6.0 + this.keypressTachycardia * 8.0) * speed;
    const xHead = (ctx.totalTime * bpmSpeed) % 14.0;
    const phase = xHead / 14.0;
    const targetRow = this.getEkgRow(phase);

    // Fade existing phosphor trails
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 14; c++) {
        this.trails[r][c] = Math.max(0, this.trails[r][c] - dt * (1.8 * speed));
      }
    }

    // Paint active beam into trails
    const cHead = Math.floor(xHead);
    const rInt = Math.round(targetRow);
    if (cHead >= 0 && cHead < 14 && rInt >= 0 && rInt < 5) {
      this.trails[rInt][cHead] = 1.0;
      // Soft vertical continuity
      if (rInt > 0) this.trails[rInt - 1][cHead] = Math.max(this.trails[rInt - 1][cHead], 0.5);
      if (rInt < 4) this.trails[rInt + 1][cHead] = Math.max(this.trails[rInt + 1][cHead], 0.5);
    }

    const frame: KeyFrameColor = {};
    const primary = this.params.primaryColor ?? DEFAULT_EKG_HEARTBEAT_PARAMS.primaryColor;
    const secondary = this.params.secondaryColor ?? DEFAULT_EKG_HEARTBEAT_PARAMS.secondaryColor;
    const brightness = Math.max(0, Math.min(1, this.params.brightness ?? 1.0));

    for (const key of K630_LAYOUT) {
      const c = key.gridX;
      const r = key.gridY;

      const trail = this.trails[r][c];
      const isLead = Math.abs(c - xHead) < 0.6 && Math.abs(r - targetRow) < 0.7;

      let col: RGBColor;
      if (isLead) {
        col = lerpColor(primary, { r: 255, g: 255, b: 255 }, 0.6);
      } else if (trail > 0) {
        col = lerpColor(secondary, primary, trail);
      } else {
        // Dim cardiac monitor grid dot
        col = (c % 2 === 0 && r === 2) ? { r: 0, g: 15, b: 8 } : { r: 0, g: 4, b: 2 };
      }

      frame[key.id] = applyBrightness(col, brightness);
    }

    return frame;
  }
}
