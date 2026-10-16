import React, { useState, useEffect } from 'react';
import { EffectType, AnyEffectParams, SavedPreset } from '../types/effects';
import { RGBColor } from '../types/keyboard';
import { EFFECT_REGISTRY } from '../engine/registry';
import { rgbToHex, hexToRgb } from '../engine/color';
import { RotateCcw, Save, Compass, SlidersHorizontal, Sun, Zap, Plus, Copy, Trash2, Bookmark, Monitor, Moon } from 'lucide-react';
import { MusicPulseSettings } from './MusicPulseSettings';
import { screenCaptureService } from '../engine/effects/screenAmbilight';

interface EffectControlsProps {
  currentType: EffectType;
  params: AnyEffectParams;
  onTypeChange?: (type: EffectType) => void;
  onParamsChange: (newParams: AnyEffectParams) => void;
  onResetDefaults?: () => void;
  onSavePreset?: (name: string) => void;
  presets?: SavedPreset[];
  activePresetId?: string;
  activePresetByEffect?: Partial<Record<EffectType, string>>;
  onApplyPreset?: (preset: SavedPreset) => void;
  onDuplicatePreset?: (preset: SavedPreset) => void;
  onDeletePreset?: (id: string) => void;
  hardwareEnabled?: boolean;
  hardwareStatus?: 'preview-only' | 'connecting' | 'active' | 'error';
  embeddedMode?: boolean;
}

