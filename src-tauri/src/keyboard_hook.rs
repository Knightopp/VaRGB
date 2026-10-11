#[cfg(windows)]
pub mod hook {
    use std::ptr::null_mut;
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::sync::OnceLock;
    use std::thread;
    use tauri::{AppHandle, Emitter};

    static APP_HANDLE: OnceLock<AppHandle> = OnceLock::new();
    static HOOK_RUNNING: AtomicBool = AtomicBool::new(false);
    static KEY_DOWN_STATE: [AtomicBool; 256] = [const { AtomicBool::new(false) }; 256];

    type HHOOK = *mut std::ffi::c_void;
    type HINSTANCE = *mut std::ffi::c_void;
    type HWND = *mut std::ffi::c_void;
    type LRESULT = isize;
    type WPARAM = usize;
    type LPARAM = isize;
    type BOOL = i32;

    const WH_KEYBOARD_LL: i32 = 13;
    const WM_KEYDOWN: usize = 0x0100;
    const WM_KEYUP: usize = 0x0101;
    const WM_SYSKEYDOWN: usize = 0x0104;
    const WM_SYSKEYUP: usize = 0x0105;

    #[repr(C)]
    #[derive(Copy, Clone)]
    struct KBDLLHOOKSTRUCT {
        vk_code: u32,
        scan_code: u32,
        flags: u32,
        time: u32,
        dw_extra_info: usize,
    }

    #[repr(C)]
    #[derive(Copy, Clone)]
    struct POINT {
        _x: i32,
        _y: i32,
    }

    #[repr(C)]
    #[derive(Copy, Clone)]
    struct MSG {
        _hwnd: HWND,
        _message: u32,
        _w_param: WPARAM,
        _l_param: LPARAM,
        _time: u32,
        _pt: POINT,
    }

    unsafe extern "system" {
        fn SetWindowsHookExW(
            id_hook: i32,
            lpfn: unsafe extern "system" fn(i32, WPARAM, LPARAM) -> LRESULT,
            hmod: HINSTANCE,
            dw_thread_id: u32,
        ) -> HHOOK;
        fn UnhookWindowsHookEx(hhk: HHOOK) -> BOOL;
        fn CallNextHookEx(hhk: HHOOK, n_code: i32, w_param: WPARAM, l_param: LPARAM) -> LRESULT;
        fn GetMessageW(lp_msg: *mut MSG, h_wnd: HWND, w_msg_filter_min: u32, w_msg_filter_max: u32) -> BOOL;
        fn GetModuleHandleW(lp_module_name: *const u16) -> HINSTANCE;
        fn GetLastError() -> u32;
    }

    unsafe extern "system" fn low_level_keyboard_proc(
        code: i32,
        wparam: WPARAM,
        lparam: LPARAM,
    ) -> LRESULT {
        if code >= 0 {
            let kbd = unsafe { *(lparam as *const KBDLLHOOKSTRUCT) };
            let vk = (kbd.vk_code & 0xFF) as usize;

            if wparam == WM_KEYDOWN || wparam == WM_SYSKEYDOWN {
                // Ignore OS auto-repeats so holding down keys (e.g. Space) doesn't flood and cancel animations
                let was_already_down = KEY_DOWN_STATE[vk].swap(true, Ordering::SeqCst);
                if !was_already_down {
                    if let Some(key_code) = vk_to_code(kbd.vk_code) {
                        if let Some(app) = APP_HANDLE.get() {
                            let _ = app.emit("global_key_press", key_code);
                        }
                    }
                }
            } else if wparam == WM_KEYUP || wparam == WM_SYSKEYUP {
                KEY_DOWN_STATE[vk].store(false, Ordering::SeqCst);
            }
        }
        unsafe { CallNextHookEx(null_mut(), code, wparam, lparam) }
    }

