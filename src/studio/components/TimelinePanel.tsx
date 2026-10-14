import React, { useState, useRef, useEffect } from 'react';
import {
  StudioProject,
  StudioLayer,
  Keyframe,
  LayerType,
  SelectionState,
} from '../types/studio';
import { StudioEngine } from '../engine/StudioEngine';
import { createDefaultLayerProperties } from '../engine/effects';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
  Trash2,
  Copy,
  Clock,
  Diamond,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';

interface TimelinePanelProps {
  project: StudioProject;
  engine?: StudioEngine | null;
  currentTime: number;
  selection: SelectionState;
  onSelect: (selection: SelectionState) => void;
  onUpdateProject: (updated: StudioProject) => void;
  onSeek: (time: number) => void;
}

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  project,
  engine: _engine,
  currentTime,
  selection,
  onSelect,
  onUpdateProject,
  onSeek,
}) => {
  const [pixelsPerSecond, setPixelsPerSecond] = useState<number>(140);
  const [expandedLayers, setExpandedLayers] = useState<Record<string, boolean>>({
    [project.layers[0]?.id || '']: true,
  });

  const rulerRef = useRef<HTMLDivElement>(null);
  const lanesScrollRef = useRef<HTMLDivElement>(null);
  const headersScrollRef = useRef<HTMLDivElement>(null);
  const isDraggingPlayhead = useRef<boolean>(false);
  const draggingKeyframeRef = useRef<{
    layerId: string;
    propId: string;
    keyframeId: string;
    startX: number;
    origTime: number;
  } | null>(null);

  // Sync scroll between headers and lanes vertically
  const handleLanesScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (headersScrollRef.current) {
      headersScrollRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const totalWidth = Math.max(800, project.duration * pixelsPerSecond + 80);

  // Toggle expanded state of layer properties
  const toggleLayerExpanded = (layerId: string) => {
    setExpandedLayers((prev) => ({
      ...prev,
      [layerId]: !prev[layerId],
    }));
  };

  // Seek time on ruler/timeline click or drag
  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!lanesScrollRef.current) return;
    const rect = lanesScrollRef.current.getBoundingClientRect();
    const scrollLeft = lanesScrollRef.current.scrollLeft;
    const clickX = e.clientX - rect.left + scrollLeft;
    const time = Math.max(0, Math.min(project.duration, clickX / pixelsPerSecond));

    isDraggingPlayhead.current = true;
    onSeek(time);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingPlayhead.current && lanesScrollRef.current) {
        const rect = lanesScrollRef.current.getBoundingClientRect();
        const scrollLeft = lanesScrollRef.current.scrollLeft;
        const clickX = e.clientX - rect.left + scrollLeft;
        const time = Math.max(0, Math.min(project.duration, clickX / pixelsPerSecond));
        onSeek(time);
      } else if (draggingKeyframeRef.current) {
        const { layerId, propId, keyframeId, startX, origTime } = draggingKeyframeRef.current;
        const dx = e.clientX - startX;
        const dt = dx / pixelsPerSecond;
        const newTime = Math.max(0, Math.min(project.duration, Math.round((origTime + dt) * 100) / 100));

        // Update keyframe time in project
        const updatedLayers = project.layers.map((l) => {
          if (l.id !== layerId) return l;
          const prop = l.properties[propId];
          if (!prop) return l;

          const updatedKfs = prop.keyframes.map((kf) =>
            kf.id === keyframeId ? { ...kf, time: newTime } : kf
          );

          return {
            ...l,
            properties: {
              ...l.properties,
              [propId]: {
                ...prop,
                keyframes: updatedKfs,
              },
            },
          };
        });

        onUpdateProject({ ...project, layers: updatedLayers });
        onSeek(newTime);
      }
    };

    const handleMouseUp = () => {
      isDraggingPlayhead.current = false;
      draggingKeyframeRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [pixelsPerSecond, project, onSeek, onUpdateProject]);

  // Layer CRUD
  const handleAddLayer = (type: LayerType) => {
    const typeNames: Record<LayerType, string> = {
      traveling_wave: 'Traveling Wave',
      pulse: 'Pulse',
      color_cycle: 'Color Cycle',
      ripple: 'Ripple',
      base_color: 'Base Color',
    };

    const newLayer: StudioLayer = {
      id: `layer-${Date.now()}`,
      name: `${typeNames[type]} ${project.layers.length + 1}`,
      type,
      visible: true,
      locked: false,
      blendMode: type === 'base_color' ? 'replace' : 'add',
      opacity: 100,
      targetKeys: 'all',
      properties: createDefaultLayerProperties(type),
    };

    const updatedLayers = [newLayer, ...project.layers];
    onUpdateProject({ ...project, layers: updatedLayers });
    onSelect({ layerId: newLayer.id, propertyId: null, keyframeId: null });
    setExpandedLayers((prev) => ({ ...prev, [newLayer.id]: true }));
  };

  const handleDuplicateLayer = (layer: StudioLayer) => {
    const dup: StudioLayer = JSON.parse(JSON.stringify(layer));
    dup.id = `layer-${Date.now()}`;
    dup.name = `${layer.name} (Copy)`;

    const updated = [dup, ...project.layers];
    onUpdateProject({ ...project, layers: updated });
    onSelect({ layerId: dup.id, propertyId: null, keyframeId: null });
  };

  const handleDeleteLayer = (layerId: string) => {
    const updated = project.layers.filter((l) => l.id !== layerId);
    onUpdateProject({ ...project, layers: updated });
    if (selection.layerId === layerId) {
      onSelect({ layerId: updated[0]?.id || null, propertyId: null, keyframeId: null });
    }
  };

  const handleToggleVisible = (layerId: string) => {
    const updated = project.layers.map((l) =>
      l.id === layerId ? { ...l, visible: !l.visible } : l
    );
    onUpdateProject({ ...project, layers: updated });
  };

  const handleToggleLock = (layerId: string) => {
    const updated = project.layers.map((l) =>
      l.id === layerId ? { ...l, locked: !l.locked } : l
    );
    onUpdateProject({ ...project, layers: updated });
  };

  // Stopwatch toggle for property
  const handleToggleStopwatch = (layerId: string, propId: string) => {
    const updated = project.layers.map((l) => {
      if (l.id !== layerId) return l;
      const prop = l.properties[propId];
      if (!prop) return l;

      const animated = !prop.animated;
      const keyframes =
        animated && prop.keyframes.length === 0
          ? [{ id: `kf-${Date.now()}`, time: currentTime, value: prop.staticValue, easing: 'ease_in_out' as const }]
          : prop.keyframes;

      return {
        ...l,
        properties: {
          ...l.properties,
          [propId]: {
            ...prop,
            animated,
            keyframes,
          },
        },
      };
    });

    onUpdateProject({ ...project, layers: updated });
  };

  // Add / remove keyframe at current playhead
  const handleAddOrRemoveKeyframe = (layerId: string, propId: string) => {
    const roundedTime = Math.round(currentTime * 100) / 100;
    const updated = project.layers.map((l) => {
      if (l.id !== layerId) return l;
      const prop = l.properties[propId];
      if (!prop) return l;

      const existingIdx = prop.keyframes.findIndex(
        (kf) => Math.abs(kf.time - roundedTime) < 0.04
      );

      let keyframes: Keyframe[];
      if (existingIdx >= 0) {
        // Remove keyframe at playhead
        keyframes = prop.keyframes.filter((_, idx) => idx !== existingIdx);
      } else {
        // Add keyframe at playhead
        const newKf: Keyframe = {
          id: `kf-${Date.now()}`,
          time: roundedTime,
          value: prop.staticValue,
          easing: 'ease_in_out',
        };
        keyframes = [...prop.keyframes, newKf].sort((a, b) => a.time - b.time);
      }

      return {
        ...l,
        properties: {
          ...l.properties,
          [propId]: {
            ...prop,
            animated: true,
            keyframes,
          },
        },
      };
    });

    onUpdateProject({ ...project, layers: updated });
  };

  // Navigate to previous / next keyframe
  const handleJumpKeyframe = (layerId: string, propId: string, direction: -1 | 1) => {
    const layer = project.layers.find((l) => l.id === layerId);
    const prop = layer?.properties[propId];
    if (!prop || prop.keyframes.length === 0) return;

    const sorted = [...prop.keyframes].sort((a, b) => a.time - b.time);
    if (direction === -1) {
      const prev = sorted.filter((kf) => kf.time < currentTime - 0.01).pop();
      if (prev) onSeek(prev.time);
    } else {
      const next = sorted.find((kf) => kf.time > currentTime + 0.01);
      if (next) onSeek(next.time);
    }
  };

  // Ruler tick marks calculation
  const rulerTicks: number[] = [];
  const secondStep = pixelsPerSecond >= 100 ? 0.5 : 1.0;
  for (let t = 0; t <= project.duration; t += secondStep) {
    rulerTicks.push(t);
  }

  return (
    <div className="studio-timeline-panel">
      {/* Timeline Toolbar */}
      <div className="studio-timeline-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: '#9CA3AF' }}>
            ANIMATION TRACKS
          </span>

          {/* Add Layer dropdown */}
          <select
            className="studio-btn primary"
            style={{ padding: '3px 8px', fontSize: 11 }}
            value=""
            onChange={(e) => {
              if (e.target.value) {
                handleAddLayer(e.target.value as LayerType);
              }
            }}
          >
            <option value="" disabled>
              + Add Track...
            </option>
            <option value="traveling_wave">+ Traveling Wave</option>
            <option value="pulse">+ Pulse</option>
            <option value="color_cycle">+ Color Cycle</option>
            <option value="ripple">+ Ripple</option>
            <option value="base_color">+ Base Color</option>
          </select>
        </div>

        {/* Timeline Zoom Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setPixelsPerSecond((s) => Math.max(60, s - 20))}
            className="studio-btn"
            title="Zoom Out Timeline"
          >
            <ZoomOut size={12} />
          </button>
          <input
            type="range"
            min="60"
            max="300"
            value={pixelsPerSecond}
            onChange={(e) => setPixelsPerSecond(Number(e.target.value))}
            style={{ width: 80 }}
            title="Timeline Horizontal Zoom"
          />
          <button
            onClick={() => setPixelsPerSecond((s) => Math.min(300, s + 20))}
            className="studio-btn"
            title="Zoom In Timeline"
          >
            <ZoomIn size={12} />
          </button>
          <button
            onClick={() => setPixelsPerSecond(140)}
            className="studio-btn"
            title="Reset Timeline Zoom"
          >
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      {/* Split Tracks: Headers (Left) & Timeline Lanes (Right) */}
      <div className="studio-timeline-scroll-container">
        {/* Left Track Headers */}
        <div className="studio-track-headers-column" ref={headersScrollRef}>
          <div className="studio-track-header-topbar">
            <span>LAYER NAME</span>
            <span>PROPERTIES</span>
          </div>

          {project.layers.length === 0 ? (
            <div className="studio-empty-state">
              <span style={{ fontSize: 11 }}>No layers yet</span>
            </div>
          ) : (
            project.layers.map((layer) => {
              const isSelected = selection.layerId === layer.id;
              const isExpanded = !!expandedLayers[layer.id];

              return (
                <React.Fragment key={layer.id}>
                  {/* Layer Header Row */}
                  <div
                    className={`studio-track-header-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => onSelect({ layerId: layer.id, propertyId: null, keyframeId: null })}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLayerExpanded(layer.id);
                      }}
                      className="studio-btn"
                      style={{ padding: 2, background: 'transparent', border: 'none' }}
                    >
                      {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleVisible(layer.id);
                      }}
                      className="studio-btn"
                      style={{
                        padding: 3,
                        color: layer.visible ? '#FFFFFF' : '#555',
                        background: 'transparent',
                        border: 'none',
                      }}
                      title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                    >
                      {layer.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleLock(layer.id);
                      }}
                      className="studio-btn"
                      style={{
                        padding: 3,
                        color: layer.locked ? '#00F2FF' : '#555',
                        background: 'transparent',
                        border: 'none',
                      }}
                      title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                    >
                      {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>

                    <span className="studio-track-title" title={layer.name}>
                      {layer.name}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateLayer(layer);
                      }}
                      className="studio-btn"
                      style={{ padding: 3 }}
                      title="Duplicate Layer"
                    >
                      <Copy size={11} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLayer(layer.id);
                      }}
                      className="studio-btn"
                      style={{ padding: 3, color: '#FF4466' }}
                      title="Delete Layer"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>

                  {/* Expanded Property Rows */}
                  {isExpanded &&
                    Object.values(layer.properties).map((prop) => {
                      const isPropSelected =
                        selection.layerId === layer.id && selection.propertyId === prop.id;
                      const hasKeyframeAtCurrent = prop.keyframes.some(
                        (kf) => Math.abs(kf.time - currentTime) < 0.04
                      );

                      return (
                        <div
                          key={prop.id}
                          className={`studio-prop-header-row ${isPropSelected ? 'selected' : ''}`}
                          onClick={() =>
                            onSelect({ layerId: layer.id, propertyId: prop.id, keyframeId: null })
                          }
                        >
                          <span
                            title={prop.animated ? 'Stopwatch enabled (animated)' : 'Click to enable keyframe animation'}
                            style={{ display: 'inline-flex', cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStopwatch(layer.id, prop.id);
                            }}
                          >
                            <Clock
                              size={12}
                              className={`studio-stopwatch-icon ${prop.animated ? 'active' : ''}`}
                            />
                          </span>

                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {prop.name}
                          </span>

                          {prop.animated && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleJumpKeyframe(layer.id, prop.id, -1);
                                }}
                                className="studio-btn"
                                style={{ padding: 2 }}
                                title="Jump to Previous Keyframe"
                              >
                                <ChevronLeftIcon size={11} />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddOrRemoveKeyframe(layer.id, prop.id);
                                }}
                                className={`studio-btn ${hasKeyframeAtCurrent ? 'active' : ''}`}
                                style={{ padding: 2 }}
                                title={hasKeyframeAtCurrent ? 'Remove Keyframe at Playhead' : 'Add Keyframe at Playhead'}
                              >
                                <Diamond size={11} fill={hasKeyframeAtCurrent ? '#00F2FF' : 'none'} />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleJumpKeyframe(layer.id, prop.id, 1);
                                }}
                                className="studio-btn"
                                style={{ padding: 2 }}
                                title="Jump to Next Keyframe"
                              >
                                <ChevronRightIcon size={11} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Right Track Lanes & Time Ruler */}
        <div
          className="studio-track-lanes-column"
          ref={lanesScrollRef}
          onScroll={handleLanesScroll}
          onMouseDown={handleTimelineMouseDown}
        >
          {/* Time Ruler */}
          <div className="studio-ruler-wrapper" ref={rulerRef} style={{ width: totalWidth }}>
            {rulerTicks.map((t) => (
              <div
                key={t}
                style={{
                  position: 'absolute',
                  left: t * pixelsPerSecond,
                  top: 0,
                  bottom: 0,
                  borderLeft: t % 1 === 0 ? '1px solid #444B5B' : '1px solid #252A36',
                  paddingLeft: 4,
                  fontSize: 10,
                  fontFamily: 'var(--studio-font-mono)',
                  color: t % 1 === 0 ? '#9CA3AF' : '#5E6676',
                  pointerEvents: 'none',
                }}
              >
                {t % 1 === 0 ? `${t}s` : ''}
              </div>
            ))}

            {/* Work Area Bracket Highlight */}
            <div
              className="studio-workarea-span"
              style={{
                left: project.workArea.start * pixelsPerSecond,
                width: Math.max(2, (project.workArea.end - project.workArea.start) * pixelsPerSecond),
              }}
            />
          </div>

          {/* Draggable Cyan Playhead Needle */}
          <div
            className="studio-playhead-line"
            style={{
              left: currentTime * pixelsPerSecond,
              height: '100%',
            }}
          >
            <div
              className="studio-playhead-handle"
              onMouseDown={(e) => {
                e.stopPropagation();
                isDraggingPlayhead.current = true;
              }}
            />
          </div>

          {/* Lanes Content */}
          <div className="studio-lanes-content" style={{ width: totalWidth }}>
            {project.layers.map((layer) => {
              const isExpanded = !!expandedLayers[layer.id];

              return (
                <React.Fragment key={layer.id}>
                  {/* Layer Lane Row */}
                  <div className="studio-lane-row">
                    {/* Background grid lines */}
                    {rulerTicks.filter((t) => t % 1 === 0).map((t) => (
                      <div
                        key={t}
                        style={{
                          position: 'absolute',
                          left: t * pixelsPerSecond,
                          top: 0,
                          bottom: 0,
                          borderLeft: '1px solid rgba(255, 255, 255, 0.04)',
                          pointerEvents: 'none',
                        }}
                      />
                    ))}
                  </div>

                  {/* Expanded Property Lanes with Keyframe Diamonds */}
                  {isExpanded &&
                    Object.values(layer.properties).map((prop) => (
                      <div key={prop.id} className="studio-prop-lane-row">
                        {rulerTicks.filter((t) => t % 1 === 0).map((t) => (
                          <div
                            key={t}
                            style={{
                              position: 'absolute',
                              left: t * pixelsPerSecond,
                              top: 0,
                              bottom: 0,
                              borderLeft: '1px solid rgba(255, 255, 255, 0.03)',
                              pointerEvents: 'none',
                            }}
                          />
                        ))}

                        {/* Keyframe diamonds */}
                        {prop.keyframes.map((kf) => {
                          const isKfSelected = selection.keyframeId === kf.id;

                          return (
                            <div
                              key={kf.id}
                              className={`studio-keyframe-diamond ${isKfSelected ? 'selected' : ''}`}
                              style={{ left: kf.time * pixelsPerSecond }}
                              title={`Keyframe at ${kf.time.toFixed(2)}s (${kf.easing})`}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                onSelect({
                                  layerId: layer.id,
                                  propertyId: prop.id,
                                  keyframeId: kf.id,
                                });
                                onSeek(kf.time);
                                draggingKeyframeRef.current = {
                                  layerId: layer.id,
                                  propId: prop.id,
                                  keyframeId: kf.id,
                                  startX: e.clientX,
                                  origTime: kf.time,
                                };
                              }}
                            />
                          );
                        })}
                      </div>
                    ))}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
