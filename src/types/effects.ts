import { RGBColor, KeyFrameColor, KeyDefinition } from './keyboard';

export type EffectType =
  | 'aurora'
  | 'ripple'
  | 'glitch'
  | 'matrix'
  | 'pixel_art'
  | 'pulse'
  | 'color_cycle'
  | 'starlight'
  | 'music_pulse'
  | 'zigzag_wave'
  | 'continuous_wave'
  | 'reactive_ripple'
  | 'key_flash'
  | 'snake_trail'
  | 'shockwave'
  | 'ember'
  | 'neighbor_glow'
  | 'typing_intensity'
  | 'electric_discharge'
  | 'flowing_curve'
  | 'thermal_heatmap'
  | 'gravity_drop'
  | 'laser_crosshair'
  | 'pong_bounce'
  | 'radar_sweep'
  | 'vortex_pinwheel'
  | 'lava_lamp'
  | 'raindrops'
  | 'screen_ambilight'
  | 'telemetry_bars'
  | 'spectrum_eq'
  | 'custom_zones'
  | 'afk_screensaver'
  | 'game_of_life'
  | 'pacman_arcade'
  | 'dvd_bounce'
  | 'wave_pond'
  | 'doom_fire'
  | 'plasma_shader'
  | 'lightning_storm'
  | 'event_horizon'
  | 'wpm_overdrive'
  | 'fireworks'
  | 'domino_topple'
  | 'crt_scanline'
  | 'dna_helix'
  | 'pomodoro_bar'
  | 'pathfinder_a_star'
  | 'sort_visualizer'
  | 'binary_counter'
  | 'boids_swarm'
  | 'magnetic_field'
  | 'solar_eclipse'
  | 'blizzard_drift'
  | 'ekg_heartbeat'
  | 'newtons_cradle'
  | 'frost_shatter'
  | 'combo_multiplier'
  | 'spotlight_lantern'
  | 'reaction_diffusion'
  | 'kaleidoscope'
  | 'voronoi_cells';

export interface AuroraParams {
  speed: number;            // 0.1 to 3.0
  brightness: number;       // 0 to 1
  gradientWidth: number;    // 0.5 to 3.0
  direction: number;        // 0 to 360 degrees
  palette: RGBColor[];      // Default Cyan, Blue, Purple
}

export interface RippleParams {
  speed: number;            // Wave propagation speed
  brightness: number;       // 0 to 1
  fadeDuration: number;     // Milliseconds
  maxRadius: number;        // Max wave distance (0 to 1.5 in norm units)
  waveColor: RGBColor;      // Color of expanding wave
}

export interface GlitchParams {
  speed: number;            // 0.1 to 3.0
  brightness: number;       // 0 to 1
  frequency: number;        // 0.1 to 1.0 (trigger probability)
  intensity: number;        // Cluster size (1 to 15 keys)
  duration: number;         // Milliseconds glitch remains active
  seed: number;             // Seed for pseudo-random reproducibility
  palette: RGBColor[];
}

export interface MatrixParams {
  speed: number;            // 0.1 to 3.0
  brightness: number;       // 0 to 1
  density: number;          // Column spawn chance (0.1 to 1.0)
  trailLength: number;      // Rows of trailing tail (1 to 5)
  intensity: number;        // Head brightness multiplier
  headColor: RGBColor;      // Bright lead color (e.g. #D4FFD4)
  trailColor: RGBColor;     // Green tail color (e.g. #00CC22)
  backgroundColor: RGBColor;// Background color (e.g. #000000)
}

export interface PixelArtFrame {
  id: string;
  pixels: Record<string, RGBColor>; // keyId -> RGBColor
}

export interface PixelArtParams {
  fps: number;              // 1 to 24 fps
  frames: PixelArtFrame[];
}

export interface PulseParams {
  speed: number;            // 0.1 to 3.0
  brightness: number;       // 0 to 1
  color: RGBColor;          // Deep crimson default
  minBrightness: number;    // 0.0 to 0.3
}

