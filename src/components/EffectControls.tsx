import React, { useState } from 'react';
import { EffectType, AnyEffectParams, SavedPreset } from '../types/effects';
import { RGBColor } from '../types/keyboard';
import { EFFECT_REGISTRY } from '../engine/registry';
import { rgbToHex, hexToRgb } from '../engine/color';
import { RotateCcw, Save, Compass, SlidersHorizontal, Sun, Zap, Plus, Copy, Trash2, Bookmark } from 'lucide-react';
import { MusicPulseSettings } from './MusicPulseSettings';

interface EffectControlsProps {
  currentType: EffectType;
  params: AnyEffectParams;
  onTypeChange: (type: EffectType) => void;
  onParamsChange: (newParams: AnyEffectParams) => void;
  onResetDefaults: () => void;
  onSavePreset: (name: string) => void;
  presets?: SavedPreset[];
  activePresetId?: string;
  activePresetByEffect?: Partial<Record<EffectType, string>>;
  onApplyPreset?: (preset: SavedPreset) => void;
  onDuplicatePreset?: (preset: SavedPreset) => void;
  onDeletePreset?: (id: string) => void;
  hardwareEnabled?: boolean;
  hardwareStatus?: 'preview-only' | 'connecting' | 'active' | 'error';
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
}) => {
  const [presetNameInput, setPresetNameInput] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  const updateParam = (key: string, value: any) => {
    onParamsChange({
      ...params,
      [key]: value,
    });
  };

  const handleSave = () => {
    if (!presetNameInput.trim()) return;
    onSavePreset(presetNameInput.trim());
    setPresetNameInput('');
    setShowSaveModal(false);
  };

  return (
    <div className="effect-controls-panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <SlidersHorizontal size={15} />
          <h2>Lighting Parameters</h2>
        </div>
        <div className="panel-actions">
          <button onClick={onResetDefaults} className="icon-btn" title="Reset to Defaults">
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
          <button onClick={() => setShowSaveModal(true)} className="icon-btn primary" title="Save Preset">
            <Save size={13} />
            <span>Save Preset</span>
          </button>
        </div>
      </div>

      {showSaveModal && (
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
      </div>
    </div>
  );
};
