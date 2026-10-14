import React from 'react';
import {
  StudioProject,
  StudioLayer,
  Keyframe,
  KeyframeEasing,
  SelectionState,
  LayerBlendMode,
} from '../types/studio';
import { rgbToHex, hexToRgb } from '../../engine/color';
import { RGBColor } from '../../types/keyboard';
import { evaluateProperty } from '../engine/interpolation';
import {
  Sliders,
  Layers,
  Clock,
  Trash2,
  Activity,
  Check,
} from 'lucide-react';

interface PropertiesPanelProps {
  project: StudioProject;
  currentTime: number;
  selection: SelectionState;
  onUpdateProject: (updated: StudioProject) => void;
  onSelect: (selection: SelectionState) => void;
  selectedCanvasKeyCount: number;
  onAssignCanvasSelectionToLayer: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  project,
  currentTime,
  selection,
  onUpdateProject,
  onSelect,
  selectedCanvasKeyCount,
  onAssignCanvasSelectionToLayer,
}) => {
  const selectedLayer = project.layers.find((l) => l.id === selection.layerId);
  const selectedProperty = selectedLayer?.properties[selection.propertyId || ''];
  const selectedKeyframe = selectedProperty?.keyframes.find(
    (kf) => kf.id === selection.keyframeId
  );

  // Update property staticValue or keyframe value
  const handleUpdatePropertyValue = (layerId: string, propId: string, val: any) => {
    const updatedLayers = project.layers.map((l) => {
      if (l.id !== layerId) return l;
      const prop = l.properties[propId];
      if (!prop) return l;

      if (prop.animated) {
        // If animated, check if there's a keyframe right at currentTime; if so update it, else add/update
        const roundedTime = Math.round(currentTime * 100) / 100;
        const existingIdx = prop.keyframes.findIndex(
          (kf) => Math.abs(kf.time - roundedTime) < 0.04
        );

        let newKfs: Keyframe[];
        if (existingIdx >= 0) {
          newKfs = prop.keyframes.map((kf, idx) =>
            idx === existingIdx ? { ...kf, value: val } : kf
          );
        } else {
          newKfs = [
            ...prop.keyframes,
            { id: `kf-${Date.now()}`, time: roundedTime, value: val, easing: 'ease_in_out' as KeyframeEasing },
          ].sort((a, b) => a.time - b.time);
        }

        return {
          ...l,
          properties: {
            ...l.properties,
            [propId]: {
              ...prop,
              staticValue: val,
              keyframes: newKfs,
            },
          },
        };
      } else {
        return {
          ...l,
          properties: {
            ...l.properties,
            [propId]: {
              ...prop,
              staticValue: val,
            },
          },
        };
      }
    });

    onUpdateProject({ ...project, layers: updatedLayers });
  };

  // Update selected keyframe easing
  const handleUpdateKeyframeEasing = (easing: KeyframeEasing) => {
    if (!selectedLayer || !selectedProperty || !selectedKeyframe) return;

    const updatedLayers = project.layers.map((l) => {
      if (l.id !== selectedLayer.id) return l;
      const prop = l.properties[selectedProperty.id];
      if (!prop) return l;

      const newKfs = prop.keyframes.map((kf) =>
        kf.id === selectedKeyframe.id ? { ...kf, easing } : kf
      );

      return {
        ...l,
        properties: {
          ...l.properties,
          [selectedProperty.id]: {
            ...prop,
            keyframes: newKfs,
          },
        },
      };
    });

    onUpdateProject({ ...project, layers: updatedLayers });
  };

  // Delete selected keyframe
  const handleDeleteKeyframe = () => {
    if (!selectedLayer || !selectedProperty || !selectedKeyframe) return;

    const updatedLayers = project.layers.map((l) => {
      if (l.id !== selectedLayer.id) return l;
      const prop = l.properties[selectedProperty.id];
      if (!prop) return l;

      return {
        ...l,
        properties: {
          ...l.properties,
          [selectedProperty.id]: {
            ...prop,
            keyframes: prop.keyframes.filter((kf) => kf.id !== selectedKeyframe.id),
          },
        },
      };
    });

    onUpdateProject({ ...project, layers: updatedLayers });
    onSelect({ ...selection, keyframeId: null });
  };

  // Layer settings update
  const handleUpdateLayerMeta = (
    layerId: string,
    updates: Partial<Pick<StudioLayer, 'name' | 'blendMode' | 'opacity' | 'targetKeys'>>
  ) => {
    const updatedLayers = project.layers.map((l) =>
      l.id === layerId ? { ...l, ...updates } : l
    );
    onUpdateProject({ ...project, layers: updatedLayers });
  };

  // Render Keyframe Inspector
  if (selectedKeyframe && selectedProperty && selectedLayer) {
    return (
      <aside className="studio-inspector-panel">
        <div className="studio-inspector-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Activity size={14} color="#00F2FF" />
            <span>KEYFRAME INSPECTOR</span>
          </div>
          <button
            onClick={handleDeleteKeyframe}
            className="studio-btn"
            style={{ padding: '2px 6px', color: '#FF4466' }}
            title="Delete Keyframe"
          >
            <Trash2 size={12} />
          </button>
        </div>

        <div className="studio-inspector-content">
          <div className="studio-field-group">
            <span className="studio-field-label">Timestamp (Seconds)</span>
            <input
              type="number"
              step="0.05"
              className="studio-input-num"
              style={{ width: '100%' }}
              value={selectedKeyframe.time}
              onChange={(e) => {
                const newTime = Math.max(0, Math.min(project.duration, Number(e.target.value)));
                const updatedLayers = project.layers.map((l) => {
                  if (l.id !== selectedLayer.id) return l;
                  const prop = l.properties[selectedProperty.id];
                  const newKfs = prop.keyframes.map((kf) =>
                    kf.id === selectedKeyframe.id ? { ...kf, time: newTime } : kf
                  );
                  return {
                    ...l,
                    properties: { ...l.properties, [selectedProperty.id]: { ...prop, keyframes: newKfs } },
                  };
                });
                onUpdateProject({ ...project, layers: updatedLayers });
              }}
            />
          </div>

          {/* Interpolation / Easing Buttons */}
          <div className="studio-field-group">
            <span className="studio-field-label">Easing Curve (Interpolation)</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              {(
                [
                  { id: 'linear', label: 'Linear' },
                  { id: 'hold', label: 'Hold / Step' },
                  { id: 'ease_in', label: 'Ease In' },
                  { id: 'ease_out', label: 'Ease Out' },
                  { id: 'ease_in_out', label: 'Ease In-Out' },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => handleUpdateKeyframeEasing(mode.id)}
                  className={`studio-btn ${selectedKeyframe.easing === mode.id ? 'active' : ''}`}
                  style={{ justifyContent: 'center' }}
                >
                  {selectedKeyframe.easing === mode.id && <Check size={11} />}
                  <span>{mode.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Keyframe Value Editor */}
          <div className="studio-field-group">
            <span className="studio-field-label">Keyframe Value</span>
            {selectedProperty.type === 'color' ? (
              <div className="studio-color-picker-row">
                <input
                  type="color"
                  className="studio-color-swatch-btn"
                  value={rgbToHex(selectedKeyframe.value as RGBColor)}
                  onChange={(e) => {
                    const rgb = hexToRgb(e.target.value);
                    handleUpdatePropertyValue(selectedLayer.id, selectedProperty.id, rgb);
                  }}
                />
                <span style={{ fontSize: 11, fontFamily: 'var(--studio-font-mono)' }}>
                  {rgbToHex(selectedKeyframe.value as RGBColor)}
                </span>
              </div>
            ) : (
              <div className="studio-field-row">
                <input
                  type="range"
                  min={selectedProperty.min ?? 0}
                  max={selectedProperty.max ?? 100}
                  step={selectedProperty.step ?? 1}
                  className="studio-slider"
                  value={selectedKeyframe.value}
                  onChange={(e) =>
                    handleUpdatePropertyValue(selectedLayer.id, selectedProperty.id, Number(e.target.value))
                  }
                />
                <input
                  type="number"
                  className="studio-input-num"
                  value={selectedKeyframe.value}
                  onChange={(e) =>
                    handleUpdatePropertyValue(selectedLayer.id, selectedProperty.id, Number(e.target.value))
                  }
                />
                {selectedProperty.unit && (
                  <span style={{ fontSize: 11, color: '#777' }}>{selectedProperty.unit}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    );
  }

  // Render Layer Inspector
  if (selectedLayer) {
    return (
      <aside className="studio-inspector-panel">
        <div className="studio-inspector-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers size={14} color="#00F2FF" />
            <span>LAYER INSPECTOR</span>
          </div>
          <span style={{ fontSize: 10, color: '#00F2FF', fontWeight: 600 }}>
            {selectedLayer.type.toUpperCase().replace('_', ' ')}
          </span>
        </div>

        <div className="studio-inspector-content">
          {/* Layer Name */}
          <div className="studio-field-group">
            <span className="studio-field-label">Layer Name</span>
            <input
              type="text"
              style={{
                background: '#0B0D11',
                border: '1px solid var(--studio-border)',
                color: '#FFF',
                padding: '5px 8px',
                borderRadius: 4,
                fontSize: 12,
              }}
              value={selectedLayer.name}
              onChange={(e) => handleUpdateLayerMeta(selectedLayer.id, { name: e.target.value })}
            />
          </div>

          {/* Blend Mode & Opacity */}
          <div className="studio-field-group">
            <span className="studio-field-label">Compositing Blend Mode</span>
            <select
              style={{
                background: '#0B0D11',
                border: '1px solid var(--studio-border)',
                color: '#FFF',
                padding: '5px 8px',
                borderRadius: 4,
                fontSize: 11,
              }}
              value={selectedLayer.blendMode}
              onChange={(e) =>
                handleUpdateLayerMeta(selectedLayer.id, {
                  blendMode: e.target.value as LayerBlendMode,
                })
              }
            >
              <option value="replace">Normal (Replace)</option>
              <option value="add">Add (Additive Luminance)</option>
              <option value="screen">Screen (Maximum Brightness)</option>
              <option value="multiply">Multiply (Dim / Modulate)</option>
            </select>
          </div>

          <div className="studio-field-group">
            <span className="studio-field-label">Opacity ({selectedLayer.opacity}%)</span>
            <input
              type="range"
              min="0"
              max="100"
              className="studio-slider"
              value={selectedLayer.opacity}
              onChange={(e) =>
                handleUpdateLayerMeta(selectedLayer.id, { opacity: Number(e.target.value) })
              }
            />
          </div>

          {/* Target Keys Scope */}
          <div className="studio-field-group">
            <span className="studio-field-label">Target Keys</span>
            <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
              <button
                className={`studio-btn ${selectedLayer.targetKeys === 'all' ? 'active' : ''}`}
                onClick={() => handleUpdateLayerMeta(selectedLayer.id, { targetKeys: 'all' })}
              >
                All 61 Keys
              </button>
              <button
                className={`studio-btn ${selectedLayer.targetKeys !== 'all' ? 'active' : ''}`}
                onClick={onAssignCanvasSelectionToLayer}
              >
                Assigned Keys ({Array.isArray(selectedLayer.targetKeys) ? selectedLayer.targetKeys.length : 0})
              </button>
            </div>
            {selectedCanvasKeyCount > 0 && (
              <button
                onClick={onAssignCanvasSelectionToLayer}
                className="studio-btn primary"
                style={{ fontSize: 11, padding: '4px 8px' }}
              >
                Set to Canvas Selection ({selectedCanvasKeyCount} keys)
              </button>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--studio-border)', margin: '4px 0' }} />

          {/* Animated Parameters */}
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: 0.5 }}>
            LAYER PARAMETERS
          </div>

          {Object.values(selectedLayer.properties).map((prop) => {
            const currentVal = evaluateProperty(prop, currentTime);

            return (
              <div key={prop.id} className="studio-field-group">
                <div className="studio-field-label">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span
                      title={prop.animated ? 'Stopwatch enabled' : 'Static parameter'}
                      style={{ display: 'inline-flex' }}
                    >
                      <Clock size={11} color={prop.animated ? '#00F2FF' : '#666'} />
                    </span>
                    <span>{prop.name}</span>
                  </div>
                  {prop.animated && (
                    <span style={{ fontSize: 10, color: '#00F2FF' }}>
                      {prop.keyframes.length} keyframes
                    </span>
                  )}
                </div>

                {prop.type === 'color' ? (
                  <div className="studio-color-picker-row">
                    <input
                      type="color"
                      className="studio-color-swatch-btn"
                      value={rgbToHex(currentVal as RGBColor)}
                      onChange={(e) => {
                        const rgb = hexToRgb(e.target.value);
                        handleUpdatePropertyValue(selectedLayer.id, prop.id, rgb);
                      }}
                    />
                    <span style={{ fontSize: 11, fontFamily: 'var(--studio-font-mono)' }}>
                      {rgbToHex(currentVal as RGBColor)}
                    </span>
                  </div>
                ) : (
                  <div className="studio-field-row">
                    <input
                      type="range"
                      min={prop.min ?? 0}
                      max={prop.max ?? 100}
                      step={prop.step ?? 1}
                      className="studio-slider"
                      value={currentVal}
                      onChange={(e) =>
                        handleUpdatePropertyValue(selectedLayer.id, prop.id, Number(e.target.value))
                      }
                    />
                    <input
                      type="number"
                      className="studio-input-num"
                      value={typeof currentVal === 'number' ? Math.round(currentVal * 10) / 10 : currentVal}
                      onChange={(e) =>
                        handleUpdatePropertyValue(selectedLayer.id, prop.id, Number(e.target.value))
                      }
                    />
                    {prop.unit && <span style={{ fontSize: 11, color: '#777' }}>{prop.unit}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>
    );
  }

  // Fallback: Project Global Properties
  return (
    <aside className="studio-inspector-panel">
      <div className="studio-inspector-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sliders size={14} color="#00F2FF" />
          <span>PROJECT SETTINGS</span>
        </div>
      </div>

      <div className="studio-inspector-content">
        <div className="studio-field-group">
          <span className="studio-field-label">Timeline Duration</span>
          <div className="studio-field-row">
            <input
              type="number"
              step="0.5"
              min="1"
              max="60"
              className="studio-input-num"
              value={project.duration}
              onChange={(e) => {
                const dur = Math.max(1, Number(e.target.value));
                onUpdateProject({
                  ...project,
                  duration: dur,
                  workArea: { ...project.workArea, end: Math.min(project.workArea.end, dur) },
                });
              }}
            />
            <span style={{ fontSize: 11, color: '#777' }}>seconds</span>
          </div>
        </div>

        <div className="studio-field-group">
          <span className="studio-field-label">Target FPS</span>
          <div className="studio-field-row">
            <input
              type="number"
              min="15"
              max="60"
              className="studio-input-num"
              value={project.fps}
              onChange={(e) => onUpdateProject({ ...project, fps: Number(e.target.value) })}
            />
            <span style={{ fontSize: 11, color: '#777' }}>frames / sec</span>
          </div>
        </div>

        <div className="studio-field-group">
          <span className="studio-field-label">Target Hardware</span>
          <div
            style={{
              padding: '8px 10px',
              background: '#0B0D11',
              border: '1px solid var(--studio-border)',
              borderRadius: 4,
              fontSize: 11,
              color: '#9CA3AF',
            }}
          >
            Redragon K630 RGB (61 Keys ANSI) • EVision MCU (VID 0x320F, PID 0x5000)
          </div>
        </div>
      </div>
    </aside>
  );
};
