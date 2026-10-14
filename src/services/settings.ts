import { EffectType, AnyEffectParams, PixelArtParams } from '../types/effects';
import { RGBColor } from '../types/keyboard';
import { NavTab } from '../components/Sidebar';
import { DEFAULT_AURORA_PARAMS } from '../engine/effects/aurora';
import { DEFAULT_PIXEL_ART_PARAMS } from '../engine/effects/pixelArt';
import { invoke } from '@tauri-apps/api/core';

const SETTINGS_KEY = 'vargb_app_settings_v1';

export interface AppSettings {
  activeTab: NavTab;
  currentEffectType: EffectType;
  effectParams: Partial<Record<EffectType, AnyEffectParams>>;
  pixelArtParams: PixelArtParams;
  activePresetId?: string;
  activePresetByEffect?: Partial<Record<EffectType, string>>;
  fpsLimit: number;
  hardwareEnabled: boolean;
  activeColor: RGBColor;
}

export const DEFAULT_ACTIVE_PRESETS: Record<EffectType, string> = {
  aurora: 'factory-aurora',
  ripple: 'factory-ripple',
  matrix: 'factory-matrix',
  glitch: 'factory-glitch',
  pixel_art: 'factory-invader',
  pulse: 'factory-pulse',
  color_cycle: 'factory-prism',
  starlight: 'factory-starlight',
  music_pulse: 'factory-music-pulse',
  zigzag_wave: 'factory-zigzag-neon',
  continuous_wave: 'factory-continuous-wave-ocean',
  flowing_curve: 'factory-flowing-curve-neon',
  reactive_ripple: 'factory-reactive-ripple',
  key_flash: 'factory-key-flash',
  snake_trail: 'factory-snake-trail',
  shockwave: 'factory-shockwave',
  ember: 'factory-ember',
  neighbor_glow: 'factory-neighbor-glow',
  typing_intensity: 'factory-typing-intensity',
  electric_discharge: 'factory-electric-discharge',
  thermal_heatmap: 'factory-thermal-heatmap',
  gravity_drop: 'factory-gravity-drop',
  laser_crosshair: 'factory-laser-crosshair',
  pong_bounce: 'factory-pong-bounce',
  radar_sweep: 'factory-radar-sweep',
  vortex_pinwheel: 'factory-vortex-pinwheel',
  lava_lamp: 'factory-lava-lamp',
  raindrops: 'factory-raindrops',
  screen_ambilight: 'factory-screen-ambilight',
  telemetry_bars: 'factory-telemetry-bars',
  spectrum_eq: 'factory-spectrum-eq',
  custom_zones: 'factory-custom-zones',
  afk_screensaver: 'factory-afk-screensaver',
  game_of_life: 'factory-game-of-life',
  pacman_arcade: 'factory-pacman-arcade',
  dvd_bounce: 'factory-dvd-bounce',
  wave_pond: 'factory-wave-pond',
  doom_fire: 'factory-doom-fire',
  plasma_shader: 'factory-plasma-shader',
  lightning_storm: 'factory-lightning-storm',
  event_horizon: 'factory-event-horizon',
  wpm_overdrive: 'factory-wpm-overdrive',
  fireworks: 'factory-fireworks',
  domino_topple: 'factory-domino-topple',
  crt_scanline: 'factory-crt-scanline',
  dna_helix: 'factory-dna-helix',
  pomodoro_bar: 'factory-pomodoro-bar',
  pathfinder_a_star: 'factory-pathfinder-a-star',
  sort_visualizer: 'factory-sort-visualizer',
  binary_counter: 'factory-binary-counter',
  boids_swarm: 'factory-boids-swarm',
  magnetic_field: 'factory-magnetic-field',
  solar_eclipse: 'factory-solar-eclipse',
  blizzard_drift: 'factory-blizzard-drift',
  ekg_heartbeat: 'factory-ekg-heartbeat',
  newtons_cradle: 'factory-newtons-cradle',
  frost_shatter: 'factory-frost-shatter',
  combo_multiplier: 'factory-combo-multiplier',
  spotlight_lantern: 'factory-spotlight-lantern',
  reaction_diffusion: 'factory-reaction-diffusion',
  kaleidoscope: 'factory-kaleidoscope',
  voronoi_cells: 'factory-voronoi-cells',
};

export const DEFAULT_SETTINGS: AppSettings = {
  activeTab: 'effects',
  currentEffectType: 'aurora',
  effectParams: {
    aurora: DEFAULT_AURORA_PARAMS,
  },
  pixelArtParams: DEFAULT_PIXEL_ART_PARAMS,
  activePresetId: 'factory-aurora',
  activePresetByEffect: DEFAULT_ACTIVE_PRESETS,
  fpsLimit: 30,
  hardwareEnabled: true,
  activeColor: { r: 255, g: 0, b: 0 },
};

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        activePresetByEffect: {
          ...DEFAULT_ACTIVE_PRESETS,
          ...(parsed.activePresetByEffect || {}),
        },
        effectParams: {
          ...DEFAULT_SETTINGS.effectParams,
          ...(parsed.effectParams || {}),
        },
      };
    }
  } catch (err) {
    console.warn('Failed to load saved settings:', err);
  }
  return DEFAULT_SETTINGS;
}

export async function loadSettingsAsync(): Promise<AppSettings> {
  try {
    const raw = await invoke<string | null>('load_persistent_settings');
    if (raw && raw.trim() !== '' && raw.trim() !== '{}') {
      const parsed = JSON.parse(raw);
      const resolved: AppSettings = {
        ...DEFAULT_SETTINGS,
        ...parsed,
        activePresetByEffect: {
          ...DEFAULT_ACTIVE_PRESETS,
          ...(parsed.activePresetByEffect || {}),
        },
        effectParams: {
          ...DEFAULT_SETTINGS.effectParams,
          ...(parsed.effectParams || {}),
        },
      };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(resolved));
      } catch {}
      return resolved;
    }
  } catch (err) {
    console.warn('Persistent settings not loaded from disk:', err);
  }

  // Fallback to local storage
  const local = loadSettings();
  // Migrate existing settings to disk
  try {
    await invoke('save_persistent_settings', { settingsJson: JSON.stringify(local) });
  } catch {}
  return local;
}

export function saveSettings(settings: Partial<AppSettings>): void {
  if (typeof window === 'undefined') return;
  try {
    const current = loadSettings();
    const updated = {
      ...current,
      ...settings,
      effectParams: {
        ...current.effectParams,
        ...(settings.effectParams || {}),
      },
    };
    const jsonStr = JSON.stringify(updated);
    try {
      localStorage.setItem(SETTINGS_KEY, jsonStr);
    } catch {}

    void invoke('save_persistent_settings', { settingsJson: jsonStr }).catch((err) => {
      console.warn('Failed to write settings to disk:', err);
    });
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

