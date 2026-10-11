import React, { useEffect, useLayoutEffect, useRef, useState, useMemo, useCallback } from 'react';
import { KeyDefinition, KeyFrameColor } from '../types/keyboard';
import { K630_LAYOUT } from '../engine/layout';
import { rgbToCss } from '../engine/color';
import { ZoomIn, ZoomOut, Maximize2, MousePointer } from 'lucide-react';
import type { AnimationEngine } from '../engine/animator';

interface VirtualKeyboardProps {
  currentFrame?: KeyFrameColor;
  engine?: AnimationEngine | null;
  isPixelArtMode?: boolean;
  selectedKeyIds?: Set<string>;
  onKeyClick?: (key: KeyDefinition, e: React.MouseEvent) => void;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = React.memo(({
  currentFrame = {},
  engine = null,
  isPixelArtMode = false,
  selectedKeyIds = new Set(),
  onKeyClick,
}) => {
  const [zoom, setZoom] = useState<number>(1.0);
  const containerRef = useRef<HTMLDivElement>(null);
  const keyRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lastFrameRef = useRef<KeyFrameColor>(currentFrame);

  const updateColors = useCallback((frame: KeyFrameColor) => {
    lastFrameRef.current = frame;
    for (const [keyId, color] of Object.entries(frame)) {
      const el = keyRefs.current[keyId];
      if (el) {
        const css = rgbToCss(color);
        const glow = color.r > 20 || color.g > 20 || color.b > 20
          ? `0 3px 0 #0A0A0A, 0 0 10px rgba(${color.r}, ${color.g}, ${color.b}, 0.55), inset 0 0 4px rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`
          : '0 3px 0 #0A0A0A, 0 4px 6px rgba(0, 0, 0, 0.5)';
        el.style.backgroundColor = css;
        el.style.boxShadow = glow;
      }
    }
  }, []);

  // Direct subscription to animation engine for zero-rerender 60 FPS animation
  useEffect(() => {
    if (!engine) return;
    const unsub = engine.subscribe((frame) => {
      updateColors(frame);
    });
    return unsub;
  }, [engine, updateColors]);

  // Synchronously ensure colors are applied immediately after React render/reconciliation
  useLayoutEffect(() => {
    const frameToApply = isPixelArtMode
      ? currentFrame
      : (Object.keys(lastFrameRef.current).length > 0 ? lastFrameRef.current : currentFrame);
    if (frameToApply && Object.keys(frameToApply).length > 0) {
      updateColors(frameToApply);
    }
  });

  // Group keys by row
  const rows = useMemo(() => {
    const r: KeyDefinition[][] = [[], [], [], [], []];
    K630_LAYOUT.forEach((k) => r[k.row].push(k));
    return r;
  }, []);

  const [isPointerDown, setIsPointerDown] = useState(false);

  useEffect(() => {
    const handleMouseUp = () => setIsPointerDown(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  return (
    <div className="virtual-keyboard-card">
      <div className="vk-header">
        <div className="vk-title-area">
          <span className="vk-badge">REDRAGON K630 RGB</span>
          <span className="vk-subtitle">61-Key ANSI 60% Layout • EVision Controller</span>
        </div>
        <div className="vk-controls">
          <button
            onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
            title="Zoom Out"
            className="icon-btn"
          >
            <ZoomOut size={13} />
          </button>
          <span className="zoom-text">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
            title="Zoom In"
            className="icon-btn"
          >
            <ZoomIn size={13} />
          </button>
          <button
            onClick={() => setZoom(1.0)}
            title="Reset Zoom"
            className="icon-btn"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      <div className="vk-viewport" ref={containerRef}>
        <div
          className="vk-chassis"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
          }}
        >
          {rows.map((rowKeys, rowIndex) => (
            <div key={`row-${rowIndex}`} className="vk-row">
              {rowKeys.map((key) => {
                const isSelected = selectedKeyIds.has(key.id);
                const color = isPixelArtMode
                  ? currentFrame[key.id]
                  : (lastFrameRef.current[key.id] || currentFrame[key.id]);
                const bgStyle = color ? rgbToCss(color) : '#1A1A1A';
                const glowStyle = color && (color.r > 20 || color.g > 20 || color.b > 20)
                  ? `0 3px 0 #0A0A0A, 0 0 10px rgba(${color.r}, ${color.g}, ${color.b}, 0.55), inset 0 0 4px rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`
                  : '0 3px 0 #0A0A0A, 0 4px 6px rgba(0, 0, 0, 0.5)';

                return (
                  <div
                    key={key.id}
                    ref={(el) => {
                      keyRefs.current[key.id] = el;
                    }}
                    className={`vk-key ${isSelected ? 'selected' : ''} ${
                      isPixelArtMode ? 'interactive-pixel' : ''
                    }`}
                    style={{
                      flex: `${key.uWidth} 0 0`,
                      maxWidth: `${key.uWidth * 56}px`,
                      minWidth: `${key.uWidth * 42}px`,
                      backgroundColor: bgStyle,
                      boxShadow: glowStyle,
                    }}
                    onMouseDown={(e) => {
                      setIsPointerDown(true);
                      onKeyClick && onKeyClick(key, e);
                    }}
                    onMouseEnter={(e) => {
                      if (isPointerDown && isPixelArtMode && !e.shiftKey && !e.ctrlKey) {
                        onKeyClick && onKeyClick(key, e);
                      }
                    }}
                  >
                    <div className="vk-keycap-top">
                      <span className="vk-key-label">{key.label}</span>
                      {key.subLabel && (
                        <span className="vk-key-sub">{key.subLabel}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {isPixelArtMode && (
        <div className="vk-pixel-hint">
          <MousePointer size={12} />
          <span>Click key to paint with active color • Click & drag or hold Shift/Ctrl to select multiple</span>
        </div>
      )}
    </div>
  );
});
