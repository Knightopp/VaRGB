mod audio;
mod k630;
mod keyboard_hook;

use hidapi::HidDevice;
use k630::{
    DeviceManager, DeviceStatus, K630_KEY_IDS, K630_LED_INDICES, RGB_PAYLOAD_LEN, build_rgb_payload,
};
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, State,
};

struct ActiveDevice {
    device: HidDevice,
    initialized: bool,
}

struct AppState {
    manager: DeviceManager,
    active_device: Mutex<Option<ActiveDevice>>,
}

#[tauri::command]
fn list_audio_outputs() -> Result<Vec<audio::AudioOutput>, String> {
    audio::list_outputs()
}

#[tauri::command]
fn get_audio_analysis(state: State<audio::AudioService>) -> audio::AudioAnalysis {
    state.snapshot()
}

#[tauri::command]
fn start_audio_capture(
    app: tauri::AppHandle,
    state: State<audio::AudioService>,
    device_id: Option<String>,
    config: audio::AudioAnalyzerConfig,
) -> Result<audio::AudioAnalysis, String> {
    state.start(app, device_id, config)
}

#[tauri::command]
fn set_audio_config(state: State<audio::AudioService>, config: audio::AudioAnalyzerConfig) {
    state.set_config(config);
}

#[tauri::command]
fn stop_audio_capture(state: State<audio::AudioService>) {
    state.stop();
}

const APP_REGISTRY_NAME: &str = "VaRGB - vazorism productions";

#[cfg(windows)]
fn configure_startup_launch(enable: bool) -> Result<(), String> {
    use std::env::current_exe;
    use windows_registry::{CURRENT_USER, LOCAL_MACHINE};

    let run_subkey = r"Software\Microsoft\Windows\CurrentVersion\Run";

    // 1. Clean up any stale or unquoted entries in HKLM if present
    if let Ok(hklm_run) = LOCAL_MACHINE.open(run_subkey) {
        let _ = hklm_run.remove_value(APP_REGISTRY_NAME);
    }

    let hkcu_run = CURRENT_USER
        .create(run_subkey)
        .map_err(|e| format!("Failed to open HKCU Run key: {e}"))?;

    if enable {
        let exe_path = current_exe().map_err(|e| format!("Failed to get current executable path: {e}"))?;
        let exe_str = exe_path.to_str().ok_or("Invalid exe path unicode")?;
        // CRITICAL: Always enclose the executable path in double quotes so Windows handles spaces in user folders
        // (such as "C:\Users\ABHIRAM C S\...") without splitting at "ABHIRAM" and prompting "Which app to open ABHIRAM".
        let quoted_cmd = format!("\"{}\"", exe_str);
        hkcu_run
            .set_string(APP_REGISTRY_NAME, &quoted_cmd)
            .map_err(|e| format!("Failed to write HKCU Run value: {e}"))?;
    } else {
        let _ = hkcu_run.remove_value(APP_REGISTRY_NAME);
    }

    Ok(())
}

#[cfg(not(windows))]
fn configure_startup_launch(_enable: bool) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
fn enable_startup_launch() -> Result<(), String> {
    configure_startup_launch(true)
}

#[tauri::command]
fn disable_startup_launch() -> Result<(), String> {
    configure_startup_launch(false)
}

#[tauri::command]
fn is_startup_launch_enabled() -> Result<bool, String> {
    #[cfg(windows)]
    {
        use windows_registry::CURRENT_USER;
        let run_subkey = r"Software\Microsoft\Windows\CurrentVersion\Run";
        match CURRENT_USER.open(run_subkey).and_then(|k| k.get_string(APP_REGISTRY_NAME)) {
            Ok(val) => Ok(!val.trim().is_empty()),
            Err(_) => Ok(false),
        }
    }
    #[cfg(not(windows))]
    {
        Ok(false)
    }
}

fn with_active_device<T>(
    state: &AppState,
    operation: impl FnOnce(&DeviceManager, &HidDevice) -> Result<T, String>,
) -> Result<T, String> {
    let mut guard = state
        .active_device
        .lock()
        .map_err(|_| "K630 device lock is poisoned")?;
    if guard.is_none() {
        let device = state.manager.open_k630()?;
        state.manager.init_software_mode(&device)?;
        *guard = Some(ActiveDevice {
            device,
            initialized: true,
        });
    }
    let session = guard.as_mut().expect("device session initialized above");
    if !session.initialized {
        state.manager.init_software_mode(&session.device)?;
        session.initialized = true;
    }
    operation(&state.manager, &session.device)
}

