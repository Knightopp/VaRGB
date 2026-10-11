import React, { useState } from 'react';
import { PixelArtParams, PixelArtFrame } from '../types/effects';
import { RGBColor } from '../types/keyboard';
import {
  STARTER_HEART,
  STARTER_SKULL,
  STARTER_SMILEY,
  STARTER_INVADER_F1,
  STARTER_INVADER_F2,
} from '../engine/effects/pixelArt';
import { rgbToHex, hexToRgb } from '../engine/color';
import {
  Plus,
  Trash2,
  Copy,
  RotateCcw,
  Info,
  Paintbrush,
  Eraser,
} from 'lucide-react';

interface PixelArtEditorProps {
  params: PixelArtParams;
  onChange: (newParams: PixelArtParams) => void;
  onSavePreset: (name: string) => void;
  activeFrameIndex: number;
  onSelectFrameIndex: (idx: number) => void;
  selectedColor: RGBColor;
  onSelectColor: (color: RGBColor) => void;
  tool: 'brush' | 'eraser';
  onSelectTool: (t: 'brush' | 'eraser') => void;
  onNewBlankArt: () => void;
  selectedKeyIds: Set<string>;
  onClearSelection: () => void;
  onSelectAll: () => void;
}

const PALETTE_SWATCHES: RGBColor[] = [
  { r: 255, g: 0, b: 0 },       // Pure Crimson Red (Calibrated #FF0000)
  { r: 255, g: 90, b: 0 },      // Neon Amber Orange
  { r: 255, g: 220, b: 0 },     // Sun Yellow
  { r: 0, g: 255, b: 0 },       // Pure Green
  { r: 0, g: 240, b: 255 },     // Electric Cyan
  { r: 0, g: 70, b: 255 },      // Royal Blue
  { r: 160, g: 0, b: 255 },     // Deep Violet
  { r: 255, g: 0, b: 150 },     // Magenta
  { r: 255, g: 255, b: 255 },   // Pure White
  { r: 90, g: 90, b: 90 },      // Dim Charcoal
  { r: 0, g: 0, b: 0 },         // Strict Blackout / LED Off
];

