import React, { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Sidebar, NavTab } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { VirtualKeyboard } from './components/VirtualKeyboard';
import { EffectControls } from './components/EffectControls';
import { PixelArtEditor } from './components/PixelArtEditor';
import { PresetsView } from './components/PresetsView';
import { DeviceSettingsView } from './components/DeviceSettingsView';

import { KeyDefinition, RGBColor } from './types/keyboard';
import { EffectType, AnyEffectParams, SavedPreset, PixelArtParams, AudioAnalysis, MusicPulseParams } from './types/effects';
import { AnimationEngine } from './engine/animator';
import { createEffectInstance, EFFECT_REGISTRY } from './engine/registry';
import { DEFAULT_AURORA_PARAMS } from './engine/effects/aurora';
import { PixelArtEffect } from './engine/effects/pixelArt';
import { DEFAULT_MUSIC_PULSE_PARAMS, toAudioAnalyzerConfig } from './engine/effects/musicPulse';
import { hardwareService, DeviceInfo } from './services/hardware';
import { loadPresets, savePresets } from './services/presets';
import { loadSettings, saveSettings, DEFAULT_ACTIVE_PRESETS } from './services/settings';
import { LiquidChrome } from './components/LiquidChrome';
import { Dock, DockItemData } from './components/Dock';
import { K630_LAYOUT } from './engine/layout';
import {
  LayoutDashboard,
  Sparkles,
  Palette,
  Bookmark,
  Settings,
  Play,
  Pause,
  Radio,
  RotateCcw,
} from 'lucide-react';

import './styles/theme.css';
import './App.css';

const CHROME_BASE_COLOR: [number, number, number] = [
  0.047058823529411764,
  0.043137254901960784,
  0.043137254901960784,
];

