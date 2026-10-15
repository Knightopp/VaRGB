import React, { useState } from 'react';
import { EffectType, AnyEffectParams, SavedPreset } from '../types/effects';
import { RGBColor } from '../types/keyboard';
import { EFFECT_REGISTRY } from '../engine/registry';
import { EFFECT_DISPLAY_METAS } from '../engine/effectMetadata';
import { VirtualKeyboard } from './VirtualKeyboard';
import { EffectControls } from './EffectControls';
import { ReactiveInputEngine } from '../engine/input/reactiveInputEngine';
import { rgbToHex, hexToRgb } from '../engine/color';
import type { AnimationEngine } from '../engine/animator';
import { KeyboardVisualTheme, GapLightingMode, saveSettings } from '../services/settings';
import {
  Star,
  RotateCcw,
  Save,
  ChevronDown,
  Activity,
  Sun,
  ArrowLeftRight,
  Palette,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Check,
  Radio,
  Play,
  Pause,
  Square,
  Bookmark,
} from 'lucide-react';

interface ModernLightingWorkspaceProps {
  currentType: EffectType;
  params: AnyEffectParams;
  engine: AnimationEngine | null;
  onParamsChange: (newParams: AnyEffectParams) => void;
  onResetDefaults: () => void;
  onSavePreset: (name: string) => void;
  presets?: SavedPreset[];
  activePresetId?: string;
  onApplyPreset?: (preset: SavedPreset) => void;
  onDuplicatePreset?: (preset: SavedPreset) => void;
  onDeletePreset?: (id: string) => void;
  hardwareEnabled?: boolean;
  onToggleHardware?: () => void;
  isPlaying?: boolean;
  isPaused?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
}

