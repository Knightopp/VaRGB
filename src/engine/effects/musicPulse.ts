import {
  AudioAnalysis,
  AudioAnalyzerConfig,
  MusicPulseParams,
  AnimationContext,
  ILightingEffect,
  BeatCandidateLog,
  MusicPulseState,
} from '../../types/effects';
import { KeyFrameColor, RGBColor } from '../../types/keyboard';
import { applyBrightness } from '../color';

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const SILENT_ANALYSIS: AudioAnalysis = {
  status: 'inactive',
  deviceId: null,
  message: null,
  rms: 0,
  energyChange: 0,
  bass: 0,
  mids: 0,
  highs: 0,
  bands: [],
  beat: false,
  bassFlux: 0,
  adaptiveThreshold: 0.04,
  noiseFloor: 0.005,
  isGated: true,
  updatedAt: 0,
};

export function toAudioAnalyzerConfig(params: MusicPulseParams): AudioAnalyzerConfig {
  return {
    sensitivity: params.sensitivity,
    noiseGate: params.noiseGate ?? 0.012,
    bandCount: params.bandCount ?? 32,
    minFrequency: params.minFrequency ?? 35,
    maxFrequency: params.maxFrequency ?? 16_000,
    attackMs: params.attackMs ?? 25,
    releaseMs: params.releaseMs ?? 220,
    beatMinIntervalMs: params.beatMinIntervalMs ?? 100,
    beatSensitivity: params.beatSensitivity ?? 1.0,
    bassMaxHz: params.bassMaxHz ?? 130,
  };
}

const SPECTRUM_COLORS: RGBColor[] = [
  { r: 255, g: 0, b: 0 },
  { r: 255, g: 100, b: 0 },
  { r: 255, g: 200, b: 0 },
  { r: 35, g: 225, b: 80 },
  { r: 0, g: 205, b: 230 },
  { r: 45, g: 95, b: 255 },
  { r: 180, g: 55, b: 255 },
];

interface SecondaryPulseWave {
  birthTime: number;
  speed: number;
  holdDuration: number;
  pulseWidth: number;
}

/**
 * Concentric 4-ring color generator:
 * Ring 0 (Core: 0.00 to 0.20): Mint-White
 * Ring 1 (Inner: 0.20 to 0.45): Neon-Green
 * Ring 2 (Middle: 0.45 to 0.72): Cyan
 * Ring 3 (Outer: 0.72+): Violet
 * Smooth feathering across adjacent boundaries preserves ring identity.
 */
function getConcentricRingColor(
  normDist: number,
  cCore: RGBColor,
  cInner: RGBColor,
  cMid: RGBColor,
  cOuter: RGBColor
): RGBColor {
  if (normDist <= 0.16) {
    return cCore;
  } else if (normDist < 0.24) {
    const t = (normDist - 0.16) / (0.24 - 0.16);
    return {
      r: Math.round(cCore.r + (cInner.r - cCore.r) * t),
      g: Math.round(cCore.g + (cInner.g - cCore.g) * t),
      b: Math.round(cCore.b + (cInner.b - cCore.b) * t),
    };
  } else if (normDist <= 0.40) {
    return cInner;
  } else if (normDist < 0.50) {
    const t = (normDist - 0.40) / (0.50 - 0.40);
    return {
      r: Math.round(cInner.r + (cMid.r - cInner.r) * t),
      g: Math.round(cInner.g + (cMid.g - cInner.g) * t),
      b: Math.round(cInner.b + (cMid.b - cInner.b) * t),
    };
  } else if (normDist <= 0.68) {
    return cMid;
  } else if (normDist < 0.78) {
    const t = (normDist - 0.68) / (0.78 - 0.68);
    return {
      r: Math.round(cMid.r + (cOuter.r - cMid.r) * t),
      g: Math.round(cMid.g + (cOuter.g - cMid.g) * t),
      b: Math.round(cMid.b + (cOuter.b - cMid.b) * t),
    };
  } else {
    return cOuter;
  }
}

export class MusicPulseEffect implements ILightingEffect {
  readonly type = 'music_pulse';
  readonly name = 'Music Pulse';
  public params: MusicPulseParams;

