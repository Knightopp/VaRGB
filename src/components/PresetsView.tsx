import React, { useRef } from 'react';
import { SavedPreset, EffectType } from '../types/effects';
import { Bookmark, Play, Copy, Trash2, Download, Upload, Clock, Check } from 'lucide-react';

interface PresetsViewProps {
  presets: SavedPreset[];
  activePresetId?: string;
  activePresetByEffect?: Partial<Record<EffectType, string>>;
  currentEffectType?: EffectType;
  onApplyPreset: (preset: SavedPreset) => void;
  onDuplicatePreset: (preset: SavedPreset) => void;
  onDeletePreset: (id: string) => void;
  onImportPresets: (presets: SavedPreset[]) => void;
}

export const PresetsView: React.FC<PresetsViewProps> = ({
  presets,
  activePresetId,
  activePresetByEffect = {},
  currentEffectType,
  onApplyPreset,
  onDuplicatePreset,
  onDeletePreset,
  onImportPresets,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(presets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `k630_lighting_presets_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          onImportPresets(parsed);
        }
      } catch (err) {
        alert('Invalid preset JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="presets-view-panel">
      <div className="presets-header">
        <div>
          <h2>Preset Library</h2>
          <p className="subtitle">
            Saved lighting configurations and pixel art animations stored locally.
          </p>
        </div>
        <div className="presets-actions">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json"
            style={{ display: 'none' }}
          />
          <button className="icon-btn" onClick={() => fileInputRef.current?.click()}>
            <Upload size={13} />
            <span>Import</span>
          </button>
          <button className="icon-btn" onClick={handleExport}>
            <Download size={13} />
            <span>Export</span>
          </button>
        </div>
      </div>

      <div className="presets-list">
        {presets.length === 0 ? (
          <div className="empty-state">
            <Bookmark size={32} />
            <p>No presets saved yet. Customize an effect and click "Save Preset".</p>
          </div>
        ) : (
          presets.map((preset) => {
            const isCurrentActive = preset.id === activePresetId && (!currentEffectType || preset.effectType === currentEffectType);
            const isEffectActive = activePresetByEffect[preset.effectType] === preset.id;
            const isActive = isCurrentActive || isEffectActive;
            return (
              <div key={preset.id} className={`preset-card ${isActive ? 'active' : ''}`}>
                <div className="preset-card-left">
                  <div className="preset-title-row">
                    <span className="preset-name">{preset.name}</span>
                    <span className="preset-badge">{preset.effectType.toUpperCase()}</span>
                    {isCurrentActive ? (
                      <span className="active-pill" title="Currently running effect preset">ACTIVE</span>
                    ) : isEffectActive ? (
                      <span className="active-pill" style={{ opacity: 0.85, background: 'rgba(255,255,255,0.75)' }} title="Active preset for this effect mode">ACTIVE</span>
                    ) : null}
                  </div>
                  <div className="preset-date">
                    <Clock size={11} />
                    <span>Saved {new Date(preset.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="preset-card-right">
                  <button
                    className={`icon-btn ${isActive ? 'primary active' : 'primary'}`}
                    onClick={() => onApplyPreset(preset)}
                    title={isCurrentActive ? 'Preset is currently active' : 'Click to activate this preset'}
                  >
                    {isCurrentActive ? <Check size={12} /> : <Play size={12} />}
                    <span>{isCurrentActive ? 'Active' : 'Apply'}</span>
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => onDuplicatePreset(preset)}
                    title="Duplicate Preset"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    className="icon-btn danger"
                    onClick={() => onDeletePreset(preset.id)}
                    title="Delete Preset"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
