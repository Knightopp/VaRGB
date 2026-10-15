mod audio;
mod k630;
mod keyboard_hook;

use hidapi::HidDevice;
use k630::{
    DeviceManager, DeviceStatus, K630_KEY_IDS, K630_LED_INDICES, RGB_PAYLOAD_LEN, build_rgb_payload,
};
use std::fs;
use std::path::PathBuf;
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
    use std::process::Command;
    use std::os::windows::process::CommandExt;
    use windows_registry::{CURRENT_USER, LOCAL_MACHINE};

    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let run_subkey = r"Software\Microsoft\Windows\CurrentVersion\Run";
    let stale_names = ["k630-studio", "tauri-app", "VaRGB", "vazorism productions"];

    // 1. Clean up any stale or unquoted entries in HKLM if present
    if let Ok(hklm_run) = LOCAL_MACHINE.open(run_subkey) {
        let _ = hklm_run.remove_value(APP_REGISTRY_NAME);
        for stale in &stale_names {
            let _ = hklm_run.remove_value(stale);
        }
    }

    let hkcu_run = CURRENT_USER
        .create(run_subkey)
        .map_err(|e| format!("Failed to open HKCU Run key: {e}"))?;

    for stale in &stale_names {
        let _ = hkcu_run.remove_value(stale);
    }

    if enable {
        let exe_path = current_exe().map_err(|e| format!("Failed to get current executable path: {e}"))?;
        let exe_str = exe_path.to_str().ok_or("Invalid exe path unicode")?;
        // Always enclose in quotes and pass --minimized so Windows startup launches quietly into the tray
        let quoted_cmd = format!("\"{}\" --minimized", exe_str);

        // A. Primary: HKCU Run entry
        hkcu_run
            .set_string(APP_REGISTRY_NAME, &quoted_cmd)
            .map_err(|e| format!("Failed to write HKCU Run value: {e}"))?;

        // B. Disable Explorer's artificial 10-second startup delay (StartupDelayInMSec = 0)
        let serialize_subkey = r"Software\Microsoft\Windows\CurrentVersion\Explorer\Serialize";
        if let Ok(serialize_key) = CURRENT_USER.create(serialize_subkey) {
            let _ = serialize_key.set_u32("StartupDelayInMSec", 0);
        }

        // C. Fast-Track: Windows Task Scheduler "onlogon" (starts immediately at login without Explorer queue delay)
        let _ = Command::new("schtasks")
            .args(&[
                "/create",
                "/tn", "VaRGB_FastBoot",
                "/tr", &quoted_cmd,
                "/sc", "onlogon",
                "/rl", "highest",
                "/f"
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .status()
            .or_else(|_| {
                // If highest privilege fails (e.g. non-admin user), try standard privilege
                Command::new("schtasks")
                    .args(&[
                        "/create",
                        "/tn", "VaRGB_FastBoot",
                        "/tr", &quoted_cmd,
                        "/sc", "onlogon",
                        "/f"
                    ])
                    .creation_flags(CREATE_NO_WINDOW)
                    .status()
            });

        // D. Shell Startup folder link (shell:startup)
        if let Ok(appdata) = std::env::var("APPDATA") {
            let startup_dir = std::path::PathBuf::from(appdata)
                .join("Microsoft")
                .join("Windows")
                .join("Start Menu")
                .join("Programs")
                .join("Startup");
            if startup_dir.exists() {
                let lnk_path = startup_dir.join("VaRGB.lnk");
                let ps_script = format!(
                    "$s = (New-Object -ComObject WScript.Shell).CreateShortcut('{}'); $s.TargetPath = '{}'; $s.Arguments = '--minimized'; $s.Save()",
                    lnk_path.to_string_lossy().replace('\'', "''"),
                    exe_str.replace('\'', "''")
                );
                let _ = Command::new("powershell")
                    .args(&["-NoProfile", "-NonInteractive", "-Command", &ps_script])
                    .creation_flags(CREATE_NO_WINDOW)
                    .status();
            }
        }

        eprintln!("[VaRGB] Instant Priority Boot Launch registered (Run + StartupFolder + Serialize Delay 0ms)");
    } else {
        let _ = hkcu_run.remove_value(APP_REGISTRY_NAME);

        // Remove Task Scheduler entry
        let _ = Command::new("schtasks")
            .args(&["/delete", "/tn", "VaRGB_FastBoot", "/f"])
            .creation_flags(CREATE_NO_WINDOW)
            .status();

        // Remove Shell Startup folder shortcut
        if let Ok(appdata) = std::env::var("APPDATA") {
            let lnk_path = std::path::PathBuf::from(appdata)
                .join("Microsoft")
                .join("Windows")
                .join("Start Menu")
                .join("Programs")
                .join("Startup")
                .join("VaRGB.lnk");
            let _ = std::fs::remove_file(lnk_path);
        }

        eprintln!("[VaRGB] Startup launch disabled");
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
        if let Ok(k) = CURRENT_USER.open(run_subkey) {
            if let Ok(val) = k.get_string(APP_REGISTRY_NAME) {
                if !val.trim().is_empty() {
                    return Ok(true);
                }
            }
        }
        Ok(false)
    }
    #[cfg(not(windows))]
    {
        Ok(false)
    }
}


fn get_app_storage_path(_app: &tauri::AppHandle, filename: &str) -> Result<PathBuf, String> {
    let base_dir = std::env::var_os("APPDATA")
        .or_else(|| std::env::var_os("LOCALAPPDATA"))
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."));
    let app_dir = base_dir.join("com.k630.studio");
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir)
            .map_err(|e| format!("Failed to create storage dir {}: {e}", app_dir.display()))?;
    }
    Ok(app_dir.join(filename))
}