export const App: React.FC = () => {
  const initialSettings = useRef(loadSettings()).current;
  const initialPresets = useRef(loadPresets()).current;

  const initialEffect = initialSettings.currentEffectType as EffectType;
  const initialPresetId =
    initialSettings.activePresetByEffect?.[initialEffect] ||
    initialSettings.activePresetId ||
    DEFAULT_ACTIVE_PRESETS[initialEffect];

  const matchedInitialPreset =
    initialPresets.find((p) => p.id === initialPresetId && p.effectType === initialEffect) ||
    initialPresets.find((p) => p.id === initialPresetId);

  const initialParams = (initialSettings.effectParams[initialEffect]
    ? JSON.parse(JSON.stringify(initialSettings.effectParams[initialEffect]))
    : (matchedInitialPreset
        ? JSON.parse(JSON.stringify(matchedInitialPreset.params))
        : (EFFECT_REGISTRY[initialEffect]?.defaultParams ||
           DEFAULT_AURORA_PARAMS))) as AnyEffectParams;

  const [activeTab, setActiveTab] = useState<NavTab>(initialSettings.activeTab);
  const [currentEffectType, setCurrentEffectType] = useState<EffectType>(initialEffect);
  const [currentParams, setCurrentParams] = useState<AnyEffectParams>(initialParams);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [engineInstance, setEngineInstance] = useState<AnimationEngine | null>(null);

  // Hardware State
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    connected: false,
    vendor_id: 0x320f,
    product_id: 0x5000,
    device_name: 'Scanning...',
    path: '',
    interface_number: 1,
    usage: 0x0092,
    manufacturer: '',
  });
  const [hardwareEnabled, setHardwareEnabled] = useState<boolean>(initialSettings.hardwareEnabled);
  const [hardwareStatus, setHardwareStatus] = useState<'preview-only' | 'connecting' | 'active' | 'error'>('preview-only');
  const [hardwareError, setHardwareError] = useState<string | undefined>();
  const [fpsLimit, setFpsLimit] = useState<number>(initialSettings.fpsLimit);

  // Presets - start with fully merged presets and permanent active preset tracking
  const [presets, setPresets] = useState<SavedPreset[]>(initialPresets);
  const [activePresetId, setActivePresetId] = useState<string | undefined>(
    matchedInitialPreset?.id || initialPresetId
  );
  const [activePresetByEffect, setActivePresetByEffect] = useState<Partial<Record<EffectType, string>>>(
    () => ({
      ...DEFAULT_ACTIVE_PRESETS,
      ...(initialSettings.activePresetByEffect || {}),
      [initialEffect]: matchedInitialPreset?.id || initialPresetId,
    })
  );

  // Pixel Art Editor State
  const [pixelArtParams, setPixelArtParams] = useState<PixelArtParams>(initialSettings.pixelArtParams);
  const [activePixelFrameIdx, setActivePixelFrameIdx] = useState<number>(0);
  const [activeColor, setActiveColor] = useState<RGBColor>(initialSettings.activeColor);
  const [pixelTool, setPixelTool] = useState<'brush' | 'eraser'>('brush');
  const [selectedKeyIds, setSelectedKeyIds] = useState<Set<string>>(new Set());

  // Animation Engine Ref
  const animatorRef = useRef<AnimationEngine | null>(null);

  // Persist settings whenever user changes them so next launch restores exact state
  useEffect(() => {
    saveSettings({
      activeTab,
      currentEffectType,
      effectParams: {
        [currentEffectType]: currentParams,
      },
      pixelArtParams,
      activePresetId,
      activePresetByEffect,
      fpsLimit,
      hardwareEnabled,
      activeColor,
    });
  }, [activeTab, currentEffectType, currentParams, pixelArtParams, activePresetId, activePresetByEffect, fpsLimit, hardwareEnabled, activeColor]);

  // Initialize engine and presets on mount
  useEffect(() => {
    const loaded = loadPresets();
    setPresets(loaded);

    // Auto-register only the installed production app; never register the dev server executable.
    if (import.meta.env.PROD && typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      void invoke('enable_startup_launch')
        .catch((error) => console.error('Could not enable Windows startup launch:', error));
    }

    const engine = new AnimationEngine();
    animatorRef.current = engine;
    setEngineInstance(engine);
    hardwareService.setStatusListener((status, message) => {
      setHardwareStatus(status);
      setHardwareError(message);
    });
    hardwareService.setHardwareEnabled(initialSettings.hardwareEnabled);

    // Initial effect restored from active preset
    const initialEffectInstance = createEffectInstance(initialEffect, initialParams);
    engine.setEffect(initialEffectInstance);

    // Hardware streamer
    engine.setHardwareStreamer((frame) => {
      hardwareService.pushFrame(frame);
    });

    engine.start();

    // Check device connection
    void checkDevice();
    const devicePoll = window.setInterval(() => { void checkDevice(); }, 3000);

    return () => {
      window.clearInterval(devicePoll);
      engine.stop();
      hardwareService.setStatusListener(null);
      hardwareService.setHardwareEnabled(false);
    };
  }, []);

  useEffect(() => {
    animatorRef.current?.setHardwareFrameRateLimit(fpsLimit);
  }, [fpsLimit]);

  useEffect(() => {
    if (currentEffectType !== 'music_pulse') {
      animatorRef.current?.setAudioAnalysis(undefined);
      return;
    }
    let unlisten: (() => void) | undefined;
    let disposed = false;
    const deviceId = (currentParams as any).deviceId as string | null;
    const audioConfig = toAudioAnalyzerConfig(currentParams as MusicPulseParams);
    void (async () => {
      try {
        unlisten = await listen<AudioAnalysis>('music-pulse-analysis', ({ payload }) => {
          animatorRef.current?.setAudioAnalysis(payload);
        });
        if (disposed) { unlisten(); return; }
        const result = await invoke<AudioAnalysis>('start_audio_capture', { deviceId, config: audioConfig });
        animatorRef.current?.setAudioAnalysis(result);
      } catch (error) {
        const message = typeof error === 'string' ? error : String(error);
        animatorRef.current?.setAudioAnalysis({ status: 'error', deviceId, message, rms: 0,
          energyChange: 0, bass: 0, mids: 0, highs: 0, bands: [], beat: false, updatedAt: Date.now() });
      }
    })();
    return () => {
      disposed = true;
      unlisten?.();
      void invoke('stop_audio_capture').catch(() => undefined);
      animatorRef.current?.setAudioAnalysis(undefined);
    };
  }, [currentEffectType, (currentParams as any).deviceId]);

  const checkDevice = async () => {
    const status = await hardwareService.getStatus();
    setDeviceInfo((prev) => {
      if (
        prev.connected === status.connected &&
        prev.device_name === status.device_name &&
        prev.path === status.path &&
        prev.interface_number === status.interface_number &&
        prev.usage === status.usage
      ) {
        return prev;
      }
      return status;
    });
  };

  // Switch effect mode
  const handleEffectTypeChange = useCallback((type: EffectType) => {
    setCurrentEffectType(type);
    const targetPresetId = activePresetByEffect[type] || DEFAULT_ACTIVE_PRESETS[type];
    const allPresets = presets.length > 0 ? presets : loadPresets();
    const targetPreset = targetPresetId
      ? allPresets.find((p) => p.id === targetPresetId && p.effectType === type)
      : allPresets.find((p) => p.effectType === type);

    let newParams: AnyEffectParams;
    if (targetPreset) {
      newParams = JSON.parse(JSON.stringify(targetPreset.params));
      setActivePresetId(targetPreset.id);
      setActivePresetByEffect((prev) => ({
        ...prev,
        [type]: targetPreset.id,
      }));
    } else if (type === 'pixel_art') {
      newParams = pixelArtParams;
      const pixelPreset = allPresets.find((p) => p.effectType === 'pixel_art');
      if (pixelPreset) {
        setActivePresetId(pixelPreset.id);
      }
    } else {
      newParams = initialSettings.effectParams[type] || EFFECT_REGISTRY[type]?.defaultParams || DEFAULT_AURORA_PARAMS;
    }

    setCurrentParams(newParams);

    if (animatorRef.current) {
      const effectInstance = createEffectInstance(type, newParams);
      animatorRef.current.setEffect(effectInstance);
    }

    if (type === 'music_pulse') {
      const audioConfig = toAudioAnalyzerConfig(newParams as MusicPulseParams);
      void invoke('set_audio_config', { config: audioConfig }).catch(() => undefined);
    }
  }, [pixelArtParams, activePresetByEffect, presets, initialSettings]);

  // Update effect params
  const handleParamsChange = useCallback((newParams: AnyEffectParams) => {
    setCurrentParams(newParams);
    // Preserves active preset permanently while customizing parameters
    if (animatorRef.current) {
      const currentEffect = animatorRef.current.getEffect();
      if (currentEffect && currentEffect.type === currentEffectType) {
        // Update params in-place to preserve active animation state and prevent re-initialization flicker
        (currentEffect as any).params = newParams;
      } else {
        const effectInstance = createEffectInstance(currentEffectType, newParams);
        animatorRef.current.setEffect(effectInstance);
      }
    }
    if (currentEffectType === 'music_pulse') {
      const audioConfig = toAudioAnalyzerConfig(newParams as MusicPulseParams);
      void invoke('set_audio_config', { config: audioConfig }).catch(() => undefined);
    }
  }, [currentEffectType]);

  // Pixel art specific updates
  const handlePixelArtChange = useCallback((newParams: PixelArtParams) => {
    setPixelArtParams(newParams);
    if (currentEffectType === 'pixel_art') {
      setCurrentParams(newParams);
      if (animatorRef.current) {
        const effectInstance = new PixelArtEffect(newParams);
        effectInstance.setFrameIndex(activePixelFrameIdx);
        animatorRef.current.setEffect(effectInstance);
      }
    }
  }, [currentEffectType, activePixelFrameIdx]);

  // Key click on Virtual Keyboard
  const handleKeyClick = useCallback((key: KeyDefinition, e: React.MouseEvent) => {
    if (activeTab !== 'pixel_art') {
      if (animatorRef.current) {
        const activeEffect = animatorRef.current.getEffect();
        if (activeEffect && activeEffect.onKeyDown) {
          activeEffect.onKeyDown(key.code);
        }
      }
      return;
    }

    if (e.shiftKey || e.ctrlKey) {
      // Toggle selection
      setSelectedKeyIds((prev) => {
        const next = new Set(prev);
        if (next.has(key.id)) {
          next.delete(key.id);
        } else {
          next.add(key.id);
        }
        return next;
      });
    } else {
      // Paint or erase key directly
      const currentFrames = [...pixelArtParams.frames];
      const frameToUpdate = currentFrames[activePixelFrameIdx] || currentFrames[0];
      if (frameToUpdate) {
        const updatedPixels = { ...frameToUpdate.pixels };
        if (pixelTool === 'eraser') {
          delete updatedPixels[key.id];
        } else {
          updatedPixels[key.id] = activeColor;
        }
        frameToUpdate.pixels = updatedPixels;
        handlePixelArtChange({
          ...pixelArtParams,
          frames: currentFrames,
        });
      }
    }
  }, [activeTab, pixelArtParams, activePixelFrameIdx, activeColor, pixelTool, handlePixelArtChange]);

  const handleNewBlankArt = useCallback(() => {
    const blankParams: PixelArtParams = {
      frames: [{ id: `frame-${Date.now()}`, pixels: {} }],
      fps: 1,
    };
    setSelectedKeyIds(new Set());
    setActivePixelFrameIdx(0);
    handlePixelArtChange(blankParams);
  }, [handlePixelArtChange]);

  // Playback handlers
  const handlePlay = () => {
    if (animatorRef.current) {
      animatorRef.current.resume();
      setIsPlaying(true);
      setIsPaused(false);
    }
  };

  const handlePause = () => {
    if (animatorRef.current) {
      animatorRef.current.pause();
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    if (animatorRef.current) {
      animatorRef.current.stop();
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const handleToggleHardware = () => {
    const nextState = !hardwareEnabled;
    setHardwareEnabled(nextState);
    setHardwareError(undefined);
    setHardwareStatus(nextState ? 'connecting' : 'preview-only');
    hardwareService.setHardwareEnabled(nextState);
  };

  // Presets
  const handleSavePreset = (name: string) => {
    const newPresetId = `preset-${Date.now()}`;
    const newPreset: SavedPreset = {
      id: newPresetId,
      name,
      effectType: currentEffectType,
      version: 1,
      params: JSON.parse(JSON.stringify(currentParams)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newPreset, ...presets];
    setPresets(updated);
    savePresets(updated);
    setActivePresetId(newPresetId);
    setActivePresetByEffect((prev) => ({
      ...prev,
      [currentEffectType]: newPresetId,
    }));
  };

  const handleSavePixelArtPreset = (name: string) => {
    const now = new Date().toISOString();
    const preset: SavedPreset = {
      id: `preset-${Date.now()}`, name, effectType: 'pixel_art', version: 1,
      params: pixelArtParams, createdAt: now, updatedAt: now,
    };
    const updated = [preset, ...presets];
    setPresets(updated);
    savePresets(updated);
    setActivePresetId(preset.id);
  };

  const handleApplyPreset = (preset: SavedPreset) => {
    const appliedParams: AnyEffectParams = JSON.parse(JSON.stringify(
      preset.effectType === 'music_pulse'
        ? { ...DEFAULT_MUSIC_PULSE_PARAMS, ...(preset.params as Partial<MusicPulseParams>) }
        : preset.params
    ));
    setActivePresetId(preset.id);
    setActivePresetByEffect((prev) => ({
      ...prev,
      [preset.effectType]: preset.id,
    }));
    setCurrentEffectType(preset.effectType);
    setCurrentParams(appliedParams);

    if (preset.effectType === 'pixel_art') {
      setPixelArtParams(appliedParams as PixelArtParams);
    }

    if (animatorRef.current) {
      const inst = createEffectInstance(preset.effectType, appliedParams);
      animatorRef.current.setEffect(inst);
      animatorRef.current.resume();
      setIsPlaying(true);
      setIsPaused(false);
    }

    if (preset.effectType === 'music_pulse') {
      const audioConfig = toAudioAnalyzerConfig(appliedParams as MusicPulseParams);
      void invoke('set_audio_config', { config: audioConfig }).catch(() => undefined);
    }
  };

  const handleDuplicatePreset = (preset: SavedPreset) => {
    const duplicated: SavedPreset = {
      ...preset,
      id: `preset-${Date.now()}`,
      name: `${preset.name} (Copy)`,
      updatedAt: new Date().toISOString(),
    };
    const updated = [duplicated, ...presets];
    setPresets(updated);
    savePresets(updated);
  };

  const handleDeletePreset = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    savePresets(updated);
    const fallbackId = DEFAULT_ACTIVE_PRESETS[currentEffectType];
    if (activePresetId === id) {
      setActivePresetId(fallbackId);
    }
    setActivePresetByEffect((prev) => {
      const next = { ...prev };
      for (const [effect, pId] of Object.entries(next)) {
        if (pId === id) {
          next[effect as EffectType] = DEFAULT_ACTIVE_PRESETS[effect as EffectType];
        }
      }
      return next;
    });
  };

  const handleImportPresets = (imported: SavedPreset[]) => {
    const combined = [...imported, ...presets];
    setPresets(combined);
    savePresets(combined);
  };

  const handleResetDefaults = () => {
    const defaultPresetId = DEFAULT_ACTIVE_PRESETS[currentEffectType];
    const defaultPreset = (presets.length > 0 ? presets : loadPresets()).find(
      (p) => p.id === defaultPresetId && p.effectType === currentEffectType
    );
    if (defaultPreset) {
      handleApplyPreset(defaultPreset);
    } else {
      const def = EFFECT_REGISTRY[currentEffectType]?.defaultParams || DEFAULT_AURORA_PARAMS;
      handleParamsChange(def);
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'overview':
        return 'Overview & Real-Time Monitor';
      case 'effects':
        return 'Lighting Effects Engine';
      case 'pixel_art':
        return 'Custom Pixel Art Studio';
      case 'presets':
        return 'Preset Management';
      case 'settings':
        return 'Hardware & USB Configuration';
    }
  };

  const dockItems: DockItemData[] = [
    {
      icon: <LayoutDashboard size={20} />,
      label: 'Overview',
      active: activeTab === 'overview',
      onClick: () => setActiveTab('overview'),
    },
    {
      icon: <Sparkles size={20} />,
      label: 'Lighting Effects',
      active: activeTab === 'effects',
      onClick: () => setActiveTab('effects'),
      menu: [
        { label: 'Aurora Flow', onClick: () => handleEffectTypeChange('aurora') },
        { label: 'Sine Wave', onClick: () => handleEffectTypeChange('flowing_curve') },
        { label: 'Zigzag Wave', onClick: () => handleEffectTypeChange('zigzag_wave') },
        { label: 'Continuous Wave', onClick: () => handleEffectTypeChange('continuous_wave') },
        { label: 'Reactive Ripple', onClick: () => handleEffectTypeChange('reactive_ripple') },
        { label: 'Key Flash', onClick: () => handleEffectTypeChange('key_flash') },
        { label: 'Snake Trail', onClick: () => handleEffectTypeChange('snake_trail') },
        { label: 'Shockwave', onClick: () => handleEffectTypeChange('shockwave') },
        { label: 'Ember', onClick: () => handleEffectTypeChange('ember') },
        { label: 'Neighbor Glow', onClick: () => handleEffectTypeChange('neighbor_glow') },
        { label: 'Typing Intensity', onClick: () => handleEffectTypeChange('typing_intensity') },
        { label: 'Electric Discharge', onClick: () => handleEffectTypeChange('electric_discharge') },
        { label: 'Keystroke Ripple', onClick: () => handleEffectTypeChange('ripple') },
        { label: 'Cyber Glitch', onClick: () => handleEffectTypeChange('glitch') },
        { label: 'Matrix Rain', onClick: () => handleEffectTypeChange('matrix') },
        { label: 'Music Pulse', onClick: () => handleEffectTypeChange('music_pulse') },
        { label: 'Crimson Pulse', onClick: () => handleEffectTypeChange('pulse') },
        { label: 'Starlight Drift', onClick: () => handleEffectTypeChange('starlight') },
        { separator: true },
        { label: 'Reset Defaults', icon: <RotateCcw size={12} />, onClick: handleResetDefaults },
      ],
    },
    {
      icon: <Palette size={20} />,
      label: 'Pixel Art Studio',
      active: activeTab === 'pixel_art',
      onClick: () => {
        setActiveTab('pixel_art');
        if (currentEffectType !== 'pixel_art') {
          handleEffectTypeChange('pixel_art');
        }
      },
    },
    {
      icon: <Bookmark size={20} />,
      label: 'Presets Library',
      active: activeTab === 'presets',
      badge: presets.length > 0 ? presets.length : undefined,
      onClick: () => setActiveTab('presets'),
    },
    { separator: true },
    {
      icon: isPlaying && !isPaused ? <Pause size={20} /> : <Play size={20} />,
      label: isPlaying && !isPaused ? 'Pause Animation' : 'Play Animation',
      active: isPlaying && !isPaused,
      onClick: () => {
        if (isPlaying && !isPaused) handlePause();
        else handlePlay();
      },
    },
    {
      icon: <Radio size={20} />,
      label: hardwareEnabled ? 'USB Output ON' : 'USB Output OFF',
      active: hardwareEnabled,
      badge: !deviceInfo.connected ? '!' : undefined,
      onClick: handleToggleHardware,
    },
    {
      icon: <Settings size={20} />,
      label: 'Device Settings',
      active: activeTab === 'settings',
      onClick: () => setActiveTab('settings'),
    },
  ];

  return (
    <div className="app-container">
      {/* Dynamic LiquidChrome WebGL Background from React Bits */}
      <div className="app-liquid-chrome-bg">
        <LiquidChrome
          baseColor={CHROME_BASE_COLOR}
          speed={1}
          amplitude={0.29}
          interactive={false}
        />
      </div>

      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'pixel_art' && currentEffectType !== 'pixel_art') {
            handleEffectTypeChange('pixel_art');
          }
        }}
        isDeviceConnected={deviceInfo.connected}
        deviceName={deviceInfo.device_name}
        isOpen={sidebarOpen}
      />

      <div className="app-main-wrapper">
        <TopBar
          pageTitle={getPageTitle()}
          activeEffectName={EFFECT_REGISTRY[currentEffectType].name}
          isPlaying={isPlaying}
          isPaused={isPaused}
          onPlay={handlePlay}
          onPause={handlePause}
          onStop={handleStop}
          onOpenSettings={() => setActiveTab('settings')}
          hardwareEnabled={hardwareEnabled}
          onToggleHardware={handleToggleHardware}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
        />

        <main className="app-content-scroll">
          {/* Virtual Keyboard is always prominently rendered in the workspace */}
          <section className="keyboard-stage-section">
            <VirtualKeyboard
              engine={engineInstance}
              currentFrame={activeTab === 'pixel_art' ? (pixelArtParams.frames[activePixelFrameIdx]?.pixels || {}) : undefined}
              isPixelArtMode={activeTab === 'pixel_art'}
              selectedKeyIds={selectedKeyIds}
              onKeyClick={handleKeyClick}
            />
          </section>

          {/* Contextual Workspace panels */}
          <section className="controls-stage-section">
            {(activeTab === 'overview' || activeTab === 'effects') && (
              <EffectControls
                currentType={currentEffectType}
                params={currentParams}
                onTypeChange={handleEffectTypeChange}
                onParamsChange={handleParamsChange}
                onResetDefaults={handleResetDefaults}
                onSavePreset={handleSavePreset}
                presets={presets}
                activePresetId={activePresetId}
                activePresetByEffect={activePresetByEffect}
                onApplyPreset={handleApplyPreset}
                onDuplicatePreset={handleDuplicatePreset}
                onDeletePreset={handleDeletePreset}
                hardwareEnabled={hardwareEnabled}
                hardwareStatus={hardwareStatus}
              />
            )}

            {activeTab === 'pixel_art' && (
              <PixelArtEditor
                params={pixelArtParams}
                onChange={handlePixelArtChange}
                onSavePreset={handleSavePixelArtPreset}
                activeFrameIndex={activePixelFrameIdx}
                onSelectFrameIndex={(idx) => {
                  setActivePixelFrameIdx(idx);
                  if (animatorRef.current) {
                    const inst = animatorRef.current.getEffect();
                    if (inst instanceof PixelArtEffect) {
                      inst.setFrameIndex(idx);
                    }
                  }
                }}
                selectedColor={activeColor}
                onSelectColor={setActiveColor}
                tool={pixelTool}
                onSelectTool={setPixelTool}
                onNewBlankArt={handleNewBlankArt}
                selectedKeyIds={selectedKeyIds}
                onClearSelection={() => setSelectedKeyIds(new Set())}
                onSelectAll={() => setSelectedKeyIds(new Set(K630_LAYOUT.map((k) => k.id)))}
              />
            )}

            {activeTab === 'presets' && (
              <PresetsView
                presets={presets}
                activePresetId={activePresetId}
                activePresetByEffect={activePresetByEffect}
                currentEffectType={currentEffectType}
                onApplyPreset={handleApplyPreset}
                onDuplicatePreset={handleDuplicatePreset}
                onDeletePreset={handleDeletePreset}
                onImportPresets={handleImportPresets}
              />
            )}

            {activeTab === 'settings' && (
              <DeviceSettingsView
                isDeviceConnected={deviceInfo.connected}
                deviceInfo={deviceInfo}
                hardwareStatus={hardwareStatus}
                hardwareError={hardwareError}
                hardwareEnabled={hardwareEnabled}
                onToggleHardware={handleToggleHardware}
                onTestDevice={(colorHex) => hardwareService.testDeviceFrame(colorHex)}
                fpsLimit={fpsLimit}
                onFpsLimitChange={(fps) => setFpsLimit(fps)}
                onRefreshDevice={checkDevice}
              />
            )}
          </section>
        </main>

        {/* React Bits Floating Dock */}
        <Dock
          items={dockItems}
          position="bottom"
          baseItemSize={48}
          magnification={68}
          panelHeight={64}
          gap={10}
          bounce={true}
          theme="dark"
          accentColor="#FFFFFF"
        />
      </div>
    </div>
  );
};

export default App;
