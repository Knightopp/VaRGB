import { SavedPreset } from '../types/effects';
import { invoke } from '@tauri-apps/api/core';
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
import { DEFAULT_THERMAL_HEATMAP_PARAMS } from '../engine/effects/thermalHeatmap';
import { DEFAULT_GRAVITY_DROP_PARAMS } from '../engine/effects/gravityDrop';
import { DEFAULT_LASER_CROSSHAIR_PARAMS } from '../engine/effects/laserCrosshair';
import { DEFAULT_PONG_BOUNCE_PARAMS } from '../engine/effects/pongBounce';
import { DEFAULT_RADAR_SWEEP_PARAMS } from '../engine/effects/radarSweep';
import { DEFAULT_VORTEX_PINWHEEL_PARAMS } from '../engine/effects/vortexPinwheel';
import { DEFAULT_LAVA_LAMP_PARAMS } from '../engine/effects/lavaLamp';
import { DEFAULT_RAINDROPS_PARAMS } from '../engine/effects/raindrops';
import { DEFAULT_SCREEN_AMBILIGHT_PARAMS } from '../engine/effects/screenAmbilight';
import { DEFAULT_TELEMETRY_BARS_PARAMS } from '../engine/effects/telemetryBars';
import { DEFAULT_SPECTRUM_EQ_PARAMS } from '../engine/effects/spectrumEQ';
import { DEFAULT_CUSTOM_ZONES_PARAMS } from '../engine/effects/customZones';
import { DEFAULT_AFK_SCREENSAVER_PARAMS } from '../engine/effects/afkScreensaver';
import { DEFAULT_GAME_OF_LIFE_PARAMS } from '../engine/effects/gameOfLife';
import { DEFAULT_PACMAN_ARCADE_PARAMS } from '../engine/effects/pacmanArcade';
import { DEFAULT_DVD_BOUNCE_PARAMS } from '../engine/effects/dvdBounce';
import { DEFAULT_WAVE_POND_PARAMS } from '../engine/effects/wavePond';
import { DEFAULT_DOOM_FIRE_PARAMS } from '../engine/effects/doomFire';
import { DEFAULT_PLASMA_SHADER_PARAMS } from '../engine/effects/plasmaShader';
import { DEFAULT_LIGHTNING_STORM_PARAMS } from '../engine/effects/lightningStorm';
import { DEFAULT_EVENT_HORIZON_PARAMS } from '../engine/effects/eventHorizon';
import { DEFAULT_WPM_OVERDRIVE_PARAMS } from '../engine/effects/wpmOverdrive';
import { DEFAULT_FIREWORKS_PARAMS } from '../engine/effects/fireworks';
import { DEFAULT_DOMINO_TOPPLE_PARAMS } from '../engine/effects/dominoTopple';
import { DEFAULT_CRT_SCANLINE_PARAMS } from '../engine/effects/crtScanline';
import { DEFAULT_DNA_HELIX_PARAMS } from '../engine/effects/dnaHelix';
import { DEFAULT_POMODORO_BAR_PARAMS } from '../engine/effects/pomodoroBar';
import { DEFAULT_PATHFINDER_A_STAR_PARAMS } from '../engine/effects/pathfinderAStar';
import { DEFAULT_SORT_VISUALIZER_PARAMS } from '../engine/effects/sortVisualizer';
import { DEFAULT_BINARY_COUNTER_PARAMS } from '../engine/effects/binaryCounter';
import { DEFAULT_BOIDS_SWARM_PARAMS } from '../engine/effects/boidsSwarm';
import { DEFAULT_MAGNETIC_FIELD_PARAMS } from '../engine/effects/magneticField';
import { DEFAULT_SOLAR_ECLIPSE_PARAMS } from '../engine/effects/solarEclipse';
import { DEFAULT_BLIZZARD_DRIFT_PARAMS } from '../engine/effects/blizzardDrift';
import { DEFAULT_EKG_HEARTBEAT_PARAMS } from '../engine/effects/ekgHeartbeat';
import { DEFAULT_NEWTONS_CRADLE_PARAMS } from '../engine/effects/newtonsCradle';
import { DEFAULT_FROST_SHATTER_PARAMS } from '../engine/effects/frostShatter';
import { DEFAULT_COMBO_MULTIPLIER_PARAMS } from '../engine/effects/comboMultiplier';
import { DEFAULT_SPOTLIGHT_LANTERN_PARAMS } from '../engine/effects/spotlightLantern';
import { DEFAULT_REACTION_DIFFUSION_PARAMS } from '../engine/effects/reactionDiffusion';
import { DEFAULT_KALEIDOSCOPE_PARAMS } from '../engine/effects/kaleidoscope';
import { DEFAULT_VORONOI_CELLS_PARAMS } from '../engine/effects/voronoiCells';

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
  {
    id: 'factory-thermal-heatmap',
    name: 'Thermal Heatmap (Default)',
    effectType: 'thermal_heatmap',
    version: 1,
    params: DEFAULT_THERMAL_HEATMAP_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-gravity-drop',
    name: 'Gravity Drop (Cyan Cascades)',
    effectType: 'gravity_drop',
    version: 1,
    params: DEFAULT_GRAVITY_DROP_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-laser-crosshair',
    name: 'Laser Crosshair (Crimson Beam)',
    effectType: 'laser_crosshair',
    version: 1,
    params: DEFAULT_LASER_CROSSHAIR_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-pong-bounce',
    name: 'Pong Bounce (Arcade Green)',
    effectType: 'pong_bounce',
    version: 1,
    params: DEFAULT_PONG_BOUNCE_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-radar-sweep',
    name: 'Radar Sweep (Phosphor Glow)',
    effectType: 'radar_sweep',
    version: 1,
    params: DEFAULT_RADAR_SWEEP_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-vortex-pinwheel',
    name: 'Vortex Pinwheel (Rainbow Spin)',
    effectType: 'vortex_pinwheel',
    version: 1,
    params: DEFAULT_VORTEX_PINWHEEL_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-lava-lamp',
    name: 'Lava Lamp (Molten Magma)',
    effectType: 'lava_lamp',
    version: 1,
    params: DEFAULT_LAVA_LAMP_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-raindrops',
    name: 'Raindrops (Gentle Cyan)',
    effectType: 'raindrops',
    version: 1,
    params: DEFAULT_RAINDROPS_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-screen-ambilight',
    name: 'Screen Ambilight (Display Sync)',
    effectType: 'screen_ambilight',
    version: 1,
    params: DEFAULT_SCREEN_AMBILIGHT_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-telemetry-bars',
    name: 'Telemetry Bars (Hardware Stats)',
    effectType: 'telemetry_bars',
    version: 1,
    params: DEFAULT_TELEMETRY_BARS_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-spectrum-eq',
    name: 'Spectrum EQ (14-Band Equalizer)',
    effectType: 'spectrum_eq',
    version: 1,
    params: DEFAULT_SPECTRUM_EQ_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-custom-zones',
    name: 'Custom Zones (Gamer Profile)',
    effectType: 'custom_zones',
    version: 1,
    params: DEFAULT_CUSTOM_ZONES_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-afk-screensaver',
    name: 'AFK Screensaver (Aurora Transition)',
    effectType: 'afk_screensaver',
    version: 1,
    params: DEFAULT_AFK_SCREENSAVER_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-game-of-life',
    name: 'Game of Life (Cyber Emerald)',
    effectType: 'game_of_life',
    version: 1,
    params: DEFAULT_GAME_OF_LIFE_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-pacman-arcade',
    name: 'Pac-Man Arcade (Classic 8-Bit)',
    effectType: 'pacman_arcade',
    version: 1,
    params: DEFAULT_PACMAN_ARCADE_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-dvd-bounce',
    name: 'DVD Bounce (Hue Shift)',
    effectType: 'dvd_bounce',
    version: 1,
    params: DEFAULT_DVD_BOUNCE_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-wave-pond',
    name: 'Wave Pond (Ocean Blue)',
    effectType: 'wave_pond',
    version: 1,
    params: DEFAULT_WAVE_POND_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-doom-fire',
    name: 'Doom Fire (Hellfire Core)',
    effectType: 'doom_fire',
    version: 1,
    params: DEFAULT_DOOM_FIRE_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-plasma-shader',
    name: 'Plasma Shader (Rainbow Dream)',
    effectType: 'plasma_shader',
    version: 1,
    params: DEFAULT_PLASMA_SHADER_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-lightning-storm',
    name: 'Lightning Storm (High Voltage)',
    effectType: 'lightning_storm',
    version: 1,
    params: DEFAULT_LIGHTNING_STORM_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-event-horizon',
    name: 'Event Horizon (Black Hole)',
    effectType: 'event_horizon',
    version: 1,
    params: DEFAULT_EVENT_HORIZON_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-wpm-overdrive',
    name: 'WPM Overdrive (Speed Tracker)',
    effectType: 'wpm_overdrive',
    version: 1,
    params: DEFAULT_WPM_OVERDRIVE_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-fireworks',
    name: 'Fireworks (Night Sky)',
    effectType: 'fireworks',
    version: 1,
    params: DEFAULT_FIREWORKS_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-domino-topple',
    name: 'Domino Topple (Kinetic Cascade)',
    effectType: 'domino_topple',
    version: 1,
    params: DEFAULT_DOMINO_TOPPLE_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-crt-scanline',
    name: 'CRT Scanline (Phosphor Glitch)',
    effectType: 'crt_scanline',
    version: 1,
    params: DEFAULT_CRT_SCANLINE_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-dna-helix',
    name: 'DNA Helix (Neon Double Helix)',
    effectType: 'dna_helix',
    version: 1,
    params: DEFAULT_DNA_HELIX_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-pomodoro-bar',
    name: 'Pomodoro Bar (25 Min Focus)',
    effectType: 'pomodoro_bar',
    version: 1,
    params: DEFAULT_POMODORO_BAR_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-pathfinder-a-star',
    name: 'Pathfinder A* (Gold Search)',
    effectType: 'pathfinder_a_star',
    version: 1,
    params: DEFAULT_PATHFINDER_A_STAR_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-sort-visualizer',
    name: 'Sort Visualizer (Rainbow Sweep)',
    effectType: 'sort_visualizer',
    version: 1,
    params: DEFAULT_SORT_VISUALIZER_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-binary-counter',
    name: 'Binary Counter (Terminal Phosphor)',
    effectType: 'binary_counter',
    version: 1,
    params: DEFAULT_BINARY_COUNTER_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-boids-swarm',
    name: 'Boids Swarm (Flocking Agents)',
    effectType: 'boids_swarm',
    version: 1,
    params: DEFAULT_BOIDS_SWARM_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-magnetic-field',
    name: 'Magnetic Field (Dipole Lemniscate)',
    effectType: 'magnetic_field',
    version: 1,
    params: DEFAULT_MAGNETIC_FIELD_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-solar-eclipse',
    name: 'Solar Eclipse (Luminous Corona)',
    effectType: 'solar_eclipse',
    version: 1,
    params: DEFAULT_SOLAR_ECLIPSE_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-blizzard-drift',
    name: 'Blizzard Drift (Sub-Zero Drift)',
    effectType: 'blizzard_drift',
    version: 1,
    params: DEFAULT_BLIZZARD_DRIFT_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-ekg-heartbeat',
    name: 'EKG Heartbeat (Cardiac Telemetry)',
    effectType: 'ekg_heartbeat',
    version: 1,
    params: DEFAULT_EKG_HEARTBEAT_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-newtons-cradle',
    name: "Newton's Cradle (Kinetic Metal)",
    effectType: 'newtons_cradle',
    version: 1,
    params: DEFAULT_NEWTONS_CRADLE_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-frost-shatter',
    name: 'Frost Shatter (Glacier Ray)',
    effectType: 'frost_shatter',
    version: 1,
    params: DEFAULT_FROST_SHATTER_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-combo-multiplier',
    name: 'Combo Multiplier (Hyper Nitro)',
    effectType: 'combo_multiplier',
    version: 1,
    params: DEFAULT_COMBO_MULTIPLIER_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-spotlight-lantern',
    name: 'Spotlight Lantern (Warm Stalker)',
    effectType: 'spotlight_lantern',
    version: 1,
    params: DEFAULT_SPOTLIGHT_LANTERN_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-reaction-diffusion',
    name: 'Reaction Diffusion (Turing Coral)',
    effectType: 'reaction_diffusion',
    version: 1,
    params: DEFAULT_REACTION_DIFFUSION_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-kaleidoscope',
    name: 'Kaleidoscope (Mirrored Mandala)',
    effectType: 'kaleidoscope',
    version: 1,
    params: DEFAULT_KALEIDOSCOPE_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'factory-voronoi-cells',
    name: 'Voronoi Cells (Neon Tessellation)',
    effectType: 'voronoi_cells',
    version: 1,
    params: DEFAULT_VORONOI_CELLS_PARAMS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function mergeWithFactoryPresets(parsed: any[]): SavedPreset[] {
  if (!Array.isArray(parsed)) return FACTORY_PRESETS;
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

export function loadPresets(): SavedPreset[] {
  if (typeof window === 'undefined') return FACTORY_PRESETS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return FACTORY_PRESETS;
    const parsed = JSON.parse(raw);
    return mergeWithFactoryPresets(parsed);
  } catch (e) {
    console.warn('Failed to parse saved presets:', e);
  }
  return FACTORY_PRESETS;
}

export async function loadPresetsAsync(): Promise<SavedPreset[]> {
  try {
    const raw = await invoke<string | null>('load_persistent_presets');
    if (raw && raw.trim() !== '' && raw.trim() !== '[]') {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const merged = mergeWithFactoryPresets(parsed);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch {}
        return merged;
      }
    }
  } catch (err) {
    console.warn('Persistent presets not loaded from disk:', err);
  }

  // Fallback to local storage
  const local = loadPresets();
  // Migrate existing presets to disk
  try {
    await invoke('save_persistent_presets', { presetsJson: JSON.stringify(local) });
  } catch {}
  return local;
}

export function savePresets(presets: SavedPreset[]): void {
  if (typeof window === 'undefined') return;
  try {
    const jsonStr = JSON.stringify(presets);
    try {
      localStorage.setItem(STORAGE_KEY, jsonStr);
    } catch {}

    void invoke('save_persistent_presets', { presetsJson: jsonStr }).catch((err) => {
      console.warn('Failed to write presets to disk:', err);
    });
  } catch (e) {
    console.error('Failed to save presets:', e);
  }
}