export const PixelArtEditor: React.FC<PixelArtEditorProps> = ({
  params,
  onChange,
  onSavePreset,
  activeFrameIndex,
  onSelectFrameIndex,
  selectedColor,
  onSelectColor,
  tool,
  onSelectTool,
  onNewBlankArt,
  selectedKeyIds,
  onClearSelection,
  onSelectAll,
}) => {
  const [presetName, setPresetName] = useState('');

  const currentFrame = params.frames[activeFrameIndex] || params.frames[0];

  const updateCurrentFramePixels = (newPixels: Record<string, RGBColor>) => {
    const newFrames = [...params.frames];
    newFrames[activeFrameIndex] = {
      ...newFrames[activeFrameIndex],
      pixels: newPixels,
    };
    onChange({
      ...params,
      frames: newFrames,
    });
  };

  const handleAddFrame = () => {
    const newFrame: PixelArtFrame = {
      id: `frame-${Date.now()}`,
      pixels: { ...(currentFrame?.pixels || {}) },
    };
    onChange({
      ...params,
      frames: [...params.frames, newFrame],
    });
    onSelectFrameIndex(params.frames.length);
  };

  const handleDuplicateFrame = () => {
    if (!currentFrame) return;
    const duplicated: PixelArtFrame = {
      id: `frame-${Date.now()}`,
      pixels: { ...currentFrame.pixels },
    };
    const newFrames = [...params.frames];
    newFrames.splice(activeFrameIndex + 1, 0, duplicated);
    onChange({
      ...params,
      frames: newFrames,
    });
    onSelectFrameIndex(activeFrameIndex + 1);
  };

  const handleDeleteFrame = () => {
    if (params.frames.length <= 1) return;
    const newFrames = params.frames.filter((_, idx) => idx !== activeFrameIndex);
    onChange({
      ...params,
      frames: newFrames,
    });
    onSelectFrameIndex(Math.max(0, activeFrameIndex - 1));
  };

  const handleClearFrame = () => {
    updateCurrentFramePixels({});
  };

  const handleFillSelected = () => {
    if (!currentFrame) return;
    const colorToApply = tool === 'eraser' ? { r: 0, g: 0, b: 0 } : selectedColor;
    const newPixels = { ...currentFrame.pixels };
    selectedKeyIds.forEach((id) => {
      newPixels[id] = colorToApply;
    });
    updateCurrentFramePixels(newPixels);
  };

  const handleLoadStarter = (starter: PixelArtFrame) => {
    updateCurrentFramePixels({ ...starter.pixels });
  };

  return (
    <div className="pixel-art-editor-panel">
      {/* Resolution limitation notice */}
      <div className="resolution-banner">
        <Info size={14} />
        <div>
          <strong>61-Key ANSI Canvas (14×5 matrix)</strong>
          <p>
            Due to the physical key layout of a 60% keyboard, columns shift across rows.
            High-contrast shapes and icon silhouettes yield the clearest illumination.
          </p>
        </div>
      </div>

      {/* Top Action Bar */}
      <div className="pixel-art-top-actions">
        <button
          onClick={onNewBlankArt}
          className="icon-btn primary blackout-btn"
          title="Start fresh with all keys completely off"
        >
          <RotateCcw size={13} />
          <span>New Art (Blackout All Keys)</span>
        </button>
      </div>

      <div className="save-preset-inline">
        <input aria-label="Pixel art preset name" placeholder="Name this pixel art preset" value={presetName}
          onChange={(event) => setPresetName(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter' && presetName.trim()) { onSavePreset(presetName.trim()); setPresetName(''); } }} />
        <button className="primary" disabled={!presetName.trim()} onClick={() => { onSavePreset(presetName.trim()); setPresetName(''); }}>Save Pixel Art</button>
      </div>

      {/* Tools & Palette */}
      <div className="tools-palette-row">
        <div className="tool-selector">
          <button
            className={`tool-btn ${tool === 'brush' ? 'active' : ''}`}
            onClick={() => onSelectTool('brush')}
            title="Brush - Paint keys with selected color"
          >
            <Paintbrush size={14} />
            <span>Brush</span>
          </button>
          <button
            className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
            onClick={() => onSelectTool('eraser')}
            title="Eraser - Blackout / turn off clicked keys"
          >
            <Eraser size={14} />
            <span>Eraser (Off)</span>
          </button>
        </div>

        <div className="swatches-container">
          {PALETTE_SWATCHES.map((swatch, idx) => {
            const isCurrent =
              tool === 'brush' &&
              swatch.r === selectedColor.r &&
              swatch.g === selectedColor.g &&
              swatch.b === selectedColor.b;
            const isOff = swatch.r === 0 && swatch.g === 0 && swatch.b === 0;
            return (
              <button
                key={idx}
                className={`swatch-circle ${isCurrent ? 'active' : ''} ${isOff ? 'swatch-off' : ''}`}
                style={{ backgroundColor: rgbToHex(swatch) }}
                title={isOff ? 'Off / Blackout' : rgbToHex(swatch)}
                onClick={() => {
                  if (isOff) {
                    onSelectTool('eraser');
                  } else {
                    onSelectColor(swatch);
                    onSelectTool('brush');
                  }
                }}
              />
            );
          })}
          <div className="custom-picker">
            <input
              type="color"
              value={rgbToHex(selectedColor)}
              onChange={(e) => {
                onSelectColor(hexToRgb(e.target.value));
                onSelectTool('brush');
              }}
              title="Custom Hex Picker"
            />
          </div>
        </div>
      </div>

      {/* Selection Actions */}
      <div className="selection-actions-bar">
        <button onClick={onSelectAll} className="icon-btn">
          Select All Keys
        </button>
        <button
          onClick={handleFillSelected}
          disabled={selectedKeyIds.size === 0}
          className="icon-btn primary"
        >
          Fill Selected ({selectedKeyIds.size})
        </button>
        <button
          onClick={onClearSelection}
          disabled={selectedKeyIds.size === 0}
          className="icon-btn"
        >
          Clear Selection
        </button>
        <button onClick={handleClearFrame} className="icon-btn" title="Turn all keys in this frame off">
          <RotateCcw size={13} />
          <span>Blackout Canvas</span>
        </button>
      </div>

      {/* Starter Templates */}
      <div className="starter-section">
        <span className="section-title">Starter Templates (Optional)</span>
        <div className="starter-grid">
          <button onClick={() => handleLoadStarter(STARTER_HEART)} className="starter-btn">
            <span>❤️ Heart</span>
          </button>
          <button onClick={() => handleLoadStarter(STARTER_SKULL)} className="starter-btn">
            <span>💀 Skull</span>
          </button>
          <button onClick={() => handleLoadStarter(STARTER_SMILEY)} className="starter-btn">
            <span>😊 Smiley</span>
          </button>
          <button
            onClick={() => {
              onChange({
                ...params,
                frames: [STARTER_INVADER_F1, STARTER_INVADER_F2],
                fps: 2,
              });
              onSelectFrameIndex(0);
            }}
            className="starter-btn"
          >
            <span>👾 Space Invader (2F)</span>
          </button>
        </div>
      </div>

      {/* Animation Timeline */}
      <div className="timeline-section">
        <div className="timeline-header">
          <span className="section-title">Animation Frames</span>
          <div className="fps-control">
            <span>FPS: {params.fps}</span>
            <input
              type="range"
              min="1"
              max="12"
              value={params.fps}
              onChange={(e) =>
                onChange({
                  ...params,
                  fps: parseInt(e.target.value),
                })
              }
            />
          </div>
        </div>

        <div className="frames-strip">
          {params.frames.map((_, idx) => (
            <button
              key={idx}
              className={`frame-thumb ${idx === activeFrameIndex ? 'active' : ''}`}
              onClick={() => onSelectFrameIndex(idx)}
            >
              <span>Frame {idx + 1}</span>
            </button>
          ))}
          <button onClick={handleAddFrame} className="frame-add-btn" title="Add Frame">
            <Plus size={14} />
          </button>
        </div>

        <div className="timeline-controls">
          <button onClick={handleDuplicateFrame} className="icon-btn" title="Duplicate Current Frame">
            <Copy size={13} />
            <span>Duplicate</span>
          </button>
          <button
            onClick={handleDeleteFrame}
            disabled={params.frames.length <= 1}
            className="icon-btn"
            title="Delete Frame"
          >
            <Trash2 size={13} />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};
