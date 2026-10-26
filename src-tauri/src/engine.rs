use crate::k630::{DeviceManager, RGB_PAYLOAD_LEN};
use serde_json::Value;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

#[derive(Clone, Copy, Debug)]
pub struct KeyCoord {
    pub id: &'static str,
    pub norm_x: f32,
    pub norm_y: f32,
    pub led_index: u8,
}

// Precomputed normalized coordinates (normX = centerX / 15.0, normY = centerY / 5.0)
pub const K630_KEY_COORDS: [KeyCoord; 61] = [
    KeyCoord { id: "esc", norm_x: 0.0333, norm_y: 0.1, led_index: 1 },
    KeyCoord { id: "num_1", norm_x: 0.1000, norm_y: 0.1, led_index: 9 },
    KeyCoord { id: "num_2", norm_x: 0.1667, norm_y: 0.1, led_index: 17 },
    KeyCoord { id: "num_3", norm_x: 0.2333, norm_y: 0.1, led_index: 25 },
    KeyCoord { id: "num_4", norm_x: 0.3000, norm_y: 0.1, led_index: 33 },
    KeyCoord { id: "num_5", norm_x: 0.3667, norm_y: 0.1, led_index: 41 },
    KeyCoord { id: "num_6", norm_x: 0.4333, norm_y: 0.1, led_index: 49 },
    KeyCoord { id: "num_7", norm_x: 0.5000, norm_y: 0.1, led_index: 57 },
    KeyCoord { id: "num_8", norm_x: 0.5667, norm_y: 0.1, led_index: 65 },
    KeyCoord { id: "num_9", norm_x: 0.6333, norm_y: 0.1, led_index: 73 },
    KeyCoord { id: "num_0", norm_x: 0.7000, norm_y: 0.1, led_index: 81 },
    KeyCoord { id: "minus", norm_x: 0.7667, norm_y: 0.1, led_index: 89 },
    KeyCoord { id: "equal", norm_x: 0.8333, norm_y: 0.1, led_index: 97 },
    KeyCoord { id: "backspace", norm_x: 0.9333, norm_y: 0.1, led_index: 105 },
    KeyCoord { id: "tab", norm_x: 0.0500, norm_y: 0.3, led_index: 2 },
    KeyCoord { id: "q", norm_x: 0.1333, norm_y: 0.3, led_index: 10 },
    KeyCoord { id: "w", norm_x: 0.2000, norm_y: 0.3, led_index: 18 },
    KeyCoord { id: "e", norm_x: 0.2667, norm_y: 0.3, led_index: 26 },
    KeyCoord { id: "r", norm_x: 0.3333, norm_y: 0.3, led_index: 34 },
    KeyCoord { id: "t", norm_x: 0.4000, norm_y: 0.3, led_index: 42 },
    KeyCoord { id: "y", norm_x: 0.4667, norm_y: 0.3, led_index: 50 },
    KeyCoord { id: "u", norm_x: 0.5333, norm_y: 0.3, led_index: 58 },
    KeyCoord { id: "i", norm_x: 0.6000, norm_y: 0.3, led_index: 66 },
    KeyCoord { id: "o", norm_x: 0.6667, norm_y: 0.3, led_index: 74 },
    KeyCoord { id: "p", norm_x: 0.7333, norm_y: 0.3, led_index: 82 },
    KeyCoord { id: "bracket_l", norm_x: 0.8000, norm_y: 0.3, led_index: 90 },
    KeyCoord { id: "bracket_r", norm_x: 0.8667, norm_y: 0.3, led_index: 98 },
    KeyCoord { id: "backslash", norm_x: 0.9500, norm_y: 0.3, led_index: 106 },
    KeyCoord { id: "caps", norm_x: 0.0583, norm_y: 0.5, led_index: 3 },
    KeyCoord { id: "a", norm_x: 0.1500, norm_y: 0.5, led_index: 11 },
    KeyCoord { id: "s", norm_x: 0.2167, norm_y: 0.5, led_index: 19 },
    KeyCoord { id: "d", norm_x: 0.2833, norm_y: 0.5, led_index: 27 },
    KeyCoord { id: "f", norm_x: 0.3500, norm_y: 0.5, led_index: 35 },
    KeyCoord { id: "g", norm_x: 0.4167, norm_y: 0.5, led_index: 43 },
    KeyCoord { id: "h", norm_x: 0.4833, norm_y: 0.5, led_index: 51 },
    KeyCoord { id: "j", norm_x: 0.5500, norm_y: 0.5, led_index: 59 },
    KeyCoord { id: "k", norm_x: 0.6167, norm_y: 0.5, led_index: 67 },
    KeyCoord { id: "l", norm_x: 0.6833, norm_y: 0.5, led_index: 75 },
    KeyCoord { id: "semicolon", norm_x: 0.7500, norm_y: 0.5, led_index: 83 },
    KeyCoord { id: "quote", norm_x: 0.8167, norm_y: 0.5, led_index: 91 },
    KeyCoord { id: "enter", norm_x: 0.9250, norm_y: 0.5, led_index: 107 },
    KeyCoord { id: "shift_l", norm_x: 0.0750, norm_y: 0.7, led_index: 4 },
    KeyCoord { id: "z", norm_x: 0.1833, norm_y: 0.7, led_index: 20 },
    KeyCoord { id: "x", norm_x: 0.2500, norm_y: 0.7, led_index: 28 },
    KeyCoord { id: "c", norm_x: 0.3167, norm_y: 0.7, led_index: 36 },
    KeyCoord { id: "v", norm_x: 0.3833, norm_y: 0.7, led_index: 44 },
    KeyCoord { id: "b", norm_x: 0.4500, norm_y: 0.7, led_index: 52 },
    KeyCoord { id: "n", norm_x: 0.5167, norm_y: 0.7, led_index: 60 },
    KeyCoord { id: "m", norm_x: 0.5833, norm_y: 0.7, led_index: 68 },
    KeyCoord { id: "comma", norm_x: 0.6500, norm_y: 0.7, led_index: 76 },
    KeyCoord { id: "period", norm_x: 0.7167, norm_y: 0.7, led_index: 84 },
    KeyCoord { id: "slash", norm_x: 0.7833, norm_y: 0.7, led_index: 92 },
    KeyCoord { id: "shift_r", norm_x: 0.9083, norm_y: 0.7, led_index: 108 },
    KeyCoord { id: "ctrl_l", norm_x: 0.0417, norm_y: 0.9, led_index: 5 },
    KeyCoord { id: "win", norm_x: 0.1250, norm_y: 0.9, led_index: 13 },
    KeyCoord { id: "alt_l", norm_x: 0.2083, norm_y: 0.9, led_index: 21 },
    KeyCoord { id: "space", norm_x: 0.4583, norm_y: 0.9, led_index: 45 },
    KeyCoord { id: "alt_r", norm_x: 0.7083, norm_y: 0.9, led_index: 77 },
    KeyCoord { id: "fn", norm_x: 0.7917, norm_y: 0.9, led_index: 85 },
    KeyCoord { id: "menu", norm_x: 0.8750, norm_y: 0.9, led_index: 93 },
    KeyCoord { id: "ctrl_r", norm_x: 0.9583, norm_y: 0.9, led_index: 101 },
];

