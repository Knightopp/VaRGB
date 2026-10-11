import { EffectType, ILightingEffect, AnyEffectParams } from '../types/effects';
import { AuroraEffect, DEFAULT_AURORA_PARAMS } from './effects/aurora';
import { RippleEffect, DEFAULT_RIPPLE_PARAMS } from './effects/ripple';
import { GlitchEffect, DEFAULT_GLITCH_PARAMS } from './effects/glitch';
import { MatrixEffect, DEFAULT_MATRIX_PARAMS } from './effects/matrix';
import { PixelArtEffect, DEFAULT_PIXEL_ART_PARAMS } from './effects/pixelArt';
import { PulseEffect, DEFAULT_PULSE_PARAMS } from './effects/pulse';
import { ColorCycleEffect, DEFAULT_COLOR_CYCLE_PARAMS } from './effects/colorCycle';
import { StarlightEffect, DEFAULT_STARLIGHT_PARAMS } from './effects/starlight';
import { MusicPulseEffect, DEFAULT_MUSIC_PULSE_PARAMS } from './effects/musicPulse';
import { ZigzagWaveEffect, DEFAULT_ZIGZAG_WAVE_PARAMS } from './effects/zigzagWave';
import { ContinuousWaveEffect, DEFAULT_CONTINUOUS_WAVE_PARAMS } from './effects/continuousWave';
import { SineWaveEffect, DEFAULT_SINE_WAVE_PARAMS } from './effects/sineWave';
import { ReactiveRippleEffect, DEFAULT_REACTIVE_RIPPLE_PARAMS } from './effects/reactiveRipple';
import { KeyFlashEffect, DEFAULT_KEY_FLASH_PARAMS } from './effects/keyFlash';
import { SnakeTrailEffect, DEFAULT_SNAKE_TRAIL_PARAMS } from './effects/snakeTrail';
import { ShockwaveEffect, DEFAULT_SHOCKWAVE_PARAMS } from './effects/shockwave';
import { EmberEffect, DEFAULT_EMBER_PARAMS } from './effects/ember';
import { NeighborGlowEffect, DEFAULT_NEIGHBOR_GLOW_PARAMS } from './effects/neighborGlow';
import { TypingIntensityEffect, DEFAULT_TYPING_INTENSITY_PARAMS } from './effects/typingIntensity';
import { ElectricDischargeEffect, DEFAULT_ELECTRIC_DISCHARGE_PARAMS } from './effects/electricDischarge';

export interface EffectMeta {
  type: EffectType;
  name: string;
  description: string;
  defaultParams: AnyEffectParams;
}

export const EFFECT_REGISTRY: Record<EffectType, EffectMeta> = {
  aurora: {
    type: 'aurora',
    name: 'Aurora Flow',
    description: 'Silky color wave shifting dynamically across the keyboard matrix.',
    defaultParams: DEFAULT_AURORA_PARAMS,
  },
  ripple: {
    type: 'ripple',
    name: 'Keystroke Ripple',
    description: 'Dynamic reactive waves emanating outward from pressed keys.',
    defaultParams: DEFAULT_RIPPLE_PARAMS,
  },
  glitch: {
    type: 'glitch',
    name: 'Cyber Glitch',
    description: 'Digital interference clusters with rapid flashes and pseudo-random seed.',
    defaultParams: DEFAULT_GLITCH_PARAMS,
  },
  matrix: {
    type: 'matrix',
    name: 'Matrix Rain',
    description: 'Cascading digital code streams with glowing heads and fading tails.',
    defaultParams: DEFAULT_MATRIX_PARAMS,
  },
  pixel_art: {
    type: 'pixel_art',
    name: 'Pixel Art Mode',
    description: 'Static & animated key-by-key pixel canvas with retro templates.',
    defaultParams: DEFAULT_PIXEL_ART_PARAMS,
  },
  pulse: {
    type: 'pulse',
    name: 'Crimson Pulse',
    description: 'Atmospheric breathing rhythm oscillating between deep crimson and shadow.',
    defaultParams: DEFAULT_PULSE_PARAMS,
  },
  color_cycle: {
    type: 'color_cycle',
    name: 'Prism Drift',
    description: 'A smooth spectrum wave that shifts across the keyboard.',
    defaultParams: DEFAULT_COLOR_CYCLE_PARAMS,
  },
  starlight: {
    type: 'starlight',
    name: 'Starlight',
    description: 'Soft, scattered color twinkles across a dark keyboard.',
    defaultParams: DEFAULT_STARLIGHT_PARAMS,
  },
  music_pulse: {
    type: 'music_pulse',
    name: 'Music Pulse',
    description: 'Live lighting driven by real Windows system audio.',
    defaultParams: DEFAULT_MUSIC_PULSE_PARAMS,
  },
  zigzag_wave: {
    type: 'zigzag_wave',
    name: 'Zigzag Wave',
    description: 'Serpentine ping-pong wave gliding across the physical keyboard matrix.',
    defaultParams: DEFAULT_ZIGZAG_WAVE_PARAMS,
  },
  continuous_wave: {
    type: 'continuous_wave',
    name: 'Continuous Wave',
    description: 'Smooth, unbroken horizontal sine wave traveling continuously from left to right with multiple peaks and troughs.',
    defaultParams: DEFAULT_CONTINUOUS_WAVE_PARAMS,
  },
  flowing_curve: {
    type: 'flowing_curve',
    name: 'Sine Wave',
    description: 'Traveling sinusoidal wave with a vibrant multicolour gradient gliding smoothly across the keyboard matrix.',
    defaultParams: DEFAULT_SINE_WAVE_PARAMS,
  },
  reactive_ripple: {
    type: 'reactive_ripple',
    name: 'Reactive Ripple',
    description: 'Expanding circular light waves emanating from pressed keys across physical layout.',
    defaultParams: DEFAULT_REACTIVE_RIPPLE_PARAMS,
  },
  key_flash: {
    type: 'key_flash',
    name: 'Key Flash',
    description: 'Instant bright key flashes with independent timers and neighboring glow.',
    defaultParams: DEFAULT_KEY_FLASH_PARAMS,
  },
  snake_trail: {
    type: 'snake_trail',
    name: 'Snake Trail',
    description: 'Moving serpentine trails traveling across physically adjacent neighboring keys.',
    defaultParams: DEFAULT_SNAKE_TRAIL_PARAMS,
  },
  shockwave: {
    type: 'shockwave',
    name: 'Shockwave',
    description: 'High-speed sharp expanding rings with trailing afterglow on keypresses.',
    defaultParams: DEFAULT_SHOCKWAVE_PARAMS,
  },
  ember: {
    type: 'ember',
    name: 'Ember',
    description: 'Warm incandescent embers cooling through molten orange and ruby red.',
    defaultParams: DEFAULT_EMBER_PARAMS,
  },
  neighbor_glow: {
    type: 'neighbor_glow',
    name: 'Neighbor Glow',
    description: 'Progressive distance-based illumination radiating across physical key neighbors.',
    defaultParams: DEFAULT_NEIGHBOR_GLOW_PARAMS,
  },
  typing_intensity: {
    type: 'typing_intensity',
    name: 'Typing Intensity',
    description: 'Dynamic illumination responding smoothly to real-time typing speed and rhythm.',
    defaultParams: DEFAULT_TYPING_INTENSITY_PARAMS,
  },
  electric_discharge: {
    type: 'electric_discharge',
    name: 'Electric Discharge',
    description: 'Jagged branching high-voltage lightning arcs jumping through physical keys.',
    defaultParams: DEFAULT_ELECTRIC_DISCHARGE_PARAMS,
  },
};