#[tauri::command]
fn get_device_status(state: State<AppState>) -> DeviceStatus {
    if let Ok(guard) = state.active_device.lock() {
        if guard.is_some() {
            return DeviceStatus {
                connected: true,
                vendor_id: k630::K630_VID,
                product_id: k630::K630_PID,
                device_name: "Redragon K630 RGB".into(),
                path: String::new(),
                interface_number: k630::TARGET_INTERFACE,
                usage: k630::TARGET_USAGE,
                manufacturer: "Shenzhen EVision".into(),
            };
        }
    }
    state.manager.scan_device()
}

#[tauri::command]
fn test_device_frame(state: State<AppState>, r: u8, g: u8, b: u8) -> Result<String, String> {
    let colors: Vec<(String, [u8; 3])> = K630_KEY_IDS
        .iter()
        .map(|id| ((*id).to_string(), [r, g, b]))
        .collect();
    let payload = build_rgb_payload(&colors)?;
    with_active_device(&state, |manager, device| {
        manager.send_rgb_frame(device, &payload)
    })?;
    Ok(format!(
        "K630 HID reports accepted for RGB({r}, {g}, {b}) across 61 keys"
    ))
}

#[tauri::command]
fn send_rgb_packet(state: State<AppState>, rgb_data: Vec<u8>) -> Result<(), String> {
    if rgb_data.len() != RGB_PAYLOAD_LEN {
        return Err(format!(
            "RGB payload must be exactly {RGB_PAYLOAD_LEN} bytes"
        ));
    }
    with_active_device(&state, |manager, device| {
        manager.send_rgb_frame(device, &rgb_data)
    })
}

#[tauri::command]
fn disconnect_k630(state: State<AppState>) -> Result<(), String> {
    let mut guard = state
        .active_device
        .lock()
        .map_err(|_| "K630 device lock is poisoned")?;
    *guard = None;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Keep the LED map referenced here so frontend/backend mapping drift is visible
    // in tests and in code review; each existing frontend key maps to one LED slot.
    debug_assert_eq!(K630_KEY_IDS.len(), K630_LED_INDICES.len());

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(windows)]
            {
                use windows_registry::{CURRENT_USER, LOCAL_MACHINE};
                let run_subkey = r"Software\Microsoft\Windows\CurrentVersion\Run";
                // Clean up stale or broken unquoted entries in HKLM
                if let Ok(hklm_run) = LOCAL_MACHINE.open(run_subkey) {
                    let _ = hklm_run.remove_value(APP_REGISTRY_NAME);
                }
                // If HKCU has an existing entry, verify and enforce quoting
                if let Ok(hkcu_run) = CURRENT_USER.open(run_subkey) {
                    if let Ok(val) = hkcu_run.get_string(APP_REGISTRY_NAME) {
                        let trimmed = val.trim();
                        if !trimmed.is_empty() && (!trimmed.starts_with('"') || !trimmed.ends_with('"')) {
                            let _ = configure_startup_launch(true);
                        }
                    }
                }
            }

            // System Tray Setup
            let show_item = MenuItem::with_id(app, "show", "Open VaRGB", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit VaRGB", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let mut tray_builder = TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(false)
                .tooltip("VaRGB - vazorism productions")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.unminimize();
                            let _ = window.set_focus();
                        }
                    }
                });

            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }

            let _tray = tray_builder.build(app)?;

            keyboard_hook::hook::start(app.handle().clone());

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Intercept close event: prevent app shutdown and hide window to system tray
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .manage(AppState {
            manager: DeviceManager::new(),
            active_device: Mutex::new(None),
        })
        .manage(audio::AudioService::default())
        .invoke_handler(tauri::generate_handler![
            get_device_status,
            test_device_frame,
            send_rgb_packet,
            disconnect_k630,
            list_audio_outputs,
            get_audio_analysis,
            start_audio_capture,
            set_audio_config,
            stop_audio_capture,
            enable_startup_launch,
            disable_startup_launch,
            is_startup_launch_enabled
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