export interface ColorCycleParams {
  speed: number;
  brightness: number;
  spread: number;
}

export interface StarlightParams {
  speed: number;
  brightness: number;
  density: number;
  color: RGBColor;
  backgroundColor: RGBColor;
}

export interface ZigzagWaveParams {
  speed: number;              // 0.2 to 4.0 (travel speed along serpentine path)
  waveWidth: number;          // 0.04 to 0.35 (normalized width of wave head)
  trailLength: number;        // 0.05 to 0.60 (normalized length of fading trail)
  brightness: number;         // 0.1 to 1.0 (master brightness ceiling)
  colorMode: 'single' | 'two_color' | 'rainbow'; // Color scheme mode
  primaryColor: RGBColor;     // Wave-head color (or single color)
  secondaryColor: RGBColor;   // Trail-end color (for two-color gradient)
  rainbowMode?: boolean;      // Quick toggle for rainbow gradient
  backgroundGlow: boolean;    // Ambient lighting for keys outside active wave
  backgroundColor: RGBColor;  // Color for ambient background glow
  reverseStart: boolean;      // Start at end traveling backward
}

export interface MusicPulseParams {
  deviceId: string | null;
  sensitivity: number;
  bassResponse: number;
  midResponse: number;
  highResponse: number;
  beatDetection: boolean;
  intensity: number;
  speed: number;
  brightness: number;
  decayMs: number;
  idleBrightness: number;
  bassColor: RGBColor;
  midColor: RGBColor;
  highColor: RGBColor;
  idleColor: RGBColor;
  minFrequency: number;
  maxFrequency: number;
  bandCount: number;
  attackMs: number;
  releaseMs: number;
  noiseGate: number;
  peakHold: boolean;
  spectrumMode: 'radial_circle' | 'spectrum_bars' | 'spectrum_wave' | 'bass_impact' | 'full_spectrum';
  // Professional Concentric Radial Spectrum parameters
  coreColor?: RGBColor;       // Ring 0: Mint-White (#E0FFF4)
  innerColor?: RGBColor;      // Ring 1: Neon-Green (#00FF66)
  outerColor?: RGBColor;      // Ring 3: Violet (#9D00FF)
  ringCount?: number;         // Default 4 (Core, Inner, Middle, Outer)
  centerX?: number;           // Virtual center X (default 0.47 for G/H)
  centerY?: number;           // Virtual center Y (default 0.50 for row 2)
  pulseSpeed?: number;        // Outward wave propagation speed (default 2.4 units/sec)
  pulseWidth?: number;        // Outward wave thickness (default 0.18)
  pulseHoldMs?: number;       // Peak hold duration before pulse begins to decay (default 35ms)
  beatSensitivity?: number;   // Beat threshold multiplier (default 1.0)
  strongBeatThreshold?: number; // Minimum beat strength score [0.1 .. 1.0] to trigger an outward wave (default 0.35)
  strongBeatPolicy?: 'merge' | 'restart' | 'queue'; // Policy for incoming strong beats during an active wave (default 'merge')
  centerPulseDurationMs?: number; // Duration of center transition pulse in ms (default 70ms)
  continuousIntensity?: number; // Continuous audio spectrum intensity [0.0 .. 1.0] (0 = pure beat mode, default 0.35)
  pauseFrameBehavior?: 'freeze' | 'black'; // Behavior when playback pauses (default 'freeze')
  beatMinIntervalMs?: number; // Refractory interval in ms (default 100)
  maxBrightness?: number;     // Output ceiling clamp [0.1 .. 1.0] (default 1.0)
  adaptiveTiming?: boolean;   // Dynamically scale pulse propagation speed with estimated tempo (BPM)
  tempoSmoothing?: number;    // Smoothing factor for BPM transitions [0.05 .. 0.8] (default 0.25)
  bassMaxHz?: number;         // Upper limit for bass onset analysis (default 130 Hz)
  showDiagnostics?: boolean;  // Live audio-analysis diagnostics panel
}