export const EffectControls: React.FC<EffectControlsProps> = ({
  currentType,
  params,
  onTypeChange,
  onParamsChange,
  onResetDefaults,
  onSavePreset,
  presets = [],
  activePresetId,
  activePresetByEffect = {},
  onApplyPreset,
  onDuplicatePreset,
  onDeletePreset,
  hardwareEnabled = false,
  hardwareStatus = 'preview-only',
  embeddedMode = false,
}) => {
  const [presetNameInput, setPresetNameInput] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isCapturing, setIsCapturing] = useState(() => screenCaptureService.isCapturing());
  const [trackLabel, setTrackLabel] = useState(() => screenCaptureService.getTrackLabel());

  useEffect(() => {
    if (currentType !== 'screen_ambilight') return;
    setIsCapturing(screenCaptureService.isCapturing());
    setTrackLabel(screenCaptureService.getTrackLabel());
    const unsub = screenCaptureService.subscribe((active) => {
      setIsCapturing(active);
      setTrackLabel(screenCaptureService.getTrackLabel());
    });
    return unsub;
  }, [currentType]);

  const updateParam = (key: string, value: any) => {
    onParamsChange({
      ...params,
      [key]: value,
    });
  };

  const handleSave = () => {
    if (!presetNameInput.trim()) return;
    onSavePreset && onSavePreset(presetNameInput.trim());
    setPresetNameInput('');
    setShowSaveModal(false);
  };

  return (
    <div className={`effect-controls-panel ${embeddedMode ? 'embedded' : ''}`}>
      {!embeddedMode && (
        <div className="panel-header">
          <div className="panel-title-group">
            <SlidersHorizontal size={15} />
            <h2>Lighting Parameters</h2>
          </div>
          <div className="panel-actions">
            {onResetDefaults && (
              <button onClick={onResetDefaults} className="icon-btn" title="Reset to Defaults">
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            )}
            {onSavePreset && (
              <button onClick={() => setShowSaveModal(true)} className="icon-btn primary" title="Save Preset">
                <Save size={13} />
                <span>Save Preset</span>
              </button>
            )}
          </div>
        </div>
      )}

      {!embeddedMode && showSaveModal && (
        <div className="save-preset-inline">
          <input
            type="text"
            placeholder="Preset Name (e.g. Synthwave Glitch)"
            value={presetNameInput}
            onChange={(e) => setPresetNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          <button className="primary" onClick={handleSave}>Confirm</button>
          <button onClick={() => setShowSaveModal(false)}>Cancel</button>
        </div>
      )}

      {/* Effect Mode Selector */}
      {!embeddedMode && onTypeChange && (
        <div className="control-group">
          <label className="control-label">Effect Mode</label>
          <div className="effect-selector-grid">
            {(Object.keys(EFFECT_REGISTRY) as EffectType[])
              .filter((type) => type !== 'pixel_art')
              .map((type) => {
                const meta = EFFECT_REGISTRY[type];
                const isSelected = currentType === type;
                return (
                  <button
                    key={type}
                    className={`effect-chip ${isSelected ? 'active' : ''}`}
                    onClick={() => onTypeChange(type)}
                  >
                    <span>{meta.name}</span>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Effect-Specific Presets Section */}
      <div className="effect-presets-section">
        <div className="effect-presets-header">
          <div className="effect-presets-title">
            <Bookmark size={13} />
            <span className="control-label" style={{ margin: 0 }}>
              {EFFECT_REGISTRY[currentType].name} Presets ({presets.filter((p) => p.effectType === currentType).length})
            </span>
          </div>
          <button
            onClick={() => setShowSaveModal(true)}
            className="save-preset-chip-btn"
            title={`Save current settings as a new ${EFFECT_REGISTRY[currentType].name} preset`}
          >
            <Plus size={12} />
            <span>Save Current as Preset</span>
          </button>
        </div>

        {presets.filter((p) => p.effectType === currentType).length === 0 ? (
          <div className="no-effect-presets-notice">
            <span>No custom presets for {EFFECT_REGISTRY[currentType].name} yet. Click "Save Current as Preset" above to create one.</span>
          </div>
        ) : (
          <div className="effect-presets-grid">
            {presets
              .filter((p) => p.effectType === currentType)
              .map((preset) => {
                const isActive = activePresetId === preset.id || activePresetByEffect[currentType] === preset.id;
                return (
                  <div
                    key={preset.id}
                    className={`effect-preset-chip ${isActive ? 'active' : ''}`}
                    onClick={() => onApplyPreset?.(preset)}
                    title={`Click to apply "${preset.name}"`}
                  >
                    <div className="preset-chip-content">
                      <span className="preset-chip-name">{preset.name}</span>
                      {isActive && <span className="preset-chip-active-badge">Active</span>}
                    </div>
                    <div className="preset-chip-actions" onClick={(e) => e.stopPropagation()}>
                      {onDuplicatePreset && (
                        <button
                          className="chip-action-btn"
                          onClick={() => onDuplicatePreset(preset)}
                          title="Duplicate Preset"
                        >
                          <Copy size={11} />
                        </button>
                      )}
                      {onDeletePreset && (
                        <button
                          className="chip-action-btn delete"
                          onClick={() => onDeletePreset(preset.id)}
                          title="Delete Preset"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <div className="controls-scrollable">
        {/* Universal Sliders: Brightness & Speed (for standard effects) */}
        {['aurora', 'ripple', 'glitch', 'matrix', 'pulse', 'color_cycle', 'starlight', 'music_pulse', 'zigzag_wave', 'continuous_wave'].includes(currentType) && (
          <div className="slider-row">
            {typeof (params as any).brightness === 'number' && (
              <div className="control-field">
                <div className="field-header">
                  <span className="field-title"><Sun size={12} /> Brightness</span>
                  <span className="field-val">{Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
            )}

            {typeof (params as any).speed === 'number' && (
              <div className="control-field">
                <div className="field-header">
                  <span className="field-title"><Zap size={12} /> Speed</span>
                  <span className="field-val">{((params as any).speed ?? 1.0).toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
            )}
          </div>
        )}

        {/* Effect-Specific Parameters */}
        {currentType === 'aurora' && (
          <div className="specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <div className="field-header">
                  <span className="field-title"><Compass size={12} /> Direction</span>
                  <span className="field-val">{(params as any).direction}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="5"
                  value={(params as any).direction}
                  onChange={(e) => updateParam('direction', parseInt(e.target.value))}
                />
              </div>

              <div className="control-field">
                <div className="field-header">
                  <span className="field-title">Gradient Width</span>
                  <span className="field-val">{(params as any).gradientWidth.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="3.0"
                  step="0.2"
                  value={(params as any).gradientWidth}
                  onChange={(e) => updateParam('gradientWidth', parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div className="control-field">
              <span className="field-title">Color Palette Stops</span>
              <div className="palette-stop-editor">
                {(params as any).palette.map((color: any, idx: number) => (
                  <div key={idx} className="palette-stop-item">
                    <input
                      type="color"
                      value={rgbToHex(color)}
                      onChange={(e) => {
                        const newPalette = [...(params as any).palette];
                        newPalette[idx] = hexToRgb(e.target.value);
                        updateParam('palette', newPalette);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentType === 'ripple' && (
          <div className="specific-controls">
            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Wave Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).waveColor)}
                    onChange={(e) => updateParam('waveColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).waveColor)}</span>
                </div>
              </div>

            </div>

            <div className="control-field">
              <div className="field-header">
                <span className="field-title">Sweep Duration</span>
                <span className="field-val">{(params as any).fadeDuration} ms</span>
              </div>
              <input
                type="range"
                min="400"
                max="3000"
                step="100"
                value={(params as any).fadeDuration}
                onChange={(e) => updateParam('fadeDuration', parseInt(e.target.value))}
              />
            </div>
          </div>
        )}

        {currentType === 'glitch' && (
          <div className="specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <div className="field-header">
                  <span className="field-title">Frequency</span>
                  <span className="field-val">{Math.round((params as any).frequency * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={(params as any).frequency}
                  onChange={(e) => updateParam('frequency', parseFloat(e.target.value))}
                />
              </div>

              <div className="control-field">
                <div className="field-header">
                  <span className="field-title">Cluster Intensity</span>
                  <span className="field-val">{(params as any).intensity} keys</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="1"
                  value={(params as any).intensity}
                  onChange={(e) => updateParam('intensity', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="slider-row">
              <div className="control-field">
                <div className="field-header">
                  <span className="field-title">Flash Duration</span>
                  <span className="field-val">{(params as any).duration} ms</span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="600"
                  step="20"
                  value={(params as any).duration}
                  onChange={(e) => updateParam('duration', parseInt(e.target.value))}
                />
              </div>

              <div className="control-field">
                <div className="field-header">
                  <span className="field-title">PRNG Seed</span>
                  <span className="field-val">#{(params as any).seed}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="200"
                  step="1"
                  value={(params as any).seed}
                  onChange={(e) => updateParam('seed', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}

        {currentType === 'matrix' && (
          <div className="specific-controls">
            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Lead Head Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).headColor)}
                    onChange={(e) => updateParam('headColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).headColor)}</span>
                </div>
              </div>

              <div className="control-field">
                <span className="field-title">Phosphor Tail Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).trailColor)}
                    onChange={(e) => updateParam('trailColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).trailColor)}</span>
                </div>
              </div>
            </div>

            <div className="slider-row">
              <div className="control-field">
                <div className="field-header">
                  <span className="field-title">Drop Density</span>
                  <span className="field-val">{Math.round((params as any).density * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={(params as any).density}
                  onChange={(e) => updateParam('density', parseFloat(e.target.value))}
                />
              </div>

              <div className="control-field">
                <div className="field-header">
                  <span className="field-title">Tail Length</span>
                  <span className="field-val">{(params as any).trailLength.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="6.0"
                  step="0.5"
                  value={(params as any).trailLength}
                  onChange={(e) => updateParam('trailLength', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}

        {currentType === 'pulse' && (
          <div className="specific-controls">
            <div className="control-field">
              <span className="field-title">Pulse Color</span>
              <div className="color-picker-box">
                <input
                  type="color"
                  value={rgbToHex((params as any).color)}
                  onChange={(e) => updateParam('color', hexToRgb(e.target.value))}
                />
                <span>{rgbToHex((params as any).color)}</span>
              </div>
            </div>

            <div className="control-field">
              <div className="field-header">
                <span className="field-title">Baseline Floor (Min Brightness)</span>
                <span className="field-val">{Math.round((params as any).minBrightness * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.3"
                step="0.02"
                value={(params as any).minBrightness}
                onChange={(e) => updateParam('minBrightness', parseFloat(e.target.value))}
              />
            </div>
          </div>
        )}

        {currentType === 'color_cycle' && (
          <div className="control-field"><div className="field-header"><span className="field-title">Spectrum spread</span><span className="field-val">{(params as any).spread.toFixed(1)}</span></div><input type="range" min="0.2" max="3" step="0.1" value={(params as any).spread} onChange={(e) => updateParam('spread', Number(e.target.value))} /></div>
        )}

        {currentType === 'starlight' && (
          <div className="specific-controls"><div className="slider-row"><div className="control-field"><div className="field-header"><span className="field-title">Twinkle density</span><span className="field-val">{Math.round((params as any).density * 100)}%</span></div><input type="range" min="0.1" max="1" step="0.05" value={(params as any).density} onChange={(e) => updateParam('density', Number(e.target.value))} /></div></div><div className="color-pickers-row"><div className="control-field"><span className="field-title">Star color</span><input type="color" value={rgbToHex((params as any).color)} onChange={(e) => updateParam('color', hexToRgb(e.target.value))} /></div><div className="control-field"><span className="field-title">Background</span><input type="color" value={rgbToHex((params as any).backgroundColor)} onChange={(e) => updateParam('backgroundColor', hexToRgb(e.target.value))} /></div></div></div>
        )}

        {currentType === 'zigzag_wave' && (
          <div className="specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <div className="field-header">
                  <span className="field-title">Wave Width</span>
                  <span className="field-val">{Math.round((params as any).waveWidth * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.04"
                  max="0.35"
                  step="0.02"
                  value={(params as any).waveWidth}
                  onChange={(e) => updateParam('waveWidth', parseFloat(e.target.value))}
                />
              </div>

              <div className="control-field">
                <div className="field-header">
                  <span className="field-title">Trail Length</span>
                  <span className="field-val">{Math.round((params as any).trailLength * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.60"
                  step="0.02"
                  value={(params as any).trailLength}
                  onChange={(e) => updateParam('trailLength', parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div className="control-field">
              <span className="field-title">Color Scheme</span>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                {(['two_color', 'single', 'rainbow'] as const).map((mode) => {
                  const isSelected = (params as any).colorMode === mode || (mode === 'rainbow' && (params as any).rainbowMode);
                  return (
                    <button
                      key={mode}
                      type="button"
                      className={`theme-chip-btn ${isSelected ? 'active' : ''}`}
                      style={{
                        background: isSelected ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                        border: `1px solid ${isSelected ? '#00e5ff' : 'rgba(255, 255, 255, 0.12)'}`,
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        color: isSelected ? '#00e5ff' : '#eee',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        updateParam('colorMode', mode);
                        if (mode === 'rainbow') updateParam('rainbowMode', true);
                        else updateParam('rainbowMode', false);
                      }}
                    >
                      {mode === 'two_color' ? 'Two-Color Gradient' : mode === 'single' ? 'Single Color' : 'Rainbow Spectrum'}
                    </button>
                  );
                })}
              </div>
            </div>

            {(params as any).colorMode !== 'rainbow' && !(params as any).rainbowMode && (
              <div className="color-pickers-row">
                <div className="control-field">
                  <span className="field-title">Wave Head Color</span>
                  <div className="color-picker-box">
                    <input
                      type="color"
                      value={rgbToHex((params as any).primaryColor)}
                      onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                    />
                    <span>{rgbToHex((params as any).primaryColor)}</span>
                  </div>
                </div>

                {(params as any).colorMode === 'two_color' && (
                  <div className="control-field">
                    <span className="field-title">Trail End Color</span>
                    <div className="color-picker-box">
                      <input
                        type="color"
                        value={rgbToHex((params as any).secondaryColor)}
                        onChange={(e) => updateParam('secondaryColor', hexToRgb(e.target.value))}
                      />
                      <span>{rgbToHex((params as any).secondaryColor)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="slider-row" style={{ marginTop: '6px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#ccc' }}>
                <input
                  type="checkbox"
                  checked={Boolean((params as any).backgroundGlow)}
                  onChange={(e) => updateParam('backgroundGlow', e.target.checked)}
                />
                <span>Background Glow</span>
              </label>

              {(params as any).backgroundGlow && (
                <div className="control-field" style={{ margin: 0 }}>
                  <div className="color-picker-box" style={{ padding: '2px 8px' }}>
                    <input
                      type="color"
                      value={rgbToHex((params as any).backgroundColor)}
                      onChange={(e) => updateParam('backgroundColor', hexToRgb(e.target.value))}
                    />
                    <span style={{ fontSize: '11px' }}>{rgbToHex((params as any).backgroundColor)}</span>
                  </div>
                </div>
              )}

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#ccc', marginLeft: 'auto' }}>
                <input
                  type="checkbox"
                  checked={Boolean((params as any).reverseStart)}
                  onChange={(e) => updateParam('reverseStart', e.target.checked)}
                />
                <span>Reverse Start</span>
              </label>
            </div>
          </div>
        )}

        {/* Continuous Wave Controls */}
        {currentType === 'continuous_wave' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title">Wavelength: {((params as any).wavelength ?? 0.40).toFixed(2)}</span>
                <input
                  type="range"
                  min="0.15"
                  max="1.20"
                  step="0.05"
                  value={(params as any).wavelength ?? 0.40}
                  onChange={(e) => updateParam('wavelength', parseFloat(e.target.value))}
                />
              </div>

              <div className="control-field">
                <span className="field-title">Amplitude / Contrast: {Math.round(((params as any).amplitude ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={(params as any).amplitude ?? 1.0}
                  onChange={(e) => updateParam('amplitude', parseFloat(e.target.value))}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#ccc', alignSelf: 'center', marginTop: '12px' }}>
                <input
                  type="checkbox"
                  checked={Boolean((params as any).useMulticolor)}
                  onChange={(e) => updateParam('useMulticolor', e.target.checked)}
                />
                <span>Multicolor Rainbow Gradient</span>
              </label>
            </div>

            {!(params as any).useMulticolor && (
              <div className="color-pickers-row">
                <div className="control-field">
                  <span className="field-title">Peak / Crest Color</span>
                  <div className="color-picker-box">
                    <input
                      type="color"
                      value={rgbToHex((params as any).primaryColor)}
                      onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                    />
                    <span>{rgbToHex((params as any).primaryColor)}</span>
                  </div>
                </div>

                <div className="control-field">
                  <span className="field-title">Trough / Valley Color</span>
                  <div className="color-picker-box">
                    <input
                      type="color"
                      value={rgbToHex((params as any).secondaryColor)}
                      onChange={(e) => updateParam('secondaryColor', hexToRgb(e.target.value))}
                    />
                    <span>{rgbToHex((params as any).secondaryColor)}</span>
                  </div>
                </div>

                <div className="control-field">
                  <span className="field-title">Base / Floor Color</span>
                  <div className="color-picker-box">
                    <input
                      type="color"
                      value={rgbToHex((params as any).baseColor)}
                      onChange={(e) => updateParam('baseColor', hexToRgb(e.target.value))}
                    />
                    <span>{rgbToHex((params as any).baseColor)}</span>
                  </div>
                </div>
              </div>
            )}

            {(params as any).useMulticolor && (
              <div style={{ marginTop: '12px' }}>
                <div className="color-pickers-row" style={{ marginBottom: '8px' }}>
                  <div className="control-field">
                    <span className="field-title">Base / Floor Color</span>
                    <div className="color-picker-box">
                      <input
                        type="color"
                        value={rgbToHex((params as any).baseColor)}
                        onChange={(e) => updateParam('baseColor', hexToRgb(e.target.value))}
                      />
                      <span>{rgbToHex((params as any).baseColor)}</span>
                    </div>
                  </div>
                </div>

                <div className="control-field">
                  <span className="field-title">Rainbow Palette Gradient Stops</span>
                  <div className="palette-stop-editor" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {((params as any).palette || []).map((color: any, idx: number) => (
                      <div key={idx} className="palette-stop-item">
                        <input
                          type="color"
                          value={rgbToHex(color)}
                          onChange={(e) => {
                            const newPalette = [...((params as any).palette || [])];
                            newPalette[idx] = hexToRgb(e.target.value);
                            updateParam('palette', newPalette);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentType === 'music_pulse' && <MusicPulseSettings params={params as any} onChange={onParamsChange as any} hardwareEnabled={hardwareEnabled} hardwareStatus={hardwareStatus} />}

        {/* 1. Reactive Ripple Controls */}
        {currentType === 'reactive_ripple' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title">Wave Speed: {((params as any).speed ?? 1.4).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.4"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.4}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Max Radius: {((params as any).radius ?? 12.0).toFixed(0)} units</span>
                <input
                  type="range"
                  min="3.0"
                  max="18.0"
                  step="1.0"
                  value={(params as any).radius ?? 12.0}
                  onChange={(e) => updateParam('radius', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Intensity: {Math.round(((params as any).intensity ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={(params as any).intensity ?? 1.0}
                  onChange={(e) => updateParam('intensity', parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Wave Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).color)}
                    onChange={(e) => updateParam('color', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).color)}</span>
                </div>
              </div>

              <div className="control-field">
                <span className="field-title">Base / Resting Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).baseColor)}
                    onChange={(e) => updateParam('baseColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).baseColor)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Key Flash Controls */}
        {currentType === 'key_flash' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title">Hold Duration: {(params as any).holdDuration ?? 80} ms</span>
                <input
                  type="range"
                  min="20"
                  max="300"
                  step="10"
                  value={(params as any).holdDuration ?? 80}
                  onChange={(e) => updateParam('holdDuration', parseInt(e.target.value, 10))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Fade Duration: {(params as any).fadeDuration ?? 350} ms</span>
                <input
                  type="range"
                  min="100"
                  max="1200"
                  step="50"
                  value={(params as any).fadeDuration ?? 350}
                  onChange={(e) => updateParam('fadeDuration', parseInt(e.target.value, 10))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Flash Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).flashColor)}
                    onChange={(e) => updateParam('flashColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).flashColor)}</span>
                </div>
              </div>

              <div className="control-field">
                <span className="field-title">Base Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).baseColor)}
                    onChange={(e) => updateParam('baseColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).baseColor)}</span>
                </div>
              </div>
            </div>

            <div className="slider-row" style={{ marginTop: '8px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#ccc' }}>
                <input
                  type="checkbox"
                  checked={Boolean((params as any).neighborGlow)}
                  onChange={(e) => updateParam('neighborGlow', e.target.checked)}
                />
                <span>Neighbor Glow Halo</span>
              </label>

              {(params as any).neighborGlow && (
                <div className="control-field" style={{ flex: 1, marginLeft: '16px' }}>
                  <span className="field-title">Neighbor Intensity: {Math.round(((params as any).neighborGlowIntensity ?? 0.25) * 100)}%</span>
                  <input
                    type="range"
                    min="0.05"
                    max="0.5"
                    step="0.05"
                    value={(params as any).neighborGlowIntensity ?? 0.25}
                    onChange={(e) => updateParam('neighborGlowIntensity', parseFloat(e.target.value))}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Snake Trail Controls */}
        {currentType === 'snake_trail' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title">Trail Length: {(params as any).trailLength ?? 6} keys</span>
                <input
                  type="range"
                  min="2"
                  max="12"
                  step="1"
                  value={(params as any).trailLength ?? 6}
                  onChange={(e) => updateParam('trailLength', parseInt(e.target.value, 10))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Speed: {(params as any).speed ?? 10} steps/sec</span>
                <input
                  type="range"
                  min="4"
                  max="25"
                  step="1"
                  value={(params as any).speed ?? 10}
                  onChange={(e) => updateParam('speed', parseInt(e.target.value, 10))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Snake Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).trailColor)}
                    onChange={(e) => updateParam('trailColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).trailColor)}</span>
                </div>
              </div>

              <div className="control-field">
                <span className="field-title">Base Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).baseColor)}
                    onChange={(e) => updateParam('baseColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).baseColor)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Shockwave Controls */}
        {currentType === 'shockwave' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title">Expansion Speed: {((params as any).propagationSpeed ?? 2.2).toFixed(1)}x</span>
                <input
                  type="range"
                  min="1.0"
                  max="4.5"
                  step="0.2"
                  value={(params as any).propagationSpeed ?? 2.2}
                  onChange={(e) => updateParam('propagationSpeed', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Ring Thickness: {((params as any).thickness ?? 0.15).toFixed(2)}</span>
                <input
                  type="range"
                  min="0.05"
                  max="0.40"
                  step="0.02"
                  value={(params as any).thickness ?? 0.15}
                  onChange={(e) => updateParam('thickness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Afterglow: {(params as any).afterglowDuration ?? 450} ms</span>
                <input
                  type="range"
                  min="150"
                  max="1200"
                  step="50"
                  value={(params as any).afterglowDuration ?? 450}
                  onChange={(e) => updateParam('afterglowDuration', parseInt(e.target.value, 10))}
                />
              </div>
            </div>

            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Shockwave Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).ringColor)}
                    onChange={(e) => updateParam('ringColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).ringColor)}</span>
                </div>
              </div>

              <div className="control-field">
                <span className="field-title">Base Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).baseColor)}
                    onChange={(e) => updateParam('baseColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).baseColor)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. Ember Controls */}
        {currentType === 'ember' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title">Cooling Duration: {((params as any).fadeDuration ?? 1200)} ms</span>
                <input
                  type="range"
                  min="400"
                  max="2500"
                  step="100"
                  value={(params as any).fadeDuration ?? 1200}
                  onChange={(e) => updateParam('fadeDuration', parseInt(e.target.value, 10))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Thermal Spread: {((params as any).glowSpread ?? 1.6).toFixed(1)} units</span>
                <input
                  type="range"
                  min="0.0"
                  max="2.5"
                  step="0.1"
                  value={(params as any).glowSpread ?? 1.6}
                  onChange={(e) => updateParam('glowSpread', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Core Color (Hot)</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).coreColor)}
                    onChange={(e) => updateParam('coreColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).coreColor)}</span>
                </div>
              </div>

              <div className="control-field">
                <span className="field-title">Ember Color (Body)</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).emberColor)}
                    onChange={(e) => updateParam('emberColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).emberColor)}</span>
                </div>
              </div>

              <div className="control-field">
                <span className="field-title">Base Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).baseColor)}
                    onChange={(e) => updateParam('baseColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).baseColor)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. Neighbor Glow Controls */}
        {currentType === 'neighbor_glow' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title">Glow Radius: {((params as any).glowRadius ?? 2.8).toFixed(1)} units</span>
                <input
                  type="range"
                  min="1.2"
                  max="5.0"
                  step="0.2"
                  value={(params as any).glowRadius ?? 2.8}
                  onChange={(e) => updateParam('glowRadius', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Propagation Speed: {((params as any).propagationSpeed ?? 2.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="1.0"
                  max="5.0"
                  step="0.2"
                  value={(params as any).propagationSpeed ?? 2.0}
                  onChange={(e) => updateParam('propagationSpeed', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Fade Duration: {(params as any).fadeDuration ?? 450} ms</span>
                <input
                  type="range"
                  min="200"
                  max="1200"
                  step="50"
                  value={(params as any).fadeDuration ?? 450}
                  onChange={(e) => updateParam('fadeDuration', parseInt(e.target.value, 10))}
                />
              </div>
            </div>

            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Glow Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).color)}
                    onChange={(e) => updateParam('color', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).color)}</span>
                </div>
              </div>

              <div className="control-field">
                <span className="field-title">Base Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).baseColor)}
                    onChange={(e) => updateParam('baseColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).baseColor)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. Typing Intensity Controls */}
        {currentType === 'typing_intensity' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title">Idle Brightness: {Math.round(((params as any).minBrightness ?? 0.0) * 100)}% (0% = Off)</span>
                <input
                  type="range"
                  min="0.0"
                  max="0.5"
                  step="0.05"
                  value={(params as any).minBrightness ?? 0.0}
                  onChange={(e) => updateParam('minBrightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Peak Brightness: {Math.round(((params as any).maxBrightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.05"
                  value={(params as any).maxBrightness ?? 1.0}
                  onChange={(e) => updateParam('maxBrightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Heat Rate: {((params as any).responsiveness ?? 1.5).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.2"
                  value={(params as any).responsiveness ?? 1.5}
                  onChange={(e) => updateParam('responsiveness', parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div className="slider-row">
              <div className="control-field">
                <span className="field-title">Cooling Time: {((params as any).idleDecayTime ?? 2.5).toFixed(1)} s</span>
                <input
                  type="range"
                  min="1.0"
                  max="6.0"
                  step="0.5"
                  value={(params as any).idleDecayTime ?? 2.5}
                  onChange={(e) => updateParam('idleDecayTime', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Activity Window: {((params as any).activityWindow ?? 2.5).toFixed(1)} s</span>
                <input
                  type="range"
                  min="1.0"
                  max="5.0"
                  step="0.5"
                  value={(params as any).activityWindow ?? 2.5}
                  onChange={(e) => updateParam('activityWindow', parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Resting Color (Off)</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).idleColor || { r: 0, g: 0, b: 0 })}
                    onChange={(e) => updateParam('idleColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).idleColor || { r: 0, g: 0, b: 0 })}</span>
                </div>
              </div>

              <div className="control-field">
                <span className="field-title">Max Heat Color (Red)</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).activeColor || { r: 255, g: 0, b: 0 })}
                    onChange={(e) => updateParam('activeColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).activeColor || { r: 255, g: 0, b: 0 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 8. Electric Discharge Controls */}
        {currentType === 'electric_discharge' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title">Branch Count: {(params as any).branchCount ?? 3} forks</span>
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="1"
                  value={(params as any).branchCount ?? 3}
                  onChange={(e) => updateParam('branchCount', parseInt(e.target.value, 10))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Arc Speed: {(params as any).propagationSpeed ?? 24} keys/s</span>
                <input
                  type="range"
                  min="10"
                  max="45"
                  step="2"
                  value={(params as any).propagationSpeed ?? 24}
                  onChange={(e) => updateParam('propagationSpeed', parseInt(e.target.value, 10))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Flash Duration: {(params as any).flashDuration ?? 300} ms</span>
                <input
                  type="range"
                  min="100"
                  max="600"
                  step="50"
                  value={(params as any).flashDuration ?? 300}
                  onChange={(e) => updateParam('flashDuration', parseInt(e.target.value, 10))}
                />
              </div>
            </div>

            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Arc Body Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).primaryColor)}
                    onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).primaryColor)}</span>
                </div>
              </div>

              <div className="control-field">
                <span className="field-title">Spark Highlight</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).highlightColor)}
                    onChange={(e) => updateParam('highlightColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).highlightColor)}</span>
                </div>
              </div>

              <div className="control-field">
                <span className="field-title">Base Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).baseColor)}
                    onChange={(e) => updateParam('baseColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).baseColor)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 9. Continuous Wave Controls */}
        {currentType === 'continuous_wave' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title">Propagation Speed: {((params as any).speed ?? 1.0).toFixed(1)} cyc/s</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.5"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Wavelength: {((params as any).wavelength ?? 0.5).toFixed(2)} kb</span>
                <input
                  type="range"
                  min="0.15"
                  max="1.5"
                  step="0.05"
                  value={(params as any).wavelength ?? 0.5}
                  onChange={(e) => updateParam('wavelength', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Wave Amplitude: {Math.round(((params as any).amplitude ?? 0.8) * 100)}%</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={(params as any).amplitude ?? 0.8}
                  onChange={(e) => updateParam('amplitude', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div className="slider-row" style={{ marginTop: '8px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#ccc' }}>
                <input
                  type="checkbox"
                  checked={Boolean((params as any).useMulticolor)}
                  onChange={(e) => updateParam('useMulticolor', e.target.checked)}
                />
                <span>Prism Rainbow Spectrum</span>
              </label>
            </div>

            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Crest / Peak Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).primaryColor)}
                    onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).primaryColor)}</span>
                </div>
              </div>

              <div className="control-field">
                <span className="field-title">Trough / Valley Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).secondaryColor)}
                    onChange={(e) => updateParam('secondaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).secondaryColor)}</span>
                </div>
              </div>

              <div className="control-field">
                <span className="field-title">Base Floor Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).baseColor)}
                    onChange={(e) => updateParam('baseColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).baseColor)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 10. Sine Wave Controls */}
        {currentType === 'flowing_curve' && (
          <div className="effect-specific-controls">
            {/* Colour Mode Selector */}
            <div className="control-group" style={{ marginBottom: '14px' }}>
              <span className="field-title" style={{ display: 'block', marginBottom: '6px' }}>Colour Mode</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {([
                  { id: 'rainbow', label: 'Rainbow' },
                  { id: 'single', label: 'Single Colour' },
                  { id: 'dual', label: 'Dual Colour' },
                  { id: 'custom', label: 'Custom Gradient' },
                ] as const).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    className={`effect-chip ${((params as any).colorMode || 'rainbow') === mode.id ? 'active' : ''}`}
                    onClick={() => updateParam('colorMode', mode.id)}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Speed & Wavelength Sliders Only */}
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title">Speed: {(((params as any).speed ?? (params as any).travelSpeed) ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={((params as any).speed ?? (params as any).travelSpeed) ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">
                  Wavelength: {(((params as any).wavelength) ?? 15.0).toFixed(1)} keys
                  {' '}({(15.0 / (((params as any).wavelength) ?? 15.0)).toFixed(1)} {Math.abs(15.0 / (((params as any).wavelength) ?? 15.0) - 1.0) < 0.1 ? 'cycle' : 'cycles'})
                </span>
                <input
                  type="range"
                  min="6.0"
                  max="25.0"
                  step="0.5"
                  value={((params as any).wavelength) ?? 15.0}
                  onChange={(e) => updateParam('wavelength', parseFloat(e.target.value))}
                />
              </div>
            </div>

            {/* Conditional Colour Pickers */}
            {((params as any).colorMode === 'single') && (
              <div className="color-pickers-row" style={{ marginTop: '14px' }}>
                <div className="control-field">
                  <span className="field-title">Wave Colour</span>
                  <div className="color-picker-box">
                    <input
                      type="color"
                      value={rgbToHex((params as any).primaryColor || { r: 0, g: 255, b: 240 })}
                      onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                    />
                    <span>{rgbToHex((params as any).primaryColor || { r: 0, g: 255, b: 240 })}</span>
                  </div>
                </div>
              </div>
            )}

            {((params as any).colorMode === 'dual') && (
              <div className="color-pickers-row" style={{ marginTop: '14px' }}>
                <div className="control-field">
                  <span className="field-title">Crest Colour (Peak)</span>
                  <div className="color-picker-box">
                    <input
                      type="color"
                      value={rgbToHex((params as any).primaryColor || { r: 0, g: 255, b: 240 })}
                      onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                    />
                    <span>{rgbToHex((params as any).primaryColor || { r: 0, g: 255, b: 240 })}</span>
                  </div>
                </div>

                <div className="control-field">
                  <span className="field-title">Trough Colour (Valley)</span>
                  <div className="color-picker-box">
                    <input
                      type="color"
                      value={rgbToHex((params as any).secondaryColor || { r: 255, g: 0, b: 160 })}
                      onChange={(e) => updateParam('secondaryColor', hexToRgb(e.target.value))}
                    />
                    <span>{rgbToHex((params as any).secondaryColor || { r: 255, g: 0, b: 160 })}</span>
                  </div>
                </div>
              </div>
            )}

            {((params as any).colorMode === 'custom') && (
              <div style={{ marginTop: '14px' }}>
                <span className="field-title" style={{ display: 'block', marginBottom: '8px' }}>Custom Gradient Palette Stops</span>
                <div className="color-pickers-row">
                  {([0, 1, 2, 3]).map((idx) => {
                    const defaultPalette = [
                      { r: 255, g: 0, b: 40 },
                      { r: 255, g: 180, b: 0 },
                      { r: 0, g: 255, b: 200 },
                      { r: 160, g: 0, b: 255 },
                    ];
                    const currentStops: RGBColor[] = (params as any).customPalette && (params as any).customPalette.length >= 4
                      ? (params as any).customPalette
                      : defaultPalette;
                    const stopColor = currentStops[idx] || defaultPalette[idx];

                    return (
                      <div key={idx} className="control-field">
                        <span className="field-title">Stop {idx + 1}</span>
                        <div className="color-picker-box">
                          <input
                            type="color"
                            value={rgbToHex(stopColor)}
                            onChange={(e) => {
                              const updatedStops = [...currentStops];
                              updatedStops[idx] = hexToRgb(e.target.value);
                              // Maintain seamless wrapping loop if first color modified
                              if (idx === 0) {
                                updatedStops[4] = hexToRgb(e.target.value);
                              }
                              updateParam('customPalette', updatedStops);
                            }}
                          />
                          <span>{rgbToHex(stopColor)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Thermal Heatmap Controls */}
        {currentType === 'thermal_heatmap' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Decay Rate: {((params as any).decayRate ?? 0.08).toFixed(2)}/s</span>
                <input
                  type="range"
                  min="0.02"
                  max="0.25"
                  step="0.01"
                  value={(params as any).decayRate ?? 0.08}
                  onChange={(e) => updateParam('decayRate', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Hit Strength: {((params as any).hitStrength ?? 0.25).toFixed(2)}</span>
                <input
                  type="range"
                  min="0.10"
                  max="0.60"
                  step="0.05"
                  value={(params as any).hitStrength ?? 0.25}
                  onChange={(e) => updateParam('hitStrength', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Bleed Strength: {((params as any).bleedStrength ?? 0.06).toFixed(2)}</span>
                <input
                  type="range"
                  min="0.01"
                  max="0.15"
                  step="0.01"
                  value={(params as any).bleedStrength ?? 0.06}
                  onChange={(e) => updateParam('bleedStrength', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div style={{ marginTop: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
              Thermal gradient: Off &rarr; Deep Blue (#0022FF) &rarr; Cyan (#00FF66) &rarr; Orange (#FF8800) &rarr; White-Hot
            </div>
          </div>
        )}

        {/* Gravity Drop Controls */}
        {currentType === 'gravity_drop' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Fall Speed: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Particle Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).primaryColor || { r: 0, g: 200, b: 255 })}
                    onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).primaryColor || { r: 0, g: 200, b: 255 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Laser Crosshair Controls */}
        {currentType === 'laser_crosshair' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Beam Duration: {((params as any).beamDuration ?? 0.35).toFixed(2)}s</span>
                <input
                  type="range"
                  min="0.10"
                  max="1.00"
                  step="0.05"
                  value={(params as any).beamDuration ?? 0.35}
                  onChange={(e) => updateParam('beamDuration', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Laser Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).primaryColor || { r: 255, g: 0, b: 60 })}
                    onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).primaryColor || { r: 255, g: 0, b: 60 })}</span>
                </div>
              </div>
              <div className="control-field">
                <span className="field-title">Base Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).baseColor || { r: 0, g: 0, b: 0 })}
                    onChange={(e) => updateParam('baseColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).baseColor || { r: 0, g: 0, b: 0 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pong Bounce Controls */}
        {currentType === 'pong_bounce' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Speed: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Trail Length: {(params as any).trailLength ?? 4}</span>
                <input
                  type="range"
                  min="2"
                  max="8"
                  step="1"
                  value={(params as any).trailLength ?? 4}
                  onChange={(e) => updateParam('trailLength', parseInt(e.target.value, 10))}
                />
              </div>
            </div>
            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Ball & Trail Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).primaryColor || { r: 0, g: 255, b: 120 })}
                    onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).primaryColor || { r: 0, g: 255, b: 120 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Radar Sweep Controls */}
        {currentType === 'radar_sweep' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Sweep Speed: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Trail Arc Width: {((params as any).trailWidth ?? 1.4).toFixed(1)} rad</span>
                <input
                  type="range"
                  min="0.4"
                  max="2.5"
                  step="0.1"
                  value={(params as any).trailWidth ?? 1.4}
                  onChange={(e) => updateParam('trailWidth', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Phosphor Glow Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).primaryColor || { r: 0, g: 255, b: 68 })}
                    onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).primaryColor || { r: 0, g: 255, b: 68 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Vortex Pinwheel Controls */}
        {currentType === 'vortex_pinwheel' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Spin Speed: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Spiral Twist: {((params as any).twist ?? 0.12).toFixed(2)}</span>
                <input
                  type="range"
                  min="0.02"
                  max="0.30"
                  step="0.02"
                  value={(params as any).twist ?? 0.12}
                  onChange={(e) => updateParam('twist', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}

        {/* Lava Lamp Controls */}
        {currentType === 'lava_lamp' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Drift Speed: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Metaball Count: {(params as any).blobCount ?? 4}</span>
                <input
                  type="range"
                  min="2"
                  max="6"
                  step="1"
                  value={(params as any).blobCount ?? 4}
                  onChange={(e) => updateParam('blobCount', parseInt(e.target.value, 10))}
                />
              </div>
            </div>
            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Molten Foreground</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).foregroundColor || { r: 255, g: 51, b: 0 })}
                    onChange={(e) => updateParam('foregroundColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).foregroundColor || { r: 255, g: 51, b: 0 })}</span>
                </div>
              </div>
              <div className="control-field">
                <span className="field-title">Deep Background</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).backgroundColor || { r: 0, g: 0, b: 0 })}
                    onChange={(e) => updateParam('backgroundColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).backgroundColor || { r: 0, g: 0, b: 0 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Raindrops Controls */}
        {currentType === 'raindrops' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Ripple Speed: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Spawn Interval: {((params as any).spawnInterval ?? 0.3).toFixed(2)}s</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={(params as any).spawnInterval ?? 0.3}
                  onChange={(e) => updateParam('spawnInterval', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Max Radius: {((params as any).maxRadius ?? 3.5).toFixed(1)}</span>
                <input
                  type="range"
                  min="2.0"
                  max="6.0"
                  step="0.5"
                  value={(params as any).maxRadius ?? 3.5}
                  onChange={(e) => updateParam('maxRadius', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Ripple Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).primaryColor || { r: 100, g: 220, b: 255 })}
                    onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).primaryColor || { r: 100, g: 220, b: 255 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Screen Ambilight Controls */}
        {currentType === 'screen_ambilight' && (
          <div className="effect-specific-controls">
            {/* Screen Sync Status & Action Bar */}
            <div className="screen-sync-banner">
              <div className="screen-sync-info">
                <Monitor size={18} className="screen-sync-icon" />
                <div className="screen-sync-details">
                  <div className="screen-sync-status-row">
                    <span className={`sync-dot ${isCapturing ? 'active' : 'idle'}`} />
                    <span className="sync-title">
                      {isCapturing ? `Display Sync Active: ${trackLabel || 'Screen'}` : 'Screen Capture Inactive'}
                    </span>
                  </div>
                  <div className="screen-sync-subtext">
                    {isCapturing
                      ? 'Keyboard RGB keys are dynamically sampled from your display with true physical 2D coordinates.'
                      : 'Click below to select a screen, window, or monitor to synchronize.'}
                  </div>
                </div>
              </div>
              <div className="screen-sync-actions">
                <button
                  type="button"
                  className={`screen-capture-btn ${isCapturing ? 'active' : 'primary'}`}
                  onClick={async () => {
                    await screenCaptureService.startCapture();
                  }}
                >
                  <Monitor size={13} />
                  <span>{isCapturing ? 'Change Screen' : 'Select Screen'}</span>
                </button>
                {isCapturing && (
                  <button
                    type="button"
                    className="screen-capture-btn stop"
                    onClick={() => {
                      screenCaptureService.stopCapture();
                    }}
                  >
                    <span>Stop</span>
                  </button>
                )}
              </div>
            </div>

            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Smoothing: {((params as any).smoothing ?? 0.25).toFixed(2)}</span>
                <input
                  type="range"
                  min="0.05"
                  max="0.80"
                  step="0.05"
                  value={(params as any).smoothing ?? 0.25}
                  onChange={(e) => updateParam('smoothing', parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div className="slider-row" style={{ marginTop: '12px' }}>
              <div className="control-field">
                <span className="field-title">
                  <Moon size={12} /> Pitch Black Cutoff: {((params as any).blackCutoff ?? 15)}
                </span>
                <input
                  type="range"
                  min="0"
                  max="45"
                  step="1"
                  value={(params as any).blackCutoff ?? 15}
                  onChange={(e) => updateParam('blackCutoff', parseInt(e.target.value, 10))}
                />
                <div className="field-micro-desc">
                  Completely shuts LEDs OFF in dark scenes, letterboxes, or black backgrounds.
                </div>
              </div>
              <div className="control-field">
                <span className="field-title">
                  Contrast & Gamma: {((params as any).gamma ?? 2.0).toFixed(1)}
                </span>
                <input
                  type="range"
                  min="1.0"
                  max="2.6"
                  step="0.1"
                  value={(params as any).gamma ?? 2.0}
                  onChange={(e) => updateParam('gamma', parseFloat(e.target.value))}
                />
                <div className="field-micro-desc">
                  Perceptual curve for deep shadow contrast matching your monitor.
                </div>
              </div>
            </div>

            <div className="slider-row" style={{ marginTop: '12px' }}>
              <div className="control-field">
                <span className="field-title">
                  Color Vibrancy (Saturation): {Math.round(((params as any).saturation ?? 1.25) * 100)}%
                </span>
                <input
                  type="range"
                  min="0.80"
                  max="2.20"
                  step="0.05"
                  value={(params as any).saturation ?? 1.25}
                  onChange={(e) => updateParam('saturation', parseFloat(e.target.value))}
                />
                <div className="field-micro-desc">
                  Compensates for keycap diffuser light absorption for punchy colors.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Telemetry Bars Controls */}
        {currentType === 'telemetry_bars' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Poll Interval: {(params as any).pollInterval ?? 500} ms</span>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="100"
                  value={(params as any).pollInterval ?? 500}
                  onChange={(e) => updateParam('pollInterval', parseInt(e.target.value, 10))}
                />
              </div>
            </div>
            <div style={{ marginTop: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
              Row 0: CPU Load &bull; Row 1: Memory / GPU &bull; Row 2: RAM Telemetry with Green &rarr; Yellow &rarr; Red scaling.
            </div>
          </div>
        )}

        {/* Spectrum EQ Controls */}
        {currentType === 'spectrum_eq' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Sensitivity: {((params as any).sensitivity ?? 1.5).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={(params as any).sensitivity ?? 1.5}
                  onChange={(e) => updateParam('sensitivity', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field" style={{ display: 'flex', alignItems: 'center', paddingTop: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#fff' }}>
                  <input
                    type="checkbox"
                    checked={(params as any).useRainbow ?? true}
                    onChange={(e) => updateParam('useRainbow', e.target.checked)}
                  />
                  <span>Rainbow Gradient Mode</span>
                </label>
              </div>
            </div>
            {!((params as any).useRainbow ?? true) && (
              <div className="color-pickers-row">
                <div className="control-field">
                  <span className="field-title">Solid Bar Color</span>
                  <div className="color-picker-box">
                    <input
                      type="color"
                      value={rgbToHex((params as any).primaryColor || { r: 0, g: 200, b: 255 })}
                      onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                    />
                    <span>{rgbToHex((params as any).primaryColor || { r: 0, g: 200, b: 255 })}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom Zones Controls */}
        {currentType === 'custom_zones' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Background Dim Level: {Math.round(((params as any).dimLevel ?? 0.1) * 100)}%</span>
                <input
                  type="range"
                  min="0.0"
                  max="0.30"
                  step="0.05"
                  value={(params as any).dimLevel ?? 0.1}
                  onChange={(e) => updateParam('dimLevel', parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div style={{ margin: '10px 0' }}>
              <span className="field-title" style={{ display: 'block', marginBottom: '6px' }}>Zone Profile</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className={`effect-chip ${((params as any).preset ?? 'gamer') === 'gamer' ? 'active' : ''}`}
                  onClick={() => updateParam('preset', 'gamer')}
                >
                  <span>Gamer (WASD + 1-4 + Modifiers)</span>
                </button>
                <button
                  className={`effect-chip ${((params as any).preset ?? 'gamer') === 'coder' ? 'active' : ''}`}
                  onClick={() => updateParam('preset', 'coder')}
                >
                  <span>Coder (Esc + Tab + Brackets + IJKL)</span>
                </button>
              </div>
            </div>

            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Zone Primary Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).primaryColor || { r: 255, g: 50, b: 50 })}
                    onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).primaryColor || { r: 255, g: 50, b: 50 })}</span>
                </div>
              </div>
              <div className="control-field">
                <span className="field-title">Zone Accent Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).accentColor || { r: 0, g: 200, b: 255 })}
                    onChange={(e) => updateParam('accentColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).accentColor || { r: 0, g: 200, b: 255 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AFK Screensaver Controls */}
        {currentType === 'afk_screensaver' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Idle Timeout: {(params as any).idleTimeout ?? 120}s</span>
                <input
                  type="range"
                  min="10"
                  max="300"
                  step="10"
                  value={(params as any).idleTimeout ?? 120}
                  onChange={(e) => updateParam('idleTimeout', parseInt(e.target.value, 10))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Crossfade: {((params as any).crossfadeDuration ?? 2.0).toFixed(1)}s</span>
                <input
                  type="range"
                  min="0.5"
                  max="5.0"
                  step="0.5"
                  value={(params as any).crossfadeDuration ?? 2.0}
                  onChange={(e) => updateParam('crossfadeDuration', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Typing Dim: {Math.round(((params as any).dimLevel ?? 0.15) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="0.40"
                  step="0.05"
                  value={(params as any).dimLevel ?? 0.15}
                  onChange={(e) => updateParam('dimLevel', parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div style={{ margin: '10px 0' }}>
              <span className="field-title" style={{ display: 'block', marginBottom: '6px' }}>Idle Screensaver Animation</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className={`effect-chip ${((params as any).screensaverMode ?? 'aurora') === 'aurora' ? 'active' : ''}`}
                  onClick={() => updateParam('screensaverMode', 'aurora')}
                >
                  <span>Aurora Flow</span>
                </button>
                <button
                  className={`effect-chip ${((params as any).screensaverMode ?? 'aurora') === 'matrix_rain' ? 'active' : ''}`}
                  onClick={() => updateParam('screensaverMode', 'matrix_rain')}
                >
                  <span>Matrix Rain</span>
                </button>
              </div>
            </div>

            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Active Typing Resting Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).dimColor || { r: 40, g: 50, b: 70 })}
                    onChange={(e) => updateParam('dimColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).dimColor || { r: 40, g: 50, b: 70 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Game of Life Controls */}
        {currentType === 'game_of_life' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Speed: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Fade Rate: {((params as any).fadeSpeed ?? 9.0).toFixed(0)}</span>
                <input
                  type="range"
                  min="4.0"
                  max="16.0"
                  step="1.0"
                  value={(params as any).fadeSpeed ?? 9.0}
                  onChange={(e) => updateParam('fadeSpeed', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Alive Cell Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).aliveColor || { r: 0, g: 255, b: 120 })}
                    onChange={(e) => updateParam('aliveColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).aliveColor || { r: 0, g: 255, b: 120 })}</span>
                </div>
              </div>
              <div className="control-field">
                <span className="field-title">Keypress Seed Accent</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).accentColor || { r: 255, g: 0, b: 180 })}
                    onChange={(e) => updateParam('accentColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).accentColor || { r: 255, g: 0, b: 180 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pac-Man Arcade Controls */}
        {currentType === 'pacman_arcade' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Chase Speed: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div style={{ marginTop: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
              🟡 Pac-Man (#FFFF00) &bull; 🔴 Blinky (#FF0000) &bull; 🌸 Pinky (#FFB8FF) &bull; 🩵 Inky (#00FFFF) &bull; 🟠 Clyde (#FFB852)
            </div>
          </div>
        )}

        {/* DVD Bounce Controls */}
        {currentType === 'dvd_bounce' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Bounce Velocity: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div style={{ marginTop: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
              2&times;2 logo shifts hue on wall impacts. Corner hits trigger an instant full-board rainbow jackpot celebration!
            </div>
          </div>
        )}

        {/* Wave Pond Controls */}
        {currentType === 'wave_pond' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Wave Speed: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Damping: {((params as any).damping ?? 0.92).toFixed(2)}</span>
                <input
                  type="range"
                  min="0.85"
                  max="0.98"
                  step="0.01"
                  value={(params as any).damping ?? 0.92}
                  onChange={(e) => updateParam('damping', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div style={{ marginTop: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
              2D wave equation: Press any key to drop a water ripple into the deep ocean blue matrix.
            </div>
          </div>
        )}

        {/* Doom Fire Controls */}
        {currentType === 'doom_fire' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Burn Speed: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Cooling Rate: {((params as any).coolingRate ?? 0.20).toFixed(2)}</span>
                <input
                  type="range"
                  min="0.10"
                  max="0.40"
                  step="0.02"
                  value={(params as any).coolingRate ?? 0.20}
                  onChange={(e) => updateParam('coolingRate', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}

        {/* Plasma Shader Controls */}
        {currentType === 'plasma_shader' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Plasma Speed: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div style={{ margin: '10px 0' }}>
              <span className="field-title" style={{ display: 'block', marginBottom: '6px' }}>Color Palette Mode</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className={`effect-chip ${((params as any).mode ?? 'rainbow') === 'rainbow' ? 'active' : ''}`}
                  onClick={() => updateParam('mode', 'rainbow')}
                >
                  <span>Full Spectrum Rainbow</span>
                </button>
                <button
                  className={`effect-chip ${((params as any).mode ?? 'rainbow') === 'duo' ? 'active' : ''}`}
                  onClick={() => updateParam('mode', 'duo')}
                >
                  <span>Dual-Tone Gradient</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lightning Storm Controls */}
        {currentType === 'lightning_storm' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title">Strike Interval: {((params as any).strikeInterval ?? 2.5).toFixed(1)}s</span>
                <input
                  type="range"
                  min="1.0"
                  max="6.0"
                  step="0.5"
                  value={(params as any).strikeInterval ?? 2.5}
                  onChange={(e) => updateParam('strikeInterval', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Lightning Bolt Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).boltColor || { r: 136, g: 0, b: 255 })}
                    onChange={(e) => updateParam('boltColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).boltColor || { r: 136, g: 0, b: 255 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Event Horizon Controls */}
        {currentType === 'event_horizon' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Rotation Speed: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div style={{ marginTop: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
              Black hole center at (6.5, 2.0) with swirling golden accretion disk and infalling cosmic stardust spiral.
            </div>
          </div>
        )}

        {/* WPM Overdrive Controls */}
        {currentType === 'wpm_overdrive' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div style={{ marginTop: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
              <div>&bull; <strong>0–35 WPM:</strong> Calm cyan breathing</div>
              <div>&bull; <strong>35–75 WPM:</strong> Neon purple pulse + horizontal speed-lines</div>
              <div>&bull; <strong>75+ WPM:</strong> Full nitro mode with high-speed chroma shift &amp; keystroke sparks</div>
            </div>
          </div>
        )}

        {/* Fireworks Controls */}
        {currentType === 'fireworks' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Speed: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div style={{ marginTop: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
              Press any key to launch an ascending rocket that detonates into 8 gravity-affected spark particles.
            </div>
          </div>
        )}

        {/* Domino Topple Controls */}
        {currentType === 'domino_topple' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Topple Speed: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Domino Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).dominoColor || { r: 0, g: 220, b: 255 })}
                    onChange={(e) => updateParam('dominoColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).dominoColor || { r: 0, g: 220, b: 255 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CRT Scanline Controls */}
        {currentType === 'crt_scanline' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Scan Speed: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Phosphor Beam Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).scanColor || { r: 0, g: 255, b: 136 })}
                    onChange={(e) => updateParam('scanColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).scanColor || { r: 0, g: 255, b: 136 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DNA Helix Controls */}
        {currentType === 'dna_helix' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Rotation Speed: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div style={{ marginTop: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
              Dual opposing sinusoidal waves in Cyan (#00FFFF) and Magenta (#FF00AA) linked by violet DNA rungs.
            </div>
          </div>
        )}

        {/* Pomodoro Bar Controls */}
        {currentType === 'pomodoro_bar' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
            </div>

            <div style={{ margin: '10px 0' }}>
              <span className="field-title" style={{ display: 'block', marginBottom: '6px' }}>Timer Duration</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[5, 15, 25, 50].map((mins) => (
                  <button
                    key={mins}
                    className={`effect-chip ${((params as any).durationMinutes ?? 25) === mins ? 'active' : ''}`}
                    onClick={() => updateParam('durationMinutes', mins)}
                  >
                    <span>{mins} Min</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginTop: '10px', fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
              Drains across all 61 keys from Emerald Green &rarr; Amber &rarr; Crimson. Press any key to pause/resume or restart when finished.
            </div>
          </div>
        )}

        {/* Pathfinder A* Controls */}
        {currentType === 'pathfinder_a_star' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Search Speed: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Path Gold</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).primaryColor || { r: 255, g: 215, b: 0 })}
                    onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).primaryColor || { r: 255, g: 215, b: 0 })}</span>
                </div>
              </div>
              <div className="control-field">
                <span className="field-title">Frontier Cyan</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).secondaryColor || { r: 0, g: 136, b: 170 })}
                    onChange={(e) => updateParam('secondaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).secondaryColor || { r: 0, g: 136, b: 170 })}</span>
                </div>
              </div>
              <div className="control-field">
                <span className="field-title">Goal Target</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).goalColor || { r: 255, g: 0, b: 85 })}
                    onChange={(e) => updateParam('goalColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).goalColor || { r: 255, g: 0, b: 85 })}</span>
                </div>
              </div>
              <div className="control-field">
                <span className="field-title">Obstacle Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).obstacleColor || { r: 26, g: 26, b: 46 })}
                    onChange={(e) => updateParam('obstacleColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).obstacleColor || { r: 26, g: 26, b: 46 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sort Visualizer Controls */}
        {currentType === 'sort_visualizer' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Sort Speed: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Sorted Bar Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).primaryColor || { r: 0, g: 255, b: 102 })}
                    onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).primaryColor || { r: 0, g: 255, b: 102 })}</span>
                </div>
              </div>
              <div className="control-field">
                <span className="field-title">Pointer Highlight</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).secondaryColor || { r: 255, g: 255, b: 255 })}
                    onChange={(e) => updateParam('secondaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).secondaryColor || { r: 255, g: 255, b: 255 })}</span>
                </div>
              </div>
              <div className="control-field">
                <span className="field-title">Background Base</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).backgroundColor || { r: 0, g: 0, b: 0 })}
                    onChange={(e) => updateParam('backgroundColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).backgroundColor || { r: 0, g: 0, b: 0 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Binary Counter Controls */}
        {currentType === 'binary_counter' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Count Frequency: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Bit "1" Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).primaryColor || { r: 0, g: 255, b: 102 })}
                    onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).primaryColor || { r: 0, g: 255, b: 102 })}</span>
                </div>
              </div>
              <div className="control-field">
                <span className="field-title">Bit "0" Dim Base</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).secondaryColor || { r: 0, g: 26, b: 8 })}
                    onChange={(e) => updateParam('secondaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).secondaryColor || { r: 0, g: 26, b: 8 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Boids Swarm Controls */}
        {currentType === 'boids_swarm' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Flocking Speed: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Leader Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).primaryColor || { r: 0, g: 238, b: 255 })}
                    onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).primaryColor || { r: 0, g: 238, b: 255 })}</span>
                </div>
              </div>
              <div className="control-field">
                <span className="field-title">Follower Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).secondaryColor || { r: 255, g: 0, b: 170 })}
                    onChange={(e) => updateParam('secondaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).secondaryColor || { r: 255, g: 0, b: 170 })}</span>
                </div>
              </div>
            </div>
            <div style={{ margin: '10px 0' }}>
              <span className="field-title" style={{ display: 'block', marginBottom: '6px' }}>Color Mode</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className={`effect-chip ${((params as any).colorMode ?? 'rainbow') === 'rainbow' ? 'active' : ''}`}
                  onClick={() => updateParam('colorMode', 'rainbow')}
                >
                  <span>Chroma Rainbow</span>
                </button>
                <button
                  className={`effect-chip ${((params as any).colorMode) === 'palette' ? 'active' : ''}`}
                  onClick={() => updateParam('colorMode', 'palette')}
                >
                  <span>Custom Duo</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Magnetic Field Controls */}
        {currentType === 'magnetic_field' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Drift Speed: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">North Pole Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).primaryColor || { r: 255, g: 34, b: 68 })}
                    onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).primaryColor || { r: 255, g: 34, b: 68 })}</span>
                </div>
              </div>
              <div className="control-field">
                <span className="field-title">South Pole Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).secondaryColor || { r: 0, g: 136, b: 255 })}
                    onChange={(e) => updateParam('secondaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).secondaryColor || { r: 0, g: 136, b: 255 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Solar Eclipse Controls */}
        {currentType === 'solar_eclipse' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Orbital Speed: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Corona Gold</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).primaryColor || { r: 255, g: 184, b: 0 })}
                    onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).primaryColor || { r: 255, g: 184, b: 0 })}</span>
                </div>
              </div>
              <div className="control-field">
                <span className="field-title">Outer Violet</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).secondaryColor || { r: 138, g: 43, b: 226 })}
                    onChange={(e) => updateParam('secondaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).secondaryColor || { r: 138, g: 43, b: 226 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Blizzard Drift Controls */}
        {currentType === 'blizzard_drift' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Wind / Fall Speed: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Snowflake Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).primaryColor || { r: 224, g: 247, b: 250 })}
                    onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).primaryColor || { r: 224, g: 247, b: 250 })}</span>
                </div>
              </div>
              <div className="control-field">
                <span className="field-title">Storm Background</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).secondaryColor || { r: 13, g: 34, b: 58 })}
                    onChange={(e) => updateParam('secondaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).secondaryColor || { r: 13, g: 34, b: 58 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EKG Heartbeat Controls */}
        {currentType === 'ekg_heartbeat' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Heart Rate (BPM): {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Beam Trace Color</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).primaryColor || { r: 0, g: 255, b: 136 })}
                    onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).primaryColor || { r: 0, g: 255, b: 136 })}</span>
                </div>
              </div>
              <div className="control-field">
                <span className="field-title">Phosphor Glow</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).secondaryColor || { r: 0, g: 45, b: 20 })}
                    onChange={(e) => updateParam('secondaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).secondaryColor || { r: 0, g: 45, b: 20 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Newton's Cradle Controls */}
        {currentType === 'newtons_cradle' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Swing Speed: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Pendulum Balls</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).primaryColor || { r: 0, g: 229, b: 255 })}
                    onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).primaryColor || { r: 0, g: 229, b: 255 })}</span>
                </div>
              </div>
              <div className="control-field">
                <span className="field-title">Impact Shockwave</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).secondaryColor || { r: 255, g: 0, b: 119 })}
                    onChange={(e) => updateParam('secondaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).secondaryColor || { r: 255, g: 0, b: 119 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Frost Shatter Controls */}
        {currentType === 'frost_shatter' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Ray Speed: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Fracture Core</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).primaryColor || { r: 255, g: 255, b: 255 })}
                    onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).primaryColor || { r: 255, g: 255, b: 255 })}</span>
                </div>
              </div>
              <div className="control-field">
                <span className="field-title">Glacier Cool-down</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).secondaryColor || { r: 0, g: 204, b: 255 })}
                    onChange={(e) => updateParam('secondaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).secondaryColor || { r: 0, g: 204, b: 255 })}</span>
                </div>
              </div>
              <div className="control-field">
                <span className="field-title">Frost Base</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).backgroundColor || { r: 0, g: 0, b: 0 })}
                    onChange={(e) => updateParam('backgroundColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).backgroundColor || { r: 0, g: 0, b: 0 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Combo Multiplier Controls */}
        {currentType === 'combo_multiplier' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Animation Speed: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Tier 1 Edge (10+)</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).secondaryColor || { r: 0, g: 255, b: 136 })}
                    onChange={(e) => updateParam('secondaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).secondaryColor || { r: 0, g: 255, b: 136 })}</span>
                </div>
              </div>
              <div className="control-field">
                <span className="field-title">Tier 2 Ring (30+)</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).primaryColor || { r: 255, g: 215, b: 0 })}
                    onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).primaryColor || { r: 255, g: 215, b: 0 })}</span>
                </div>
              </div>
              <div className="control-field">
                <span className="field-title">Tier 3 Nitro (60+)</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).overdriveColor || { r: 255, g: 0, b: 102 })}
                    onChange={(e) => updateParam('overdriveColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).overdriveColor || { r: 255, g: 0, b: 102 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Spotlight Lantern Controls */}
        {currentType === 'spotlight_lantern' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Chase Speed: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Beam Core</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).primaryColor || { r: 255, g: 170, b: 51 })}
                    onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).primaryColor || { r: 255, g: 170, b: 51 })}</span>
                </div>
              </div>
              <div className="control-field">
                <span className="field-title">Lantern Halo</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).secondaryColor || { r: 0, g: 212, b: 255 })}
                    onChange={(e) => updateParam('secondaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).secondaryColor || { r: 0, g: 212, b: 255 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reaction Diffusion Controls */}
        {currentType === 'reaction_diffusion' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Morphogen Speed: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Morphogen B (Coral)</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).primaryColor || { r: 0, g: 255, b: 170 })}
                    onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).primaryColor || { r: 0, g: 255, b: 170 })}</span>
                </div>
              </div>
              <div className="control-field">
                <span className="field-title">Substrate A (Base)</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).secondaryColor || { r: 17, g: 0, b: 51 })}
                    onChange={(e) => updateParam('secondaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).secondaryColor || { r: 17, g: 0, b: 51 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Kaleidoscope Controls */}
        {currentType === 'kaleidoscope' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Mandala Rotation: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Mandala Primary</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).primaryColor || { r: 255, g: 0, b: 136 })}
                    onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).primaryColor || { r: 255, g: 0, b: 136 })}</span>
                </div>
              </div>
              <div className="control-field">
                <span className="field-title">Mandala Accent</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).secondaryColor || { r: 0, g: 229, b: 255 })}
                    onChange={(e) => updateParam('secondaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).secondaryColor || { r: 0, g: 229, b: 255 })}</span>
                </div>
              </div>
            </div>
            <div style={{ margin: '10px 0' }}>
              <span className="field-title" style={{ display: 'block', marginBottom: '6px' }}>Mandala Palette</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className={`effect-chip ${((params as any).colorMode ?? 'rainbow') === 'rainbow' ? 'active' : ''}`}
                  onClick={() => updateParam('colorMode', 'rainbow')}
                >
                  <span>Chroma Spectrum</span>
                </button>
                <button
                  className={`effect-chip ${((params as any).colorMode) === 'palette' ? 'active' : ''}`}
                  onClick={() => updateParam('colorMode', 'palette')}
                >
                  <span>Custom Duo</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Voronoi Cells Controls */}
        {currentType === 'voronoi_cells' && (
          <div className="effect-specific-controls">
            <div className="slider-row">
              <div className="control-field">
                <span className="field-title"><Sun size={12} /> Brightness: {Math.round(((params as any).brightness ?? 1.0) * 100)}%</span>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={(params as any).brightness ?? 1.0}
                  onChange={(e) => updateParam('brightness', parseFloat(e.target.value))}
                />
              </div>
              <div className="control-field">
                <span className="field-title"><Zap size={12} /> Seed Velocity: {((params as any).speed ?? 1.0).toFixed(1)}x</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={(params as any).speed ?? 1.0}
                  onChange={(e) => updateParam('speed', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="color-pickers-row">
              <div className="control-field">
                <span className="field-title">Cell Color A</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).primaryColor || { r: 255, g: 0, b: 85 })}
                    onChange={(e) => updateParam('primaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).primaryColor || { r: 255, g: 0, b: 85 })}</span>
                </div>
              </div>
              <div className="control-field">
                <span className="field-title">Cell Color B</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).secondaryColor || { r: 0, g: 204, b: 255 })}
                    onChange={(e) => updateParam('secondaryColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).secondaryColor || { r: 0, g: 204, b: 255 })}</span>
                </div>
              </div>
              <div className="control-field">
                <span className="field-title">Border Line</span>
                <div className="color-picker-box">
                  <input
                    type="color"
                    value={rgbToHex((params as any).borderColor || { r: 0, g: 0, b: 0 })}
                    onChange={(e) => updateParam('borderColor', hexToRgb(e.target.value))}
                  />
                  <span>{rgbToHex((params as any).borderColor || { r: 0, g: 0, b: 0 })}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