  // Formal 4-state radial pattern state machine
  private state: MusicPulseState = 'WAITING_FOR_STRONG_BEAT';
  private waveStartTime = -1;
  private waveSpeed = 2.4;
  private currentWaveRadius = 0;
  private centerPulseStartTime = -1;
  private queuedWaves = 0;
  private secondaryPulses: SecondaryPulseWave[] = [];

  // Audio envelope smoothing state
  private smoothBass = 0;
  private smoothMids = 0;
  private smoothHighs = 0;
  private smoothRms = 0;

  // Frame persistence & pause tracking
  private lastRenderedFrame: KeyFrameColor = {};
  private silenceDurationSec = 0;

  // Beat pulse tracking
  private lastBeatTime = -1;
  private activeKeyCount = 0;
  private minBrightness = 0;
  private maxBrightness = 0;
  private avgBrightness = 0;

  // Adaptive tempo / BPM tracking
  private recentIntervals: number[] = [];
  private smoothedInterval = 0.5; // default ~120 BPM
  private estimatedBpm = 120;
  private tempoConfidence = 0; // [0 .. 1]
  private candidateLogs: BeatCandidateLog[] = [];

  constructor(params: MusicPulseParams) {
    this.params = { ...DEFAULT_MUSIC_PULSE_PARAMS, ...params };
  }

  private logCandidate(log: BeatCandidateLog): void {
    this.candidateLogs.unshift(log);
    if (this.candidateLogs.length > 20) {
      this.candidateLogs.pop();
    }
  }

  public getState(): MusicPulseState {
    return this.state;
  }

  public getCurrentWaveRadius(): number {
    return this.currentWaveRadius;
  }

  public getBrightnessStats(): { min: number; max: number; avg: number; illuminatedCount: number } {
    return {
      min: this.minBrightness,
      max: this.maxBrightness,
      avg: this.avgBrightness,
      illuminatedCount: this.activeKeyCount,
    };
  }

  public getCandidateLogs(): BeatCandidateLog[] {
    return this.candidateLogs;
  }

  public getEstimatedBpm(): { bpm: number; confidence: number; intervalMs: number } {
    return {
      bpm: this.estimatedBpm,
      confidence: this.tempoConfidence,
      intervalMs: Math.round(this.smoothedInterval * 1000),
    };
  }

  public getActiveKeyCount(): number {
    return this.activeKeyCount;
  }

  private updateTempoEstimate(): void {
    if (this.recentIntervals.length < 3) {
      this.tempoConfidence = 0;
      return;
    }
    const sorted = [...this.recentIntervals].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    const deviation = this.recentIntervals.reduce((acc, val) => acc + Math.abs(val - median), 0) / this.recentIntervals.length;
    const deviationRatio = median > 0 ? deviation / median : 1;

    this.tempoConfidence = Math.max(0, Math.min(1, 1 - (deviationRatio / 0.25)));

    if (this.tempoConfidence > 0.15) {
      const smoothing = clamp01(this.params.tempoSmoothing ?? 0.25);
      this.smoothedInterval += (median - this.smoothedInterval) * smoothing;
      this.estimatedBpm = Math.round(60 / Math.max(0.2, this.smoothedInterval));
    }
  }