export type MusicPulseState =
  | 'WAITING_FOR_STRONG_BEAT'
  | 'WAVE_OUTWARD'
  | 'CENTRE_PULSE'
  | 'PAUSED_FRAME';

export interface BeatCandidateLog {
  timestamp: number;
  flux: number;
  score: number;
  threshold: number;
  status: 'ACCEPTED' | 'REJECTED_THRESHOLD' | 'REJECTED_REFRACTORY' | 'REJECTED_WEAK' | 'REJECTED_SILENT';
  reason: string;
  timeSinceLastBeatMs: number;
}

export interface AudioAnalysis {
  status: 'inactive' | 'starting' | 'capturing' | 'silent' | 'error';
  deviceId: string | null;
  deviceName?: string | null;
  message: string | null;
  rms: number;
  rmsDbfs?: number;
  peakDbfs?: number;
  energyChange: number;
  bass: number;
  mids: number;
  highs: number;
  bands: number[];
  beat: boolean;
  beatStrength?: number;
  bassFlux?: number;
  adaptiveThreshold?: number;
  noiseFloor?: number;
  isGated?: boolean;
  updatedAt: number;
}

export interface AudioAnalyzerConfig {
  sensitivity: number;
  noiseGate: number;
  bandCount: number;
  minFrequency: number;
  maxFrequency: number;
  attackMs: number;
  releaseMs: number;
  beatMinIntervalMs?: number;
  beatSensitivity?: number;
  bassMaxHz?: number;
}

export interface ReactiveRippleParams {
  speed: number;        // Propagation speed (0.5 to 3.0)
  radius: number;       // Maximum radial span in physical units (2.0 to 18.0)
  color: RGBColor;      // Wave color
  intensity: number;    // Wave brightness multiplier (0.0 to 1.0)
  baseColor: RGBColor;  // Resting background color
}

export interface KeyFlashParams {
  flashColor: RGBColor;           // Peak illumination color
  holdDuration: number;          // Milliseconds to hold flash at peak
  fadeDuration: number;          // Milliseconds to smoothly fade down
  brightness: number;            // 0.0 to 1.0
  baseColor: RGBColor;           // Resting background color
  neighborGlow: boolean;         // Enable subtle ambient glow on adjacent keys
  neighborGlowIntensity: number; // Neighbor glow fraction (0.0 to 0.5)
}

export interface SnakeTrailParams {
  trailLength: number;  // Number of keys in trailing tail (2 to 12)
  trailColor: RGBColor; // Color of the moving snake
  speed: number;        // Key traversal speed in steps/sec (4 to 25)
  brightness: number;   // 0.0 to 1.0
  baseColor: RGBColor;  // Resting background color
}

export interface ShockwaveParams {
  ringColor: RGBColor;        // Leading shockwave ring color
  thickness: number;          // Sharp ring width in physical units (0.05 to 0.40)
  propagationSpeed: number;   // High-speed wave expansion factor (1.0 to 5.0)
  intensity: number;          // 0.0 to 1.0
  afterglowDuration: number;  // Milliseconds trailing afterglow persists (150 to 1200)
  baseColor: RGBColor;        // Resting background color
}

export interface EmberParams {
  coreColor: RGBColor;    // Incandescent yellow-white core
  emberColor: RGBColor;   // Burning flame orange
  glowSpread: number;     // Physical thermal spread radius (0.0 to 2.5)
  fadeDuration: number;   // Thermal cooling duration in milliseconds (400 to 2500)
  brightness: number;     // 0.0 to 1.0
  baseColor: RGBColor;    // Resting background color
}

export interface NeighborGlowParams {
  glowRadius: number;       // Physical radius in key units (1.2 to 5.0)
  propagationSpeed: number; // Radial expansion speed (1.0 to 5.0)
  fadeDuration: number;     // Fade duration in milliseconds (200 to 1200)
  color: RGBColor;          // Glow color
  brightness: number;       // 0.0 to 1.0
  baseColor: RGBColor;      // Resting background color
}

