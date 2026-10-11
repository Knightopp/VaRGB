use rustfft::{FftPlanner, num_complex::Complex};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::sync::{Arc, Mutex, RwLock};
use std::thread::{self, JoinHandle};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioAnalysis {
    pub status: String,
    pub device_id: Option<String>,
    pub device_name: Option<String>,
    pub message: Option<String>,
    pub rms: f32,
    pub rms_dbfs: f32,
    pub peak_dbfs: f32,
    pub energy_change: f32,
    pub bass: f32,
    pub mids: f32,
    pub highs: f32,
    pub bands: Vec<f32>,
    pub beat: bool,
    pub beat_strength: f32,
    pub bass_flux: f32,
    pub adaptive_threshold: f32,
    pub noise_floor: f32,
    pub is_gated: bool,
    pub updated_at: u64,
}

impl AudioAnalysis {
    fn new(status: &str, device_id: Option<String>, message: Option<String>) -> Self {
        Self {
            status: status.into(),
            device_id,
            device_name: None,
            message,
            rms: 0.0,
            rms_dbfs: -96.0,
            peak_dbfs: -96.0,
            energy_change: 0.0,
            bass: 0.0,
            mids: 0.0,
            highs: 0.0,
            bands: Vec::new(),
            beat: false,
            beat_strength: 0.0,
            bass_flux: 0.0,
            adaptive_threshold: 0.05,
            noise_floor: 0.005,
            is_gated: true,
            updated_at: now_ms(),
        }
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioOutput {
    pub id: String,
    pub name: String,
    pub is_default: bool,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioAnalyzerConfig {
    pub sensitivity: f32,
    pub noise_gate: f32,
    pub band_count: usize,
    pub min_frequency: f32,
    pub max_frequency: f32,
    pub attack_ms: f32,
    pub release_ms: f32,
    #[serde(default = "default_beat_min_interval_ms")]
    pub beat_min_interval_ms: u64,
    #[serde(default = "default_beat_sensitivity")]
    pub beat_sensitivity: f32,
    #[serde(default = "default_bass_max_hz")]
    pub bass_max_hz: f32,
}

fn default_beat_min_interval_ms() -> u64 {
    280
}

fn default_beat_sensitivity() -> f32 {
    1.0
}

fn default_bass_max_hz() -> f32 {
    105.0
}

impl Default for AudioAnalyzerConfig {
    fn default() -> Self {
        Self {
            sensitivity: 3.5,
            noise_gate: 0.012,
            band_count: 24,
            min_frequency: 35.0,
            max_frequency: 16_000.0,
            attack_ms: 25.0,
            release_ms: 220.0,
            beat_min_interval_ms: 280,
            beat_sensitivity: 1.0,
            bass_max_hz: 105.0,
        }
    }
}

impl AudioAnalyzerConfig {
    fn normalized(&self) -> Self {
        Self {
            sensitivity: self.sensitivity.clamp(0.25, 8.0),
            noise_gate: self.noise_gate.clamp(0.0, 0.12),
            band_count: self.band_count.clamp(8, 48),
            min_frequency: self.min_frequency.clamp(20.0, 1000.0),
            max_frequency: self.max_frequency.clamp(1000.0, 20_000.0),
            attack_ms: self.attack_ms.clamp(8.0, 300.0),
            release_ms: self.release_ms.clamp(40.0, 1500.0),
            beat_min_interval_ms: self.beat_min_interval_ms.clamp(60, 1500),
            beat_sensitivity: self.beat_sensitivity.clamp(0.2, 3.0),
            bass_max_hz: self.bass_max_hz.clamp(60.0, 250.0),
        }
    }
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}
fn smooth(current: f32, target: f32, elapsed: f32, attack_ms: f32, release_ms: f32) -> f32 {
    let duration = if target > current {
        attack_ms
    } else {
        release_ms
    }
    .max(1.0)
        / 1000.0;
    current + (target - current) * (1.0 - (-elapsed / duration).exp())
}
fn normalize_magnitude(value: f32, gate: f32) -> f32 {
    ((value - gate) / (0.42 - gate).max(0.02)).clamp(0.0, 1.0)
}

/// Fixed-size FFT analyzer. Keeps only normalized, smoothed band levels; raw samples never leave this module.
pub struct Analyzer {
    planner: FftPlanner<f32>,
    window: Vec<f32>,
    history: VecDeque<f32>,
    bands: Vec<f32>,
    rms: f32,
    energy_change: f32,
    previous_rms: f32,
    previous_bass: f32,
    previous_kick_mags: Vec<f32>,
    smooth_flux: f32,
    previous_flux: f32,
    noise_floor: f32,
    last_beat_ms: u64,
}

impl Default for Analyzer {
    fn default() -> Self {
        let size = 2048;
        Self {
            planner: FftPlanner::new(),
            window: (0..size)
                .map(|i| 0.5 - 0.5 * (std::f32::consts::TAU * i as f32 / (size - 1) as f32).cos())
                .collect(),
            history: VecDeque::with_capacity(size),
            bands: vec![0.0; AudioAnalyzerConfig::default().band_count],
            rms: 0.0,
            energy_change: 0.0,
            previous_rms: 0.0,
            previous_bass: 0.0,
            previous_kick_mags: Vec::new(),
            smooth_flux: 0.04,
            previous_flux: 0.0,
            noise_floor: 0.005,
            last_beat_ms: 0,
        }
    }
}

impl Analyzer {
    pub fn analyze(
        &mut self,
        samples: &[f32],
        sample_rate: f32,
        device_id: Option<String>,
        device_name: Option<String>,
        config: &AudioAnalyzerConfig,
    ) -> AudioAnalysis {
        if samples.is_empty() || sample_rate <= 0.0 {
            let mut state = AudioAnalysis::new("silent", device_id, None);
            state.device_name = device_name;
            return state;
        }
        let config = config.normalized();
        if self.bands.len() != config.band_count {
            self.bands.resize(config.band_count, 0.0);
        }
        for sample in samples {
            self.history.push_back(sample.clamp(-1.0, 1.0));
        }
        while self.history.len() > self.window.len() {
            self.history.pop_front();
        }

        let mut input = vec![Complex::new(0.0, 0.0); self.window.len()];
        let history_start = input.len() - self.history.len();
        let mut sample_peak = 0.0f32;
        let mut sample_rms = 0.0f32;
        for (index, sample) in self.history.iter().enumerate() {
            input[history_start + index].re = *sample * self.window[history_start + index];
        }
        for &sample in samples {
            let abs = sample.abs();
            if abs > sample_peak {
                sample_peak = abs;
            }
            sample_rms += sample * sample;
        }
        sample_rms = (sample_rms / samples.len().max(1) as f32).sqrt();
        let elapsed = (samples.len() as f32 / sample_rate).clamp(0.001, 0.1);

        let peak_dbfs = if sample_peak > 0.00001 {
            (20.0 * sample_peak.log10()).clamp(-96.0, 0.0)
        } else {
            -96.0
        };
        let rms_dbfs = if sample_rms > 0.00001 {
            (20.0 * sample_rms.log10()).clamp(-96.0, 0.0)
        } else {
            -96.0
        };

        // Continuous noise floor tracking (minimum statistics tracker)
        if sample_rms < self.noise_floor {
            self.noise_floor += (sample_rms - self.noise_floor) * 0.10;
        } else {
            self.noise_floor += (sample_rms - self.noise_floor) * 0.002;
        }
        self.noise_floor = self.noise_floor.clamp(0.0001, 0.08);

        let is_gated = sample_rms <= config.noise_gate && self.rms <= config.noise_gate * 1.05;

        let sensitivity = config.sensitivity / 3.5;
        let rms_target = if is_gated {
            0.0
        } else {
            normalize_magnitude(sample_rms * sensitivity, config.noise_gate)
        };
        self.rms = smooth(
            self.rms,
            rms_target,
            elapsed,
            config.attack_ms,
            config.release_ms,
        );

        self.planner
            .plan_fft_forward(input.len())
            .process(&mut input);
        let min_hz = config.min_frequency.min(config.max_frequency - 1.0);
        let max_hz = config
            .max_frequency
            .max(min_hz + 1.0)
            .min(sample_rate * 0.5);
        let log_span = (max_hz / min_hz).ln().max(0.001);
        let mut magnitudes = vec![0.0f32; config.band_count];
        let mut current_kick_mags = Vec::new();

        for (bin, value) in input.iter().take(input.len() / 2).enumerate().skip(1) {
            let hz = bin as f32 * sample_rate / input.len() as f32;
            if hz < min_hz || hz > max_hz {
                continue;
            }
            let norm_mag = value.norm() / input.len() as f32 * 6.8 * sensitivity;
            // Kick drum analysis range: 35 Hz up to configurable bass_max_hz (default 130 Hz)
            if hz >= 32.0 && hz <= config.bass_max_hz {
                current_kick_mags.push(norm_mag);
            }
            let position = ((hz / min_hz).ln() / log_span).clamp(0.0, 0.999_999);
            let band = (position * config.band_count as f32) as usize;
            magnitudes[band] = magnitudes[band].max(norm_mag);
        }

        for (level, magnitude) in self.bands.iter_mut().zip(magnitudes) {
            let target = if is_gated {
                0.0
            } else {
                normalize_magnitude(magnitude, config.noise_gate)
            };
            *level = smooth(*level, target, elapsed, config.attack_ms, config.release_ms);
        }

        // Frequency-accurate band segmentation:
        // Bass: <= 200 Hz
        // Mids: 200 Hz - 3500 Hz
        // Treble: > 3500 Hz
        let mut bass_sum = 0.0f32;
        let mut bass_count = 0usize;
        let mut mids_sum = 0.0f32;
        let mut mids_count = 0usize;
        let mut highs_sum = 0.0f32;
        let mut highs_count = 0usize;

        for (i, &band_val) in self.bands.iter().enumerate() {
            let center_pos = (i as f32 + 0.5) / config.band_count as f32;
            let center_hz = min_hz * (center_pos * log_span).exp();
            if center_hz <= 200.0 {
                bass_sum += band_val;
                bass_count += 1;
            } else if center_hz <= 3500.0 {
                mids_sum += band_val;
                mids_count += 1;
            } else {
                highs_sum += band_val;
                highs_count += 1;
            }
        }

        let current_bass = if bass_count > 0 { bass_sum / bass_count as f32 } else { self.rms };
        let current_mids = if mids_count > 0 { mids_sum / mids_count as f32 } else { self.rms };
        let current_highs = if highs_count > 0 { highs_sum / highs_count as f32 } else { self.rms };

        // Bass Spectral Flux: sum of positive half-wave differences across low kick bins
        let mut bass_flux = 0.0f32;
        if !self.previous_kick_mags.is_empty() && self.previous_kick_mags.len() == current_kick_mags.len() {
            for (&curr, &prev) in current_kick_mags.iter().zip(&self.previous_kick_mags) {
                if curr > prev {
                    bass_flux += curr - prev;
                }
            }
            bass_flux /= current_kick_mags.len().max(1) as f32;
        }

        // Stable rolling baseline tracking with asymmetric adaptation:
        // Slow rise (0.015) prevents a single loud kick from driving the threshold so high that consecutive beats get rejected.
        let alpha = if bass_flux > self.smooth_flux { 0.015 } else { 0.04 };
        self.smooth_flux += (bass_flux - self.smooth_flux) * alpha;
        self.smooth_flux = self.smooth_flux.clamp(0.002, 0.40);

        let beat_sens = config.beat_sensitivity.max(0.2);
        // Adaptive threshold combines baseline with dynamics and sensitivity
        let threshold_margin = (0.016 / beat_sens).clamp(0.006, 0.045);
        let adaptive_threshold = (self.smooth_flux * 1.15 + threshold_margin).clamp(0.012, 0.35);

        let refractory_ms = config.beat_min_interval_ms.clamp(60, 1500);
        let time_since_last_beat = now_ms().saturating_sub(self.last_beat_ms);
        let not_refractory = time_since_last_beat >= refractory_ms;

        // Local peak confirmation:
        // Current flux must exceed adaptive threshold AND be at or near peak relative to previous frame
        let is_onset_peak = bass_flux > adaptive_threshold
            && (bass_flux >= self.previous_flux * 0.95)
            && (bass_flux - self.smooth_flux >= threshold_margin * 0.60);

        // Vocal & speech rejection guard:
        // Human singing and speech live in 200-3500 Hz (mids). True beats impact low kick frequencies (32-105 Hz).
        // Only reject if mids are loud while bass is virtually silent (pure vocal / speech without a beat).
        let is_pure_vocal_passage = current_bass < 0.12 && current_mids > 0.28;

        let beat = !is_gated && not_refractory && is_onset_peak && !is_pure_vocal_passage;

        if beat {
            self.last_beat_ms = now_ms();
        }
        self.previous_flux = bass_flux;
        self.previous_kick_mags = current_kick_mags;

        let flux_target = if is_gated {
            0.0
        } else {
            normalize_magnitude(bass_flux * 4.5, config.noise_gate)
        };
        self.energy_change = smooth(
            self.energy_change,
            flux_target,
            elapsed,
            config.attack_ms * 0.4,
            config.release_ms * 0.4,
        );

        let prominence = (bass_flux - self.smooth_flux).max(0.0);
        let beat_strength = if beat {
            let ratio = (bass_flux / adaptive_threshold.max(0.001)).clamp(1.0, 3.5);
            let raw_score = (prominence * 4.5 * beat_sens) + ((ratio - 1.0) * 0.3) + (current_bass * 0.25);
            raw_score.clamp(0.40, 1.0)
        } else {
            0.0
        };

        self.previous_bass = current_bass;
        self.previous_rms = sample_rms;

        let status = if sample_rms < 0.0001 && self.rms < 0.001 {
            "silent".to_string()
        } else {
            "capturing".to_string()
        };

        AudioAnalysis {
            status,
            device_id,
            device_name,
            message: None,
            rms: self.rms,
            rms_dbfs,
            peak_dbfs,
            energy_change: self.energy_change,
            bass: current_bass,
            mids: current_mids,
            highs: current_highs,
            bands: self.bands.clone(),
            beat,
            beat_strength,
            bass_flux,
            adaptive_threshold,
            noise_floor: self.noise_floor,
            is_gated,
            updated_at: now_ms(),
        }
    }
}

struct Worker {
    stop: Arc<std::sync::atomic::AtomicBool>,
    join: JoinHandle<()>,
}
pub struct AudioService {
    latest: Arc<RwLock<AudioAnalysis>>,
    worker: Mutex<Option<Worker>>,
    config: Arc<RwLock<AudioAnalyzerConfig>>,
}

impl Default for AudioService {
    fn default() -> Self {
        Self {
            latest: Arc::new(RwLock::new(AudioAnalysis::new("inactive", None, None))),
            worker: Mutex::new(None),
            config: Arc::new(RwLock::new(AudioAnalyzerConfig::default())),
        }
    }
}

impl AudioService {
    pub fn snapshot(&self) -> AudioAnalysis {
        self.latest.read().map(|x| x.clone()).unwrap_or_else(|_| {
            AudioAnalysis::new("error", None, Some("Audio status lock failed".into()))
        })
    }
    pub fn set_config(&self, config: AudioAnalyzerConfig) {
        if let Ok(mut current) = self.config.write() {
            *current = config.normalized();
        }
    }
    pub fn stop(&self) {
        if let Ok(mut guard) = self.worker.lock() {
            if let Some(worker) = guard.take() {
                worker
                    .stop
                    .store(true, std::sync::atomic::Ordering::Relaxed);
                let _ = worker.join.join();
            }
        }
        if let Ok(mut state) = self.latest.write() {
            *state = AudioAnalysis::new("inactive", None, None);
        }
    }

    #[cfg(windows)]
    pub fn start(
        &self,
        app: AppHandle,
        requested_id: Option<String>,
        config: AudioAnalyzerConfig,
    ) -> Result<AudioAnalysis, String> {
        use std::sync::atomic::{AtomicBool, Ordering};
        use std::sync::mpsc;
        self.stop();
        self.set_config(config);
        let config_ref = self.config.clone();
        let latest = self.latest.clone();
        let stop = Arc::new(AtomicBool::new(false));
        let thread_stop = stop.clone();
        let (ready_tx, ready_rx) = mpsc::sync_channel::<Result<AudioAnalysis, String>>(1);
        let join = thread::Builder::new()
            .name("VaRGB audio loopback".into())
            .spawn(move || {
                use wasapi::*;
                let run = || -> Result<(), String> {
                    initialize_mta()
                        .ok()
                        .map_err(|e| format!("WASAPI initialization failed: {e}"))?;
                    let enumerator = DeviceEnumerator::new().map_err(|e| e.to_string())?;
                    let device = match requested_id.as_deref() {
                        Some(id) => enumerator
                            .get_device(id)
                            .map_err(|e| format!("Audio output is unavailable: {e}"))?,
                        None => enumerator
                            .get_default_device(&Direction::Render)
                            .map_err(|e| format!("No default audio output: {e}"))?,
                    };
                    let device_id = device.get_id().map_err(|e| e.to_string())?;
                    let device_name = device.get_friendlyname().ok();
                    let mut client = device.get_iaudioclient().map_err(|e| e.to_string())?;
                    let format = client.get_mixformat().unwrap_or_else(|_| {
                        WaveFormat::new(32, 32, &SampleType::Float, 48_000, 2, None)
                    });
                    let mode = StreamMode::PollingShared {
                        autoconvert: true,
                        buffer_duration_hns: 200_000,
                    };
                    client
                        .initialize_client(&format, &Direction::Capture, &mode)
                        .map_err(|e| format!("Could not start Windows audio loopback: {e}"))?;
                    let capture = client.get_audiocaptureclient().map_err(|e| e.to_string())?;
                    let buffer_frames =
                        client.get_buffer_size().map_err(|e| e.to_string())? as usize;
                    let block_align = format.get_blockalign() as usize;
                    let mut bytes = vec![0u8; buffer_frames * block_align];
                    let sample_rate = format.get_samplespersec() as f32;
                    let channels = format.get_nchannels() as usize;
                    let bits_per_sample = format.get_bitspersample();
                    let is_float = matches!(format.get_subformat(), Ok(SampleType::Float));

                    client.start_stream().map_err(|e| e.to_string())?;
                    let mut initial = AudioAnalysis::new("capturing", Some(device_id.clone()), None);
                    initial.device_name = device_name.clone();
                    let _ = ready_tx.send(Ok(initial.clone()));
                    if let Ok(mut state) = latest.write() {
                        *state = initial;
                    }
                    let mut analyzer = Analyzer::default();
                    let mut last_event = now_ms();
                    while !thread_stop.load(Ordering::Relaxed) {
                        let (read, info) = capture
                            .read_from_device(&mut bytes)
                            .map_err(|e| format!("Audio loopback stopped: {e}"))?;
                        let mono: Vec<f32> = if read > 0 && !info.flags.silent {
                            let frame_bytes = &bytes[..read as usize * block_align];
                            let samples_per_frame = channels.max(1);
                            let mut frame_samples = Vec::with_capacity(read as usize);
                            if is_float && bits_per_sample == 32 {
                                for chunk in frame_bytes.chunks_exact(4 * samples_per_frame) {
                                    let mut sum = 0.0f32;
                                    for ch in 0..samples_per_frame {
                                        let offset = ch * 4;
                                        sum += f32::from_le_bytes([chunk[offset], chunk[offset+1], chunk[offset+2], chunk[offset+3]]);
                                    }
                                    frame_samples.push(sum / samples_per_frame as f32);
                                }
                            } else if !is_float && bits_per_sample == 16 {
                                for chunk in frame_bytes.chunks_exact(2 * samples_per_frame) {
                                    let mut sum = 0.0f32;
                                    for ch in 0..samples_per_frame {
                                        let offset = ch * 2;
                                        let val = i16::from_le_bytes([chunk[offset], chunk[offset+1]]) as f32 / 32768.0;
                                        sum += val;
                                    }
                                    frame_samples.push(sum / samples_per_frame as f32);
                                }
                            } else if !is_float && bits_per_sample == 24 {
                                for chunk in frame_bytes.chunks_exact(3 * samples_per_frame) {
                                    let mut sum = 0.0f32;
                                    for ch in 0..samples_per_frame {
                                        let offset = ch * 3;
                                        let raw = (chunk[offset] as i32) | ((chunk[offset+1] as i32) << 8) | ((chunk[offset+2] as i8 as i32) << 16);
                                        sum += raw as f32 / 8388608.0;
                                    }
                                    frame_samples.push(sum / samples_per_frame as f32);
                                }
                            } else {
                                for chunk in frame_bytes.chunks_exact(4 * samples_per_frame) {
                                    let mut sum = 0.0f32;
                                    for ch in 0..samples_per_frame {
                                        let offset = ch * 4;
                                        let val = i32::from_le_bytes([chunk[offset], chunk[offset+1], chunk[offset+2], chunk[offset+3]]) as f32 / 2147483648.0;
                                        sum += val;
                                    }
                                    frame_samples.push(sum / samples_per_frame as f32);
                                }
                            }
                            frame_samples
                        } else {
                            thread::sleep(Duration::from_millis(8));
                            vec![0.0; 256]
                        };
                        let config = config_ref.read().map(|c| c.clone()).unwrap_or_default();
                        let analysis = analyzer.analyze(&mono, sample_rate, Some(device_id.clone()), device_name.clone(), &config);
                        let is_beat = analysis.beat;
                        if let Ok(mut state) = latest.write() {
                            *state = analysis.clone();
                        }
                        if is_beat || now_ms().saturating_sub(last_event) >= 33 {
                            if let Ok(state) = latest.read() {
                                let _ = app.emit("music-pulse-analysis", state.clone());
                            }
                            last_event = now_ms();
                        }
                    }
                    let _ = client.stop_stream();
                    Ok(())
                };
                if let Err(error) = run() {
                    let failed =
                        AudioAnalysis::new("error", requested_id.clone(), Some(error.clone()));
                    if let Ok(mut state) = latest.write() {
                        *state = failed.clone();
                    }
                    let _ = app.emit("music-pulse-analysis", failed);
                    let _ = ready_tx.send(Err(error));
                }
            })
            .map_err(|e| e.to_string())?;
        *self
            .worker
            .lock()
            .map_err(|_| "Audio service lock failed")? = Some(Worker { stop, join });
        match ready_rx.recv_timeout(Duration::from_secs(3)) {
            Ok(Ok(state)) => Ok(state),
            Ok(Err(error)) => Err(error),
            Err(_) => {
                self.stop();
                Err("Timed out while starting Windows system audio capture".into())
            }
        }
    }

    #[cfg(not(windows))]
    pub fn start(
        &self,
        _app: AppHandle,
        _requested_id: Option<String>,
        _config: AudioAnalyzerConfig,
    ) -> Result<AudioAnalysis, String> {
        Err("System audio loopback is available only on Windows".into())
    }
}

#[cfg(windows)]
pub fn list_outputs() -> Result<Vec<AudioOutput>, String> {
    use wasapi::*;
    initialize_mta().ok().map_err(|e| e.to_string())?;
    let enumerator = DeviceEnumerator::new().map_err(|e| e.to_string())?;
    let default_id = enumerator
        .get_default_device(&Direction::Render)
        .ok()
        .and_then(|d| d.get_id().ok());
    let mut result = Vec::new();
    for item in &enumerator
        .get_device_collection(&Direction::Render)
        .map_err(|e| e.to_string())?
    {
        let device = item.map_err(|e| e.to_string())?;
        if device
            .get_state()
            .map(|s| s != DeviceState::Active)
            .unwrap_or(true)
        {
            continue;
        }
        let id = device.get_id().map_err(|e| e.to_string())?;
        result.push(AudioOutput {
            name: device.get_friendlyname().map_err(|e| e.to_string())?,
            is_default: default_id.as_deref() == Some(&id),
            id,
        });
    }
    Ok(result)
}

#[cfg(not(windows))]
pub fn list_outputs() -> Result<Vec<AudioOutput>, String> {
    Ok(Vec::new())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn tone(hz: f32, amplitude: f32) -> Vec<f32> {
        (0..4096)
            .map(|i| (std::f32::consts::TAU * hz * i as f32 / 48_000.0).sin() * amplitude)
            .collect()
    }
    fn analyze_tone(hz: f32, cfg: &AudioAnalyzerConfig) -> AudioAnalysis {
        Analyzer::default().analyze(&tone(hz, 0.6), 48_000.0, None, None, cfg)
    }

    #[test]
    fn silence_and_background_noise_are_gated() {
        let cfg = AudioAnalyzerConfig::default();
        let mut a = Analyzer::default();
        assert_eq!(
            a.analyze(&vec![0.0; 4096], 48_000.0, None, None, &cfg)
                .bands
                .iter()
                .sum::<f32>(),
            0.0
        );
        let noise: Vec<f32> = (0..4096)
            .map(|i| ((i * 7919 % 997) as f32 / 498.0 - 1.0) * 0.0005)
            .collect();
        assert_eq!(a.analyze(&noise, 48_000.0, None, None, &cfg).rms, 0.0);
    }
    #[test]
    fn logarithmic_bands_distinguish_bass_mids_and_treble() {
        let cfg = AudioAnalyzerConfig::default();
        let bass = analyze_tone(100.0, &cfg);
        let mids = analyze_tone(1000.0, &cfg);
        let treble = analyze_tone(6000.0, &cfg);
        let peak = |a: &AudioAnalysis| {
            a.bands
                .iter()
                .position(|x| *x == a.bands.iter().copied().fold(0.0, f32::max))
                .unwrap()
        };
        assert!(peak(&bass) < peak(&mids));
        assert!(peak(&mids) < peak(&treble));
        assert_eq!(bass.bands.len(), cfg.band_count);
    }
    #[test]
    fn louder_audio_increases_level_and_sensitivity_changes_normalization() {
        let quiet = tone(440.0, 0.08);
        let loud = tone(440.0, 0.8);
        let cfg = AudioAnalyzerConfig::default();
        let mut a = Analyzer::default();
        let low = a.analyze(&quiet, 48_000.0, None, None, &cfg);
        let high = a.analyze(&loud, 48_000.0, None, None, &cfg);
        assert!(high.rms > low.rms);
        let sensitive = AudioAnalyzerConfig {
            sensitivity: 7.0,
            ..cfg
        };
        assert!(
            Analyzer::default()
                .analyze(&quiet, 48_000.0, None, None, &sensitive)
                .rms
                > low.rms
        );
    }
    #[test]
    fn onset_and_release_are_smoothed() {
        let cfg = AudioAnalyzerConfig::default();
        let mut a = Analyzer::default();
        a.analyze(&tone(100.0, 0.01), 48_000.0, None, None, &cfg);
        let hit = a.analyze(&tone(100.0, 0.8), 48_000.0, None, None, &cfg);
        assert!(hit.beat);
        let mut quiet = hit;
        for _ in 0..120 {
            quiet = a.analyze(&vec![0.0; 512], 48_000.0, None, None, &cfg);
        }
        assert!(quiet.rms < 0.03);
        assert!(quiet.bands.iter().all(|v| *v < 0.03));
    }
    #[test]
    fn band_count_and_frequency_range_apply() {
        let cfg = AudioAnalyzerConfig {
            band_count: 32,
            min_frequency: 400.0,
            max_frequency: 1200.0,
            ..AudioAnalyzerConfig::default()
        };
        let result = analyze_tone(1000.0, &cfg);
        assert_eq!(result.bands.len(), 32);
        assert!(result.bands.iter().any(|value| *value > 0.0));
    }
}
