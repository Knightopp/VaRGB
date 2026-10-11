import { ElectricDischargeParams, AnimationContext, ILightingEffect } from '../../types/effects';
import { KeyFrameColor } from '../../types/keyboard';
import { K630_LAYOUT, KEY_BY_CODE, KEY_BY_ID, PHYSICAL_ADJACENCY } from '../layout';
import { applyBrightness, lerpColor } from '../color';

interface ElectricalBranch {
  keys: string[]; // Consecutive key IDs along this jagged branch [origin, neighbor1, neighbor2, ...]
}

interface ActiveDischarge {
  originKeyId: string;
  branches: ElectricalBranch[];
  startTime: number; // Seconds
  duration: number;  // Total lifecycle in seconds
}

export class ElectricDischargeEffect implements ILightingEffect {
  readonly type = 'electric_discharge';
  readonly name = 'Electric Discharge';

  private discharges: ActiveDischarge[] = [];
  private readonly maxDischarges: number = 10;
  private currentTime: number = 0;

  constructor(public params: ElectricDischargeParams = { ...DEFAULT_ELECTRIC_DISCHARGE_PARAMS }) {}

  onKeyDown(code: string): void {
    const key = KEY_BY_CODE[code] || KEY_BY_ID[code];
    if (key) {
      this.triggerDischarge(key.id);
    }
  }

  /**
   * Generates jagged branching paths once at inception and stores them statically.
   * Paths are NEVER recomputed every frame.
   */
  public triggerDischarge(startKeyId: string): void {
    const now = this.currentTime;
    const branchCount = Math.max(1, Math.min(4, Math.round(this.params.branchCount)));
    const branches: ElectricalBranch[] = [];

    const immediateNeighbors = PHYSICAL_ADJACENCY[startKeyId] || [];
    if (immediateNeighbors.length === 0) return;

    // Pick unique directions for branches if possible
    const shuffledNeighbors = [...immediateNeighbors].sort(() => Math.random() - 0.5);

    for (let b = 0; b < branchCount; b++) {
      const branchKeys: string[] = [startKeyId];
      let currentKey = shuffledNeighbors[b % shuffledNeighbors.length] || startKeyId;
      branchKeys.push(currentKey);

      // Branch length between 3 and 5 keys
      const branchLength = 3 + Math.floor(Math.random() * 3);

      for (let step = 2; step < branchLength; step++) {
        const nextCandidates = PHYSICAL_ADJACENCY[currentKey] || [];
        // Filter out keys already visited in this branch to prevent loops
        const unvisited = nextCandidates.filter((k) => !branchKeys.includes(k));
        if (unvisited.length === 0) break;

        // Choose a jagged neighbor (random selection among physical neighbors creates electric jitter)
        currentKey = unvisited[Math.floor(Math.random() * unvisited.length)];
        branchKeys.push(currentKey);
      }

      branches.push({ keys: branchKeys });
    }

    const maxBranchLength = Math.max(...branches.map((b) => b.keys.length), 3);
    const speed = Math.max(5.0, this.params.propagationSpeed); // Keys per second
    const arcTravelSec = maxBranchLength / speed;
    const flashSec = Math.max(0.08, this.params.flashDuration / 1000);
    const totalLife = arcTravelSec + flashSec;

    this.discharges.push({
      originKeyId: startKeyId,
      branches,
      startTime: now,
      duration: totalLife,
    });

    if (this.discharges.length > this.maxDischarges) {
      this.discharges.shift();
    }
  }

  reset(): void {
    this.discharges = [];
    this.currentTime = 0;
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const dt = Math.max(0.001, Math.min(0.5, ctx.dt));
    this.currentTime += dt;
    const now = this.currentTime;
    const keys = ctx.keys ?? K630_LAYOUT;
    const speed = Math.max(5.0, this.params.propagationSpeed);
    const flashSec = Math.max(0.08, this.params.flashDuration / 1000);

    // Prune expired discharges
    this.discharges = this.discharges.filter((d) => now - d.startTime < d.duration);

    const frame: KeyFrameColor = {};
    const baseColor = applyBrightness(this.params.baseColor, this.params.brightness);
    const primaryColor = applyBrightness(this.params.primaryColor, this.params.brightness);
    const highlightColor = applyBrightness(this.params.highlightColor, this.params.brightness);

    // Track per-key spark highlight and body glow contributions
    const keyHighlight: Record<string, number> = {};
    const keyPrimary: Record<string, number> = {};

    for (const discharge of this.discharges) {
      const elapsed = now - discharge.startTime;

      // 1. Instantaneous violent flash at origin key
      if (elapsed < flashSec * 1.5) {
        const originFlash = Math.max(0, 1.0 - elapsed / (flashSec * 1.5));
        keyHighlight[discharge.originKeyId] = Math.max(keyHighlight[discharge.originKeyId] || 0, originFlash);
      }

      // 2. Animate the electrical arc propagating along the pre-generated branches
      for (const branch of discharge.branches) {
        for (let i = 0; i < branch.keys.length; i++) {
          const keyId = branch.keys[i];
          const arrivalTime = i / speed;

          if (elapsed >= arrivalTime) {
            const timeSinceArrival = elapsed - arrivalTime;
            if (timeSinceArrival < flashSec) {
              // Peak sharp spark highlight at leading spark edge
              const sparkProgress = timeSinceArrival / (flashSec * 0.35);
              if (sparkProgress <= 1.0) {
                const sparkVal = Math.max(0, 1.0 - sparkProgress);
                keyHighlight[keyId] = Math.max(keyHighlight[keyId] || 0, sparkVal);
              }

              // Trailing primary electric body glow after spark passes
              const bodyProgress = timeSinceArrival / flashSec;
              const bodyVal = Math.cos((Math.PI / 2) * bodyProgress) ** 2;
              keyPrimary[keyId] = Math.max(keyPrimary[keyId] || 0, bodyVal);
            }
          }
        }
      }
    }

    // Blend final color for each key
    for (const key of keys) {
      const hVal = keyHighlight[key.id] || 0;
      const pVal = keyPrimary[key.id] || 0;

      if (hVal > 0.05) {
        // High electric energy: blend into highlight color (bright cyan-white)
        const mixed = lerpColor(primaryColor, highlightColor, Math.min(1.0, hVal));
        frame[key.id] = lerpColor(baseColor, mixed, Math.min(1.0, hVal + pVal));
      } else if (pVal > 0.01) {
        // Lingering electric afterglow: primary arc color
        frame[key.id] = lerpColor(baseColor, primaryColor, Math.min(1.0, pVal));
      } else {
        frame[key.id] = baseColor;
      }
    }

    return frame;
  }
}

export const DEFAULT_ELECTRIC_DISCHARGE_PARAMS: ElectricDischargeParams = {
  primaryColor: { r: 0, g: 110, b: 255 },     // Electric Cobalt Blue Arc Body
  highlightColor: { r: 210, g: 245, b: 255 }, // High-voltage Cyan-White Spark
  branchCount: 3,                             // 3 branching jagged forks
  propagationSpeed: 24,                       // 24 keys per second
  flashDuration: 300,                         // 300ms lightning flash
  brightness: 1.0,
  baseColor: { r: 0, g: 0, b: 0 },            // Black base
};