    fn vk_to_code(vk: u32) -> Option<&'static str> {
        match vk {
            0x41 => Some("KeyA"),
            0x42 => Some("KeyB"),
            0x43 => Some("KeyC"),
            0x44 => Some("KeyD"),
            0x45 => Some("KeyE"),
            0x46 => Some("KeyF"),
            0x47 => Some("KeyG"),
            0x48 => Some("KeyH"),
            0x49 => Some("KeyI"),
            0x4A => Some("KeyJ"),
            0x4B => Some("KeyK"),
            0x4C => Some("KeyL"),
            0x4D => Some("KeyM"),
            0x4E => Some("KeyN"),
            0x4F => Some("KeyO"),
            0x50 => Some("KeyP"),
            0x51 => Some("KeyQ"),
            0x52 => Some("KeyR"),
            0x53 => Some("KeyS"),
            0x54 => Some("KeyT"),
            0x55 => Some("KeyU"),
            0x56 => Some("KeyV"),
            0x57 => Some("KeyW"),
            0x58 => Some("KeyX"),
            0x59 => Some("KeyY"),
            0x5A => Some("KeyZ"),
            0x30 => Some("Digit0"),
            0x31 => Some("Digit1"),
            0x32 => Some("Digit2"),
            0x33 => Some("Digit3"),
            0x34 => Some("Digit4"),
            0x35 => Some("Digit5"),
            0x36 => Some("Digit6"),
            0x37 => Some("Digit7"),
            0x38 => Some("Digit8"),
            0x39 => Some("Digit9"),
            0x20 => Some("Space"),
            0x0D => Some("Enter"),
            0x1B => Some("Escape"),
            0x09 => Some("Tab"),
            0x08 => Some("Backspace"),
            0x14 => Some("CapsLock"),
            0x10 | 0xA0 => Some("ShiftLeft"),
            0xA1 => Some("ShiftRight"),
            0x11 | 0xA2 => Some("ControlLeft"),
            0xA3 => Some("ControlRight"),
            0x12 | 0xA4 => Some("AltLeft"),
            0xA5 => Some("AltRight"),
            0x5B => Some("MetaLeft"),
            0x5C => Some("MetaRight"),
            0x5D => Some("ContextMenu"),
            0xBA => Some("Semicolon"),
            0xBB => Some("Equal"),
            0xBC => Some("Comma"),
            0xBD => Some("Minus"),
            0xBE => Some("Period"),
            0xBF => Some("Slash"),
            0xC0 => Some("Backquote"),
            0xDB => Some("BracketLeft"),
            0xDC => Some("Backslash"),
            0xDD => Some("BracketRight"),
            0xDE => Some("Quote"),
            0x26 => Some("ArrowUp"),
            0x28 => Some("ArrowDown"),
            0x25 => Some("ArrowLeft"),
            0x27 => Some("ArrowRight"),
            _ => None,
        }
    }

    pub fn start(app: AppHandle) {
        if HOOK_RUNNING.swap(true, Ordering::SeqCst) {
            return;
        }
        let _ = APP_HANDLE.set(app);

        thread::spawn(|| unsafe {
            let hmod = GetModuleHandleW(null_mut());
            let hook = SetWindowsHookExW(
                WH_KEYBOARD_LL,
                low_level_keyboard_proc,
                hmod,
                0,
            );
            if hook.is_null() {
                eprintln!("[keyboard_hook] SetWindowsHookExW failed with err: {}", GetLastError());
                HOOK_RUNNING.store(false, Ordering::SeqCst);
                return;
            }
            eprintln!("[keyboard_hook] Global WH_KEYBOARD_LL hook initialized successfully");

            let mut msg: MSG = std::mem::zeroed();
            while GetMessageW(&mut msg, null_mut(), 0, 0) > 0 {
                // message loop keeps hook alive
            }

            UnhookWindowsHookEx(hook);
            HOOK_RUNNING.store(false, Ordering::SeqCst);
        });
    }
}

#[cfg(not(windows))]
pub mod hook {
    use tauri::AppHandle;
    pub fn start(_app: AppHandle) {}
}