export interface TypingIntensityParams {
  idleColor: RGBColor;    // Resting / slow typing color
  activeColor: RGBColor;  // Fast typing activity color
  minBrightness: number;  // Idle brightness (0.0 to 0.5)
  maxBrightness: number;  // Peak typing brightness (0.5 to 1.0)
  responsiveness: number; // Dynamic attack factor (0.5 to 3.0)
  activityWindow: number; // Keystroke sliding window in seconds (1.0 to 5.0)
  idleDecayTime: number;  // Decay duration in seconds after typing ceases (1.0 to 6.0)
}

export interface ElectricDischargeParams {
  primaryColor: RGBColor;     // Main electric arc color (e.g. Electric Blue)
  highlightColor: RGBColor;   // Sharp lead spark color (e.g. Blue-White)
  branchCount: number;        // Number of branching arcs (1 to 4)
  propagationSpeed: number;   // Arc speed in keys/sec (10 to 45)
  flashDuration: number;      // Spark flash duration in milliseconds (100 to 600)
  brightness: number;         // 0.0 to 1.0
  baseColor: RGBColor;        // Resting background color
}

export interface ContinuousWaveParams {
  wavelength: number;      // Wavelength in normalized keyboard width (0.15 to 1.50)
  speed: number;           // Phase propagation speed in cycles/sec (0.2 to 4.0)
  amplitude: number;       // Peak-to-trough contrast multiplier (0.1 to 1.0)
  brightness: number;      // Global brightness scale (0.05 to 1.0)
  primaryColor: RGBColor;  // Wave crest/peak color
  secondaryColor: RGBColor;// Wave trough/valley color
  baseColor: RGBColor;     // Resting floor/background color
  useMulticolor: boolean;  // Rainbow / multicolor gradient option
  palette: RGBColor[];     // Multicolor gradient stops
}

export type SineWaveColorMode = 'rainbow' | 'single' | 'dual' | 'custom';
export type SineWavePaletteType = 'rainbow' | 'synthwave' | 'cyberpunk' | 'ocean' | 'fire' | 'custom';

export interface SineWaveParams {
  speed: number;             // Traveling speed in cycles/sec (0.2 to 3.0, default: 1.0)
  wavelength: number;        // Distance between peaks in keys (6.0 to 25.0, default: 15.0 ~ 1 keyboard width)
  colorMode: SineWaveColorMode;
  primaryColor: RGBColor;    // Single color, or dual-color crest (peak)
  secondaryColor: RGBColor;  // Dual-color trough (valley)
  customPalette: RGBColor[]; // Custom gradient stops
  amplitude?: number;        // Peak-to-trough height (default: 1.5 rows)
  waveThickness?: number;    // Width of illuminated band around sine curve (default: 1.15)
  direction?: 'left-to-right' | 'right-to-left';
  centerY?: number;          // Vertical center offset in key rows (default: 2.0)
  brightness?: number;       // Overall brightness multiplier (0.05 to 1.0, default: 1.0)
  baseColor?: RGBColor;      // Background resting color
  // Backward-compatibility aliases:
  paletteType?: SineWavePaletteType;
  palette?: RGBColor[];
  useMulticolor?: boolean;
  glowWidth?: number;
  travelSpeed?: number;
  curveOffset?: number;
  peakShape?: number;
  curveCount?: number;
  travelLength?: number;
  travelMode?: 'pulse' | 'stream' | 'segments';
  glowIntensity?: number;
  headIntensity?: number;
  trailIntensity?: number;
  fadeLength?: number;
  colorSoftness?: number;
}

export type FlowingCurveParams = SineWaveParams;

export interface ThermalHeatmapParams {
  brightness: number;
  decayRate: number;
  hitStrength: number;
  bleedStrength: number;
}

export interface GravityDropParams {
  brightness: number;
  speed: number;
  primaryColor: RGBColor;
}

export interface LaserCrosshairParams {
  brightness: number;
  beamDuration: number;
  primaryColor: RGBColor;
  baseColor: RGBColor;
}