  update(ctx: AnimationContext): KeyFrameColor {
    const analysis = ctx.audio ?? SILENT_ANALYSIS;
    const capturing = analysis.status === 'capturing';
    const isGated = Boolean(analysis.isGated);
    const dt = Math.max(0.001, Math.min(0.1, ctx.dt));
    const releaseMs = this.params.releaseMs ?? this.params.decayMs ?? 220;
    const attackMs = this.params.attackMs ?? 25;

    // Distinguish playback silence / pause from active playback
    const isExplicitlySilent = analysis.status === 'silent';
    const isSilent = isExplicitlySilent || !capturing || isGated || (analysis.rms < 0.0005 && this.smoothRms < 0.001);

    if (isSilent) {
      this.silenceDurationSec += Math.max(dt, Math.min(1.0, ctx.dt));
      if (isExplicitlySilent || this.silenceDurationSec >= 0.20) {
        if (this.params.pauseFrameBehavior !== 'black') {
          this.state = 'PAUSED_FRAME';
          // Preserve the exact last rendered frame without fading, clearing, or restoring factory lighting
          if (Object.keys(this.lastRenderedFrame).length > 0) {
            return { ...this.lastRenderedFrame };
          }
        }
      }
    } else {
      this.silenceDurationSec = 0;
      if (this.state === 'PAUSED_FRAME') {
        this.state = 'WAITING_FOR_STRONG_BEAT';
      }
    }

    // 1. Smooth frequency-band envelopes (attack / release)
    const attackRate = 1 - Math.exp(-dt / Math.max(0.005, attackMs / 1000));
    const releaseRate = 1 - Math.exp(-dt / Math.max(0.04, releaseMs / 1000));

    const targetBass = capturing && !isGated ? clamp01(analysis.bass) : 0;
    const targetMids = capturing && !isGated ? clamp01(analysis.mids) : 0;
    const targetHighs = capturing && !isGated ? clamp01(analysis.highs) : 0;
    const targetRms = capturing && !isGated ? clamp01(analysis.rms) : 0;

    this.smoothBass += (targetBass - this.smoothBass) * (targetBass > this.smoothBass ? attackRate : releaseRate);
    this.smoothMids += (targetMids - this.smoothMids) * (targetMids > this.smoothMids ? attackRate : releaseRate);
    this.smoothHighs += (targetHighs - this.smoothHighs) * (targetHighs > this.smoothHighs ? attackRate : releaseRate);
    this.smoothRms += (targetRms - this.smoothRms) * (targetRms > this.smoothRms ? attackRate : releaseRate);

    const mode = this.params.spectrumMode ?? 'radial_circle';

    // 2. State Machine: Progress active outward wave
    if (this.state === 'WAVE_OUTWARD' && this.waveStartTime >= 0) {
      const age = ctx.totalTime - this.waveStartTime;
      this.currentWaveRadius = age * this.waveSpeed;
      // When radial wave reaches boundary (~1.25), wave is complete
      if (this.currentWaveRadius >= 1.25) {
        const centerDuration = this.params.centerPulseDurationMs ?? 0;
        if (centerDuration > 0) {
          this.state = 'CENTRE_PULSE';
          this.centerPulseStartTime = ctx.totalTime;
          this.currentWaveRadius = 0;
        } else if (this.queuedWaves > 0) {
          this.queuedWaves--;
          this.state = 'WAVE_OUTWARD';
          this.waveStartTime = ctx.totalTime;
          this.currentWaveRadius = 0;
        } else {
          this.state = 'WAITING_FOR_STRONG_BEAT';
          this.waveStartTime = -1;
          this.currentWaveRadius = 0;
        }
      }
    } else if (this.state === 'CENTRE_PULSE' && this.centerPulseStartTime >= 0) {
      const centerAge = ctx.totalTime - this.centerPulseStartTime;
      const centerDuration = (this.params.centerPulseDurationMs ?? 0) / 1000;
      if (centerAge >= centerDuration) {
        if (this.queuedWaves > 0) {
          this.queuedWaves--;
          this.state = 'WAVE_OUTWARD';
          this.waveStartTime = ctx.totalTime;
          this.currentWaveRadius = 0;
        } else {
          this.state = 'WAITING_FOR_STRONG_BEAT';
          this.centerPulseStartTime = -1;
        }
      }
    }

    // 3. Onset Evaluation & Strong-Beat Prioritization
    if (this.params.beatDetection && capturing && !isGated) {
      const minIntervalSec = (this.params.beatMinIntervalMs ?? 100) / 1000;
      const beatSens = Math.max(0.2, this.params.beatSensitivity ?? 1.0);
      const bassDelta = Math.max(0, targetBass - this.smoothBass);

      const flux = analysis.bassFlux ?? bassDelta;
      const baseThreshold = analysis.adaptiveThreshold ?? 0.035;
      const effectiveThreshold = baseThreshold / beatSens;

      const hasOnsetPeak = Boolean(analysis.beat);
      const timeSinceLast = this.lastBeatTime >= 0 ? (ctx.totalTime - this.lastBeatTime) : 999;
      const timeSinceLastMs = Math.round(timeSinceLast * 1000);

      if (hasOnsetPeak) {
        if (this.lastBeatTime >= 0 && timeSinceLast < minIntervalSec) {
          this.logCandidate({
            timestamp: ctx.totalTime,
            flux,
            score: (flux / Math.max(0.005, effectiveThreshold)),
            threshold: effectiveThreshold,
            status: 'REJECTED_REFRACTORY',
            reason: `Refractory lockout (${timeSinceLastMs}ms < ${(minIntervalSec * 1000).toFixed(0)}ms)`,
            timeSinceLastBeatMs: timeSinceLastMs,
          });
        } else {
          // Calculate beat-strength score
          const rawScore = analysis.beatStrength && analysis.beatStrength > 0
            ? analysis.beatStrength
            : Math.min(1.0, (flux / Math.max(0.005, effectiveThreshold)) * 0.7 + (targetBass * 0.3));
          const score = clamp01(rawScore);
          const strongThreshold = this.params.strongBeatThreshold ?? 0.20;

          if (score < strongThreshold) {
            this.logCandidate({
              timestamp: ctx.totalTime,
              flux,
              score,
              threshold: effectiveThreshold,
              status: 'REJECTED_WEAK',
              reason: `Weak transient (score=${score.toFixed(2)} < thr=${strongThreshold.toFixed(2)})`,
              timeSinceLastBeatMs: timeSinceLastMs,
            });
          } else {
            // ACCEPT CONFIRMED STRONG BEAT!
            this.logCandidate({
              timestamp: ctx.totalTime,
              flux,
              score,
              threshold: effectiveThreshold,
              status: 'ACCEPTED',
              reason: `Confirmed strong beat (score=${score.toFixed(2)} >= thr=${strongThreshold.toFixed(2)})`,
              timeSinceLastBeatMs: timeSinceLastMs,
            });

            if (this.lastBeatTime >= 0 && timeSinceLast >= 0.18 && timeSinceLast <= 1.80) {
              this.recentIntervals.push(timeSinceLast);
              if (this.recentIntervals.length > 8) {
                this.recentIntervals.shift();
              }
              this.updateTempoEstimate();
            }

            this.lastBeatTime = ctx.totalTime;

            // Determine wave speed (adaptive vs user configured)
            let calculatedSpeed = this.params.pulseSpeed ?? 2.4;
            if (this.params.adaptiveTiming && this.tempoConfidence >= 0.30) {
              const targetDuration = Math.max(0.25, Math.min(1.4, this.smoothedInterval * 0.85));
              calculatedSpeed = Math.max(1.2, Math.min(4.5, 1.25 / targetDuration));
            }

            const policy = this.params.strongBeatPolicy ?? 'merge';

            if (this.state === 'WAITING_FOR_STRONG_BEAT' || this.state === 'CENTRE_PULSE' || this.state === 'PAUSED_FRAME') {
              this.state = 'WAVE_OUTWARD';
              this.waveStartTime = ctx.totalTime;
              this.waveSpeed = calculatedSpeed;
              this.currentWaveRadius = 0;
            } else if (this.state === 'WAVE_OUTWARD') {
              if (policy === 'restart') {
                this.waveStartTime = ctx.totalTime;
                this.waveSpeed = calculatedSpeed;
                this.currentWaveRadius = 0;
              } else if (policy === 'queue') {
                this.queuedWaves = Math.min(2, this.queuedWaves + 1);
              } else {
                // Merge policy: accelerate current wave and allow smooth secondary crest
                this.waveSpeed = Math.min(4.5, Math.max(this.waveSpeed, calculatedSpeed) * 1.12);
                this.secondaryPulses.push({
                  birthTime: ctx.totalTime,
                  speed: calculatedSpeed,
                  holdDuration: (this.params.pulseHoldMs ?? 35) / 1000,
                  pulseWidth: this.params.pulseWidth ?? 0.18,
                });
                if (this.secondaryPulses.length > 4) {
                  this.secondaryPulses.shift();
                }
              }
            }
          }
        }
      } else if (flux > 0.005) {
        this.logCandidate({
          timestamp: ctx.totalTime,
          flux,
          score: (flux / Math.max(0.005, effectiveThreshold)),
          threshold: effectiveThreshold,
          status: 'REJECTED_THRESHOLD',
          reason: `Flux below threshold (${flux.toFixed(3)} < ${effectiveThreshold.toFixed(3)})`,
          timeSinceLastBeatMs: timeSinceLastMs,
        });
      }
    }

    // Prune expired secondary pulses
    this.secondaryPulses = this.secondaryPulses.filter(
      (p) => (ctx.totalTime - p.birthTime) * p.speed < 1.45
    );

    // Color definitions
    const cCore = this.params.coreColor ?? this.params.highColor ?? { r: 224, g: 255, b: 244 };
    const cMid = this.params.midColor ?? { r: 0, g: 229, b: 255 };
    const cOuter = this.params.outerColor ?? this.params.bassColor ?? { r: 157, g: 0, b: 255 };
    const cInner = this.params.innerColor ?? {
      r: Math.round((cCore.r + cMid.r) / 2),
      g: Math.round((cCore.g + cMid.g) / 2),
      b: Math.round((cCore.b + cMid.b) / 2),
    };

    const centerX = this.params.centerX ?? 0.47;
    const centerY = this.params.centerY ?? 0.50;
    const maxCeiling = clamp01(this.params.maxBrightness ?? 1.0);
    const idle = clamp01(this.params.idleBrightness);

    const frame: KeyFrameColor = {};
    let activeKeys = 0;
    let bMin = 1.0;
    let bMax = 0.0;
    let bSum = 0.0;

    for (const key of ctx.keys) {
      if (mode === 'radial_circle') {
        const dx = (key.normX - centerX) * 15.0;
        const dy = (key.normY - centerY) * 5.0;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const normDist = dist / 7.5; // normalized radius [0.0 .. ~1.0+]

        const ringColor = getConcentricRingColor(normDist, cCore, cInner, cMid, cOuter);

        // LAYER 1: Continuous Spectrum Layer (Configurable intensity; 0 = pure beat mode)
        let continuousBrightness = 0;
        const contIntensity = clamp01(this.params.continuousIntensity ?? 0.0);

        if (capturing && !isGated && contIntensity > 0.001) {
          let staticBandLevel = 0;
          if (normDist <= 0.40) {
            const bassWeight = Math.max(0, 1.0 - normDist * 1.5);
            staticBandLevel = this.smoothBass * this.params.bassResponse * bassWeight;
          } else if (normDist <= 0.72) {
            const midWeight = Math.max(0, 1.0 - Math.abs(normDist - 0.56) * 3.0);
            staticBandLevel = this.smoothMids * this.params.midResponse * 1.15 * midWeight;
          } else {
            const trebleWeight = Math.min(1.0, Math.max(0, (normDist - 0.65) / 0.35));
            staticBandLevel = this.smoothHighs * this.params.highResponse * 1.25 * trebleWeight;
          }

          const gateCut = 0.11;
          staticBandLevel = staticBandLevel > gateCut ? (staticBandLevel - gateCut) / (1 - gateCut) : 0;
          continuousBrightness = Math.min(0.70, staticBandLevel * this.params.intensity * (contIntensity / 0.35));
        }

        // LAYER 2: Confirmed Beat Wave & Center Pulse (Guarantees 100% target brightness on active crest)
        let beatBrightness = 0;

        // Primary outward wave
        if (this.state === 'WAVE_OUTWARD' && this.waveStartTime >= 0) {
          const age = ctx.totalTime - this.waveStartTime;
          const waveRadius = age * this.waveSpeed;
          const dr = Math.abs(normDist - waveRadius);
          const pWidth = this.params.pulseWidth ?? 0.18;

          if (dr < pWidth) {
            const crestFactor = Math.cos((Math.PI / 2) * (dr / pWidth)) ** 2;
            const transitDuration = 1.25 / this.waveSpeed;
            const holdDuration = (this.params.pulseHoldMs ?? 35) / 1000;
            let timeEnvelope = 1.0;
            if (age > transitDuration + holdDuration) {
              const fadeAge = age - (transitDuration + holdDuration);
              timeEnvelope = Math.max(0, 1.0 - fadeAge / 0.12);
            }
            beatBrightness = Math.max(beatBrightness, crestFactor * timeEnvelope);
          }
        }

        // Secondary merged pulses
        for (const pulse of this.secondaryPulses) {
          const age = ctx.totalTime - pulse.birthTime;
          const waveRadius = age * pulse.speed;
          const dr = Math.abs(normDist - waveRadius);
          const pWidth = pulse.pulseWidth;

          if (dr < pWidth) {
            const crestFactor = Math.cos((Math.PI / 2) * (dr / pWidth)) ** 2;
            const transitDuration = 1.25 / pulse.speed;
            let timeEnvelope = 1.0;
            if (age > transitDuration + pulse.holdDuration) {
              const fadeAge = age - (transitDuration + pulse.holdDuration);
              timeEnvelope = Math.max(0, 1.0 - fadeAge / 0.12);
            }
            beatBrightness = Math.max(beatBrightness, crestFactor * timeEnvelope);
          }
        }

        // Centre Pulse transition
        if (this.state === 'CENTRE_PULSE' && this.centerPulseStartTime >= 0) {
          if (normDist <= 0.20) {
            const centerAge = ctx.totalTime - this.centerPulseStartTime;
            const centerDuration = (this.params.centerPulseDurationMs ?? 70) / 1000;
            const progress = Math.min(1.0, centerAge / Math.max(0.01, centerDuration));
            const pulseFactor = progress < 0.5 ? 1.0 : Math.cos((Math.PI / 2) * ((progress - 0.5) / 0.5)) ** 2;
            beatBrightness = Math.max(beatBrightness, pulseFactor);
          }
        }

        beatBrightness = Math.min(1.0, beatBrightness);

        // LAYER 3: Bounded Compositing & Per-Key RGB Output
        let compositeBrightness = 0;
        if (beatBrightness > 0.001) {
          compositeBrightness = Math.max(continuousBrightness, beatBrightness);
        } else {
          compositeBrightness = continuousBrightness;
        }

        const clampedBrightness = Math.min(maxCeiling, compositeBrightness * this.params.brightness);
        const keyBrightness = (capturing && !isGated && clampedBrightness > 0.001)
          ? (idle + clampedBrightness * (1 - idle))
          : idle;

        if (keyBrightness > 0.05) {
          activeKeys++;
        }

        const calculatedColor = applyBrightness(
          capturing && keyBrightness > 0.001 ? ringColor : this.params.idleColor,
          keyBrightness
        );
        frame[key.id] = calculatedColor;

        const b = Math.max(calculatedColor.r, calculatedColor.g, calculatedColor.b) / 255;
        bMin = Math.min(bMin, b);
        bMax = Math.max(bMax, b);
        bSum += b;
        continue;
      }

      // Traditional spectrum modes
      const bands = analysis.bands?.length ? analysis.bands.map(clamp01) : [analysis.bass, analysis.mids, analysis.highs].map(clamp01);
      const x = clamp01(key.normX);
      const pos = x * Math.max(0, bands.length - 1);
      const lower = Math.floor(pos);
      const upper = Math.min(bands.length - 1, lower + 1);
      const waveLevel = bands[lower] + (bands[upper] - bands[lower]) * (pos - lower);
      const barBand = bands[Math.min(bands.length - 1, Math.floor(x * bands.length))] ?? 0;
      const bottomBias = key.id === 'space' ? 1 : key.normY > 0.72 ? 0.86 : key.normY > 0.55 ? 0.55 : 0.22;
      const response = x < 0.32 ? this.params.bassResponse : x < 0.68 ? this.params.midResponse : this.params.highResponse;
      let level = waveLevel * response;
      if (mode === 'spectrum_bars') {
        const barsFill = (1 - key.row / 5);
        level = barBand * response >= barsFill - 0.12 ? barBand * response : 0;
      } else if (mode === 'spectrum_wave') {
        level *= 0.35 + bottomBias * 0.65;
      } else if (mode === 'bass_impact') {
        level = this.smoothBass * this.params.bassResponse * (0.3 + bottomBias * 0.7);
      } else {
        level *= 0.58 + bottomBias * 0.42;
      }
      const energy = (capturing && !isGated) ? clamp01(level * this.params.intensity) : 0;
      const color = mode === 'bass_impact' ? this.params.bassColor : spectrumColor(x);
      const brightness = (capturing && !isGated) ? idle + Math.min(maxCeiling, energy) * (1 - idle) : idle;
      if (brightness > 0.05) activeKeys++;
      const calculatedColor = applyBrightness(capturing ? color : this.params.idleColor, brightness * this.params.brightness);
      frame[key.id] = calculatedColor;

      const b = Math.max(calculatedColor.r, calculatedColor.g, calculatedColor.b) / 255;
      bMin = Math.min(bMin, b);
      bMax = Math.max(bMax, b);
      bSum += b;
    }

    this.activeKeyCount = activeKeys;
    this.minBrightness = bMin;
    this.maxBrightness = bMax;
    this.avgBrightness = ctx.keys.length > 0 ? bSum / ctx.keys.length : 0;
    this.lastRenderedFrame = { ...frame };

    return frame;
  }

