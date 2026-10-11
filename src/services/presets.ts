import { SavedPreset } from '../types/effects';
import { DEFAULT_AURORA_PARAMS } from '../engine/effects/aurora';
import { DEFAULT_RIPPLE_PARAMS } from '../engine/effects/ripple';
import { DEFAULT_GLITCH_PARAMS } from '../engine/effects/glitch';
import { DEFAULT_MATRIX_PARAMS } from '../engine/effects/matrix';
import { DEFAULT_PIXEL_ART_PARAMS } from '../engine/effects/pixelArt';
import { DEFAULT_PULSE_PARAMS } from '../engine/effects/pulse';
import { DEFAULT_COLOR_CYCLE_PARAMS } from '../engine/effects/colorCycle';
import { DEFAULT_STARLIGHT_PARAMS } from '../engine/effects/starlight';
import { DEFAULT_MUSIC_PULSE_PARAMS } from '../engine/effects/musicPulse';
import { DEFAULT_ZIGZAG_WAVE_PARAMS } from '../engine/effects/zigzagWave';
import { DEFAULT_CONTINUOUS_WAVE_PARAMS } from '../engine/effects/continuousWave';
import { DEFAULT_SINE_WAVE_PARAMS } from '../engine/effects/sineWave';
import { DEFAULT_REACTIVE_RIPPLE_PARAMS } from '../engine/effects/reactiveRipple';
import { DEFAULT_KEY_FLASH_PARAMS } from '../engine/effects/keyFlash';
import { DEFAULT_SNAKE_TRAIL_PARAMS } from '../engine/effects/snakeTrail';
import { DEFAULT_SHOCKWAVE_PARAMS } from '../engine/effects/shockwave';
import { DEFAULT_EMBER_PARAMS } from '../engine/effects/ember';
import { DEFAULT_NEIGHBOR_GLOW_PARAMS } from '../engine/effects/neighborGlow';
import { DEFAULT_TYPING_INTENSITY_PARAMS } from '../engine/effects/typingIntensity';
import { DEFAULT_ELECTRIC_DISCHARGE_PARAMS } from '../engine/effects/electricDischarge';

const STORAGE_KEY = 'k630_studio_presets_v1';

