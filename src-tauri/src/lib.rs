mod audio;
pub mod engine;
mod k630;
mod keyboard_hook;

use hidapi::HidDevice;
use k630::{
    build_rgb_payload, DeviceManager, DeviceStatus, K630_KEY_IDS, K630_LED_INDICES, RGB_PAYLOAD_LEN,
};
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, State, WebviewUrl, WebviewWindowBuilder,
};

static IS_QUITTING: AtomicBool = AtomicBool::new(false);

pub struct ActiveDevice {
    pub device: HidDevice,
    pub initialized: bool,
}

pub struct AppState {
    pub manager: Arc<DeviceManager>,
    pub active_device: Arc<Mutex<Option<ActiveDevice>>>,
    pub engine: Arc<engine::NativeEngine>,
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

const APP_REGISTRY_NAME: &str = "VaRGB";

#[cfg(windows)]
fn configure_startup_launch(enable: bool) -> Result<(), String> {
    use std::env::current_exe;
    use windows_registry::{CURRENT_USER, LOCAL_MACHINE};

    let run_subkey = r"Software\Microsoft\Windows\CurrentVersion\Run";
    let stale_names = ["k630-studio", "tauri-app", "VaRGB - vazorism productions", "vazorism productions"];

    // Clean up any stale or unquoted entries in HKLM if present
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
        // Standard, clean HKCU Run entry (fully trusted by Windows Defender)
        let quoted_cmd = format!("\"{}\" --minimized", exe_str);
        hkcu_run
            .set_string(APP_REGISTRY_NAME, &quoted_cmd)
            .map_err(|e| format!("Failed to write HKCU Run value: {e}"))?;

        eprintln!("[VaRGB] Startup launch registered in HKCU Run");
    } else {
        let _ = hkcu_run.remove_value(APP_REGISTRY_NAME);
        eprintln!("[VaRGB] Startup launch disabled");
    }

    Ok(())
}

#[cfg(not(windows))]
fn configure_startup_launch(_enable: bool) -> Result<(), String> {
    Ok(())
}

#[cfg(windows)]
fn clean_legacy_shortcuts() {
    if let Ok(appdata) = std::env::var("APPDATA") {
        let programs_dir = std::path::PathBuf::from(&appdata)
            .join("Microsoft")
            .join("Windows")
            .join("Start Menu")
            .join("Programs");

        if programs_dir.exists() {
            let stale_shortcuts = [
                "VaRGB - vazorism productions.lnk",
                "tauri-app.lnk",
            ];
            for stale in &stale_shortcuts {
                let stale_path = programs_dir.join(stale);
                if stale_path.exists() {
                    let _ = std::fs::remove_file(stale_path);
                }
            }
        }
    }
}

#[cfg(not(windows))]
fn clean_legacy_shortcuts() {}

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
fn save_persistent_settings(
    app: tauri::AppHandle,
    state: State<AppState>,
    settings_json: String,
) -> Result<(), String> {
    state.engine.update_from_json(&settings_json);
    let path = get_app_storage_path(&app, "settings.json")?;
    fs::write(&path, &settings_json)
        .map_err(|e| format!("Failed to write settings to {}: {e}", path.display()))?;
    eprintln!("[VaRGB] Successfully saved settings.json (len: {})", settings_json.len());
    Ok(())
}

#[tauri::command]
fn sync_active_mode(state: State<AppState>, settings_json: String) -> Result<(), String> {
    state.engine.update_from_json(&settings_json);
    Ok(())
}

#[tauri::command]
fn set_ui_streaming(state: State<AppState>, streaming: bool) -> Result<(), String> {
    state.engine.set_ui_streaming(streaming);
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

fn open_or_recreate_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
        eprintln!("[VaRGB] Focusing existing main window.");
    } else {
        eprintln!("[VaRGB] Re-creating WebView2 window from tray...");
        let builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
            .title("VaRGB - vazorism productions")
            .inner_size(1180.0, 820.0)
            .min_inner_size(900.0, 640.0);

        match builder.build() {
            Ok(window) => {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
                eprintln!("[VaRGB] Successfully rebuilt WebView2 window.");
            }
            Err(e) => {
                eprintln!("[VaRGB] Error rebuilding window: {e}");
            }
        }
    }

    if let Some(state) = app.try_state::<AppState>() {
        state.engine.set_ui_streaming(true);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    debug_assert_eq!(K630_KEY_IDS.len(), K630_LED_INDICES.len());

    let device_manager = Arc::new(DeviceManager::new());
    let active_device = Arc::new(Mutex::new(None));
    let native_engine = engine::NativeEngine::new();

    let app_state = AppState {
        manager: Arc::clone(&device_manager),
        active_device: Arc::clone(&active_device),
        engine: Arc::clone(&native_engine),
    };

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            eprintln!("[VaRGB] Secondary instance detected; bringing main window to front.");
            open_or_recreate_window(app);
        }))
        .plugin(tauri_plugin_opener::init())
        .setup({
            let native_engine = Arc::clone(&native_engine);

            move |app| {
                let handle = app.handle().clone();

                // Hydrate initial settings into native engine
                if let Ok(settings_path) = get_app_storage_path(&handle, "settings.json") {
                    if settings_path.exists() {
                        if let Ok(data) = fs::read_to_string(&settings_path) {
                            native_engine.update_from_json(&data);
                        }
                    } else {
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
                    let _ = configure_startup_launch(true);
                    clean_legacy_shortcuts();
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
                            open_or_recreate_window(app);
                        }
                        "quit" => {
                            IS_QUITTING.store(true, Ordering::SeqCst);
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
                            open_or_recreate_window(tray.app_handle());
                        }
                    });

                if let Some(icon) = app.default_window_icon() {
                    tray_builder = tray_builder.icon(icon.clone());
                }

                let _tray = tray_builder.build(app)?;

                keyboard_hook::hook::start(app.handle().clone());

                let is_minimized_boot = std::env::args().any(|arg| {
                    arg == "--minimized" || arg == "-m" || arg == "--tray"
                });

                if is_minimized_boot {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.hide();
                    }
                    eprintln!("[VaRGB] Started minimized inside system tray.");
                } else {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_focus();
                        eprintln!("[VaRGB] Main window displayed.");
                    }
                }

                Ok(())
            }
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Intercept close: hide to tray so active effect continues seamlessly with 0 interruption
                api.prevent_close();
                let _ = window.hide();
                eprintln!("[VaRGB] Window hidden to system tray; chosen lighting effect continues.");
            }
        })
        .manage(app_state)
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
            save_persistent_presets,
            sync_active_mode,
            set_ui_streaming
        ]);

    let app = builder
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app_handle, event| {
        if let tauri::RunEvent::ExitRequested { api, .. } = event {
            // Keep tray and native engine running when the main window is destroyed/closed
            if !IS_QUITTING.load(Ordering::SeqCst) {
                api.prevent_exit();
            }
        }
    });
}
