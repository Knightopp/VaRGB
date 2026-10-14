import React from 'react';
import {
  Lightbulb,
  Keyboard,
  Settings,
  Gamepad2,
} from 'lucide-react';

export type NavTab = 'overview' | 'effects' | 'pixel_art' | 'presets' | 'settings' | 'arcade';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isDeviceConnected: boolean;
  deviceName?: string;
  isOpen?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isDeviceConnected,
  deviceName = 'Redragon K630',
}) => {
  const isLightingActive = activeTab === 'overview' || activeTab === 'effects';
  const isArcadeActive = activeTab === 'arcade';
  const isKeybindsActive = activeTab === 'pixel_art' || activeTab === 'presets';
  const isSettingsActive = activeTab === 'settings';

  return (
    <aside className="app-modern-sidebar">
      {/* Top Branding */}
      <div className="modern-sidebar-brand">
        <h1 className="modern-brand-title">VaRGB</h1>
        <span className="modern-brand-subtitle">{deviceName}</span>
      </div>

      {/* Navigation List */}
      <nav className="modern-sidebar-nav">
        {/* Lighting */}
        <button
          className={`modern-nav-item ${isLightingActive ? 'active' : ''}`}
          onClick={() => onTabChange('overview')}
        >
          {isLightingActive && <span className="nav-active-pip" />}
          <Lightbulb size={17} className="nav-item-icon" />
          <span className="nav-item-text">Lighting</span>
        </button>

        {/* Arcade */}
        <button
          className={`modern-nav-item ${isArcadeActive ? 'active' : ''}`}
          onClick={() => onTabChange('arcade')}
        >
          {isArcadeActive && <span className="nav-active-pip" />}
          <Gamepad2 size={17} className="nav-item-icon" />
          <span className="nav-item-text">Arcade</span>
        </button>

        {/* Keybinds / Presets */}
        <button
          className={`modern-nav-item ${isKeybindsActive ? 'active' : ''}`}
          onClick={() => onTabChange('presets')}
        >
          {isKeybindsActive && <span className="nav-active-pip" />}
          <Keyboard size={17} className="nav-item-icon" />
          <span className="nav-item-text">Keybinds</span>
        </button>

        {/* Settings */}
        <button
          className={`modern-nav-item ${isSettingsActive ? 'active' : ''}`}
          onClick={() => onTabChange('settings')}
        >
          {isSettingsActive && <span className="nav-active-pip" />}
          <Settings size={17} className="nav-item-icon" />
          <span className="nav-item-text">Settings</span>
        </button>
      </nav>

      {/* Bottom Connected Device Card */}
      <div className="modern-sidebar-footer">
        <div className="modern-device-card">
          <div className="device-icon-box">
            <Keyboard size={16} />
          </div>
          <div className="device-card-info">
            <span className="device-card-name">{deviceName}</span>
            <div className="device-card-status">
              <span className={`status-dot ${isDeviceConnected ? 'connected' : 'simulation'}`} />
              <span className="status-label">{isDeviceConnected ? 'Connected' : 'Simulation'}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

