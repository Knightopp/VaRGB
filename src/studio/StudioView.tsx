import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StudioProject, SelectionState } from './types/studio';
import { StudioEngine } from './engine/StudioEngine';
import {
  createEmptyProject,
  loadProjectFromStorage,
  saveProjectToStorage,
  exportProjectAsJson,
  importProjectFromJson,
} from './services/projectService';
import { STUDIO_TEMPLATES } from './services/presets';
import { studioHardwareAdapter } from './engine/hardwareAdapter';
import { StudioTopBar } from './components/StudioTopBar';
import { CompositionCanvas } from './components/CompositionCanvas';
import { TimelinePanel } from './components/TimelinePanel';
import { PropertiesPanel } from './components/PropertiesPanel';

import './styles/studio.css';

interface StudioViewProps {
  onReturnToApp: () => void;
}

export const StudioView: React.FC<StudioViewProps> = ({ onReturnToApp }) => {
  // Load restored or starter project
  const [project, setProject] = useState<StudioProject>(() => loadProjectFromStorage());
  const [engine, setEngine] = useState<StudioEngine | null>(null);

  // Playback & UI State
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [hardwareStreaming, setHardwareStreaming] = useState<boolean>(false);

  // Undo / Redo History
  const historyRef = useRef<StudioProject[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  // Selection state
  const [selection, setSelection] = useState<SelectionState>({
    layerId: project.layers[0]?.id || null,
    propertyId: null,
    keyframeId: null,
  });

  // Canvas selected keys (for multi-key group assignment)
  const [selectedKeyIds, setSelectedKeyIds] = useState<Set<string>>(new Set());

  // Push to history helper
  const pushHistory = useCallback((proj: StudioProject) => {
    const curIndex = historyIndexRef.current;
    const history = historyRef.current.slice(0, curIndex + 1);
    history.push(JSON.parse(JSON.stringify(proj)));
    if (history.length > 50) history.shift();
    historyRef.current = history;
    historyIndexRef.current = history.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  // Update project state and notify engine
  const handleUpdateProject = useCallback(
    (updated: StudioProject, addToHistory = true) => {
      setProject(updated);
      if (engine) {
        engine.setProject(updated);
      }
      saveProjectToStorage(updated);
      if (addToHistory) {
        pushHistory(updated);
      }
    },
    [engine, pushHistory]
  );

  // Initialize engine on mount, dispose on unmount
  useEffect(() => {
    const newEngine = new StudioEngine(project);
    setEngine(newEngine);

    // Initial history entry
    historyRef.current = [JSON.parse(JSON.stringify(project))];
    historyIndexRef.current = 0;

    // Direct subscriber for timeline timecode
    const unsubTime = newEngine.subscribeTime((time) => {
      setCurrentTime(time);
      setIsPlaying(newEngine.playing);
    });

    return () => {
      unsubTime();
      newEngine.dispose();
      studioHardwareAdapter.dispose();
    };
  }, []); // Run strictly once on mount

  // Sync engine loop state
  useEffect(() => {
    if (engine) {
      engine.setLoop(isLooping);
    }
  }, [engine, isLooping]);

  // Handle Undo / Redo
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const prev = historyRef.current[historyIndexRef.current];
      setProject(prev);
      engine?.setProject(prev);
      saveProjectToStorage(prev);
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(true);
    }
  }, [engine]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const next = historyRef.current[historyIndexRef.current];
      setProject(next);
      engine?.setProject(next);
      saveProjectToStorage(next);
      setCanUndo(true);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    }
  }, [engine]);

  // Keyboard Shortcuts (Space to play/pause, Ctrl+Z to undo, Ctrl+Y to redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        engine?.togglePlay();
        if (engine) setIsPlaying(engine.playing);
      } else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (e.code === 'KeyY' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleRedo();
      } else if (e.code === 'KeyS' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        saveProjectToStorage(project);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (engine) {
          const step = 1 / project.fps;
          engine.seek(Math.max(0, engine.getCurrentTime() - step));
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (engine) {
          const step = 1 / project.fps;
          engine.seek(Math.min(project.duration, engine.getCurrentTime() + step));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine, handleUndo, handleRedo, project]);

  // Project Actions
  const handleNewProject = () => {
    const empty = createEmptyProject();
    handleUpdateProject(empty);
    setSelection({ layerId: null, propertyId: null, keyframeId: null });
  };

  const handleOpenProject = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const loaded = importProjectFromJson(content);
        handleUpdateProject(loaded);
        setSelection({ layerId: loaded.layers[0]?.id || null, propertyId: null, keyframeId: null });
      } catch (err: any) {
        alert(err.message || 'Failed to import project');
      }
    };
    reader.readAsText(file);
  };

  const handleSelectTemplate = (templateId: string) => {
    const tmpl = STUDIO_TEMPLATES.find((t) => t.id === templateId);
    if (tmpl) {
      const p = tmpl.createProject();
      handleUpdateProject(p);
      setSelection({ layerId: p.layers[0]?.id || null, propertyId: null, keyframeId: null });
    }
  };

  const handleToggleHardwareStream = () => {
    const nextState = !hardwareStreaming;
    setHardwareStreaming(nextState);
    studioHardwareAdapter.setEnabled(nextState);
  };

  const handleAssignCanvasSelectionToLayer = () => {
    if (!selection.layerId || selectedKeyIds.size === 0) return;
    const targetKeys = Array.from(selectedKeyIds);
    const updatedLayers = project.layers.map((l) =>
      l.id === selection.layerId ? { ...l, targetKeys } : l
    );
    handleUpdateProject({ ...project, layers: updatedLayers });
  };

  // Find summary string of active layer's target keys
  const activeLayer = project.layers.find((l) => l.id === selection.layerId);
  const targetKeysSummary = activeLayer
    ? activeLayer.targetKeys === 'all'
      ? 'Layer Targets: All 61 Keys'
      : `Layer Targets: ${activeLayer.targetKeys.length} Selected Keys`
    : undefined;

  return (
    <div className="studio-root">
      {/* Top Bar */}
      <StudioTopBar
        project={project}
        currentTime={currentTime}
        isPlaying={isPlaying}
        isLooping={isLooping}
        canUndo={canUndo}
        canRedo={canRedo}
        hardwareStreaming={hardwareStreaming}
        onUpdateProjectName={(name) => handleUpdateProject({ ...project, name })}
        onNewProject={handleNewProject}
        onOpenProject={handleOpenProject}
        onSaveProject={() => saveProjectToStorage(project)}
        onExportProject={() => exportProjectAsJson(project)}
        onSelectTemplate={handleSelectTemplate}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onTogglePlay={() => {
          engine?.togglePlay();
          if (engine) setIsPlaying(engine.playing);
        }}
        onStop={() => engine?.stop()}
        onStepFrame={(dir) => {
          if (engine) {
            const step = (1 / project.fps) * dir;
            engine.seek(Math.max(0, Math.min(project.duration, engine.getCurrentTime() + step)));
          }
        }}
        onToggleLoop={() => setIsLooping((v) => !v)}
        onToggleHardwareStream={handleToggleHardwareStream}
        onReturnToApp={onReturnToApp}
      />

      {/* Main Body */}
      <div className="studio-main-body">
        {/* Upper Workspace: Composition Canvas + Properties Inspector */}
        <div className="studio-upper-workspace">
          <CompositionCanvas
            engine={engine}
            selectedKeyIds={selectedKeyIds}
            onSelectKeys={setSelectedKeyIds}
            targetKeysSummary={targetKeysSummary}
            onApplySelectionToLayer={
              selection.layerId && selectedKeyIds.size > 0
                ? handleAssignCanvasSelectionToLayer
                : undefined
            }
          />

          <PropertiesPanel
            project={project}
            currentTime={currentTime}
            selection={selection}
            onUpdateProject={handleUpdateProject}
            onSelect={setSelection}
            selectedCanvasKeyCount={selectedKeyIds.size}
            onAssignCanvasSelectionToLayer={handleAssignCanvasSelectionToLayer}
          />
        </div>

        {/* Lower Workspace: Genuine AE Timeline */}
        <TimelinePanel
          project={project}
          engine={engine}
          currentTime={currentTime}
          selection={selection}
          onSelect={setSelection}
          onUpdateProject={handleUpdateProject}
          onSeek={(time) => engine?.seek(time)}
        />
      </div>
    </div>
  );
};

export default StudioView;