#[derive(Clone, Debug)]
pub struct LightingModeConfig {
    pub effect_type: String,
    pub speed: f32,
    pub brightness: f32,
    pub direction: f32,
    pub gradient_width: f32,
    pub palette: Vec<[u8; 3]>,
    pub active_color: [u8; 3],
    pub hardware_enabled: bool,
}

impl Default for LightingModeConfig {
    fn default() -> Self {
        Self {
            effect_type: "aurora".into(),
            speed: 1.0,
            brightness: 0.9,
            direction: 45.0,
            gradient_width: 1.2,
            palette: vec![
                [0, 229, 255],  // Cyan
                [0, 64, 255],   // Deep Blue
                [157, 0, 255],  // Purple
                [0, 150, 255],  // Light Blue
            ],
            active_color: [0, 229, 255],
            hardware_enabled: true,
        }
    }
}

pub struct NativeEngine {
    config: Mutex<LightingModeConfig>,
    is_ui_streaming: AtomicBool,
}

impl NativeEngine {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            config: Mutex::new(LightingModeConfig::default()),
            is_ui_streaming: AtomicBool::new(false),
        })
    }

    pub fn set_ui_streaming(&self, streaming: bool) {
        self.is_ui_streaming.store(streaming, Ordering::SeqCst);
    }

    pub fn is_ui_streaming(&self) -> bool {
        self.is_ui_streaming.load(Ordering::SeqCst)
    }

    pub fn update_from_json(&self, json_str: &str) {
        if let Ok(v) = serde_json::from_str::<Value>(json_str) {
            let mut cfg = self.config.lock().unwrap();

            if let Some(effect) = v.get("currentEffectType").and_then(|s| s.as_str()) {
                cfg.effect_type = effect.to_string();
            }

            if let Some(enabled) = v.get("hardwareEnabled").and_then(|b| b.as_bool()) {
                cfg.hardware_enabled = enabled;
            }

            if let Some(color) = v.get("activeColor") {
                let r = color.get("r").and_then(|n| n.as_u64()).unwrap_or(0) as u8;
                let g = color.get("g").and_then(|n| n.as_u64()).unwrap_or(0) as u8;
                let b = color.get("b").and_then(|n| n.as_u64()).unwrap_or(0) as u8;
                cfg.active_color = [r, g, b];
            }

            // Extract effect specific params if available
            if let Some(params_map) = v.get("effectParams") {
                if let Some(current_params) = params_map.get(&cfg.effect_type) {
                    if let Some(s) = current_params.get("speed").and_then(|n| n.as_f64()) {
                        cfg.speed = s as f32;
                    }
                    if let Some(b) = current_params.get("brightness").and_then(|n| n.as_f64()) {
                        cfg.brightness = b as f32;
                    }
                    if let Some(d) = current_params.get("direction").and_then(|n| n.as_f64()) {
                        cfg.direction = d as f32;
                    }
                    if let Some(gw) = current_params.get("gradientWidth").and_then(|n| n.as_f64()) {
                        cfg.gradient_width = gw as f32;
                    }
                    if let Some(pal_arr) = current_params.get("palette").and_then(|p| p.as_array()) {
                        let mut new_pal = Vec::new();
                        for item in pal_arr {
                            let r = item.get("r").and_then(|n| n.as_u64()).unwrap_or(0) as u8;
                            let g = item.get("g").and_then(|n| n.as_u64()).unwrap_or(0) as u8;
                            let b = item.get("b").and_then(|n| n.as_u64()).unwrap_or(0) as u8;
                            new_pal.push([r, g, b]);
                        }
                        if !new_pal.is_empty() {
                            cfg.palette = new_pal;
                        }
                    }
                }
            }

            eprintln!("[NativeEngine] Active mode synchronized: {} (speed: {}, brightness: {})", 
                cfg.effect_type, cfg.speed, cfg.brightness);
        }
    }

    pub fn compute_frame(&self, time_sec: f32) -> [u8; RGB_PAYLOAD_LEN] {
        let cfg = {
            let guard = self.config.lock().unwrap();
            guard.clone()
        };

        if !cfg.hardware_enabled {
            return [0u8; RGB_PAYLOAD_LEN];
        }

        let mut payload = [0u8; RGB_PAYLOAD_LEN];

        match cfg.effect_type.as_str() {
            "aurora" => {
                let rad = cfg.direction.to_radians();
                let cos_a = rad.cos();
                let sin_a = rad.sin();
                let grad_w = cfg.gradient_width.max(0.1);
                let phase = time_sec * cfg.speed * 0.3;

                for key in &K630_KEY_COORDS {
                    let proj = key.norm_x * cos_a + key.norm_y * sin_a;
                    let t = (proj / grad_w) - phase;
                    let color = interpolate_palette(&cfg.palette, t);
                    let final_color = apply_brightness(color, cfg.brightness);
                    let offset = usize::from(key.led_index) * 3;
                    payload[offset..offset + 3].copy_from_slice(&final_color);
                }
            }
            "color_cycle" => {
                let t = time_sec * cfg.speed * 0.2;
                for key in &K630_KEY_COORDS {
                    let key_t = t + key.norm_x * 0.5;
                    let color = interpolate_palette(&cfg.palette, key_t);
                    let final_color = apply_brightness(color, cfg.brightness);
                    let offset = usize::from(key.led_index) * 3;
                    payload[offset..offset + 3].copy_from_slice(&final_color);
                }
            }
            "pulse" => {
                let wave = ((time_sec * cfg.speed * 3.0).sin() * 0.5 + 0.5).powf(1.8);
                let current_brightness = cfg.brightness * wave;
                let color = if !cfg.palette.is_empty() { cfg.palette[0] } else { cfg.active_color };
                let final_color = apply_brightness(color, current_brightness);

                for key in &K630_KEY_COORDS {
                    let offset = usize::from(key.led_index) * 3;
                    payload[offset..offset + 3].copy_from_slice(&final_color);
                }
            }
            "continuous_wave" | "zigzag_wave" => {
                let phase = time_sec * cfg.speed * 1.5;
                for key in &K630_KEY_COORDS {
                    let wave = (key.norm_x * 4.0 - phase).sin() * 0.5 + 0.5;
                    let color = interpolate_palette(&cfg.palette, wave);
                    let final_color = apply_brightness(color, cfg.brightness);
                    let offset = usize::from(key.led_index) * 3;
                    payload[offset..offset + 3].copy_from_slice(&final_color);
                }
            }
            "starlight" => {
                for (i, key) in K630_KEY_COORDS.iter().enumerate() {
                    let seed = (i as f32) * 12.9898 + 4.1414;
                    let star_time = time_sec * cfg.speed + seed.sin() * 10.0;
                    let twinkle = ((star_time.sin()).max(0.0)).powi(4);
                    let color = if !cfg.palette.is_empty() {
                        cfg.palette[i % cfg.palette.len()]
                    } else {
                        cfg.active_color
                    };
                    let final_color = apply_brightness(color, cfg.brightness * twinkle);
                    let offset = usize::from(key.led_index) * 3;
                    payload[offset..offset + 3].copy_from_slice(&final_color);
                }
            }
            "ember" => {
                for (i, key) in K630_KEY_COORDS.iter().enumerate() {
                    let flicker = ((time_sec * 5.0 * cfg.speed + (i as f32) * 1.7).sin() * 0.5 + 0.5) * 0.6 + 0.4;
                    let base_c = [255, 60, 0]; // Warm fire amber
                    let final_color = apply_brightness(base_c, cfg.brightness * flicker);
                    let offset = usize::from(key.led_index) * 3;
                    payload[offset..offset + 3].copy_from_slice(&final_color);
                }
            }
            "pixel_art" => {
                let final_color = apply_brightness(cfg.active_color, cfg.brightness);
                for key in &K630_KEY_COORDS {
                    let offset = usize::from(key.led_index) * 3;
                    payload[offset..offset + 3].copy_from_slice(&final_color);
                }
            }
            _ => {
                // Universal graceful fallback for any other mode: ambient directional sweep
                let phase = time_sec * cfg.speed * 0.5;
                for key in &K630_KEY_COORDS {
                    let t = key.norm_x + key.norm_y * 0.3 - phase;
                    let color = interpolate_palette(&cfg.palette, t);
                    let final_color = apply_brightness(color, cfg.brightness);
                    let offset = usize::from(key.led_index) * 3;
                    payload[offset..offset + 3].copy_from_slice(&final_color);
                }
            }
        }

        payload
    }
}

