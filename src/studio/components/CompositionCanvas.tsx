import React, { useEffect, useLayoutEffect, useRef, useState, useMemo, useCallback } from 'react';
import { KeyDefinition, KeyFrameColor } from '../../types/keyboard';
import { K630_LAYOUT } from '../../engine/layout';
import { rgbToCss } from '../../engine/color';
import { StudioEngine } from '../engine/StudioEngine';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckSquare,
  Square,
  Crosshair,
  Layers,
} from 'lucide-react';

interface CompositionCanvasProps {
  engine: StudioEngine | null;
  selectedKeyIds: Set<string>;
  onSelectKeys: (keys: Set<string>) => void;
  targetKeysSummary?: string;
  onApplySelectionToLayer?: () => void;
}

export const CompositionCanvas: React.FC<CompositionCanvasProps> = ({
  engine,
  selectedKeyIds,
  onSelectKeys,
  targetKeysSummary,
  onApplySelectionToLayer,
}) => {
  const [zoom, setZoom] = useState<number>(1.0);
  const keyRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const updateColors = useCallback((frame: KeyFrameColor) => {
    for (const [keyId, color] of Object.entries(frame)) {
      const el = keyRefs.current[keyId];
      if (el) {
        const css = rgbToCss(color);
        const glow = color.r > 15 || color.g > 15 || color.b > 15
          ? `0 3px 0 #080808, 0 0 12px rgba(${color.r}, ${color.g}, ${color.b}, 0.6), inset 0 0 4px rgba(${color.r}, ${color.g}, ${color.b}, 0.35)`
          : '0 3px 0 #080808, 0 4px 6px rgba(0, 0, 0, 0.6)';
        el.style.backgroundColor = css;
        el.style.boxShadow = glow;
      }
    }
  }, []);

  // Direct subscription to StudioEngine for zero-rerender 60 FPS playback
  useEffect(() => {
    if (!engine) return;
    const unsub = engine.subscribe((frame) => {
      updateColors(frame);
    });
    return unsub;
  }, [engine, updateColors]);

  // Synchronously paint current frame on layout / initial mount
  useLayoutEffect(() => {
    if (engine) {
      const frame = engine.evaluateCurrentFrame();
      updateColors(frame);
    }
  });

  // Group keys by row for rendering
  const rows = useMemo(() => {
    const r: KeyDefinition[][] = [[], [], [], [], []];
    K630_LAYOUT.forEach((k) => r[k.row].push(k));
    return r;
  }, []);

  const handleKeyClick = (key: KeyDefinition, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedKeyIds);
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      if (next.has(key.id)) {
        next.delete(key.id);
      } else {
        next.add(key.id);
      }
    } else {
      // Single key selection or toggle if already only this one
      if (next.size === 1 && next.has(key.id)) {
        next.clear();
      } else {
        next.clear();
        next.add(key.id);
      }
    }
    onSelectKeys(next);
  };

  // Preset region selectors
  const handleSelectAll = () => {
    onSelectKeys(new Set(K630_LAYOUT.map((k) => k.id)));
  };

  const handleClearSelection = () => {
    onSelectKeys(new Set());
  };

  const handleSelectWASD = () => {
    onSelectKeys(new Set(['w', 'a', 's', 'd', 'space']));
  };

  const handleSelectRow = (rowIndex: number) => {
    const rowKeys = K630_LAYOUT.filter((k) => k.row === rowIndex).map((k) => k.id);
    onSelectKeys(new Set(rowKeys));
  };

  const handleSelectModifiers = () => {
    const modKeys = ['ctrl_l', 'ctrl_r', 'alt_l', 'alt_r', 'shift_l', 'shift_r', 'win_l', 'fn', 'app', 'enter', 'tab', 'caps', 'backspace'];
    onSelectKeys(new Set(modKeys));
  };

  return (
    <div className="studio-canvas-panel">
      {/* Canvas Top Toolbar */}
      <div className="studio-canvas-toolbar">
        <div className="studio-selection-bar">
          <span style={{ color: '#9CA3AF', fontWeight: 600 }}>KEY SELECTION:</span>
          <button onClick={handleSelectAll} className="studio-btn" title="Select All 61 Keys">
            <CheckSquare size={12} />
            <span>All</span>
          </button>
          <button onClick={handleClearSelection} className="studio-btn" title="Clear Key Selection">
            <Square size={12} />
            <span>None</span>
          </button>
          <button onClick={handleSelectWASD} className="studio-btn" title="Select WASD Cluster">
            <Crosshair size={12} />
            <span>WASD</span>
          </button>
          <button onClick={handleSelectModifiers} className="studio-btn" title="Select Modifier Keys">
            <span>Modifiers</span>
          </button>
          <select
            className="studio-btn"
            style={{ padding: '3px 6px', fontSize: 11 }}
            value=""
            onChange={(e) => {
              if (e.target.value !== '') {
                handleSelectRow(Number(e.target.value));
              }
            }}
          >
            <option value="" disabled>
              Select Row...
            </option>
            <option value="0">Row 0 (Number Row)</option>
            <option value="1">Row 1 (QWERTY)</option>
            <option value="2">Row 2 (ASDF)</option>
            <option value="3">Row 3 (ZXCV)</option>
            <option value="4">Row 4 (Bottom / Space)</option>
          </select>

          {selectedKeyIds.size > 0 && onApplySelectionToLayer && (
            <button
              onClick={onApplySelectionToLayer}
              className="studio-btn primary"
              style={{ marginLeft: 8 }}
              title="Apply these selected keys to the active layer"
            >
              <Layers size={12} />
              <span>Assign to Layer ({selectedKeyIds.size})</span>
            </button>
          )}

          {targetKeysSummary && (
            <span style={{ fontSize: 11, color: '#00F2FF', marginLeft: 8 }}>
              {targetKeysSummary}
            </span>
          )}
        </div>

        {/* Viewport Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setZoom((z) => Math.max(0.6, Math.round((z - 0.1) * 10) / 10))}
            className="studio-btn"
            title="Zoom Out"
          >
            <ZoomOut size={12} />
          </button>
          <span style={{ fontSize: 11, fontFamily: 'var(--studio-font-mono)', minWidth: 36, textAlign: 'center' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(1.5, Math.round((z + 0.1) * 10) / 10))}
            className="studio-btn"
            title="Zoom In"
          >
            <ZoomIn size={12} />
          </button>
          <button
            onClick={() => setZoom(1.0)}
            className="studio-btn"
            title="Fit / Reset Zoom (100%)"
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      {/* Interactive Virtual Keyboard Viewport */}
      <div className="studio-canvas-viewport">
        <div
          className="studio-canvas-chassis-container"
          style={{ transform: `scale(${zoom})` }}
        >
          <div className="vk-chassis">
            {rows.map((rowKeys, rowIndex) => (
              <div key={`row-${rowIndex}`} className="vk-row">
                {rowKeys.map((key) => {
                  const isSelected = selectedKeyIds.has(key.id);

                  return (
                    <div
                      key={key.id}
                      ref={(el) => {
                        keyRefs.current[key.id] = el;
                      }}
                      className={`vk-key ${isSelected ? 'studio-key-selected' : ''}`}
                      style={{
                        flex: `${key.uWidth} 0 0`,
                        maxWidth: `${key.uWidth * 56}px`,
                        minWidth: `${key.uWidth * 42}px`,
                        backgroundColor: '#121214',
                        cursor: 'pointer',
                      }}
                      onClick={(e) => handleKeyClick(key, e)}
                    >
                      <div className="vk-keycap-top">
                        <span className="vk-key-label">{key.label}</span>
                        {key.subLabel && <span className="vk-key-sub">{key.subLabel}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
