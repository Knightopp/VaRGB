import React from 'react';
import { Play, Pause, Square, Settings, Radio, PanelLeftClose, PanelLeft } from 'lucide-react';

interface TopBarProps {
  pageTitle: string;
  activeEffectName: string;
  isPlaying: boolean;
  isPaused: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onOpenSettings: () => void;
  hardwareEnabled: boolean;
  onToggleHardware: () => void;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  pageTitle,
  activeEffectName,
  isPlaying,
  isPaused,
  onPlay,
  onPause,
  onStop,
  onOpenSettings,
  hardwareEnabled,
  onToggleHardware,
  sidebarOpen = true,
  onToggleSidebar,
}) => {
  return (
    <header className="app-topbar">
      <div className="topbar-left">
        {onToggleSidebar && (
          <button
            className="icon-btn sidebar-toggle-btn"
            onClick={onToggleSidebar}
            title={sidebarOpen ? 'Hide Sidebar (Expand Workspace)' : 'Show Sidebar'}
          >
            {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
          </button>
        )}
        <h1 className="page-title">{pageTitle}</h1>
        <div className="active-effect-tag">
          <span className="tag-label">Active:</span>
          <span className="tag-value">{activeEffectName}</span>
        </div>
      </div>

      <div className="topbar-right">
        {/* Hardware output switch */}
        <button
          className={`hardware-toggle-btn ${hardwareEnabled ? 'enabled' : 'disabled'}`}
          onClick={onToggleHardware}
          title={hardwareEnabled ? 'Click to disable hardware output' : 'Click to enable USB hardware output'}
        >
          <Radio size={13} className={hardwareEnabled ? 'pulse-icon' : ''} />
          <span>{hardwareEnabled ? 'USB Output: ON' : 'USB Output: Muted'}</span>
        </button>

        {/* Animation Playback Controls */}
        <div className="playback-group">
          {isPlaying && !isPaused ? (
            <button className="playback-btn" onClick={onPause} title="Pause Animation">
              <Pause size={13} />
              <span>Pause</span>
            </button>
          ) : (
            <button className="playback-btn primary" onClick={onPlay} title="Play Animation">
              <Play size={13} />
              <span>Play</span>
            </button>
          )}

          <button className="playback-btn" onClick={onStop} title="Stop Animation (Black Out)">
            <Square size={13} />
            <span>Stop</span>
          </button>
        </div>

        <button className="icon-btn settings-btn" onClick={onOpenSettings} title="Settings">
          <Settings size={15} />
        </button>
      </div>
    </header>
  );
};