export const FACTORY_PRESETS: SavedPreset[] = [
  {
    id: 'factory-aurora',
    name: 'Aurora Flow (Default)',
    effectType: 'aurora',
    version: 1,
    params: DEFAULT_AURORA_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-ripple',
    name: 'Keystroke Ripple (White Crest)',
    effectType: 'ripple',
    version: 1,
    params: DEFAULT_RIPPLE_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-matrix',
    name: 'Matrix Rain (Phosphor Stream)',
    effectType: 'matrix',
    version: 1,
    params: DEFAULT_MATRIX_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-glitch',
    name: 'Cyber Glitch (Neon Strobe)',
    effectType: 'glitch',
    version: 1,
    params: DEFAULT_GLITCH_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-invader',
    name: 'Space Invader (8-bit Anim)',
    effectType: 'pixel_art',
    version: 1,
    params: DEFAULT_PIXEL_ART_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-pulse',
    name: 'Crimson Pulse (Deep Breathing)',
    effectType: 'pulse',
    version: 1,
    params: DEFAULT_PULSE_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-prism',
    name: 'Prism Drift',
    effectType: 'color_cycle',
    version: 1,
    params: DEFAULT_COLOR_CYCLE_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-starlight',
    name: 'Starlight',
    effectType: 'starlight',
    version: 1,
    params: DEFAULT_STARLIGHT_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-music-pulse',
    name: 'Music Pulse (Radial Beat)',
    effectType: 'music_pulse',
    version: 1,
    params: DEFAULT_MUSIC_PULSE_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-zigzag-neon',
    name: 'Zigzag Wave (Neon Flow)',
    effectType: 'zigzag_wave',
    version: 1,
    params: DEFAULT_ZIGZAG_WAVE_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-zigzag-rainbow',
    name: 'Zigzag Wave (Rainbow Glide)',
    effectType: 'zigzag_wave',
    version: 1,
    params: {
      ...DEFAULT_ZIGZAG_WAVE_PARAMS,
      colorMode: 'rainbow',
      rainbowMode: true,
      waveWidth: 0.12,
      trailLength: 0.35,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-continuous-wave-ocean',
    name: 'Continuous Wave (Ocean Surge)',
    effectType: 'continuous_wave',
    version: 1,
    params: DEFAULT_CONTINUOUS_WAVE_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-continuous-wave-rainbow',
    name: 'Continuous Wave (Prism Rainbow)',
    effectType: 'continuous_wave',
    version: 1,
    params: {
      ...DEFAULT_CONTINUOUS_WAVE_PARAMS,
      useMulticolor: true,
      wavelength: 0.35,
      speed: 1.0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-flowing-curve-neon',
    name: 'Sine Wave (Rainbow Ribbon)',
    effectType: 'flowing_curve',
    version: 1,
    params: DEFAULT_SINE_WAVE_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-flowing-curve-stream',
    name: 'Sine Wave (Dual Cyan-Magenta)',
    effectType: 'flowing_curve',
    version: 1,
    params: {
      ...DEFAULT_SINE_WAVE_PARAMS,
      colorMode: 'dual',
      speed: 1.2,
      wavelength: 12.0,
      primaryColor: { r: 0, g: 255, b: 240 },
      secondaryColor: { r: 255, g: 0, b: 160 },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-flowing-curve-segments',
    name: 'Sine Wave (Electric Violet Single)',
    effectType: 'flowing_curve',
    version: 1,
    params: {
      ...DEFAULT_SINE_WAVE_PARAMS,
      colorMode: 'single',
      speed: 0.9,
      wavelength: 15.0,
      primaryColor: { r: 160, g: 20, b: 255 },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-reactive-ripple',
    name: 'Reactive Ripple (Aqua Wave)',
    effectType: 'reactive_ripple',
    version: 1,
    params: DEFAULT_REACTIVE_RIPPLE_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-key-flash',
    name: 'Key Flash (Clean White)',
    effectType: 'key_flash',
    version: 1,
    params: DEFAULT_KEY_FLASH_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-snake-trail',
    name: 'Snake Trail (Emerald Viper)',
    effectType: 'snake_trail',
    version: 1,
    params: DEFAULT_SNAKE_TRAIL_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-shockwave',
    name: 'Shockwave (Sonic Blast)',
    effectType: 'shockwave',
    version: 1,
    params: DEFAULT_SHOCKWAVE_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-ember',
    name: 'Ember (Molten Hearth)',
    effectType: 'ember',
    version: 1,
    params: DEFAULT_EMBER_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-neighbor-glow',
    name: 'Neighbor Glow (Violet Halo)',
    effectType: 'neighbor_glow',
    version: 1,
    params: DEFAULT_NEIGHBOR_GLOW_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-typing-intensity',
    name: 'Typing Intensity (Thermal Speed)',
    effectType: 'typing_intensity',
    version: 1,
    params: DEFAULT_TYPING_INTENSITY_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-electric-discharge',
    name: 'Electric Discharge (High Voltage)',
    effectType: 'electric_discharge',
    version: 1,
    params: DEFAULT_ELECTRIC_DISCHARGE_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function loadPresets(): SavedPreset[] {
  if (typeof window === 'undefined') return FACTORY_PRESETS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return FACTORY_PRESETS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const factoryMap = new Map<string, SavedPreset>(FACTORY_PRESETS.map((p) => [p.id, p]));
      const userCustomPresets: SavedPreset[] = [];
      for (const item of parsed) {
        if (!item || !item.id) continue;
        if (factoryMap.has(item.id)) {
          // If user customized a factory preset, retain user's version
          factoryMap.set(item.id, item);
        } else {
          userCustomPresets.push(item);
        }
      }
      return [...userCustomPresets, ...Array.from(factoryMap.values())];
    }
  } catch (e) {
    console.warn('Failed to parse saved presets:', e);
  }
  return FACTORY_PRESETS;
}

export function savePresets(presets: SavedPreset[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch (e) {
    console.error('Failed to save presets:', e);
  }
}
