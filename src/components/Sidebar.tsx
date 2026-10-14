import React from 'react';
import {
  LayoutDashboard,
  Sparkles,
  Palette,
  Bookmark,
  Sliders,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Film,
} from 'lucide-react';

export type NavTab = 'overview' | 'effects' | 'pixel_art' | 'presets' | 'settings' | 'studio';

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
  deviceName = 'Redragon K630 RGB',
  isOpen = true,
}) => {
  const navItems = [
    { id: 'overview' as NavTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'effects' as NavTab, label: 'Lighting Effects', icon: Sparkles },
    { id: 'studio' as NavTab, label: 'Studio (AE)', icon: Film },
    { id: 'pixel_art' as NavTab, label: 'Custom Pixel Art', icon: Palette },
    { id: 'presets' as NavTab, label: 'Presets', icon: Bookmark },
    { id: 'settings' as NavTab, label: 'Device Settings', icon: Sliders },
  ];

  return (
    <aside className={`app-sidebar ${isOpen ? '' : 'collapsed'}`}>
      <div className="sidebar-brand">
        <div className="brand-logo-container">
          <Cpu size={18} className="brand-icon" />
        </div>
        <div className="brand-info">
          <span className="brand-title">VaRGB - vazorism productions</span>
          <span className="brand-subtitle">RGB Controller v1.0</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-button ${isActive ? 'active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="device-status-card">
          <div className="device-status-header">
            <span
              className={`status-pill ${
                isDeviceConnected ? 'connected' : 'disconnected'
              }`}
            >
              {isDeviceConnected ? (
                <CheckCircle2 size={11} />
              ) : (
                <AlertCircle size={11} />
              )}
              {isDeviceConnected ? 'HARDWARE DETECTED' : 'SIMULATION MODE'}
            </span>
          </div>
          <div className="device-name-text">{deviceName}</div>
          <div className="device-meta-text">
            VID: 0x320F • PID: 0x5000 • 60% ANSI
          </div>
        </div>
      </div>
    </aside>
  );
};