fn lerp_color(c1: [u8; 3], c2: [u8; 3], t: f32) -> [u8; 3] {
    let factor = t.clamp(0.0, 1.0);
    [
        (c1[0] as f32 + (c2[0] as f32 - c1[0] as f32) * factor).round() as u8,
        (c1[1] as f32 + (c2[1] as f32 - c1[1] as f32) * factor).round() as u8,
        (c1[2] as f32 + (c2[2] as f32 - c1[2] as f32) * factor).round() as u8,
    ]
}

fn interpolate_palette(palette: &[[u8; 3]], t: f32) -> [u8; 3] {
    if palette.is_empty() {
        return [0, 0, 0];
    }
    if palette.len() == 1 {
        return palette[0];
    }

    let mut norm = t % 1.0;
    if norm < 0.0 {
        norm += 1.0;
    }

    let count = palette.len();
    let scaled = norm * count as f32;
    let idx = scaled.floor() as usize;
    let next_idx = (idx + 1) % count;
    let frac = scaled - idx as f32;

    lerp_color(palette[idx], palette[next_idx], frac)
}

fn apply_brightness(color: [u8; 3], brightness: f32) -> [u8; 3] {
    let factor = brightness.clamp(0.0, 1.0);
    let mut r = ((color[0] as f32) * factor).round() as u8;
    let mut g = ((color[1] as f32) * factor).round() as u8;
    let mut b = ((color[2] as f32) * factor).round() as u8;

    // Strict black cut-off threshold (< 4) to eliminate LED driver leakage
    if r < 5 && g < 5 && b < 5 {
        r = 0;
        g = 0;
        b = 0;
    }

    [r, g, b]
}