export const ModernLightingWorkspace: React.FC<ModernLightingWorkspaceProps> = ({
  currentType,
  params,
  engine,
  onParamsChange,
  onResetDefaults,
  onSavePreset,
  presets = [],
  activePresetId,
  onApplyPreset,
  onDuplicatePreset,
  onDeletePreset,
  hardwareEnabled = false,
  onToggleHardware,
  isPlaying = true,
  isPaused = false,
  onPlay,
  onPause,
  onStop,
}) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showPresetsDropdown, setShowPresetsDropdown] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');
  const [selectedDirection, setSelectedDirection] = useState<'ltr' | 'rtl' | 'center' | 'random'>('ltr');
  const [selectedColorMode, setSelectedColorMode] = useState<'auto' | 'custom' | 'gradient' | 'single'>('auto');

  const meta = EFFECT_DISPLAY_METAS[currentType];
  const registryMeta = EFFECT_REGISTRY[currentType];
  const effectName = meta?.name || registryMeta?.name || currentType;
  const categoryLabel = meta?.categoryLabel || 'Ambient';
  const effectDesc = registryMeta?.description || meta?.shortDesc || 'Smooth, flowing color waves across your keyboard.';

  // 1. Smart Speed extraction across all parameter variants
  let rawSpeed = (params as any).speed;
  if (typeof rawSpeed !== 'number') {
    if (typeof (params as any).beamDuration === 'number') {
      // 0.10s (fast) to 1.0s (slow) -> mapped to speed ~ 0.2 to 2.4
      rawSpeed = Math.max(0.1, (1.05 - (params as any).beamDuration) * 2.5);
    } else if (typeof (params as any).twinkleSpeed === 'number') {
      rawSpeed = (params as any).twinkleSpeed;
    } else if (typeof (params as any).propagationSpeed === 'number') {
      rawSpeed = (params as any).propagationSpeed / 16;
    } else if (typeof (params as any).fadeDuration === 'number') {
      rawSpeed = 1500 / Math.max(100, (params as any).fadeDuration);
    } else if (typeof (params as any).stepSpeed === 'number') {
      rawSpeed = (params as any).stepSpeed;
    } else if (typeof (params as any).rotationSpeed === 'number') {
      rawSpeed = (params as any).rotationSpeed;
    } else if (typeof (params as any).flameSpeed === 'number') {
      rawSpeed = (params as any).flameSpeed;
    } else {
      rawSpeed = 1.0;
    }
  }
  const speedPercent = Math.min(100, Math.max(10, Math.round((rawSpeed / 2.0) * 100)));

  // 2. Smart Brightness extraction across all variants
  let rawBrightness = (params as any).brightness;
  if (typeof rawBrightness !== 'number') {
    if (typeof (params as any).maxBrightness === 'number') {
      rawBrightness = (params as any).maxBrightness;
    } else if (typeof (params as any).intensity === 'number') {
      rawBrightness = Math.min(1.0, (params as any).intensity / 10);
    } else {
      rawBrightness = 0.8;
    }
  }
  const brightnessPercent = Math.min(100, Math.max(0, Math.round(rawBrightness * 100)));

  // Smart Speed Change Handler
  const handleSpeedChange = (val: number) => {
    const normalized = Math.max(0.1, Number((val / 50).toFixed(2)));
    const updated: any = { ...params, speed: normalized };

    if ('beamDuration' in params) {
      updated.beamDuration = Math.max(0.10, Number((0.95 - (val / 100) * 0.80).toFixed(2)));
    }
    if ('twinkleSpeed' in params) updated.twinkleSpeed = normalized;
    if ('propagationSpeed' in params) updated.propagationSpeed = Math.round(val * 0.4);
    if ('fadeDuration' in params) updated.fadeDuration = Math.round(3000 - (val / 100) * 2500);
    if ('flameSpeed' in params) updated.flameSpeed = normalized;
    if ('stepSpeed' in params) updated.stepSpeed = normalized;
    if ('rotationSpeed' in params) updated.rotationSpeed = normalized;
    if ('sweepSpeed' in params) updated.sweepSpeed = normalized;
    if ('sparkFrequency' in params) updated.sparkFrequency = normalized;
    if ('swimSpeed' in params) updated.swimSpeed = normalized;
    if ('shatterSpeed' in params) updated.shatterSpeed = normalized;
    if ('swingPeriod' in params) updated.swingPeriod = Math.max(0.4, Number((2.5 - (val / 100) * 1.8).toFixed(2)));

    onParamsChange(updated);
  };

  // Smart Brightness Change Handler
  const handleBrightnessChange = (val: number) => {
    const normalized = Math.max(0, Math.min(1, Number((val / 100).toFixed(2))));
    const updated: any = { ...params, brightness: normalized };

    if ('maxBrightness' in params) updated.maxBrightness = normalized;
    if ('intensity' in params) updated.intensity = Math.max(1, Math.round((val / 100) * 15));
    if ('glowIntensity' in params) updated.glowIntensity = normalized;

    onParamsChange(updated);
  };

  const handleDirectionSelect = (dir: 'ltr' | 'rtl' | 'center' | 'random') => {
    setSelectedDirection(dir);
    let angle = 0;
    if (dir === 'ltr') angle = 0;
    if (dir === 'rtl') angle = 180;
    if (dir === 'center') angle = 90;
    if (dir === 'random') angle = Math.floor(Math.random() * 360);

    if ('direction' in params) {
      const currentDir = (params as any).direction;
      const val = typeof currentDir === 'number'
        ? angle
        : dir === 'rtl' ? 'right-to-left' : 'left-to-right';
      onParamsChange({
        ...params,
        direction: val as any,
      });
    }
  };

  const handleColorModeSelect = (mode: 'auto' | 'custom' | 'gradient' | 'single') => {
    setSelectedColorMode(mode);
    if (mode === 'single') {
      const singleColor = (paletteColors[0]) || { r: 139, g: 92, b: 246 };
      if ('color' in params) {
        onParamsChange({ ...params, color: singleColor });
      }
    }
  };

  // Smart Color Palette extraction: inspects all possible color properties
  const paletteColors: RGBColor[] = Array.isArray((params as any).palette)
    ? (params as any).palette
    : (params as any).primaryColor
    ? [
        (params as any).primaryColor,
        ...((params as any).secondaryColor ? [(params as any).secondaryColor] : []),
        ...((params as any).baseColor ? [(params as any).baseColor] : []),
      ]
    : (params as any).color
    ? [(params as any).color]
    : (params as any).flashColor
    ? [(params as any).flashColor, ...((params as any).baseColor ? [(params as any).baseColor] : [])]
    : (params as any).waveColor
    ? [(params as any).waveColor]
    : (params as any).ringColor
    ? [(params as any).ringColor, ...((params as any).baseColor ? [(params as any).baseColor] : [])]
    : (params as any).dominoColor
    ? [(params as any).dominoColor]
    : (params as any).sparkColor
    ? [(params as any).sparkColor]
    : (params as any).emberColor
    ? [(params as any).emberColor]
    : (params as any).aliveColor
    ? [(params as any).aliveColor]
    : (params as any).frostColor
    ? [(params as any).frostColor]
    : [
        { r: 59, g: 130, b: 246 },
        { r: 6, g: 182, b: 212 },
        { r: 139, g: 92, b: 246 },
        { r: 236, g: 72, b: 153 },
      ];

  // Smart Color Change Handler: updates whatever color properties the active effect uses
  const handleColorChange = (index: number, newHex: string) => {
    const rgb = hexToRgb(newHex);
    const updated: any = { ...params };

    if (Array.isArray(updated.palette)) {
      const nextPalette = [...updated.palette];
      nextPalette[index] = rgb;
      updated.palette = nextPalette;
    }
    if ('color' in updated) updated.color = rgb;
    if ('primaryColor' in updated && index === 0) updated.primaryColor = rgb;
    if ('secondaryColor' in updated && index === 1) updated.secondaryColor = rgb;
    if ('flashColor' in updated && index === 0) updated.flashColor = rgb;
    if ('waveColor' in updated) updated.waveColor = rgb;
    if ('ringColor' in updated && index === 0) updated.ringColor = rgb;
    if ('dominoColor' in updated) updated.dominoColor = rgb;
    if ('sparkColor' in updated) updated.sparkColor = rgb;
    if ('emberColor' in updated) updated.emberColor = rgb;
    if ('aliveColor' in updated) updated.aliveColor = rgb;
    if ('frostColor' in updated) updated.frostColor = rgb;
    if (
      'baseColor' in updated &&
      (index > 0 || !('primaryColor' in updated || 'flashColor' in updated || 'ringColor' in updated))
    ) {
      updated.baseColor = rgb;
    }

    onParamsChange(updated);
  };

  // Smart Background / Base Color extraction
  const rawBackgroundColor: RGBColor =
    (params as any).backgroundColor ||
    (params as any).baseColor ||
    (params as any).idleColor ||
    (params as any).bgColor ||
    { r: 0, g: 0, b: 0 };

  const isBackgroundBlack =
    rawBackgroundColor.r === 0 &&
    rawBackgroundColor.g === 0 &&
    rawBackgroundColor.b === 0;

  const handleBackgroundColorChange = (newColor: RGBColor) => {
    const updated: any = {
      ...params,
      backgroundColor: newColor,
      baseColor: newColor,
    };
    if ('idleColor' in params) {
      updated.idleColor = newColor;
    }
    if ('bgColor' in params) {
      updated.bgColor = newColor;
    }
    onParamsChange(updated);
  };

  const handleAddColor = () => {
    const defaultNewColor = { r: 16, g: 185, b: 129 }; // Emerald green
    if (Array.isArray((params as any).palette)) {
      onParamsChange({
        ...params,
        palette: [...(params as any).palette, defaultNewColor],
      });
    } else {
      onParamsChange({
        ...params,
        palette: [...paletteColors, defaultNewColor],
      });
    }
  };

  const handleSaveSubmit = () => {
    if (!presetNameInput.trim()) return;
    onSavePreset(presetNameInput.trim());
    setPresetNameInput('');
    setShowSaveModal(false);
  };

  const [kbTheme, setKbTheme] = useState<KeyboardVisualTheme>(() => {
    return (typeof window !== 'undefined' ? (localStorage.getItem('vargb_kb_theme') as KeyboardVisualTheme) || 'mechanical' : 'mechanical');
  });
  const [kbGapLighting, setKbGapLighting] = useState<GapLightingMode>(() => {
    return (typeof window !== 'undefined' ? (localStorage.getItem('vargb_kb_gap_lighting') as GapLightingMode) || 'vivid' : 'vivid');
  });

  const handleThemeChange = (newTheme: KeyboardVisualTheme) => {
    setKbTheme(newTheme);
    localStorage.setItem('vargb_kb_theme', newTheme);
    saveSettings({ keyboardTheme: newTheme });
    window.dispatchEvent(new Event('vargb_kb_theme_change'));
  };

  const handleGapLightingChange = (newGap: GapLightingMode) => {
    setKbGapLighting(newGap);
    localStorage.setItem('vargb_kb_gap_lighting', newGap);
    saveSettings({ gapLighting: newGap });
    window.dispatchEvent(new Event('vargb_kb_theme_change'));
  };

  const effectPresets = presets.filter((p) => p.effectType === currentType);

  return (
    <div className="modern-lighting-workspace">
      {/* Top Header */}
      <div className="workspace-header">
        <div className="workspace-title-area">
          <div className="workspace-heading-row">
            <h1 className="workspace-effect-title">{effectName}</h1>
            <span className="workspace-category-pill">{categoryLabel}</span>
          </div>
          <p className="workspace-effect-desc">{effectDesc}</p>
        </div>

        <div className="workspace-header-actions">
          {/* Quick Hardware Indicator */}
          {onToggleHardware && (
            <button
              className={`workspace-hw-pill ${hardwareEnabled ? 'enabled' : 'disabled'}`}
              onClick={onToggleHardware}
              title={hardwareEnabled ? 'Hardware USB stream active' : 'Simulation mode (USB muted)'}
            >
              <Radio size={12} className={hardwareEnabled ? 'pulse-icon' : ''} />
              <span>{hardwareEnabled ? 'USB ON' : 'USB Off'}</span>
            </button>
          )}

          {/* Quick Play/Pause & Stop */}
          {onPlay && onPause && (
            <button
              className="icon-btn workspace-play-btn"
              onClick={isPlaying && !isPaused ? onPause : onPlay}
              title={isPlaying && !isPaused ? 'Pause Lighting' : 'Resume Lighting'}
            >
              {isPlaying && !isPaused ? <Pause size={14} /> : <Play size={14} />}
            </button>
          )}

          {onStop && (
            <button
              className="icon-btn workspace-play-btn"
              onClick={onStop}
              title="Stop Animation (Turn Off LEDs)"
            >
              <Square size={13} />
            </button>
          )}

          {/* Favorite Toggle */}
          <button
            className={`icon-btn workspace-fav-btn ${isFavorite ? 'favorited' : ''}`}
            onClick={() => setIsFavorite(!isFavorite)}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star size={14} fill={isFavorite ? '#FACC15' : 'none'} color={isFavorite ? '#FACC15' : 'currentColor'} />
          </button>

          {/* Reset to Defaults */}
          <button
            className="action-btn workspace-reset-btn"
            onClick={onResetDefaults}
            title="Reset to default settings"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>

          {/* Save Preset Split Button */}
          <div className="save-preset-split-container">
            <button
              className="action-btn primary workspace-save-btn"
              onClick={() => setShowSaveModal(true)}
              title="Save current parameters as custom preset"
            >
              <Save size={13} />
              <span>Save Preset</span>
            </button>

            <button
              className="action-btn primary dropdown-arrow-btn"
              onClick={() => setShowPresetsDropdown(!showPresetsDropdown)}
              title="Select saved preset"
            >
              <ChevronDown size={13} />
            </button>

            {showPresetsDropdown && (
              <div className="presets-dropdown-menu">
                <div className="dropdown-menu-header">Saved Presets</div>
                {effectPresets.length === 0 ? (
                  <div className="dropdown-empty-item">No saved presets for this effect</div>
                ) : (
                  effectPresets.map((preset) => (
                    <button
                      key={preset.id}
                      className={`dropdown-menu-item ${preset.id === activePresetId ? 'active' : ''}`}
                      onClick={() => {
                        onApplyPreset && onApplyPreset(preset);
                        setShowPresetsDropdown(false);
                      }}
                    >
                      <span>{preset.name}</span>
                      {preset.id === activePresetId && <Check size={12} />}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inline Save Preset Modal */}
      {showSaveModal && (
        <div className="workspace-save-modal">
          <div className="save-modal-card">
            <h3>Save Preset</h3>
            <p>Save current {effectName} parameters</p>
            <input
              type="text"
              placeholder="e.g. Neon Horizon Synth"
              value={presetNameInput}
              onChange={(e) => setPresetNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveSubmit()}
              autoFocus
            />
            <div className="save-modal-actions">
              <button className="primary" onClick={handleSaveSubmit}>Save</button>
              <button onClick={() => setShowSaveModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW Section */}
      <div className="workspace-preview-section">
        <div className="preview-section-header">
          <div className="preview-section-title-wrap">
            <span className="preview-section-label">PREVIEW</span>
            <span className="preview-kb-badge">Redragon K630</span>
          </div>

          <div className="preview-style-bar">
            {/* Visual Style Selector */}
            <div className="preview-chip-group">
              <span className="chip-group-label">Style:</span>
              <div className="chip-pill-container">
                <button
                  type="button"
                  className={`chip-pill ${kbTheme === 'mechanical' ? 'active' : ''}`}
                  onClick={() => handleThemeChange('mechanical')}
                  title="3D sculpted mechanical keycaps with realistic switch underglow"
                >
                  3D Mechanical
                </button>
                <button
                  type="button"
                  className={`chip-pill ${kbTheme === 'classic' ? 'active' : ''}`}
                  onClick={() => handleThemeChange('classic')}
                  title="Change back to original flat keys with glowing border outlines"
                >
                  Classic Flat
                </button>
                <button
                  type="button"
                  className={`chip-pill ${kbTheme === 'pudding' ? 'active' : ''}`}
                  onClick={() => handleThemeChange('pudding')}
                  title="Dual-layer translucent pudding keycaps"
                >
                  Pudding
                </button>
                <button
                  type="button"
                  className={`chip-pill ${kbTheme === 'stealth' ? 'active' : ''}`}
                  onClick={() => handleThemeChange('stealth')}
                  title="Stealth matte black keycaps"
                >
                  Stealth
                </button>
              </div>
            </div>

            {/* Gap Lights Selector */}
            <div className="preview-chip-group">
              <span className="chip-group-label">Gaps:</span>
              <div className="chip-pill-container">
                <button
                  type="button"
                  className={`chip-pill ${kbGapLighting === 'vivid' ? 'active' : ''}`}
                  onClick={() => handleGapLightingChange('vivid')}
                  title="Vivid RGB light shining through gaps between keys"
                >
                  Vivid
                </button>
                <button
                  type="button"
                  className={`chip-pill ${kbGapLighting === 'subtle' ? 'active' : ''}`}
                  onClick={() => handleGapLightingChange('subtle')}
                  title="Subtle diffuse underglow in gaps"
                >
                  Subtle
                </button>
                <button
                  type="button"
                  className={`chip-pill ${kbGapLighting === 'off' ? 'active' : ''}`}
                  onClick={() => handleGapLightingChange('off')}
                  title="Turn off gap underglow (legends only)"
                >
                  Off
                </button>
              </div>
            </div>

            {/* Revert / Reset Button */}
            {(kbTheme !== 'mechanical' || kbGapLighting !== 'vivid') && (
              <button
                type="button"
                className="chip-revert-btn"
                onClick={() => {
                  handleThemeChange('mechanical');
                  handleGapLightingChange('vivid');
                }}
                title="Reset keyboard appearance to default"
              >
                <RotateCcw size={11} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Ambient Halo & Virtual Keyboard */}
        <div className="preview-keyboard-wrapper">
          {/* Dynamic RGB Aura Glow Behind Keyboard */}
          <div
            className="keyboard-ambient-halo"
            style={{
              background: `radial-gradient(ellipse at 50% 50%, ${meta?.themeColor || '#8B5CF6'}44 0%, #06B6D433 35%, #EC489922 65%, transparent 75%)`,
            }}
          />

          <VirtualKeyboard
            engine={engine}
            effectType={currentType}
            theme={kbTheme}
            gapLighting={kbGapLighting}
            onKeyClick={(key) => {
              ReactiveInputEngine.getInstance().handleRawKeyEvent(key.code);
              const activeEff = engine?.getEffect();
              if (activeEff && activeEff.onKeyDown) {
                activeEff.onKeyDown(key.code);
              }
            }}
          />
        </div>
      </div>

      {/* Effect Settings Section */}
      <div className="workspace-settings-section">
        <div className="settings-section-header">
          <h2 className="settings-section-title">Effect Settings</h2>
        </div>

        <div className="settings-controls-grid">
          {/* Speed Slider */}
          <div className="setting-row">
            <div className="setting-label-group">
              <Activity size={16} className="setting-icon" />
              <span className="setting-label">Speed</span>
            </div>
            <div className="setting-input-group">
              <input
                type="range"
                min="10"
                max="100"
                value={speedPercent}
                onChange={(e) => handleSpeedChange(Number(e.target.value))}
                className="modern-slider"
              />
              <span className="setting-value-badge">{speedPercent}%</span>
            </div>
          </div>

          {/* Brightness Slider */}
          <div className="setting-row">
            <div className="setting-label-group">
              <Sun size={16} className="setting-icon" />
              <span className="setting-label">Brightness</span>
            </div>
            <div className="setting-input-group">
              <input
                type="range"
                min="0"
                max="100"
                value={brightnessPercent}
                onChange={(e) => handleBrightnessChange(Number(e.target.value))}
                className="modern-slider"
              />
              <span className="setting-value-badge">{brightnessPercent}%</span>
            </div>
          </div>

          {/* Direction Segmented Control */}
          <div className="setting-row">
            <div className="setting-label-group">
              <ArrowLeftRight size={16} className="setting-icon" />
              <span className="setting-label">Direction</span>
            </div>
            <div className="segmented-pill-group">
              <button
                className={`segmented-pill ${selectedDirection === 'ltr' ? 'active' : ''}`}
                onClick={() => handleDirectionSelect('ltr')}
              >
                Left → Right
              </button>
              <button
                className={`segmented-pill ${selectedDirection === 'rtl' ? 'active' : ''}`}
                onClick={() => handleDirectionSelect('rtl')}
              >
                Right → Left
              </button>
              <button
                className={`segmented-pill ${selectedDirection === 'center' ? 'active' : ''}`}
                onClick={() => handleDirectionSelect('center')}
              >
                Center Out
              </button>
              <button
                className={`segmented-pill ${selectedDirection === 'random' ? 'active' : ''}`}
                onClick={() => handleDirectionSelect('random')}
              >
                Random
              </button>
            </div>
          </div>

          {/* Preset Selector */}
          <div className="setting-row">
            <div className="setting-label-group">
              <Bookmark size={16} className="setting-icon" />
              <span className="setting-label">Presets</span>
            </div>
            <div className="presets-pill-group">
              {effectPresets.length === 0 ? (
                <div className="no-presets-hint">
                  <span>Custom parameters active</span>
                  <button
                    className="save-current-preset-btn"
                    onClick={() => setShowSaveModal(true)}
                  >
                    <Plus size={11} /> Save as Preset
                  </button>
                </div>
              ) : (
                <div className="presets-scroll-chips">
                  {effectPresets.map((preset) => {
                    const isActive = preset.id === activePresetId;
                    return (
                      <button
                        key={preset.id}
                        className={`preset-selector-pill ${isActive ? 'active' : ''}`}
                        onClick={() => onApplyPreset && onApplyPreset(preset)}
                        title={`Apply preset "${preset.name}"`}
                      >
                        <span className="preset-pill-text">{preset.name}</span>
                        {isActive && <Check size={11} className="preset-pill-check" />}
                      </button>
                    );
                  })}
                  <button
                    className="save-current-preset-btn"
                    onClick={() => setShowSaveModal(true)}
                    title="Save current parameter settings as a new preset"
                  >
                    <Plus size={11} />
                    <span>Save New</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Color Mode Segmented Control */}
          <div className="setting-row">
            <div className="setting-label-group">
              <Palette size={16} className="setting-icon" />
              <span className="setting-label">Color Mode</span>
            </div>
            <div className="segmented-pill-group">
              <button
                className={`segmented-pill ${selectedColorMode === 'auto' ? 'active' : ''}`}
                onClick={() => handleColorModeSelect('auto')}
              >
                Auto
              </button>
              <button
                className={`segmented-pill ${selectedColorMode === 'custom' ? 'active' : ''}`}
                onClick={() => handleColorModeSelect('custom')}
              >
                Custom
              </button>
              <button
                className={`segmented-pill ${selectedColorMode === 'gradient' ? 'active' : ''}`}
                onClick={() => handleColorModeSelect('gradient')}
              >
                Gradient
              </button>
              <button
                className={`segmented-pill ${selectedColorMode === 'single' ? 'active' : ''}`}
                onClick={() => handleColorModeSelect('single')}
              >
                Single
              </button>
            </div>
          </div>

          {/* Color Palette Swatches */}
          <div className="setting-row palette-row">
            <div className="setting-label-group">
              <span className="setting-label palette-label">Color Palette</span>
            </div>
            <div className="palette-swatches-container">
              <div className="swatches-list">
                {paletteColors.map((color, idx) => (
                  <label
                    key={idx}
                    className="palette-swatch-circle"
                    style={{ backgroundColor: rgbToHex(color) }}
                    title={`RGB(${color.r}, ${color.g}, ${color.b}) - Click to change`}
                  >
                    <input
                      type="color"
                      value={rgbToHex(color)}
                      onChange={(e) => handleColorChange(idx, e.target.value)}
                      className="swatch-color-input"
                    />
                  </label>
                ))}

                <button
                  className="add-color-swatch-btn"
                  onClick={handleAddColor}
                  title="Add color to palette"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Decorative Accent Sparkle */}
              <div className="palette-accent-sparkle" title="RGB Harmonic Spectrum">
                <Sparkles size={18} />
              </div>
            </div>
          </div>

          {/* Background / Base Color Setting Row */}
          <div className="setting-row background-color-row">
            <div className="setting-label-group">
              <Square size={16} className="setting-icon" />
              <span className="setting-label">Background / Base</span>
            </div>
            <div className="background-color-controls">
              <div className="bg-swatch-picker-group">
                <label
                  className="palette-swatch-circle bg-swatch-circle"
                  style={{ backgroundColor: rgbToHex(rawBackgroundColor) }}
                  title={`Background RGB(${rawBackgroundColor.r}, ${rawBackgroundColor.g}, ${rawBackgroundColor.b}) - Click to pick color`}
                >
                  <input
                    type="color"
                    value={rgbToHex(rawBackgroundColor)}
                    onChange={(e) => handleBackgroundColorChange(hexToRgb(e.target.value))}
                    className="swatch-color-input"
                  />
                </label>
                <span className="bg-hex-code">{rgbToHex(rawBackgroundColor).toUpperCase()}</span>
              </div>

              {/* Quick Preset Buttons with Pure Black Default */}
              <div className="bg-quick-presets">
                <button
                  type="button"
                  className={`bg-preset-chip ${isBackgroundBlack ? 'active' : ''}`}
                  onClick={() => handleBackgroundColorChange({ r: 0, g: 0, b: 0 })}
                  title="Pure Black (0, 0, 0) - Turn background LEDs completely off"
                >
                  <span className="bg-chip-dot black" />
                  <span>Pure Black (Off)</span>
                  {isBackgroundBlack && <Check size={12} className="bg-chip-check" />}
                </button>

                <button
                  type="button"
                  className={`bg-preset-chip ${rgbToHex(rawBackgroundColor).toLowerCase() === '#000b1a' ? 'active' : ''}`}
                  onClick={() => handleBackgroundColorChange({ r: 0, g: 11, b: 26 })}
                  title="Dark Navy tint (#000B1A)"
                >
                  <span className="bg-chip-dot navy" />
                  <span>Dark Navy</span>
                </button>

                <button
                  type="button"
                  className={`bg-preset-chip ${rgbToHex(rawBackgroundColor).toLowerCase() === '#10001a' ? 'active' : ''}`}
                  onClick={() => handleBackgroundColorChange({ r: 16, g: 0, b: 26 })}
                  title="Dark Violet tint (#10001A)"
                >
                  <span className="bg-chip-dot violet" />
                  <span>Dark Violet</span>
                </button>

                <button
                  type="button"
                  className={`bg-preset-chip ${rgbToHex(rawBackgroundColor).toLowerCase() === '#0a0a0a' ? 'active' : ''}`}
                  onClick={() => handleBackgroundColorChange({ r: 10, g: 10, b: 10 })}
                  title="Charcoal tint (#0A0A0A)"
                >
                  <span className="bg-chip-dot charcoal" />
                  <span>Charcoal</span>
                </button>
              </div>
            </div>
          </div>

          {/* Dedicated Effect Fine-Tuning & Custom Parameters */}
          <div className="workspace-finetune-card">
            <div className="finetune-header-row">
              <SlidersHorizontal size={14} className="finetune-icon" />
              <span className="finetune-title">{effectName} Fine-Tuning</span>
            </div>
            <EffectControls
              currentType={currentType}
              params={params}
              onParamsChange={onParamsChange}
              presets={presets}
              activePresetId={activePresetId}
              onApplyPreset={onApplyPreset}
              onSavePreset={onSavePreset}
              onDuplicatePreset={onDuplicatePreset}
              onDeletePreset={onDeletePreset}
              embeddedMode={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
