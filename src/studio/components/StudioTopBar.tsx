import React, { useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Save,
  Download,
  Plus,
  Undo2,
  Redo2,
  ArrowLeft,
  Radio,
  Layers,
} from 'lucide-react';
import { StudioProject } from '../types/studio';
import { STUDIO_TEMPLATES } from '../services/presets';

interface StudioTopBarProps {
  project: StudioProject;
  currentTime: number;
  isPlaying: boolean;
  isLooping: boolean;
  canUndo: boolean;
  canRedo: boolean;
  hardwareStreaming: boolean;
  onUpdateProjectName: (name: string) => void;
  onNewProject: () => void;
  onOpenProject: (file: File) => void;
  onSaveProject: () => void;
  onExportProject: () => void;
  onSelectTemplate: (templateId: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onTogglePlay: () => void;
  onStop: () => void;
  onStepFrame: (direction: -1 | 1) => void;
  onToggleLoop: () => void;
  onToggleHardwareStream: () => void;
  onReturnToApp: () => void;
}

export const StudioTopBar: React.FC<StudioTopBarProps> = ({
  project,
  currentTime,
  isPlaying,
  isLooping,
  canUndo,
  canRedo,
  hardwareStreaming,
  onUpdateProjectName,
  onNewProject,
  onOpenProject,
  onSaveProject,
  onExportProject,
  onSelectTemplate,
  onUndo,
  onRedo,
  onTogglePlay,
  onStop,
  onStepFrame,
  onToggleLoop,
  onToggleHardwareStream,
  onReturnToApp,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatTimecode = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * project.fps);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onOpenProject(file);
      e.target.value = '';
    }
  };

  return (
    <header className="studio-topbar">
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".vargb-proj,.json"
        onChange={handleFileChange}
      />

      <div className="studio-topbar-left">
        <button
          onClick={onReturnToApp}
          className="studio-btn studio-exit-btn"
          title="Return to VaRGB Main Dashboard"
        >
          <ArrowLeft size={13} />
          <span>Main App</span>
        </button>

        <div className="studio-brand-badge">
          <Layers size={13} />
          <span>STUDIO</span>
        </div>

        <input
          type="text"
          className="studio-project-title-input"
          value={project.name}
          onChange={(e) => onUpdateProjectName(e.target.value)}
          title="Click to rename project"
          placeholder="Untitled Project"
        />

        <div className="studio-btn-group">
          <button onClick={onNewProject} className="studio-btn" title="New Blank Project">
            <Plus size={12} />
            <span>New</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="studio-btn"
            title="Open Project File (.vargb-proj)"
          >
            <FolderOpen size={12} />
            <span>Open</span>
          </button>
          <button onClick={onSaveProject} className="studio-btn" title="Save Project (Ctrl+S)">
            <Save size={12} />
            <span>Save</span>
          </button>
          <button onClick={onExportProject} className="studio-btn" title="Export .vargb-proj">
            <Download size={12} />
            <span>Export</span>
          </button>

          {/* Preset Templates Selector */}
          <select
            className="studio-btn"
            style={{ padding: '4px 6px', fontSize: 11 }}
            value=""
            onChange={(e) => {
              if (e.target.value) {
                onSelectTemplate(e.target.value);
              }
            }}
            title="Load Pre-configured Animation Template"
          >
            <option value="" disabled>
              Templates...
            </option>
            {STUDIO_TEMPLATES.map((tmpl) => (
              <option key={tmpl.id} value={tmpl.id}>
                {tmpl.name}
              </option>
            ))}
          </select>
        </div>

        <div className="studio-btn-group" style={{ marginLeft: 6 }}>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="studio-btn"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={12} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="studio-btn"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={12} />
          </button>
        </div>
      </div>

      {/* Center Playback Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="studio-btn-group">
          <button onClick={onStop} className="studio-btn" title="Return to Start">
            <SkipBack size={12} />
          </button>
          <button onClick={() => onStepFrame(-1)} className="studio-btn" title="Previous Frame (Left Arrow)">
            <ChevronLeft size={12} />
          </button>
          <button
            onClick={onTogglePlay}
            className={`studio-btn ${isPlaying ? 'primary' : ''}`}
            title="Play / Pause (Space)"
            style={{ minWidth: 46 }}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button onClick={() => onStepFrame(1)} className="studio-btn" title="Next Frame (Right Arrow)">
            <ChevronRight size={12} />
          </button>
          <button
            onClick={onToggleLoop}
            className={`studio-btn ${isLooping ? 'active' : ''}`}
            title="Toggle Looping"
          >
            <RotateCcw size={12} />
          </button>
        </div>

        <div className="studio-time-display" title="Current Timecode (MM:SS:FF)">
          {formatTimecode(currentTime)}
        </div>
      </div>

      {/* Right Controls: Hardware Streaming & Device Status */}
      <div className="studio-topbar-right">
        <button
          onClick={onToggleHardwareStream}
          className={`studio-hardware-status-badge ${hardwareStreaming ? 'streaming' : 'off'}`}
          title={
            hardwareStreaming
              ? 'Streaming animation to physical Redragon K630. Click to stop.'
              : 'Virtual Preview Only. Click to enable physical USB output.'
          }
        >
          <Radio size={12} />
          <span>{hardwareStreaming ? 'USB OUTPUT: ON' : 'PREVIEW MODE'}</span>
        </button>
      </div>
    </header>
  );
};