export interface PongBounceParams {
  brightness: number;
  speed: number;
  primaryColor: RGBColor;
  trailLength: number;
}

export interface RadarSweepParams {
  brightness: number;
  speed: number;
  primaryColor: RGBColor;
  trailWidth: number;
}

export interface VortexPinwheelParams {
  brightness: number;
  speed: number;
  twist: number;
}

export interface LavaLampParams {
  brightness: number;
  speed: number;
  backgroundColor: RGBColor;
  foregroundColor: RGBColor;
  blobCount: number;
}

export interface RaindropsParams {
  brightness: number;
  speed: number;
  spawnInterval: number;
  maxRadius: number;
  primaryColor: RGBColor;
}

export interface ScreenAmbilightParams {
  brightness: number;
  smoothing: number;
}

export interface TelemetryBarsParams {
  brightness: number;
  pollInterval: number;
}

export interface SpectrumEQParams {
  brightness: number;
  sensitivity: number;
  primaryColor: RGBColor;
  useRainbow: boolean;
}

export type CustomZonePreset = 'gamer' | 'coder' | 'custom';

export interface CustomZonesParams {
  brightness: number;
  preset: CustomZonePreset;
  primaryColor: RGBColor;
  accentColor: RGBColor;
  dimLevel: number;
}

export type AfkScreensaverMode = 'aurora' | 'matrix_rain';

export interface AfkScreensaverParams {
  brightness: number;
  idleTimeout: number;
  crossfadeDuration: number;
  screensaverMode: AfkScreensaverMode;
  dimColor: RGBColor;
  dimLevel: number;
}

export interface GameOfLifeParams {
  brightness: number;
  speed: number;
  aliveColor: RGBColor;
  accentColor: RGBColor;
  fadeSpeed: number;
}

export interface PacmanArcadeParams {
  brightness: number;
  speed: number;
}

export interface DvdBounceParams {
  brightness: number;
  speed: number;
}

export interface WavePondParams {
  brightness: number;
  damping: number;
  speed: number;
}

export interface DoomFireParams {
  brightness: number;
  speed: number;
  coolingRate: number;
}

export interface PlasmaShaderParams {
  brightness: number;
  speed: number;
  mode: 'rainbow' | 'duo';
  primaryHue: number;
  secondaryHue: number;
}

export interface LightningStormParams {
  brightness: number;
  strikeInterval: number;
  boltColor: RGBColor;
}

export interface EventHorizonParams {
  brightness: number;
  speed: number;
}

export interface WpmOverdriveParams {
  brightness: number;
}

export interface FireworksParams {
  brightness: number;
  speed: number;
}

export interface DominoToppleParams {
  brightness: number;
  speed: number;
  dominoColor: RGBColor;
}

export interface CrtScanlineParams {
  brightness: number;
  speed: number;
  scanColor: RGBColor;
}

export interface DnaHelixParams {
  brightness: number;
  speed: number;
}

export interface PomodoroBarParams {
  brightness: number;
  durationMinutes: number;
  isRunning: boolean;
}

export interface PathfinderAStarParams {
  brightness: number;
  speed: number;
  primaryColor: RGBColor;
  secondaryColor: RGBColor;
  goalColor: RGBColor;
  obstacleColor: RGBColor;
}

export interface SortVisualizerParams {
  brightness: number;
  speed: number;
  primaryColor: RGBColor;
  secondaryColor: RGBColor;
  backgroundColor: RGBColor;
}

export interface BinaryCounterParams {
  brightness: number;
  speed: number;
  primaryColor: RGBColor;
  secondaryColor: RGBColor;
}

export interface BoidsSwarmParams {
  brightness: number;
  speed: number;
  primaryColor: RGBColor;
  secondaryColor: RGBColor;
  colorMode: 'palette' | 'rainbow';
}

export interface MagneticFieldParams {
  brightness: number;
  speed: number;
  primaryColor: RGBColor;
  secondaryColor: RGBColor;
}

export interface SolarEclipseParams {
  brightness: number;
  speed: number;
  primaryColor: RGBColor;
  secondaryColor: RGBColor;
}

