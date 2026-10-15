import React, { useState } from 'react';
import {
  Cpu,
  HardDrive,
  RefreshCw,
  AlertTriangle,
  Radio,
  Sliders,
  CheckCircle2,
  Terminal,
  Power,
  RotateCcw,
  Palette,
} from 'lucide-react';
import { DeviceInfo } from '../services/hardware';
import { KeyboardVisualTheme, GapLightingMode, saveSettings } from '../services/settings';

interface DeviceSettingsViewProps {
  isDeviceConnected: boolean;
  deviceInfo: DeviceInfo;
  hardwareStatus: 'preview-only' | 'connecting' | 'active' | 'error';
  hardwareError?: string;
  hardwareEnabled: boolean;
  onToggleHardware: () => void;
  onTestDevice: (testColorHex: string) => Promise<string>;
  fpsLimit: number;
  onFpsLimitChange: (fps: number) => void;
  onRefreshDevice: () => void;
  isStartupEnabled?: boolean;
  onToggleStartup?: () => void;
}

export const DeviceSettingsView: React.FC<DeviceSettingsViewProps> = ({
  isDeviceConnected,
  deviceInfo,
  hardwareStatus,
  hardwareError,
  hardwareEnabled,
  onToggleHardware,
  onTestDevice,
  fpsLimit,
  onFpsLimitChange,
  onRefreshDevice,
  isStartupEnabled = false,
  onToggleStartup,
}) => {
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testColor, setTestColor] = useState('#00e5ff');

  const [kbTheme, setKbTheme] = useState<KeyboardVisualTheme>(() => {
    return (typeof window !== 'undefined' ? (localStorage.getItem('vargb_kb_theme') as KeyboardVisualTheme) || 'mechanical' : 'mechanical');
  });
  const [kbGapLighting, setKbGapLighting] = useState<GapLightingMode>(() => {
    return (typeof window !== 'undefined' ? (localStorage.getItem('vargb_kb_gap_lighting') as GapLightingMode) || 'vivid' : 'vivid');
  });

  const handleThemeChange = (newTheme: KeyboardVisualTheme) => {
    setKbTheme(newTheme);
    localStorage.setItem('vargb_kb_theme', newTheme);
    saveSettings({ keyboardTheme: newTheme });
    window.dispatchEvent(new Event('vargb_kb_theme_change'));
  };

  const handleGapLightingChange = (newGap: GapLightingMode) => {
    setKbGapLighting(newGap);
    localStorage.setItem('vargb_kb_gap_lighting', newGap);
    saveSettings({ gapLighting: newGap });
    window.dispatchEvent(new Event('vargb_kb_theme_change'));
  };

  const runTest = async () => {
    setIsTesting(true);
    setTestStatus('Executing single-frame test probe...');
    try {
      const res = await onTestDevice(testColor);
      setTestStatus(res);
    } catch (err: any) {
      setTestStatus(`Test failed: ${err?.message || err}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="device-settings-panel">
      <div className="settings-header">
        <div>
          <h2>Device & Hardware Configuration</h2>
          <p className="subtitle">
            Diagnostics, USB HID protocol specifications, and hardware transmission safety.
          </p>
        </div>
        <button onClick={onRefreshDevice} className="icon-btn">
          <RefreshCw size={13} />
          <span>Scan USB Devices</span>
        </button>
      </div>

      <div className="settings-grid">
        {/* Device Identity Card */}
        <div className="settings-card">
          <div className="card-header">
            <Cpu size={15} />
            <h3>Hardware Identification</h3>
          </div>
          <div className="specs-table">
            <div className="spec-row">
              <span className="spec-name">Device Model</span>
                <span className="spec-val">{deviceInfo.device_name}</span>
            </div>
            <div className="spec-row">
              <span className="spec-name">Microcontroller</span>
                <span className="spec-val">{deviceInfo.manufacturer || 'Not detected'}</span>
            </div>
            <div className="spec-row">
              <span className="spec-name">Vendor ID (VID)</span>
                <span className="spec-val font-mono">0x{deviceInfo.vendor_id.toString(16).padStart(4, '0').toUpperCase()}</span>
            </div>
            <div className="spec-row">
              <span className="spec-name">Product ID (PID)</span>
                <span className="spec-val font-mono">0x{deviceInfo.product_id.toString(16).padStart(4, '0').toUpperCase()}</span>
            </div>
            <div className="spec-row">
              <span className="spec-name">Target Interface</span>
                <span className="spec-val font-mono">Interface {deviceInfo.interface_number} (Usage 0x{deviceInfo.usage.toString(16).padStart(4, '0').toUpperCase()})</span>
            </div>
            <div className="spec-row">
              <span className="spec-name">Connection State</span>
              <span className="spec-val">
                {isDeviceConnected ? (
                  <span className="status-badge connected">
                    <CheckCircle2 size={12} /> Verified K630 endpoint detected
                  </span>
                ) : (
                  <span className="status-badge disconnected">
                    <AlertTriangle size={12} /> Preview-only — no verified K630 endpoint
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Transmission & Safety Controls */}
        <div className="settings-card">
          <div className="card-header">
            <Radio size={15} />
            <h3>Transmission Safety Controls</h3>
          </div>
          <div className="card-body">
            <div className="toggle-row">
              <div>
                <strong>Direct USB Output</strong>
                <p>
                  When muted, all effects animate purely in the desktop simulator. Enable to stream packets to the physical K630.
                </p>
              </div>
              <button
                className={`toggle-btn ${hardwareEnabled ? 'active' : ''}`}
                onClick={onToggleHardware}
              >
                {hardwareEnabled ? 'ENABLED' : 'MUTED'}
              </button>
            </div>
            <div className="probe-result-terminal" role="status" aria-live="polite">
              {hardwareStatus === 'active' ? <CheckCircle2 size={12} /> : <Radio size={12} />}
              <span>
                {hardwareStatus === 'active' && 'Hardware output active (last frame accepted by HID).'}
                {hardwareStatus === 'connecting' && 'Connecting to the verified K630 interface…'}
                {hardwareStatus === 'preview-only' && 'Preview-only mode; no hardware frame is being sent.'}
                {hardwareStatus === 'error' && `Transmission error: ${hardwareError || 'unknown HID error'}`}
              </span>
            </div>

            <div className="control-field" style={{ marginTop: '16px' }}>
              <div className="field-header">
                <span className="field-title"><Sliders size={12} /> USB Frame Throttle</span>
                <span className="field-val">{fpsLimit} Hz</span>
              </div>
              <input
                type="range"
                min="15"
                max="45"
                step="5"
                value={fpsLimit}
                onChange={(e) => onFpsLimitChange(parseInt(e.target.value))}
              />
              <span className="field-hint">
                  This caps how often Studio submits frames. Each frame uses six HID reports; tune for your device after confirming it responds reliably.
              </span>
            </div>

            <div className="test-probe-area">
              <span className="probe-title">Hardware Probe Test</span>
              <div className="probe-actions">
                <input
                  type="color"
                  value={testColor}
                  onChange={(e) => setTestColor(e.target.value)}
                />
                <button
                  className="primary"
                  onClick={runTest}
                  disabled={isTesting || !isDeviceConnected}
                >
                  {isTesting ? 'Sending Probe...' : 'Send Static Frame Test'}
                </button>
              </div>
              {testStatus && (
                <div className="probe-result-terminal">
                  <Terminal size={12} />
                  <span>{testStatus}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Virtual Keyboard Appearance & Customization Card */}
        <div className="settings-card full-width">
          <div className="card-header">
            <Palette size={15} />
            <h3>Virtual Keyboard Appearance & Customization</h3>
          </div>
          <div className="card-body">
            <div className="spec-row" style={{ alignItems: 'center', marginBottom: 14 }}>
              <div>
                <strong>Keycap Visual Style</strong>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Choose between the realistic 3D mechanical profile or change back to the classic flat look.
                </p>
              </div>
              <div className="chip-pill-container">
                <button
                  type="button"
                  className={`chip-pill ${kbTheme === 'mechanical' ? 'active' : ''}`}
                  onClick={() => handleThemeChange('mechanical')}
                >
                  3D Mechanical
                </button>
                <button
                  type="button"
                  className={`chip-pill ${kbTheme === 'classic' ? 'active' : ''}`}
                  onClick={() => handleThemeChange('classic')}
                >
                  Classic Flat
                </button>
                <button
                  type="button"
                  className={`chip-pill ${kbTheme === 'pudding' ? 'active' : ''}`}
                  onClick={() => handleThemeChange('pudding')}
                >
                  Pudding
                </button>
                <button
                  type="button"
                  className={`chip-pill ${kbTheme === 'stealth' ? 'active' : ''}`}
                  onClick={() => handleThemeChange('stealth')}
                >
                  Stealth
                </button>
              </div>
            </div>

            <div className="spec-row" style={{ alignItems: 'center' }}>
              <div>
                <strong>Inter-Key Gap Lighting</strong>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Adjust the intensity of RGB underglow visible in the crevices between keycaps.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="chip-pill-container">
                  <button
                    type="button"
                    className={`chip-pill ${kbGapLighting === 'vivid' ? 'active' : ''}`}
                    onClick={() => handleGapLightingChange('vivid')}
                  >
                    Vivid
                  </button>
                  <button
                    type="button"
                    className={`chip-pill ${kbGapLighting === 'subtle' ? 'active' : ''}`}
                    onClick={() => handleGapLightingChange('subtle')}
                  >
                    Subtle
                  </button>
                  <button
                    type="button"
                    className={`chip-pill ${kbGapLighting === 'off' ? 'active' : ''}`}
                    onClick={() => handleGapLightingChange('off')}
                  >
                    Off
                  </button>
                </div>

                {(kbTheme !== 'mechanical' || kbGapLighting !== 'vivid') && (
                  <button
                    type="button"
                    className="chip-revert-btn"
                    onClick={() => {
                      handleThemeChange('mechanical');
                      handleGapLightingChange('vivid');
                    }}
                    title="Reset to factory appearance"
                  >
                    <RotateCcw size={11} />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Windows Startup & Integration Card */}
        <div className="settings-card full-width">
          <div className="card-header">
            <Power size={15} />
            <h3>Instant Priority Boot Launch</h3>
          </div>
          <div className="card-body">
            <div className="toggle-row">
              <div>
                <strong>Launch Instantly on Windows Boot</strong>
                <p>
                  Configured with Windows Task Scheduler with <strong>Highest Privilege & 0ms Delay on Logon</strong>, bypassing the standard Windows startup delay so VaRGB is the first app to control your K630.
                </p>
              </div>
              <button
                className={`toggle-btn ${isStartupEnabled ? 'active' : ''}`}
                onClick={onToggleStartup}
              >
                {isStartupEnabled ? 'INSTANT BOOT: ON' : 'DISABLED'}
              </button>
            </div>
          </div>
        </div>

        {/* Persistence Architecture & Protocol Report */}
        <div className="settings-card full-width">
          <div className="card-header">
            <HardDrive size={15} />
            <h3>Memory & Architecture Report</h3>
          </div>
          <div className="persistence-report">
            <div className="report-item">
              <strong>1. Built-in Hardware Profiles (Offline)</strong>
              <p>
                Configure permanent offline profiles, modes, and key remaps using the official Redragon app. They remain burned into the keyboard EEPROM across reboots and other PCs.
              </p>
            </div>
            <div className="report-item">
              <strong>2. Priority Windows Boot Takeover</strong>
              <p>
                As soon as your Windows user logs in, VaRGB launches immediately without delay, seamlessly taking over the K630 with 60 FPS reactive lighting.
              </p>
            </div>
            <div className="report-item">
              <strong>3. Permanent PC Presets & Settings</strong>
              <p>
                Presets, customized parameters, and themes persist on disk (%APPDATA%\com.k630.studio), automatically restored on every launch.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