#[tauri::command]
fn load_persistent_settings(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = get_app_storage_path(&app, "settings.json")?;
    if !path.exists() {
        eprintln!("[VaRGB] settings.json not found on disk");
        return Ok(None);
    }
    let data = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read settings from {}: {e}", path.display()))?;
    eprintln!("[VaRGB] Loaded persistent settings (len: {})", data.len());
    Ok(Some(data))
}

#[tauri::command]
fn save_persistent_settings(app: tauri::AppHandle, settings_json: String) -> Result<(), String> {
    let path = get_app_storage_path(&app, "settings.json")?;
    fs::write(&path, &settings_json)
        .map_err(|e| format!("Failed to write settings to {}: {e}", path.display()))?;
    eprintln!("[VaRGB] Successfully saved settings.json (len: {})", settings_json.len());
    Ok(())
}

#[tauri::command]
fn load_persistent_presets(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = get_app_storage_path(&app, "presets.json")?;
    if !path.exists() {
        eprintln!("[VaRGB] presets.json not found on disk");
        return Ok(None);
    }
    let data = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read presets from {}: {e}", path.display()))?;
    eprintln!("[VaRGB] Loaded persistent presets (len: {})", data.len());
    Ok(Some(data))
}

#[tauri::command]
fn save_persistent_presets(app: tauri::AppHandle, presets_json: String) -> Result<(), String> {
    let path = get_app_storage_path(&app, "presets.json")?;
    fs::write(&path, &presets_json)
        .map_err(|e| format!("Failed to write presets to {}: {e}", path.display()))?;
    eprintln!("[VaRGB] Successfully saved presets.json (len: {})", presets_json.len());
    Ok(())
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
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            eprintln!("[VaRGB] Secondary instance detected; bringing main window to front.");
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            if let Ok(settings_path) = get_app_storage_path(&handle, "settings.json") {
                if !settings_path.exists() {
                    let _ = fs::write(&settings_path, "{}");
                }
            }
            if let Ok(presets_path) = get_app_storage_path(&handle, "presets.json") {
                if !presets_path.exists() {
                    let _ = fs::write(&presets_path, "[]");
                }
            }

            #[cfg(windows)]
            {
                use windows_registry::{CURRENT_USER, LOCAL_MACHINE};
                let run_subkey = r"Software\Microsoft\Windows\CurrentVersion\Run";
                let stale_names = ["k630-studio", "tauri-app", "VaRGB", "vazorism productions"];
                // Clean up stale entries in HKLM
                if let Ok(hklm_run) = LOCAL_MACHINE.open(run_subkey) {
                    let _ = hklm_run.remove_value(APP_REGISTRY_NAME);
                    for stale in &stale_names {
                        let _ = hklm_run.remove_value(stale);
                    }
                }
                // If HKCU has an existing entry, verify and enforce quoting + --minimized
                if let Ok(hkcu_run) = CURRENT_USER.open(run_subkey) {
                    for stale in &stale_names {
                        let _ = hkcu_run.remove_value(stale);
                    }
                    if let Ok(val) = hkcu_run.get_string(APP_REGISTRY_NAME) {
                        let trimmed = val.trim();
                        if !trimmed.is_empty() && (!trimmed.starts_with('"') || !trimmed.contains("--minimized")) {
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

            // Check if launched with --minimized / --hidden
            let is_minimized_launch = std::env::args().any(|arg| arg == "--minimized" || arg == "--hidden" || arg == "-m");
            if let Some(window) = app.get_webview_window("main") {
                if !is_minimized_launch {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                } else {
                    eprintln!("[VaRGB] Started minimized to system tray.");
                }
            }

            Ok(())
        })
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { api: _api, .. } = event {
                #[cfg(not(debug_assertions))]
                {
                    // Intercept close event in production: prevent app shutdown and hide window to system tray
                    _api.prevent_close();
                    let _ = _window.hide();
                }
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
            is_startup_launch_enabled,
            load_persistent_settings,
            save_persistent_settings,
            load_persistent_presets,
            save_persistent_presets
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