export interface BlizzardDriftParams {
  brightness: number;
  speed: number;
  primaryColor: RGBColor;
  secondaryColor: RGBColor;
}

export interface EkgHeartbeatParams {
  brightness: number;
  speed: number;
  primaryColor: RGBColor;
  secondaryColor: RGBColor;
}

export interface NewtonsCradleParams {
  brightness: number;
  speed: number;
  primaryColor: RGBColor;
  secondaryColor: RGBColor;
}

export interface FrostShatterParams {
  brightness: number;
  speed: number;
  primaryColor: RGBColor;
  secondaryColor: RGBColor;
  backgroundColor: RGBColor;
}

export interface ComboMultiplierParams {
  brightness: number;
  speed: number;
  primaryColor: RGBColor;
  secondaryColor: RGBColor;
  overdriveColor: RGBColor;
}

export interface SpotlightLanternParams {
  brightness: number;
  speed: number;
  primaryColor: RGBColor;
  secondaryColor: RGBColor;
}

export interface ReactionDiffusionParams {
  brightness: number;
  speed: number;
  primaryColor: RGBColor;
  secondaryColor: RGBColor;
}

export interface KaleidoscopeParams {
  brightness: number;
  speed: number;
  primaryColor: RGBColor;
  secondaryColor: RGBColor;
  colorMode: 'palette' | 'rainbow';
}

export interface VoronoiCellsParams {
  brightness: number;
  speed: number;
  primaryColor: RGBColor;
  secondaryColor: RGBColor;
  borderColor: RGBColor;
}

export type AnyEffectParams =
  | AuroraParams
  | RippleParams
  | GlitchParams
  | MatrixParams
  | PixelArtParams
  | PulseParams
  | ColorCycleParams
  | StarlightParams
  | MusicPulseParams
  | ZigzagWaveParams
  | ContinuousWaveParams
  | SineWaveParams
  | ReactiveRippleParams
  | KeyFlashParams
  | SnakeTrailParams
  | ShockwaveParams
  | EmberParams
  | NeighborGlowParams
  | TypingIntensityParams
  | ElectricDischargeParams
  | ThermalHeatmapParams
  | GravityDropParams
  | LaserCrosshairParams
  | PongBounceParams
  | RadarSweepParams
  | VortexPinwheelParams
  | LavaLampParams
  | RaindropsParams
  | ScreenAmbilightParams
  | TelemetryBarsParams
  | SpectrumEQParams
  | CustomZonesParams
  | AfkScreensaverParams
  | GameOfLifeParams
  | PacmanArcadeParams
  | DvdBounceParams
  | WavePondParams
  | DoomFireParams
  | PlasmaShaderParams
  | LightningStormParams
  | EventHorizonParams
  | WpmOverdriveParams
  | FireworksParams
  | DominoToppleParams
  | CrtScanlineParams
  | DnaHelixParams
  | PomodoroBarParams
  | PathfinderAStarParams
  | SortVisualizerParams
  | BinaryCounterParams
  | BoidsSwarmParams
  | MagneticFieldParams
  | SolarEclipseParams
  | BlizzardDriftParams
  | EkgHeartbeatParams
  | NewtonsCradleParams
  | FrostShatterParams
  | ComboMultiplierParams
  | SpotlightLanternParams
  | ReactionDiffusionParams
  | KaleidoscopeParams
  | VoronoiCellsParams;

export interface AnimationContext {
  keys: KeyDefinition[];
  totalTime: number; // Seconds since playback start
  dt: number;        // Seconds since last frame
  audio?: AudioAnalysis;
}

export interface ILightingEffect {
  readonly type: EffectType;
  readonly name: string;
  update(ctx: AnimationContext): KeyFrameColor;
  onKeyDown?(code: string): void;
  reset(): void;
}

export interface SavedPreset {
  id: string;
  name: string;
  effectType: EffectType;
  version: number;
  params: AnyEffectParams;
  createdAt: string;
  updatedAt: string;
}