  reset(): void {
    this.state = 'WAITING_FOR_STRONG_BEAT';
    this.waveStartTime = -1;
    this.currentWaveRadius = 0;
    this.centerPulseStartTime = -1;
    this.queuedWaves = 0;
    this.secondaryPulses = [];
    this.smoothBass = 0;
    this.smoothMids = 0;
    this.smoothHighs = 0;
    this.smoothRms = 0;
    this.lastBeatTime = -1;
    this.activeKeyCount = 0;
    this.minBrightness = 0;
    this.maxBrightness = 0;
    this.avgBrightness = 0;
    this.recentIntervals = [];
    this.smoothedInterval = 0.5;
    this.estimatedBpm = 120;
    this.tempoConfidence = 0;
    this.candidateLogs = [];
    this.lastRenderedFrame = {};
    this.silenceDurationSec = 0;
  }
}

function spectrumColor(position: number): RGBColor {
  const scaled = clamp01(position) * (SPECTRUM_COLORS.length - 1);
  const index = Math.min(SPECTRUM_COLORS.length - 2, Math.floor(scaled));
  const t = scaled - index;
  const from = SPECTRUM_COLORS[index];
  const to = SPECTRUM_COLORS[index + 1];
  return { r: from.r + (to.r - from.r) * t, g: from.g + (to.g - from.g) * t, b: from.b + (to.b - from.b) * t };
}

