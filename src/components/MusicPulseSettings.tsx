import React, { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { AudioAnalysis, MusicPulseParams } from '../types/effects';
import { RGBColor } from '../types/keyboard';
import { rgbToHex, hexToRgb } from '../engine/color';
import { toAudioAnalyzerConfig } from '../engine/effects/musicPulse';

import { hardwareService, HardwareDiagnostics } from '../services/hardware';

interface Output { id: string; name: string; isDefault: boolean }
interface Props {
  params: MusicPulseParams;
  onChange: (params: MusicPulseParams) => void;
  hardwareEnabled: boolean;
  hardwareStatus: 'preview-only' | 'connecting' | 'active' | 'error';
}

const EMPTY: AudioAnalysis = {
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
  noiseFloor: 0.005,
  isGated: true,
  updatedAt: 0,
};

const COLOR_THEMES: Record<string, Partial<MusicPulseParams>> = {
  'Mint & Violet': {
    coreColor: { r: 224, g: 255, b: 244 },
    innerColor: { r: 0, g: 255, b: 102 },
    midColor: { r: 0, g: 229, b: 255 },
    outerColor: { r: 157, g: 0, b: 255 },
    highColor: { r: 224, g: 255, b: 244 },
    bassColor: { r: 157, g: 0, b: 255 },
  },
  'Magma Flame': {
    coreColor: { r: 255, g: 0, b: 0 },
    innerColor: { r: 255, g: 40, b: 0 },
    midColor: { r: 255, g: 85, b: 0 },
    outerColor: { r: 255, g: 175, b: 0 },
    highColor: { r: 255, g: 0, b: 0 },
    bassColor: { r: 255, g: 175, b: 0 },
  },
  'Blood Moon': {
    coreColor: { r: 255, g: 20, b: 20 },
    innerColor: { r: 180, g: 0, b: 0 },
    midColor: { r: 110, g: 0, b: 0 },
    outerColor: { r: 50, g: 0, b: 0 },
    highColor: { r: 255, g: 0, b: 0 },
    bassColor: { r: 60, g: 0, b: 0 },
  },
  'Ice & Fire': {
    coreColor: { r: 255, g: 255, b: 255 },
    innerColor: { r: 255, g: 50, b: 0 },
    midColor: { r: 0, g: 150, b: 255 },
    outerColor: { r: 0, g: 230, b: 255 },
    highColor: { r: 255, g: 0, b: 0 },
    bassColor: { r: 0, g: 220, b: 255 },
  },
  'Neon Matrix': {
    coreColor: { r: 240, g: 255, b: 240 },
    innerColor: { r: 0, g: 255, b: 70 },
    midColor: { r: 0, g: 180, b: 50 },
    outerColor: { r: 180, g: 255, b: 0 },
    highColor: { r: 0, g: 255, b: 80 },
    bassColor: { r: 200, g: 255, b: 0 },
  },
};

const PRESETS: Record<string, Partial<MusicPulseParams>> = {
  'Concentric Pulse': {
    sensitivity: 3.5,
    bassResponse: 1.3,
    midResponse: 0.9,
    highResponse: 0.65,
    pulseSpeed: 2.4,
    pulseWidth: 0.18,
    pulseHoldMs: 35,
    beatSensitivity: 1.0,
    beatMinIntervalMs: 100,
    maxBrightness: 1.0,
    spectrumMode: 'radial_circle',
  },
  'Club Bass Punch': {
    sensitivity: 4.2,
    bassResponse: 1.8,
    midResponse: 0.7,
    highResponse: 0.45,
    pulseSpeed: 2.8,
    pulseWidth: 0.20,
    pulseHoldMs: 45,
    beatSensitivity: 1.3,
    beatMinIntervalMs: 90,
    maxBrightness: 1.0,
    spectrumMode: 'radial_circle',
  },
  'Balanced Studio': {
    sensitivity: 3.2,
    bassResponse: 1.1,
    midResponse: 1.0,
    highResponse: 0.8,
    pulseSpeed: 2.2,
    pulseWidth: 0.20,
    noiseGate: 0.012,
    maxBrightness: 0.9,
    spectrumMode: 'radial_circle',
  },
  'Ambient Chill': {
    sensitivity: 2.6,
    bassResponse: 0.9,
    midResponse: 1.1,
    highResponse: 0.7,
    pulseSpeed: 1.6,
    pulseWidth: 0.30,
    noiseGate: 0.016,
    attackMs: 60,
    releaseMs: 450,
    maxBrightness: 0.8,
    spectrumMode: 'radial_circle',
  },
};

export const MusicPulseSettings: React.FC<Props> = ({ params, onChange, hardwareEnabled, hardwareStatus }) => {
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [analysis, setAnalysis] = useState<AudioAnalysis>(EMPTY);
  const [deviceError, setDeviceError] = useState('');
  const [showDiagnostics, setShowDiagnostics] = useState(params.showDiagnostics ?? false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [candidateLogs, setCandidateLogs] = useState<Array<{
    time: string;
    flux: number;
    score: number;
    threshold: number;
    status: 'ACCEPTED' | 'REJECTED_REFRACTORY' | 'REJECTED_WEAK' | 'REJECTED_THRESHOLD';
    reason: string;
  }>>([]);
  const [bpmDisplay, setBpmDisplay] = useState<number>(120);
  const [bpmConfidence, setBpmConfidence] = useState<number>(0);
  const [hwDiag, setHwDiag] = useState<HardwareDiagnostics>(() => hardwareService.getDiagnostics());

  useEffect(() => {
    if (!showDiagnostics) return;
    const interval = window.setInterval(() => {
      setHwDiag(hardwareService.getDiagnostics());
    }, 250);
    return () => window.clearInterval(interval);
  }, [showDiagnostics]);

  const statusRef = useRef<AudioAnalysis['status']>('inactive');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bandsRef = useRef<number[]>([]);
  const peaksRef = useRef<number[]>([]);
  const lastBeatTimeRef = useRef<number>(-1);
  const recentIntervalsRef = useRef<number[]>([]);

  useEffect(() => {
    let active = true;
    let unlisten: (() => void) | undefined;
    let lastUiUpdate = 0;

    void invoke<Output[]>('list_audio_outputs').then((list) => {
      if (active) setOutputs(list);
    }).catch((e) => {
      if (active) setDeviceError(String(e));
    });

    void listen<AudioAnalysis>('music-pulse-analysis', ({ payload }) => {
      bandsRef.current = payload.bands ?? [];
      const now = performance.now();

      // Candidate onset logging & BPM estimation
      const minIntervalMs = params.beatMinIntervalMs ?? 100;
      const beatSens = Math.max(0.2, params.beatSensitivity ?? 1.0);
      const flux = payload.bassFlux ?? payload.bass;
      const threshold = (payload.adaptiveThreshold ?? 0.04) / beatSens;

      if (payload.status === 'capturing' && !payload.isGated) {
        if (payload.beat) {
          const timeSinceLast = lastBeatTimeRef.current > 0 ? (now - lastBeatTimeRef.current) : 9999;
          const timeStr = new Date().toLocaleTimeString().split(' ')[0] + '.' + Math.floor((now % 1000) / 100);
          const rawScore = payload.beatStrength && payload.beatStrength > 0
            ? payload.beatStrength
            : Math.min(1.0, (flux / Math.max(0.005, threshold)) * 0.7 + (payload.bass * 0.3));
          const score = Math.max(0, Math.min(1, rawScore));
          const strongThreshold = params.strongBeatThreshold ?? 0.35;

          if (timeSinceLast < minIntervalMs) {
            setCandidateLogs((prev) => [
              {
                time: timeStr,
                flux,
                score,
                threshold,
                status: 'REJECTED_REFRACTORY',
                reason: `Refractory lockout (${Math.round(timeSinceLast)}ms < ${minIntervalMs}ms)`,
              },
              ...prev.slice(0, 7),
            ]);
          } else if (score < strongThreshold) {
            setCandidateLogs((prev) => [
              {
                time: timeStr,
                flux,
                score,
                threshold,
                status: 'REJECTED_WEAK',
                reason: `Weak transient (score=${score.toFixed(2)} < thr=${strongThreshold.toFixed(2)})`,
              },
              ...prev.slice(0, 7),
            ]);
          } else {
            lastBeatTimeRef.current = now;
            setCandidateLogs((prev) => [
              {
                time: timeStr,
                flux,
                score,
                threshold,
                status: 'ACCEPTED',
                reason: `Confirmed strong beat (score=${score.toFixed(2)} >= thr=${strongThreshold.toFixed(2)})`,
              },
              ...prev.slice(0, 7),
            ]);

            if (timeSinceLast >= 200 && timeSinceLast <= 1800) {
              recentIntervalsRef.current.push(timeSinceLast);
              if (recentIntervalsRef.current.length > 8) {
                recentIntervalsRef.current.shift();
              }
              const intervals = recentIntervalsRef.current;
              if (intervals.length >= 3) {
                const sorted = [...intervals].sort((a, b) => a - b);
                const median = sorted[Math.floor(sorted.length / 2)];
                const dev = intervals.reduce((acc, v) => acc + Math.abs(v - median), 0) / intervals.length;
                const ratio = median > 0 ? dev / median : 1;
                const conf = Math.max(0, Math.min(1, 1 - ratio / 0.25));
                setBpmConfidence(Math.round(conf * 100));
                if (conf > 0.15) {
                  setBpmDisplay(Math.round(60000 / median));
                }
              }
            }
          }
        } else if (flux > 0.005) {
          const timeStr = new Date().toLocaleTimeString().split(' ')[0] + '.' + Math.floor((now % 1000) / 100);
          setCandidateLogs((prev) => [
            {
              time: timeStr,
              flux,
              score: flux / Math.max(0.005, threshold),
              threshold,
              status: 'REJECTED_THRESHOLD',
              reason: `Flux below threshold (${flux.toFixed(3)} < ${threshold.toFixed(3)})`,
            },
            ...prev.slice(0, 7),
          ]);
        }
      }

      if (payload.status !== statusRef.current || now - lastUiUpdate > 120) {
        statusRef.current = payload.status;
        lastUiUpdate = now;
        setAnalysis(payload);
      }
    }).then((stop) => {
      if (!active) stop();
      else unlisten = stop;
    });

    void invoke<AudioAnalysis>('get_audio_analysis').then((state) => {
      if (active) {
        setAnalysis(state);
        bandsRef.current = state.bands ?? [];
      }
    }).catch(() => undefined);

    return () => {
      active = false;
      unlisten?.();
    };
  }, [params.beatMinIntervalMs, params.beatSensitivity]);

  // Live FFT spectrum rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let frameId = 0;
    let previousTime = 0;

    const render = (time: number) => {
      frameId = requestAnimationFrame(render);
      if (time - previousTime < 24) return;
      previousTime = time;

      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const ratio = window.devicePixelRatio || 1;
      const width = Math.round(rect.width * ratio);
      const height = Math.round(rect.height * ratio);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const context = canvas.getContext('2d');
      if (!context) return;

      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const w = rect.width;
      const h = rect.height;
      context.fillStyle = '#0b0b0d';
      context.fillRect(0, 0, w, h);

      const values = bandsRef.current;
      if (peaksRef.current.length !== values.length) peaksRef.current = values.slice();
      const gap = Math.max(1, w * 0.004);
      const barWidth = Math.max(2, (w - gap * Math.max(0, values.length - 1)) / Math.max(1, values.length));

      const gradient = context.createLinearGradient(0, 0, w, 0);
      gradient.addColorStop(0, '#00ff66');
      gradient.addColorStop(0.35, '#00e5ff');
      gradient.addColorStop(0.70, '#9d00ff');
      gradient.addColorStop(1, '#ff00aa');
      context.fillStyle = gradient;

      const elapsed = 0.024;
      const peakHold = params.peakHold;

      for (let i = 0; i < values.length; i++) {
        const value = Math.max(0, Math.min(1, values[i] ?? 0));
        const barHeight = value * (h - 10);
        const x = i * (barWidth + gap);
        if (barHeight > 0.5) context.fillRect(x, h - barHeight, barWidth, barHeight);

        const peak = peaksRef.current[i] ?? value;
        peaksRef.current[i] = peakHold ? Math.max(value, peak - elapsed * 0.48) : value;
        if (peakHold && peaksRef.current[i] > 0.01) {
          context.fillStyle = '#f5f5f5';
          context.fillRect(x, h - peaksRef.current[i] * (h - 10) - 2, barWidth, 2);
          context.fillStyle = gradient;
        }
      }
    };

    frameId = requestAnimationFrame(render);
    const observer = new ResizeObserver(() => { canvas.width = 0; });
    observer.observe(canvas);
    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [params.peakHold]);

  // Synchronize audio configuration with Tauri backend
  useEffect(() => {
    const config = toAudioAnalyzerConfig(params);
    const timer = window.setTimeout(() => {
      void invoke('set_audio_config', { config }).catch(() => undefined);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [
    params.sensitivity,
    params.noiseGate,
    params.bandCount,
    params.minFrequency,
    params.maxFrequency,
    params.attackMs,
    params.releaseMs,
    params.beatSensitivity,
    params.bassMaxHz,
    params.beatMinIntervalMs,
  ]);

  const patch = (next: Partial<MusicPulseParams>) => onChange({ ...params, ...next });

  const slider = (label: string, key: keyof MusicPulseParams, min: number, max: number, step: number, suffix = '') => {
    const value = (params[key] as number | undefined) ?? 0;
    return (
      <label className="music-slider" key={key}>
        <span>{label}<b>{value}{suffix}</b></span>
        <input
          aria-label={label}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => patch({ [key]: Number(e.target.value) })}
        />
      </label>
    );
  };

  const color = (label: string, key: keyof MusicPulseParams) => {
    const rgb = (params[key] as RGBColor | undefined) ?? { r: 255, g: 255, b: 255 };
    return (
      <label className="music-color" key={key}>
        {label}
        <input
          aria-label={label}
          type="color"
          value={rgbToHex(rgb)}
          onChange={(e) => patch({ [key]: hexToRgb(e.target.value) })}
        />
      </label>
    );
  };

  const meter = (name: string, value: number) => (
    <div className="music-meter" key={name}>
      <span>{name}</span>
      <div>
        <i style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }} />
      </div>
    </div>
  );

  const calibrateNoiseFloor = () => {
    const suggested = Math.max(0.005, Number(((analysis.noiseFloor || 0.005) * 1.6).toFixed(3)));
    patch({ noiseGate: suggested });
  };

  const status = analysis.status === 'capturing'
    ? 'Capturing system audio'
    : analysis.status === 'starting'
      ? 'Starting capture'
      : analysis.status === 'error'
        ? 'Capture unavailable'
        : 'Capture inactive';

  const hardware = hardwareStatus === 'active'
    ? 'K630 output active'
    : hardwareStatus === 'connecting'
      ? 'K630 connecting'
      : hardwareStatus === 'error'
        ? 'K630 unavailable; retrying'
        : hardwareEnabled
          ? 'K630 output enabled'
          : 'Preview only';

  // Estimate active keys count (keys lit up > 5%)
  const approxActiveKeys = analysis.status === 'capturing' && !analysis.isGated
    ? Math.round(Math.min(61, Math.max(1, (analysis.rms * 0.4 + analysis.bass * 0.6) * 58)))
    : (params.idleBrightness > 0 ? 61 : 0);

  return (
    <div className="specific-controls music-pulse-controls">
      <div className="music-status-row">
        <strong>{status}</strong>
        <span>{hardware}</span>
      </div>

      {analysis.message && <p className="music-error">{analysis.message}</p>}
      {deviceError && <p className="music-error">{deviceError}</p>}

      <label className="music-device">
        Audio output (System loopback)
        <select value={params.deviceId ?? ''} onChange={(e) => patch({ deviceId: e.target.value || null })}>
          <option value="">Windows default audio output</option>
          {outputs.map((output) => (
            <option key={output.id} value={output.id}>
              {output.name}{output.isDefault ? ' (Default)' : ''}
            </option>
          ))}
        </select>
      </label>

      {/* Live FFT Spectrum Visualizer */}
      <div className="spectrum-card">
        <div className="spectrum-heading">
          <span>LIVE FREQUENCY SPECTRUM (2048 FFT)</span>
          <span>
            {params.minFrequency ?? 35} Hz — {(params.maxFrequency ?? 16000) >= 1000
              ? `${((params.maxFrequency ?? 16000) / 1000).toFixed(1)} kHz`
              : `${params.maxFrequency} Hz`}
          </span>
        </div>
        <canvas ref={canvasRef} className="spectrum-canvas" aria-label="Live frequency spectrum visualizer" role="img" />
        <div className="spectrum-axis">
          <span>SUB-BASS (35-130Hz)</span>
          <span>MIDS (130-3.5kHz)</span>
          <span>TREBLE (3.5-16kHz)</span>
        </div>
      </div>

      {/* Primary Audio Meters & Beat Indicator */}
      <div className="music-visualizer">
        <div className="music-meters">
          {meter('Signal RMS', analysis.rms)}
          {meter('Bass (Core)', analysis.bass)}
          {meter('Mids (Mid Ring)', analysis.mids)}
          {meter('Treble (Outer)', analysis.highs)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
          <span className={analysis.beat ? 'beat-indicator active' : 'beat-indicator'}>
            BEAT
          </span>
          <span style={{ fontSize: '11px', color: bpmConfidence > 20 ? '#00e5ff' : '#666', fontWeight: 700 }}>
            {bpmConfidence > 20 ? `~${bpmDisplay} BPM` : 'DETECTING BPM'}
          </span>
        </div>
      </div>

      {/* Live Audio Diagnostics Panel */}
      <div
        className="diagnostic-toggle-row"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '6px',
          marginBottom: '6px',
        }}
      >
        <button
          type="button"
          onClick={() => {
            const next = !showDiagnostics;
            setShowDiagnostics(next);
            patch({ showDiagnostics: next });
          }}
          style={{
            background: showDiagnostics ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${showDiagnostics ? '#00e5ff' : 'rgba(255, 255, 255, 0.12)'}`,
            borderRadius: '6px',
            color: showDiagnostics ? '#00e5ff' : '#ccc',
            fontSize: '11px',
            padding: '5px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>{showDiagnostics ? '▲ Hide Audio Diagnostics' : '▼ Live Audio Diagnostics & Candidate Log'}</span>
        </button>
        <span
          style={{
            fontSize: '11px',
            color: analysis.isGated ? '#ffaa00' : '#00ff66',
            fontWeight: 600,
            background: analysis.isGated ? 'rgba(255, 170, 0, 0.1)' : 'rgba(0, 255, 102, 0.1)',
            padding: '3px 8px',
            borderRadius: '4px',
            border: `1px solid ${analysis.isGated ? 'rgba(255, 170, 0, 0.3)' : 'rgba(0, 255, 102, 0.3)'}`,
          }}
        >
          {analysis.isGated ? 'GATE: SQUELCHED' : 'GATE: AUDIO ACTIVE'}
        </span>
      </div>

      {showDiagnostics && (
        <div
          className="diagnostic-panel"
          style={{
            background: '#0d0f14',
            border: '1px solid rgba(0, 229, 255, 0.25)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '12px',
            fontSize: '11px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '10px',
              marginBottom: '12px',
            }}
          >
            <div>
              <span style={{ color: '#888' }}>Signal Level:</span>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#fff' }}>
                {(analysis.rms * 100).toFixed(1)}% ({analysis.rmsDbfs !== undefined ? `${analysis.rmsDbfs.toFixed(1)} dBFS` : '-'})
              </div>
            </div>
            <div>
              <span style={{ color: '#888' }}>Peak Audio:</span>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#fff' }}>
                {analysis.peakDbfs !== undefined ? `${analysis.peakDbfs.toFixed(1)} dBFS` : '-'}
              </div>
            </div>
            <div>
              <span style={{ color: '#888' }}>Estimated Tempo:</span>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#00e5ff' }}>
                {bpmDisplay} BPM ({bpmConfidence}% conf)
              </div>
            </div>
            <div>
              <span style={{ color: '#888' }}>Flux / Threshold:</span>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#00ff66' }}>
                {(analysis.bassFlux ?? 0).toFixed(3)} / {(analysis.adaptiveThreshold ?? 0.04).toFixed(3)}
              </div>
            </div>
            <div>
              <span style={{ color: '#888' }}>Noise Floor / Gate:</span>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#ffaa00' }}>
                {((analysis.noiseFloor ?? 0.005) * 100).toFixed(2)}% / {((params.noiseGate ?? 0.012) * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <span style={{ color: '#888' }}>Active Keys:</span>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#00ff66' }}>
                {approxActiveKeys} / 61 keys
              </div>
            </div>
            <div>
              <span style={{ color: '#888' }}>Render Owner:</span>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#00e5ff' }}>
                Single Owner (Pulse)
              </div>
            </div>
            <div>
              <span style={{ color: '#888' }}>USB Frame Sequence:</span>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#fff', fontFamily: 'monospace' }}>
                #{hwDiag.sequenceNumber} (0x{hwDiag.lastChecksumHex})
              </div>
            </div>
            <div>
              <span style={{ color: '#888' }}>Write Latency / Dropped:</span>
              <div style={{ fontWeight: 700, fontSize: '13px', color: hwDiag.transmissionErrors > 0 ? '#ff4444' : '#00ff66' }}>
                {hwDiag.lastSendDurationMs}ms ({hwDiag.droppedFrames} drops, {hwDiag.transmissionErrors} errs)
              </div>
            </div>
          </div>

          {/* Candidate Onset Event Log */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '8px', marginTop: '4px' }}>
            <span style={{ color: '#aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Candidate Beat Events Log (Onset Flux & Score vs Adaptive Threshold):
            </span>
            <div style={{ marginTop: '6px', maxHeight: '110px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {candidateLogs.length === 0 ? (
                <div style={{ color: '#666', fontStyle: 'italic' }}>Listening for audio transients...</div>
              ) : (
                candidateLogs.map((item, idx) => {
                  const badgeColor =
                    item.status === 'ACCEPTED'
                      ? '#00ff66'
                      : item.status === 'REJECTED_WEAK'
                      ? '#ffaa00'
                      : item.status === 'REJECTED_REFRACTORY'
                      ? '#00e5ff'
                      : '#ff4444';
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        background: item.status === 'ACCEPTED' ? 'rgba(0, 255, 102, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '10px',
                      }}
                    >
                      <span style={{ color: '#888' }}>{item.time}</span>
                      <span style={{ color: badgeColor, fontWeight: 600 }}>
                        [{item.status}]
                      </span>
                      <span style={{ color: '#bbb' }}>{item.reason}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ marginTop: '10px' }}>
            <button
              type="button"
              onClick={calibrateNoiseFloor}
              style={{
                background: 'rgba(0, 229, 255, 0.1)',
                border: '1px solid #00e5ff',
                color: '#00e5ff',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Auto-Calibrate Noise Gate from Ambient Noise
            </button>
          </div>
        </div>
      )}

      {/* Pattern Selector */}
      <label className="music-device">
        Visualizer Pattern
        <select
          value={params.spectrumMode ?? 'radial_circle'}
          onChange={(e) => patch({ spectrumMode: e.target.value as MusicPulseParams['spectrumMode'] })}
        >
          <option value="radial_circle">Concentric Radial Spectrum (Beat Wave Propagation)</option>
          <option value="spectrum_bars">Spectrum Bars (Frequency Rows)</option>
          <option value="spectrum_wave">Spectrum Wave (Flowing)</option>
          <option value="bass_impact">Bass Impact (Subwoofer Kick)</option>
          <option value="full_spectrum">Full Spectrum (All Frequencies)</option>
        </select>
      </label>

      {/* Quick Presets */}
      <div className="music-presets">
        {Object.entries(PRESETS).map(([name, values]) => (
          <button key={name} type="button" onClick={() => patch(values)}>
            {name}
          </button>
        ))}
      </div>

      {/* Color Themes */}
      <div className="music-color-themes" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '10px', marginBottom: '8px' }}>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Palettes:
        </span>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {Object.entries(COLOR_THEMES).map(([name, themeColors]) => (
            <button
              key={name}
              type="button"
              className="theme-chip-btn"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                color: '#eee',
                cursor: 'pointer',
              }}
              onClick={() => patch(themeColors)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Concentric Ring Color Pickers */}
      <div className="music-colors">
        {color('Ring 0: Core (Mint)', 'coreColor')}
        {color('Ring 1: Inner (Green)', 'innerColor')}
        {color('Ring 2: Middle (Cyan)', 'midColor')}
        {color('Ring 3: Outer (Violet)', 'outerColor')}
        {color('Idle Off', 'idleColor')}
      </div>

      {/* State Machine Policy Selectors */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginTop: '10px', marginBottom: '10px' }}>
        <label className="music-device" style={{ margin: 0 }}>
          Strong Beat Merge Policy
          <select
            value={params.strongBeatPolicy ?? 'merge'}
            onChange={(e) => patch({ strongBeatPolicy: e.target.value as MusicPulseParams['strongBeatPolicy'] })}
          >
            <option value="merge">Merge & Accelerate Active Wave</option>
            <option value="restart">Restart New Outward Wave Immediately</option>
            <option value="queue">Queue Next Wave Sequentially</option>
          </select>
        </label>
        <label className="music-device" style={{ margin: 0 }}>
          Playback Pause Behavior
          <select
            value={params.pauseFrameBehavior ?? 'freeze'}
            onChange={(e) => patch({ pauseFrameBehavior: e.target.value as MusicPulseParams['pauseFrameBehavior'] })}
          >
            <option value="freeze">Freeze Exact Frame (No Rainbow / Keepalive)</option>
            <option value="black">Fade to Black Off-State</option>
          </select>
        </label>
      </div>

      {/* Adaptive Beat Timing Toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          padding: '8px 12px',
          marginTop: '6px',
          marginBottom: '10px',
        }}
      >
        <div>
          <strong style={{ fontSize: '12px', color: '#fff', display: 'block' }}>Adaptive Beat-Speed Timing</strong>
          <span style={{ fontSize: '11px', color: '#888' }}>
            Dynamically scales pulse wave propagation speed with detected song tempo
          </span>
        </div>
        <label className="switch-toggle" style={{ cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={params.adaptiveTiming ?? true}
            onChange={(e) => patch({ adaptiveTiming: e.target.checked })}
          />
        </label>
      </div>

      {/* Primary Configurable Sliders Grid */}
      <div className="music-slider-grid">
        {slider('Beat Sensitivity', 'beatSensitivity', 0.3, 2.5, 0.1)}
        {slider('Compulsory Pulse Interval', 'beatMinIntervalMs', 120, 1200, 10, ' ms')}
        {slider('Strong Beat Threshold', 'strongBeatThreshold', 0.10, 0.85, 0.05)}
        {slider('Base Pulse Speed', 'pulseSpeed', 0.8, 5.0, 0.2)}
        {slider('Pulse Wave Width', 'pulseWidth', 0.10, 0.50, 0.02)}
        {slider('Max Pulse Brightness', 'maxBrightness', 0.2, 1.0, 0.05)}
        {slider('Continuous Spectrum (0=Beat-Only)', 'continuousIntensity', 0, 1.0, 0.05)}
        {slider('Noise Gate', 'noiseGate', 0, 0.08, 0.002)}
      </div>

      {/* Expandable Advanced Controls */}
      <div style={{ marginTop: '12px' }}>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            background: 'none',
            border: 'none',
            color: '#00e5ff',
            fontSize: '12px',
            cursor: 'pointer',
            padding: '4px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 600,
          }}
        >
          {showAdvanced ? '▲ Collapse Advanced Audio & Envelope Settings' : '▼ Expand Advanced Audio & Envelope Settings'}
        </button>

        {showAdvanced && (
          <div
            className="music-slider-grid"
            style={{
              marginTop: '10px',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            {slider('Centre Pulse Duration', 'centerPulseDurationMs', 0, 200, 5, ' ms')}
            {slider('Pulse Peak Hold', 'pulseHoldMs', 10, 120, 5, ' ms')}
            {slider('Tempo Smoothing', 'tempoSmoothing', 0.05, 0.8, 0.05)}
            {slider('Bass Analysis Range', 'bassMaxHz', 60, 250, 5, ' Hz')}
            {slider('Attack Envelope', 'attackMs', 8, 250, 4, ' ms')}
            {slider('Release Decay', 'releaseMs', 40, 1200, 20, ' ms')}
            {slider('Bass Gain (Core/Inner)', 'bassResponse', 0, 2.5, 0.05)}
            {slider('Midrange Gain (Middle)', 'midResponse', 0, 2.5, 0.05)}
            {slider('Treble Gain (Outer)', 'highResponse', 0, 2.5, 0.05)}
            {slider('Idle Brightness', 'idleBrightness', 0, 0.3, 0.01)}
            {slider('Virtual Center X', 'centerX', 0.1, 0.9, 0.02)}
            {slider('Virtual Center Y', 'centerY', 0.1, 0.9, 0.05)}
          </div>
        )}
      </div>
    </div>
  );
};
