import { EffectType, AnyEffectParams, PixelArtParams } from '../types/effects';
import { RGBColor } from '../types/keyboard';
import { NavTab } from '../components/Sidebar';
import { DEFAULT_AURORA_PARAMS } from '../engine/effects/aurora';
import { DEFAULT_PIXEL_ART_PARAMS } from '../engine/effects/pixelArt';

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
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}