export const DEFAULT_MUSIC_PULSE_PARAMS: MusicPulseParams = {
  deviceId: null,
  sensitivity: 3.5,
  bassResponse: 1.3,
  midResponse: 0.9,
  highResponse: 0.65,
  beatDetection: true,
  intensity: 1.0,
  speed: 1,
  brightness: 1,
  decayMs: 200,
  idleBrightness: 0.0,
  highColor: { r: 224, g: 255, b: 244 },
  midColor: { r: 0, g: 229, b: 255 },
  bassColor: { r: 157, g: 0, b: 255 },
  idleColor: { r: 0, g: 0, b: 0 },
  ringCount: 4,
  centerX: 0.47,
  centerY: 0.50,
  pulseSpeed: 2.4,
  pulseWidth: 0.26,
  pulseHoldMs: 35,
  beatSensitivity: 1.0,
  strongBeatThreshold: 0.15,
  strongBeatPolicy: 'restart',
  centerPulseDurationMs: 0,
  continuousIntensity: 0.0,
  pauseFrameBehavior: 'black',
  beatMinIntervalMs: 280,
  maxBrightness: 1.0,
  adaptiveTiming: true,
  tempoSmoothing: 0.25,
  bassMaxHz: 105,
  showDiagnostics: false,
  minFrequency: 35,
  maxFrequency: 16_000,
  bandCount: 32,
  attackMs: 25,
  releaseMs: 220,
  noiseGate: 0.012,
  peakHold: true,
  spectrumMode: 'radial_circle',
};
