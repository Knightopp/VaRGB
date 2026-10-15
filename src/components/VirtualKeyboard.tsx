import React, { useEffect, useLayoutEffect, useRef, useState, useMemo, useCallback } from 'react';
import { KeyDefinition, KeyFrameColor, RGBColor } from '../types/keyboard';
import { K630_LAYOUT } from '../engine/layout';
import { ZoomIn, ZoomOut, Maximize2, MousePointer } from 'lucide-react';
import type { AnimationEngine } from '../engine/animator';
import { KeyboardVisualTheme, GapLightingMode } from '../services/settings';

interface VirtualKeyboardProps {
  currentFrame?: KeyFrameColor;
  engine?: AnimationEngine | null;
  effectType?: string;
  isPixelArtMode?: boolean;
  selectedKeyIds?: Set<string>;
  onKeyClick?: (key: KeyDefinition, e: React.MouseEvent) => void;
  hideHeader?: boolean;
  theme?: KeyboardVisualTheme;
  gapLighting?: GapLightingMode;
}

// Formatter matching authentic physical Redragon K630 mechanical keycaps
function renderKeycapContent(key: KeyDefinition) {
  switch (key.id) {
    case 'esc':
      return <span className="vk-cap-text">Esc</span>;
    case 'num_1':
      return <span className="vk-cap-dual"><span className="vk-cap-num">1</span><span className="vk-cap-sym">!</span></span>;
    case 'num_2':
      return <span className="vk-cap-dual"><span className="vk-cap-num">2</span><span className="vk-cap-sym">@</span></span>;
    case 'num_3':
      return <span className="vk-cap-dual"><span className="vk-cap-num">3</span><span className="vk-cap-sym">#</span></span>;
    case 'num_4':
      return <span className="vk-cap-dual"><span className="vk-cap-num">4</span><span className="vk-cap-sym">$</span></span>;
    case 'num_5':
      return <span className="vk-cap-dual"><span className="vk-cap-num">5</span><span className="vk-cap-sym">%</span></span>;
    case 'num_6':
      return <span className="vk-cap-dual"><span className="vk-cap-num">6</span><span className="vk-cap-sym">^</span></span>;
    case 'num_7':
      return <span className="vk-cap-dual"><span className="vk-cap-num">7</span><span className="vk-cap-sym">&amp;</span></span>;
    case 'num_8':
      return <span className="vk-cap-dual"><span className="vk-cap-num">8</span><span className="vk-cap-sym">*</span></span>;
    case 'num_9':
      return <span className="vk-cap-dual"><span className="vk-cap-num">9</span><span className="vk-cap-sym">(</span></span>;
    case 'num_0':
      return <span className="vk-cap-dual"><span className="vk-cap-num">0</span><span className="vk-cap-sym">)</span></span>;
    case 'minus':
      return <span className="vk-cap-dual"><span className="vk-cap-num">-</span><span className="vk-cap-sym">_</span></span>;
    case 'equal':
      return <span className="vk-cap-dual"><span className="vk-cap-num">=</span><span className="vk-cap-sym">+</span></span>;
    case 'backspace':
      return (
        <svg className="vk-cap-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="20" y1="12" x2="4" y2="12"></line>
          <polyline points="10 18 4 12 10 6"></polyline>
        </svg>
      );
    case 'tab':
      return <span className="vk-cap-text">Tab</span>;
    case 'bracket_l':
      return <span className="vk-cap-dual"><span className="vk-cap-num">[</span><span className="vk-cap-sym">&#123;</span></span>;
    case 'bracket_r':
      return <span className="vk-cap-dual"><span className="vk-cap-num">]</span><span className="vk-cap-sym">&#125;</span></span>;
    case 'backslash':
      return <span className="vk-cap-dual"><span className="vk-cap-num">\</span><span className="vk-cap-sym">|</span></span>;
    case 'caps':
      return <span className="vk-cap-text">Caps</span>;
    case 'semicolon':
      return <span className="vk-cap-dual"><span className="vk-cap-num">;</span><span className="vk-cap-sym">:</span></span>;
    case 'quote':
      return <span className="vk-cap-dual"><span className="vk-cap-num">'</span><span className="vk-cap-sym">"</span></span>;
    case 'enter':
      return <span className="vk-cap-text vk-cap-enter">Enter</span>;
    case 'shift_l':
    case 'shift_r':
      return <span className="vk-cap-text">Shift</span>;
    case 'comma':
      return <span className="vk-cap-dual"><span className="vk-cap-num">,</span><span className="vk-cap-sym">&lt;</span></span>;
    case 'period':
      return <span className="vk-cap-dual"><span className="vk-cap-num">.</span><span className="vk-cap-sym">&gt;</span></span>;
    case 'slash':
      return <span className="vk-cap-dual"><span className="vk-cap-num">/</span><span className="vk-cap-sym">?</span></span>;
    case 'ctrl_l':
    case 'ctrl_r':
      return <span className="vk-cap-text">Ctrl</span>;
    case 'win':
      return (
        <svg className="vk-cap-icon" width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
          <path d="M0 2.25L6.5 1.35V7.45H0V2.25ZM0 8.55H6.5V14.65L0 13.75V8.55ZM7.5 1.2L16 0V7.45H7.5V1.2ZM7.5 8.55H16V16L7.5 14.8V8.55Z"/>
        </svg>
      );
    case 'alt_l':
    case 'alt_r':
      return <span className="vk-cap-text">Alt</span>;
    case 'space':
      return <div className="vk-space-slit" />;
    case 'fn':
      return <span className="vk-cap-text">Fn</span>;
    case 'menu':
      return (
        <svg className="vk-cap-icon" width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <rect x="2" y="2" width="4.5" height="4.5" rx="0.5"/>
          <rect x="9.5" y="2" width="4.5" height="4.5" rx="0.5"/>
          <rect x="2" y="9.5" width="4.5" height="4.5" rx="0.5"/>
          <rect x="9.5" y="9.5" width="4.5" height="4.5" rx="0.5"/>
        </svg>
      );
    default:
      return <span className="vk-cap-letter">{key.label}</span>;
  }
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = React.memo(({
  currentFrame = {},
  engine = null,
  effectType,
  isPixelArtMode = false,
  selectedKeyIds = new Set(),
  onKeyClick,
  hideHeader = true,
  theme,
  gapLighting,
}) => {
  const [zoom, setZoom] = useState<number>(1.0);
  const containerRef = useRef<HTMLDivElement>(null);
  const keyRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lastFrameRef = useRef<KeyFrameColor>(currentFrame);

  const [activeTheme, setActiveTheme] = useState<KeyboardVisualTheme>(() => {
    return theme || (typeof window !== 'undefined' ? (localStorage.getItem('vargb_kb_theme') as KeyboardVisualTheme) || 'mechanical' : 'mechanical');
  });

  const [activeGapLighting, setActiveGapLighting] = useState<GapLightingMode>(() => {
    return gapLighting || (typeof window !== 'undefined' ? (localStorage.getItem('vargb_kb_gap_lighting') as GapLightingMode) || 'vivid' : 'vivid');
  });

  useEffect(() => {
    if (theme) setActiveTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (gapLighting) setActiveGapLighting(gapLighting);
  }, [gapLighting]);

  useEffect(() => {
    const handleStorageChange = () => {
      const storedTheme = (localStorage.getItem('vargb_kb_theme') as KeyboardVisualTheme) || 'mechanical';
      const storedGap = (localStorage.getItem('vargb_kb_gap_lighting') as GapLightingMode) || 'vivid';
      setActiveTheme(storedTheme);
      setActiveGapLighting(storedGap);
    };
    window.addEventListener('vargb_kb_theme_change', handleStorageChange);
    return () => window.removeEventListener('vargb_kb_theme_change', handleStorageChange);
  }, []);

  interface KeySubParts {
    glow: HTMLElement | null;
    body: HTMLElement | null;
    legend: HTMLElement | null;
    top: HTMLElement | null;
    slit: HTMLElement | null;
  }

  const litKeysRef = useRef<Set<string>>(new Set());
  const keyPartsRef = useRef<Record<string, KeySubParts>>({});
  const lastKeyColorRef = useRef<Record<string, RGBColor>>({});

  const applyKeyColorToElement = useCallback((
    parts: KeySubParts | undefined,
    keyId: string,
    color?: RGBColor
  ) => {
    if (!parts) return;

    // Fast-path: if color is identical to previous frame, skip all DOM style updates!
    const prev = lastKeyColorRef.current[keyId];
    if (prev) {
      if (color && prev.r === color.r && prev.g === color.g && prev.b === color.b) {
        return;
      }
      if (!color && prev.r === 0 && prev.g === 0 && prev.b === 0) {
        return;
      }
    } else if (!color) {
      return;
    }

    lastKeyColorRef.current[keyId] = color ? { r: color.r, g: color.g, b: color.b } : { r: 0, g: 0, b: 0 };

    const isLit = Boolean(color && (color.r > 12 || color.g > 12 || color.b > 12));
    const r = color?.r ?? 0;
    const g = color?.g ?? 0;
    const b = color?.b ?? 0;

    // 1. Physical switch LED underglow radiating into gaps between keycaps
    const glow = parts.glow;
    if (glow) {
      if (isLit && activeGapLighting !== 'off' && activeTheme !== 'classic') {
        const glowAlpha = activeGapLighting === 'subtle' ? 0.45 : 0.95;
        const hotR = Math.min(255, Math.round(r * 0.4 + 140));
        const hotG = Math.min(255, Math.round(g * 0.4 + 140));
        const hotB = Math.min(255, Math.round(b * 0.4 + 140));
        glow.style.background = `radial-gradient(ellipse at 50% 15%, rgba(${hotR}, ${hotG}, ${hotB}, 1) 0%, rgba(${r}, ${g}, ${b}, ${glowAlpha}) 35%, rgba(${r}, ${g}, ${b}, ${glowAlpha * 0.55}) 60%, rgba(${r}, ${g}, ${b}, 0) 85%)`;
        glow.style.boxShadow = activeGapLighting === 'subtle'
          ? `0 0 6px rgba(${r}, ${g}, ${b}, 0.35)`
          : `0 -2px 5px rgba(${r}, ${g}, ${b}, 0.9), 0 2px 4px rgba(${r}, ${g}, ${b}, 0.5), 0 0 6px rgba(${r}, ${g}, ${b}, 0.65)`;
        glow.style.opacity = '1';
      } else {
        glow.style.background = 'none';
        glow.style.boxShadow = 'none';
        glow.style.opacity = '0';
      }
    }

    // 2. Realistic keycap body skirt edge light catch in gaps vs Classic border glow vs Pudding
    const body = parts.body;
    if (body) {
      if (activeTheme === 'classic') {
        body.style.background = '';
        if (isLit) {
          body.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.65)`;
          body.style.boxShadow = `0 2px 0 #070709, 0 0 8px rgba(${r}, ${g}, ${b}, 0.45)`;
        } else {
          body.style.borderColor = 'rgba(255, 255, 255, 0.08)';
          body.style.boxShadow = '0 2px 0 #070709, 0 3px 5px rgba(0, 0, 0, 0.7)';
        }
      } else if (activeTheme === 'pudding') {
        if (isLit) {
          body.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.4)`;
          body.style.boxShadow = `0 3px 0 #070709, 0 0 12px rgba(${r}, ${g}, ${b}, 0.65)`;
          body.style.background = `linear-gradient(180deg, #18191c 40%, rgba(${r}, ${g}, ${b}, 0.8) 100%)`;
        } else {
          body.style.borderColor = 'rgba(255, 255, 255, 0.08)';
          body.style.boxShadow = '0 3px 0 #070709, 0 4px 6px rgba(0, 0, 0, 0.85)';
          body.style.background = 'linear-gradient(180deg, #18191c 50%, #101114 100%)';
        }
      } else {
        body.style.background = '';
        if (isLit) {
          body.style.borderColor = 'rgba(255, 255, 255, 0.08)';
          body.style.boxShadow = `0 3px 0 #070709, 0 4px 6px rgba(0, 0, 0, 0.85), 0 0 4px rgba(${r}, ${g}, ${b}, 0.35)`;
        } else {
          body.style.borderColor = 'rgba(255, 255, 255, 0.08)';
          body.style.boxShadow = '0 3px 0 #070709, 0 4px 6px rgba(0, 0, 0, 0.85)';
        }
      }
    }

    // 3. Realistic double-shot shine-through legend illumination
    const legend = parts.legend;
    if (legend) {
      if (isLit) {
        const hotR = Math.min(255, Math.round(r * 0.45 + 155));
        const hotG = Math.min(255, Math.round(g * 0.45 + 155));
        const hotB = Math.min(255, Math.round(b * 0.45 + 155));
        legend.style.color = `rgb(${hotR}, ${hotG}, ${hotB})`;
        legend.style.textShadow = `0 0 2px rgba(255, 255, 255, 0.95), 0 0 6px rgba(${r}, ${g}, ${b}, 1), 0 0 14px rgba(${r}, ${g}, ${b}, 0.8)`;
        legend.style.opacity = '1';
      } else {
        legend.style.color = 'rgba(255, 255, 255, 0.22)';
        legend.style.textShadow = 'none';
        legend.style.opacity = '0.3';
      }
    }

    // 4. Keycap top dish with specular rim highlight from switch LED
    const top = parts.top;
    if (top) {
      if (isLit && activeTheme === 'mechanical') {
        const rimR = Math.min(255, Math.round(r * 0.5 + 140));
        const rimG = Math.min(255, Math.round(g * 0.5 + 140));
        const rimB = Math.min(255, Math.round(b * 0.5 + 140));
        top.style.boxShadow = `inset 0 1.5px 1px rgba(${rimR}, ${rimG}, ${rimB}, 0.45), inset 0 -1px 2px rgba(0, 0, 0, 0.75), 0 1px 2px rgba(0, 0, 0, 0.5)`;
        top.style.backgroundColor = isPixelArtMode ? `rgba(${r}, ${g}, ${b}, 0.35)` : '';
      } else {
        top.style.boxShadow = 'inset 0 1px 1px rgba(255, 255, 255, 0.12), inset 0 -1px 2px rgba(0, 0, 0, 0.75), 0 1px 2px rgba(0, 0, 0, 0.5)';
        top.style.backgroundColor = isPixelArtMode ? 'linear-gradient(180deg, #22242a 0%, #15161a 100%)' : '';
      }
    }

    // 5. Spacebar glowing translucent slit
    if (keyId === 'space') {
      const slit = parts.slit;
      if (slit) {
        if (isLit) {
          const hotR = Math.min(255, Math.round(r * 0.45 + 155));
          const hotG = Math.min(255, Math.round(g * 0.45 + 155));
          const hotB = Math.min(255, Math.round(b * 0.45 + 155));
          slit.style.backgroundColor = `rgb(${hotR}, ${hotG}, ${hotB})`;
          slit.style.boxShadow = `0 0 4px rgba(255, 255, 255, 0.95), 0 0 10px rgba(${r}, ${g}, ${b}, 1)`;
          slit.style.opacity = '1';
        } else {
          slit.style.backgroundColor = 'rgba(255, 255, 255, 0.22)';
          slit.style.boxShadow = 'none';
          slit.style.opacity = '0.3';
        }
      }
    }
  }, [activeTheme, activeGapLighting, isPixelArtMode]);

  // 60 FPS direct DOM updates with zero-DOM-query child elements
  const updateColors = useCallback((frame: KeyFrameColor) => {
    lastFrameRef.current = frame;
    const currentLitKeys = new Set<string>();

    for (const [keyId, color] of Object.entries(frame)) {
      const parts = keyPartsRef.current[keyId];
      if (parts) {
        applyKeyColorToElement(parts, keyId, color);
        if (color.r > 12 || color.g > 12 || color.b > 12) {
          currentLitKeys.add(keyId);
        }
      }
    }

    // Turn off keys that were previously lit but are no longer in this frame
    for (const oldKeyId of litKeysRef.current) {
      if (!frame[oldKeyId]) {
        const parts = keyPartsRef.current[oldKeyId];
        if (parts) {
          applyKeyColorToElement(parts, oldKeyId, undefined);
        }
      }
    }

    litKeysRef.current = currentLitKeys;
  }, [applyKeyColorToElement]);

  const resetAllKeys = useCallback(() => {
    for (const [keyId, parts] of Object.entries(keyPartsRef.current)) {
      if (!parts) continue;
      if (parts.glow) {
        parts.glow.style.background = 'none';
        parts.glow.style.boxShadow = 'none';
        parts.glow.style.opacity = '0';
      }
      if (parts.body) {
        parts.body.style.borderColor = '';
        parts.body.style.boxShadow = '';
        parts.body.style.background = '';
      }
      if (parts.legend) {
        parts.legend.style.color = 'rgba(255, 255, 255, 0.22)';
        parts.legend.style.textShadow = 'none';
        parts.legend.style.opacity = '0.3';
      }
      if (parts.top) {
        parts.top.style.boxShadow = '';
        parts.top.style.backgroundColor = '';
      }
      if (parts.slit) {
        parts.slit.style.backgroundColor = 'rgba(255, 255, 255, 0.22)';
        parts.slit.style.boxShadow = 'none';
        parts.slit.style.opacity = '0.3';
      }
      delete lastKeyColorRef.current[keyId];
    }
    litKeysRef.current.clear();
    lastFrameRef.current = {};
  }, []);

  // Synchronously wipe all keys clean whenever theme, gap lighting, or effect changes
  useLayoutEffect(() => {
    resetAllKeys();
  }, [activeTheme, activeGapLighting, effectType, resetAllKeys]);

  // Direct subscription to animation engine for zero-rerender 60 FPS animation
  useEffect(() => {
    if (!engine) return;
    const unsub = engine.subscribe((frame) => {
      updateColors(frame);
    });
    return unsub;
  }, [engine, updateColors]);

  // Apply explicit static frame (e.g. Pixel Art editor or arcade step)
  useLayoutEffect(() => {
    if (currentFrame && Object.keys(currentFrame).length > 0) {
      updateColors(currentFrame);
    } else if (!engine && currentFrame) {
      updateColors(currentFrame);
    }
  }, [currentFrame, engine, updateColors]);


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
    <div className={`virtual-keyboard-card ${hideHeader ? 'clean-preview' : ''}`}>
      {!hideHeader && (
        <div className="vk-header">
          <div className="vk-title-area">
            <span className="vk-badge">REDRAGON K630 RGB</span>
            <span className="vk-subtitle">61-Key ANSI 60% Layout • Mechanical Keycaps</span>
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
      )}

      <div className="vk-viewport" ref={containerRef}>
        <div
          className={`vk-chassis theme-${activeTheme} gap-lighting-${activeGapLighting}`}
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
          }}
        >
          {rows.map((rowKeys, rowIndex) => (
            <div key={`row-${rowIndex}`} className="vk-row">
              {rowKeys.map((key) => {
                const isSelected = selectedKeyIds.has(key.id);

                return (
                  <div
                    key={key.id}
                    ref={(el) => {
                      keyRefs.current[key.id] = el;
                      if (el) {
                        keyPartsRef.current[key.id] = {
                          glow: el.querySelector('.vk-switch-glow'),
                          body: el.querySelector('.vk-keycap-body'),
                          legend: el.querySelector('.vk-legend'),
                          top: el.querySelector('.vk-keycap-top'),
                          slit: el.querySelector('.vk-space-slit'),
                        };
                      } else {
                        delete keyPartsRef.current[key.id];
                        delete lastKeyColorRef.current[key.id];
                      }
                    }}
                    className={`vk-key-wrapper ${isSelected ? 'selected' : ''} ${
                      isPixelArtMode ? 'interactive-pixel' : ''
                    }`}
                    style={{
                      flex: `${key.uWidth} 0 0`,
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
                    {/* Switch Underglow Aura in Gaps */}
                    <div className="vk-switch-glow" />

                    {/* 3D Mechanical Keycap Body */}
                    <div className="vk-keycap-body">
                      {/* Sculpted Cylindrical Dish Top Face */}
                      <div className="vk-keycap-top">
                        <div className="vk-legend">
                          {renderKeycapContent(key)}
                        </div>
                      </div>
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