// Background thread runner that streams to the K630 whenever UI is closed/minimized
pub fn start_native_engine_loop(
    engine: Arc<NativeEngine>,
    device_manager: Arc<DeviceManager>,
    active_device: Arc<Mutex<Option<crate::ActiveDevice>>>,
) {
    thread::Builder::new()
        .name("vargb-native-lighting-loop".into())
        .spawn(move || {
            let start_time = Instant::now();
            let interval = Duration::from_millis(33); // ~30 FPS

            eprintln!("[NativeEngine] Background lighting loop started.");

            loop {
                let loop_start = Instant::now();

                // ONLY stream from Rust background if UI is NOT currently streaming
                if !engine.is_ui_streaming() {
                    let elapsed = start_time.elapsed().as_secs_f32();
                    let payload = engine.compute_frame(elapsed);

                    // Send to device
                    if let Ok(mut guard) = active_device.lock() {
                        if guard.is_none() {
                            if let Ok(device) = device_manager.open_k630() {
                                let _ = device_manager.init_software_mode(&device);
                                *guard = Some(crate::ActiveDevice {
                                    device,
                                    initialized: true,
                                });
                            }
                        }

                        if let Some(session) = guard.as_mut() {
                            let _ = device_manager.send_rgb_frame(&session.device, &payload);
                        }
                    }
                }

                let elapsed_in_tick = loop_start.elapsed();
                if elapsed_in_tick < interval {
                    thread::sleep(interval - elapsed_in_tick);
                }
            }
        })
        .expect("Failed to spawn native lighting engine thread");
}
