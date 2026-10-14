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
import { ThermalHeatmapEffect, DEFAULT_THERMAL_HEATMAP_PARAMS } from './effects/thermalHeatmap';
import { GravityDropEffect, DEFAULT_GRAVITY_DROP_PARAMS } from './effects/gravityDrop';
import { LaserCrosshairEffect, DEFAULT_LASER_CROSSHAIR_PARAMS } from './effects/laserCrosshair';
import { PongBounceEffect, DEFAULT_PONG_BOUNCE_PARAMS } from './effects/pongBounce';
import { RadarSweepEffect, DEFAULT_RADAR_SWEEP_PARAMS } from './effects/radarSweep';
import { VortexPinwheelEffect, DEFAULT_VORTEX_PINWHEEL_PARAMS } from './effects/vortexPinwheel';
import { LavaLampEffect, DEFAULT_LAVA_LAMP_PARAMS } from './effects/lavaLamp';
import { RaindropsEffect, DEFAULT_RAINDROPS_PARAMS } from './effects/raindrops';
import { ScreenAmbilightEffect, DEFAULT_SCREEN_AMBILIGHT_PARAMS } from './effects/screenAmbilight';
import { TelemetryBarsEffect, DEFAULT_TELEMETRY_BARS_PARAMS } from './effects/telemetryBars';
import { SpectrumEQEffect, DEFAULT_SPECTRUM_EQ_PARAMS } from './effects/spectrumEQ';
import { CustomZonesEffect, DEFAULT_CUSTOM_ZONES_PARAMS } from './effects/customZones';
import { AfkScreensaverEffect, DEFAULT_AFK_SCREENSAVER_PARAMS } from './effects/afkScreensaver';
import { GameOfLifeEffect, DEFAULT_GAME_OF_LIFE_PARAMS } from './effects/gameOfLife';
import { PacmanArcadeEffect, DEFAULT_PACMAN_ARCADE_PARAMS } from './effects/pacmanArcade';
import { DvdBounceEffect, DEFAULT_DVD_BOUNCE_PARAMS } from './effects/dvdBounce';
import { WavePondEffect, DEFAULT_WAVE_POND_PARAMS } from './effects/wavePond';
import { DoomFireEffect, DEFAULT_DOOM_FIRE_PARAMS } from './effects/doomFire';
import { PlasmaShaderEffect, DEFAULT_PLASMA_SHADER_PARAMS } from './effects/plasmaShader';
import { LightningStormEffect, DEFAULT_LIGHTNING_STORM_PARAMS } from './effects/lightningStorm';
import { EventHorizonEffect, DEFAULT_EVENT_HORIZON_PARAMS } from './effects/eventHorizon';
import { WpmOverdriveEffect, DEFAULT_WPM_OVERDRIVE_PARAMS } from './effects/wpmOverdrive';
import { FireworksEffect, DEFAULT_FIREWORKS_PARAMS } from './effects/fireworks';
import { DominoToppleEffect, DEFAULT_DOMINO_TOPPLE_PARAMS } from './effects/dominoTopple';
import { CrtScanlineEffect, DEFAULT_CRT_SCANLINE_PARAMS } from './effects/crtScanline';
import { DnaHelixEffect, DEFAULT_DNA_HELIX_PARAMS } from './effects/dnaHelix';
import { PomodoroBarEffect, DEFAULT_POMODORO_BAR_PARAMS } from './effects/pomodoroBar';
import { PathfinderAStarEffect, DEFAULT_PATHFINDER_A_STAR_PARAMS } from './effects/pathfinderAStar';
import { SortVisualizerEffect, DEFAULT_SORT_VISUALIZER_PARAMS } from './effects/sortVisualizer';
import { BinaryCounterEffect, DEFAULT_BINARY_COUNTER_PARAMS } from './effects/binaryCounter';
import { BoidsSwarmEffect, DEFAULT_BOIDS_SWARM_PARAMS } from './effects/boidsSwarm';
import { MagneticFieldEffect, DEFAULT_MAGNETIC_FIELD_PARAMS } from './effects/magneticField';
import { SolarEclipseEffect, DEFAULT_SOLAR_ECLIPSE_PARAMS } from './effects/solarEclipse';
import { BlizzardDriftEffect, DEFAULT_BLIZZARD_DRIFT_PARAMS } from './effects/blizzardDrift';
import { EkgHeartbeatEffect, DEFAULT_EKG_HEARTBEAT_PARAMS } from './effects/ekgHeartbeat';
import { NewtonsCradleEffect, DEFAULT_NEWTONS_CRADLE_PARAMS } from './effects/newtonsCradle';
import { FrostShatterEffect, DEFAULT_FROST_SHATTER_PARAMS } from './effects/frostShatter';
import { ComboMultiplierEffect, DEFAULT_COMBO_MULTIPLIER_PARAMS } from './effects/comboMultiplier';
import { SpotlightLanternEffect, DEFAULT_SPOTLIGHT_LANTERN_PARAMS } from './effects/spotlightLantern';
import { ReactionDiffusionEffect, DEFAULT_REACTION_DIFFUSION_PARAMS } from './effects/reactionDiffusion';
import { KaleidoscopeEffect, DEFAULT_KALEIDOSCOPE_PARAMS } from './effects/kaleidoscope';
import { VoronoiCellsEffect, DEFAULT_VORONOI_CELLS_PARAMS } from './effects/voronoiCells';

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
  thermal_heatmap: {
    type: 'thermal_heatmap',
    name: 'Thermal Heatmap',
    description: 'Thermal heat dissipation mapping typing activity with heat bleed across neighboring keys.',
    defaultParams: DEFAULT_THERMAL_HEATMAP_PARAMS,
  },
  gravity_drop: {
    type: 'gravity_drop',
    name: 'Gravity Drop',
    description: 'Particles falling under gravity upon keypresses and stacking at column bottoms.',
    defaultParams: DEFAULT_GRAVITY_DROP_PARAMS,
  },
  laser_crosshair: {
    type: 'laser_crosshair',
    name: 'Laser Crosshair',
    description: 'High-speed orthogonal crosshair laser beams firing along row and column.',
    defaultParams: DEFAULT_LASER_CROSSHAIR_PARAMS,
  },
  pong_bounce: {
    type: 'pong_bounce',
    name: 'Pong Bounce',
    description: 'Bouncing pixel ball reflecting off keyboard edges with trailing glow.',
    defaultParams: DEFAULT_PONG_BOUNCE_PARAMS,
  },
  radar_sweep: {
    type: 'radar_sweep',
    name: 'Radar Sweep',
    description: 'Phosphor-green radar beam rotating smoothly around keyboard matrix center.',
    defaultParams: DEFAULT_RADAR_SWEEP_PARAMS,
  },
  vortex_pinwheel: {
    type: 'vortex_pinwheel',
    name: 'Vortex Pinwheel',
    description: 'Continuous swirling spiral vortex pinwheel radiating rainbow hues.',
    defaultParams: DEFAULT_VORTEX_PINWHEEL_PARAMS,
  },
  lava_lamp: {
    type: 'lava_lamp',
    name: 'Lava Lamp',
    description: 'Drifting molten metaball blobs merging and separating with organic fluid motion.',
    defaultParams: DEFAULT_LAVA_LAMP_PARAMS,
  },
  raindrops: {
    type: 'raindrops',
    name: 'Raindrops',
    description: 'Random soothing raindrops landing and creating concentric fading ripples.',
    defaultParams: DEFAULT_RAINDROPS_PARAMS,
  },
  screen_ambilight: {
    type: 'screen_ambilight',
    name: 'Screen Ambilight',
    description: 'Real-time screen content downsampled and mapped across the keyboard matrix.',
    defaultParams: DEFAULT_SCREEN_AMBILIGHT_PARAMS,
  },
  telemetry_bars: {
    type: 'telemetry_bars',
    name: 'Telemetry Bars',
    description: 'Live horizontal bar graph metrics visualizing CPU, GPU, and RAM telemetry.',
    defaultParams: DEFAULT_TELEMETRY_BARS_PARAMS,
  },
  spectrum_eq: {
    type: 'spectrum_eq',
    name: 'Spectrum EQ',
    description: '14-band audio equalizer frequency spectrum bars mapped to columns.',
    defaultParams: DEFAULT_SPECTRUM_EQ_PARAMS,
  },
  custom_zones: {
    type: 'custom_zones',
    name: 'Custom Zones',
    description: 'Static functional key zone lighting presets for gaming and coding.',
    defaultParams: DEFAULT_CUSTOM_ZONES_PARAMS,
  },
  afk_screensaver: {
    type: 'afk_screensaver',
    name: 'AFK Screensaver',
    description: 'Low-distraction dim profile during typing with automatic animated screensaver on idle.',
    defaultParams: DEFAULT_AFK_SCREENSAVER_PARAMS,
  },
  game_of_life: {
    type: 'game_of_life',
    name: 'Game of Life',
    description: "Conway's cellular automata evolving across a toroidal matrix with interactive cell seeding.",
    defaultParams: DEFAULT_GAME_OF_LIFE_PARAMS,
  },
  pacman_arcade: {
    type: 'pacman_arcade',
    name: 'Pac-Man Arcade',
    description: 'Retro 8-bit arcade chase with Pac-Man eating pellets trailed by Blinky, Pinky, Inky, and Clyde.',
    defaultParams: DEFAULT_PACMAN_ARCADE_PARAMS,
  },
  dvd_bounce: {
    type: 'dvd_bounce',
    name: 'DVD Bounce',
    description: 'Bouncing 2x2 logo shifting hue on walls with full-board rainbow corner jackpot celebration.',
    defaultParams: DEFAULT_DVD_BOUNCE_PARAMS,
  },
  wave_pond: {
    type: 'wave_pond',
    name: 'Wave Pond',
    description: 'Realistic 2D wave equation water ripple simulation responding interactively to keystrokes.',
    defaultParams: DEFAULT_WAVE_POND_PARAMS,
  },
  doom_fire: {
    type: 'doom_fire',
    name: 'Doom Fire',
    description: 'Classic retro PC Doom roaring flames rising from the bottom row with wind jitter.',
    defaultParams: DEFAULT_DOOM_FIRE_PARAMS,
  },
  plasma_shader: {
    type: 'plasma_shader',
    name: 'Plasma Shader',
    description: 'Psychedelic demoscene multi-frequency trigonometric interference wave plasma.',
    defaultParams: DEFAULT_PLASMA_SHADER_PARAMS,
  },
  lightning_storm: {
    type: 'lightning_storm',
    name: 'Lightning Storm',
    description: 'Brooding thunderstorm clouds illuminated by sudden high-voltage lightning strikes.',
    defaultParams: DEFAULT_LIGHTNING_STORM_PARAMS,
  },
  event_horizon: {
    type: 'event_horizon',
    name: 'Event Horizon',
    description: 'Gravitational black hole with swirling relativistic accretion disk and inward stardust spiral.',
    defaultParams: DEFAULT_EVENT_HORIZON_PARAMS,
  },
  wpm_overdrive: {
    type: 'wpm_overdrive',
    name: 'WPM Overdrive',
    description: 'Dynamic typing performance tiers: calm cyan, neon purple speed-lines, and nitro RGB sparks.',
    defaultParams: DEFAULT_WPM_OVERDRIVE_PARAMS,
  },
  fireworks: {
    type: 'fireworks',
    name: 'Fireworks',
    description: 'Ascending launch flares detonating into 8-way exploding spark cascades with gravity.',
    defaultParams: DEFAULT_FIREWORKS_PARAMS,
  },
  domino_topple: {
    type: 'domino_topple',
    name: 'Domino Topple',
    description: 'Kinetic domino chain reaction wave toppling across columns and tumbling down rows.',
    defaultParams: DEFAULT_DOMINO_TOPPLE_PARAMS,
  },
  crt_scanline: {
    type: 'crt_scanline',
    name: 'CRT Scanline',
    description: 'Cathode ray tube raster scan beam with periodic chromatic aberration glitch distortion.',
    defaultParams: DEFAULT_CRT_SCANLINE_PARAMS,
  },
  dna_helix: {
    type: 'dna_helix',
    name: 'DNA Helix',
    description: 'Double-helix genetic strands undulating smoothly with connecting base-pair rungs.',
    defaultParams: DEFAULT_DNA_HELIX_PARAMS,
  },
  pomodoro_bar: {
    type: 'pomodoro_bar',
    name: 'Pomodoro Bar',
    description: '25-minute productivity countdown bar draining smoothly from Emerald Green to Crimson.',
    defaultParams: DEFAULT_POMODORO_BAR_PARAMS,
  },
  pathfinder_a_star: {
    type: 'pathfinder_a_star',
    name: 'Pathfinder A*',
    description: 'A* shortest-path heuristic search avoiding dynamic obstacles with golden flash verification.',
    defaultParams: DEFAULT_PATHFINDER_A_STAR_PARAMS,
  },
  sort_visualizer: {
    type: 'sort_visualizer',
    name: 'Sort Visualizer',
    description: 'Animated sorting algorithm showing active pointer comparisons, swaps, and rainbow height columns.',
    defaultParams: DEFAULT_SORT_VISUALIZER_PARAMS,
  },
  binary_counter: {
    type: 'binary_counter',
    name: 'Binary Counter',
    description: '14-bit binary accumulator with per-row shifted bits and smooth phosphor persistence.',
    defaultParams: DEFAULT_BINARY_COUNTER_PARAMS,
  },
  boids_swarm: {
    type: 'boids_swarm',
    name: 'Boids Swarm',
    description: 'Reynolds autonomous flocking simulation with cohesion, alignment, separation, and keypress repulsion.',
    defaultParams: DEFAULT_BOIDS_SWARM_PARAMS,
  },
  magnetic_field: {
    type: 'magnetic_field',
    name: 'Magnetic Field',
    description: 'Autonomous figure-8 magnetic dipole drifting across keys with dual-pole field gradient.',
    defaultParams: DEFAULT_MAGNETIC_FIELD_PARAMS,
  },
  solar_eclipse: {
    type: 'solar_eclipse',
    name: 'Solar Eclipse',
    description: 'Celestial solar eclipse with orbiting moon, luminous corona rays, and interactive flare bursts.',
    defaultParams: DEFAULT_SOLAR_ECLIPSE_PARAMS,
  },
  blizzard_drift: {
    type: 'blizzard_drift',
    name: 'Blizzard Drift',
    description: 'Dynamic snowstorm with wind-drifted falling flakes, bottom snowbank drifts, and melting physics.',
    defaultParams: DEFAULT_BLIZZARD_DRIFT_PARAMS,
  },
  ekg_heartbeat: {
    type: 'ekg_heartbeat',
    name: 'EKG Heartbeat',
    description: 'Electrocardiogram telemetry monitor with authentic P-Q-R-S-T waveforms and decaying phosphor beam.',
    defaultParams: DEFAULT_EKG_HEARTBEAT_PARAMS,
  },
  newtons_cradle: {
    type: 'newtons_cradle',
    name: "Newton's Cradle",
    description: 'Kinetic conservation pendulum simulation with swinging metallic balls and center impact shockwaves.',
    defaultParams: DEFAULT_NEWTONS_CRADLE_PARAMS,
  },
  frost_shatter: {
    type: 'frost_shatter',
    name: 'Frost Shatter',
    description: 'Fractal ice crack rays branching outwards from keystrokes that cool through glacier cyan.',
    defaultParams: DEFAULT_FROST_SHATTER_PARAMS,
  },
  combo_multiplier: {
    type: 'combo_multiplier',
    name: 'Combo Multiplier',
    description: 'Escalating typing combo counter unlocking emerald pulses, golden border rings, and nitro plasma.',
    defaultParams: DEFAULT_COMBO_MULTIPLIER_PARAMS,
  },
  spotlight_lantern: {
    type: 'spotlight_lantern',
    name: 'Spotlight Lantern',
    description: 'Smoothly interpolated illumination lantern that stalks keystroke coordinates with radial falloff.',
    defaultParams: DEFAULT_SPOTLIGHT_LANTERN_PARAMS,
  },
  reaction_diffusion: {
    type: 'reaction_diffusion',
    name: 'Reaction Diffusion',
    description: 'Turing-pattern morphogen simulation generating organic coral and leopard spot waves.',
    defaultParams: DEFAULT_REACTION_DIFFUSION_PARAMS,
  },
  kaleidoscope: {
    type: 'kaleidoscope',
    name: 'Kaleidoscope',
    description: 'Four-way mirrored mandala geometry pulsating with mathematical harmonic interference.',
    defaultParams: DEFAULT_KALEIDOSCOPE_PARAMS,
  },
  voronoi_cells: {
    type: 'voronoi_cells',
    name: 'Voronoi Cells',
    description: 'Dynamically drifting Voronoi seeds with mathematical boundary edge rendering and key capture.',
    defaultParams: DEFAULT_VORONOI_CELLS_PARAMS,
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
    case 'thermal_heatmap':
      return new ThermalHeatmapEffect(params ? { ...(params as any) } : { ...DEFAULT_THERMAL_HEATMAP_PARAMS });
    case 'gravity_drop':
      return new GravityDropEffect(params ? { ...(params as any) } : { ...DEFAULT_GRAVITY_DROP_PARAMS });
    case 'laser_crosshair':
      return new LaserCrosshairEffect(params ? { ...(params as any) } : { ...DEFAULT_LASER_CROSSHAIR_PARAMS });
    case 'pong_bounce':
      return new PongBounceEffect(params ? { ...(params as any) } : { ...DEFAULT_PONG_BOUNCE_PARAMS });
    case 'radar_sweep':
      return new RadarSweepEffect(params ? { ...(params as any) } : { ...DEFAULT_RADAR_SWEEP_PARAMS });
    case 'vortex_pinwheel':
      return new VortexPinwheelEffect(params ? { ...(params as any) } : { ...DEFAULT_VORTEX_PINWHEEL_PARAMS });
    case 'lava_lamp':
      return new LavaLampEffect(params ? { ...(params as any) } : { ...DEFAULT_LAVA_LAMP_PARAMS });
    case 'raindrops':
      return new RaindropsEffect(params ? { ...(params as any) } : { ...DEFAULT_RAINDROPS_PARAMS });
    case 'screen_ambilight':
      return new ScreenAmbilightEffect(params ? { ...(params as any) } : { ...DEFAULT_SCREEN_AMBILIGHT_PARAMS });
    case 'telemetry_bars':
      return new TelemetryBarsEffect(params ? { ...(params as any) } : { ...DEFAULT_TELEMETRY_BARS_PARAMS });
    case 'spectrum_eq':
      return new SpectrumEQEffect(params ? { ...(params as any) } : { ...DEFAULT_SPECTRUM_EQ_PARAMS });
    case 'custom_zones':
      return new CustomZonesEffect(params ? { ...(params as any) } : { ...DEFAULT_CUSTOM_ZONES_PARAMS });
    case 'afk_screensaver':
      return new AfkScreensaverEffect(params ? { ...(params as any) } : { ...DEFAULT_AFK_SCREENSAVER_PARAMS });
    case 'game_of_life':
      return new GameOfLifeEffect(params ? { ...(params as any) } : { ...DEFAULT_GAME_OF_LIFE_PARAMS });
    case 'pacman_arcade':
      return new PacmanArcadeEffect(params ? { ...(params as any) } : { ...DEFAULT_PACMAN_ARCADE_PARAMS });
    case 'dvd_bounce':
      return new DvdBounceEffect(params ? { ...(params as any) } : { ...DEFAULT_DVD_BOUNCE_PARAMS });
    case 'wave_pond':
      return new WavePondEffect(params ? { ...(params as any) } : { ...DEFAULT_WAVE_POND_PARAMS });
    case 'doom_fire':
      return new DoomFireEffect(params ? { ...(params as any) } : { ...DEFAULT_DOOM_FIRE_PARAMS });
    case 'plasma_shader':
      return new PlasmaShaderEffect(params ? { ...(params as any) } : { ...DEFAULT_PLASMA_SHADER_PARAMS });
    case 'lightning_storm':
      return new LightningStormEffect(params ? { ...(params as any) } : { ...DEFAULT_LIGHTNING_STORM_PARAMS });
    case 'event_horizon':
      return new EventHorizonEffect(params ? { ...(params as any) } : { ...DEFAULT_EVENT_HORIZON_PARAMS });
    case 'wpm_overdrive':
      return new WpmOverdriveEffect(params ? { ...(params as any) } : { ...DEFAULT_WPM_OVERDRIVE_PARAMS });
    case 'fireworks':
      return new FireworksEffect(params ? { ...(params as any) } : { ...DEFAULT_FIREWORKS_PARAMS });
    case 'domino_topple':
      return new DominoToppleEffect(params ? { ...(params as any) } : { ...DEFAULT_DOMINO_TOPPLE_PARAMS });
    case 'crt_scanline':
      return new CrtScanlineEffect(params ? { ...(params as any) } : { ...DEFAULT_CRT_SCANLINE_PARAMS });
    case 'dna_helix':
      return new DnaHelixEffect(params ? { ...(params as any) } : { ...DEFAULT_DNA_HELIX_PARAMS });
    case 'pomodoro_bar':
      return new PomodoroBarEffect(params ? { ...(params as any) } : { ...DEFAULT_POMODORO_BAR_PARAMS });
    case 'pathfinder_a_star':
      return new PathfinderAStarEffect(params ? { ...(params as any) } : { ...DEFAULT_PATHFINDER_A_STAR_PARAMS });
    case 'sort_visualizer':
      return new SortVisualizerEffect(params ? { ...(params as any) } : { ...DEFAULT_SORT_VISUALIZER_PARAMS });
    case 'binary_counter':
      return new BinaryCounterEffect(params ? { ...(params as any) } : { ...DEFAULT_BINARY_COUNTER_PARAMS });
    case 'boids_swarm':
      return new BoidsSwarmEffect(params ? { ...(params as any) } : { ...DEFAULT_BOIDS_SWARM_PARAMS });
    case 'magnetic_field':
      return new MagneticFieldEffect(params ? { ...(params as any) } : { ...DEFAULT_MAGNETIC_FIELD_PARAMS });
    case 'solar_eclipse':
      return new SolarEclipseEffect(params ? { ...(params as any) } : { ...DEFAULT_SOLAR_ECLIPSE_PARAMS });
    case 'blizzard_drift':
      return new BlizzardDriftEffect(params ? { ...(params as any) } : { ...DEFAULT_BLIZZARD_DRIFT_PARAMS });
    case 'ekg_heartbeat':
      return new EkgHeartbeatEffect(params ? { ...(params as any) } : { ...DEFAULT_EKG_HEARTBEAT_PARAMS });
    case 'newtons_cradle':
      return new NewtonsCradleEffect(params ? { ...(params as any) } : { ...DEFAULT_NEWTONS_CRADLE_PARAMS });
    case 'frost_shatter':
      return new FrostShatterEffect(params ? { ...(params as any) } : { ...DEFAULT_FROST_SHATTER_PARAMS });
    case 'combo_multiplier':
      return new ComboMultiplierEffect(params ? { ...(params as any) } : { ...DEFAULT_COMBO_MULTIPLIER_PARAMS });
    case 'spotlight_lantern':
      return new SpotlightLanternEffect(params ? { ...(params as any) } : { ...DEFAULT_SPOTLIGHT_LANTERN_PARAMS });
    case 'reaction_diffusion':
      return new ReactionDiffusionEffect(params ? { ...(params as any) } : { ...DEFAULT_REACTION_DIFFUSION_PARAMS });
    case 'kaleidoscope':
      return new KaleidoscopeEffect(params ? { ...(params as any) } : { ...DEFAULT_KALEIDOSCOPE_PARAMS });
    case 'voronoi_cells':
      return new VoronoiCellsEffect(params ? { ...(params as any) } : { ...DEFAULT_VORONOI_CELLS_PARAMS });
    default:
      return new AuroraEffect({ ...DEFAULT_AURORA_PARAMS });
  }
}
