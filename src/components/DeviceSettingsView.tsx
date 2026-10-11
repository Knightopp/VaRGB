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
} from 'lucide-react';
import { DeviceInfo } from '../services/hardware';

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
}) => {
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testColor, setTestColor] = useState('#00e5ff');

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

        {/* Persistence Architecture & Protocol Report */}
        <div className="settings-card full-width">
          <div className="card-header">
            <HardDrive size={15} />
            <h3>Keyboard Memory & Persistence Architecture</h3>
          </div>
          <div className="persistence-report">
            <div className="report-item">
                <strong>1. Built-in Keyboard Lighting</strong>
              <p>
                The K630 has built-in lighting modes that can be selected with its keyboard shortcuts. The supplied RGB streaming protocol does not document a command for saving custom animation data to keyboard memory.
              </p>
            </div>
            <div className="report-item">
                <strong>2. Live Custom Effects</strong>
              <p>
                VaRGB generates effects on the computer and streams RGB frames while the app is running. Whether the keyboard stores any streamed frame or resumes a particular built-in mode after reconnect has not been verified, so custom animation persistence is unconfirmed.
              </p>
            </div>
            <div className="report-item">
                <strong>3. Studio Presets</strong>
              <p>
                Saved presets are stored in this app's local storage. They remain available on this computer, but the selected effect is not automatically restored and streamed when Studio starts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