export function createEffectInstance(type: EffectType, params?: AnyEffectParams): ILightingEffect {
  switch (type) {
    case 'aurora':
      return new AuroraEffect(params ? { ...(params as any) } : { ...DEFAULT_AURORA_PARAMS });
    case 'ripple':
      return new RippleEffect(params ? { ...(params as any) } : { ...DEFAULT_RIPPLE_PARAMS });
    case 'glitch':
      return new GlitchEffect(params ? { ...(params as any) } : { ...DEFAULT_GLITCH_PARAMS });
    case 'matrix':
      return new MatrixEffect(params ? { ...(params as any) } : { ...DEFAULT_MATRIX_PARAMS });
    case 'pixel_art':
      return new PixelArtEffect(params ? { ...(params as any) } : { ...DEFAULT_PIXEL_ART_PARAMS });
    case 'pulse':
      return new PulseEffect(params ? { ...(params as any) } : { ...DEFAULT_PULSE_PARAMS });
    case 'color_cycle':
      return new ColorCycleEffect(params ? { ...(params as any) } : { ...DEFAULT_COLOR_CYCLE_PARAMS });
    case 'starlight':
      return new StarlightEffect(params ? { ...(params as any) } : { ...DEFAULT_STARLIGHT_PARAMS });
    case 'music_pulse':
      return new MusicPulseEffect(params ? { ...(params as any) } : { ...DEFAULT_MUSIC_PULSE_PARAMS });
    case 'zigzag_wave':
      return new ZigzagWaveEffect(params ? { ...(params as any) } : { ...DEFAULT_ZIGZAG_WAVE_PARAMS });
    case 'continuous_wave':
      return new ContinuousWaveEffect(params ? { ...(params as any) } : { ...DEFAULT_CONTINUOUS_WAVE_PARAMS });
    case 'flowing_curve':
      return new SineWaveEffect(params ? { ...(params as any) } : { ...DEFAULT_SINE_WAVE_PARAMS });
    case 'reactive_ripple':
      return new ReactiveRippleEffect(params ? { ...(params as any) } : { ...DEFAULT_REACTIVE_RIPPLE_PARAMS });
    case 'key_flash':
      return new KeyFlashEffect(params ? { ...(params as any) } : { ...DEFAULT_KEY_FLASH_PARAMS });
    case 'snake_trail':
      return new SnakeTrailEffect(params ? { ...(params as any) } : { ...DEFAULT_SNAKE_TRAIL_PARAMS });
    case 'shockwave':
      return new ShockwaveEffect(params ? { ...(params as any) } : { ...DEFAULT_SHOCKWAVE_PARAMS });
    case 'ember':
      return new EmberEffect(params ? { ...(params as any) } : { ...DEFAULT_EMBER_PARAMS });
    case 'neighbor_glow':
      return new NeighborGlowEffect(params ? { ...(params as any) } : { ...DEFAULT_NEIGHBOR_GLOW_PARAMS });
    case 'typing_intensity':
      return new TypingIntensityEffect(params ? { ...(params as any) } : { ...DEFAULT_TYPING_INTENSITY_PARAMS });
    case 'electric_discharge':
      return new ElectricDischargeEffect(params ? { ...(params as any) } : { ...DEFAULT_ELECTRIC_DISCHARGE_PARAMS });
    default:
      return new AuroraEffect({ ...DEFAULT_AURORA_PARAMS });
  }
}
