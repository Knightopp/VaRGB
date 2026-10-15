use hidapi::{HidApi, HidDevice};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

pub const K630_VID: u16 = 0x320F;
pub const K630_PID: u16 = 0x5000;
pub const TARGET_INTERFACE: i32 = 1;
pub const TARGET_USAGE: u16 = 0x0092;
pub const RGB_PAYLOAD_LEN: usize = 336;
pub const RGB_CHUNK_LEN: usize = 56;
pub const RGB_PACKET_COUNT: usize = RGB_PAYLOAD_LEN / RGB_CHUNK_LEN;
pub const HID_REPORT_LEN: usize = 64;
pub const SOFTWARE_MODE_REPORT: [u8; HID_REPORT_LEN] = {
    let mut report = [0; HID_REPORT_LEN];
    report[0] = 0x04;
    report[1] = 0x8c;
    report[2] = 0x00;
    report[3] = 0x0b;
    report[4] = 0x30;
    report[5] = 0x50;
    report[6] = 0x01;
    report
};


// Index-aligned with the SignalRGB vLedNames/vLeds/vLedPositions arrays.
// Names use the existing frontend key IDs; coordinates come from layout.rs on
// the frontend and are intentionally not derived from the hardware LED index.
pub const K630_KEY_IDS: [&str; 61] = [
    "esc",
    "num_1",
    "num_2",
    "num_3",
    "num_4",
    "num_5",
    "num_6",
    "num_7",
    "num_8",
    "num_9",
    "num_0",
    "minus",
    "equal",
    "backspace",
    "tab",
    "q",
    "w",
    "e",
    "r",
    "t",
    "y",
    "u",
    "i",
    "o",
    "p",
    "bracket_l",
    "bracket_r",
    "backslash",
    "caps",
    "a",
    "s",
    "d",
    "f",
    "g",
    "h",
    "j",
    "k",
    "l",
    "semicolon",
    "quote",
    "enter",
    "shift_l",
    "z",
    "x",
    "c",
    "v",
    "b",
    "n",
    "m",
    "comma",
    "period",
    "slash",
    "shift_r",
    "ctrl_l",
    "win",
    "alt_l",
    "space",
    "alt_r",
    "fn",
    "menu",
    "ctrl_r",
];

pub const K630_LED_INDICES: [u8; 61] = [
    1, 9, 17, 25, 33, 41, 49, 57, 65, 73, 81, 89, 97, 105, 2, 10, 18, 26, 34, 42, 50, 58, 66, 74,
    82, 90, 98, 106, 3, 11, 19, 27, 35, 43, 51, 59, 67, 75, 83, 91, 107, 4, 20, 28, 36, 44, 52, 60,
    68, 76, 84, 92, 108, 5, 13, 21, 45, 77, 85, 93, 101,
];


#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DeviceStatus {
    pub connected: bool,
    pub vendor_id: u16,
    pub product_id: u16,
    pub device_name: String,
    pub path: String,
    pub interface_number: i32,
    pub usage: u16,
    pub manufacturer: String,
}

fn is_verified_endpoint(interface_number: i32, usage: u16) -> bool {
    interface_number == TARGET_INTERFACE && usage == TARGET_USAGE
}

pub fn packet_checksum(chunk: &[u8], packet_index: usize) -> Result<u16, String> {
    if chunk.len() != RGB_CHUNK_LEN || packet_index >= RGB_PACKET_COUNT {
        return Err("K630 checksum requires a 56-byte chunk and packet index 0..5".into());
    }
    let sum: u32 = chunk.iter().map(|&byte| u32::from(byte)).sum();
    let adjustment = if packet_index >= 5 {
        ((packet_index - 5) * RGB_CHUNK_LEN) as u32 + 99
    } else {
        (packet_index * RGB_CHUNK_LEN) as u32 + 74
    };
    Ok((sum + adjustment) as u16)
}

pub fn build_rgb_packets(
    rgb_data: &[u8],
) -> Result<[[u8; HID_REPORT_LEN]; RGB_PACKET_COUNT], String> {
    if rgb_data.len() != RGB_PAYLOAD_LEN {
        return Err(format!(
            "RGB payload must be exactly {RGB_PAYLOAD_LEN} bytes"
        ));
    }

    let mut packets = [[0u8; HID_REPORT_LEN]; RGB_PACKET_COUNT];
    for (index, packet) in packets.iter_mut().enumerate() {
        let start = index * RGB_CHUNK_LEN;
        let chunk = &rgb_data[start..start + RGB_CHUNK_LEN];
        let checksum = packet_checksum(chunk, index)?;
        let offset = start as u16;
        packet[..8].copy_from_slice(&[
            0x04,
            checksum as u8,
            (checksum >> 8) as u8,
            0x12,
            RGB_CHUNK_LEN as u8,
            offset as u8,
            (offset >> 8) as u8,
            0x00,
        ]);
        packet[8..].copy_from_slice(chunk);
    }
    Ok(packets)
}

pub fn build_rgb_payload(colors: &[(String, [u8; 3])]) -> Result<[u8; RGB_PAYLOAD_LEN], String> {
    let mut payload = [0u8; RGB_PAYLOAD_LEN];
    for (id, color) in colors {
        let slot = K630_KEY_IDS
            .iter()
            .position(|key_id| *key_id == id.as_str())
            .ok_or_else(|| format!("Unknown K630 key id: {id}"))?;
        let offset = usize::from(K630_LED_INDICES[slot]) * 3;
        payload[offset..offset + 3].copy_from_slice(color);
    }
    Ok(payload)
}

pub struct DeviceManager {
    api: Mutex<Option<HidApi>>,
}

impl DeviceManager {
    pub fn new() -> Self {
        Self {
            api: Mutex::new(HidApi::new().ok()),
        }
    }

    fn with_api<T>(&self, f: impl FnOnce(&mut HidApi) -> T) -> Result<T, String> {
        let mut guard = self
            .api
            .lock()
            .map_err(|_| "HID device manager lock is poisoned")?;
        if guard.is_none() {
            *guard = Some(HidApi::new().map_err(|e| format!("Failed to initialize HID API: {e}"))?);
        }
        let api = guard.as_mut().expect("HID API initialized above");
        api.refresh_devices()
            .map_err(|e| format!("Failed to refresh HID devices: {e}"))?;
        Ok(f(api))
    }

    pub fn scan_device(&self) -> DeviceStatus {
        let result = self.with_api(|api| {
            let mut matching = api
                .device_list()
                .filter(|d| d.vendor_id() == K630_VID && d.product_id() == K630_PID);
            let verified = matching
                .find(|d| d.interface_number() == TARGET_INTERFACE && d.usage() == TARGET_USAGE);
            let selected = verified.or_else(|| {
                api.device_list()
                    .find(|d| d.vendor_id() == K630_VID && d.product_id() == K630_PID)
            });
            selected.map(|d| DeviceStatus {
                connected: is_verified_endpoint(d.interface_number(), d.usage()),
                vendor_id: d.vendor_id(),
                product_id: d.product_id(),
                device_name: "Redragon K630 RGB".into(),
                path: d.path().to_string_lossy().into_owned(),
                interface_number: d.interface_number(),
                usage: d.usage(),
                manufacturer: d
                    .manufacturer_string()
                    .unwrap_or("Unknown manufacturer")
                    .to_owned(),
            })
        });
        result.ok().flatten().unwrap_or(DeviceStatus {
            connected: false,
            vendor_id: K630_VID,
            product_id: K630_PID,
            device_name: "Redragon K630 RGB".into(),
            path: String::new(),
            interface_number: -1,
            usage: 0,
            manufacturer: String::new(),
        })
    }

    pub fn open_k630(&self) -> Result<HidDevice, String> {
        self.with_api(|api| {
            let endpoint = api.device_list().find(|d|
                d.vendor_id() == K630_VID && d.product_id() == K630_PID &&
                is_verified_endpoint(d.interface_number(), d.usage())
            ).ok_or_else(|| "K630 detected, but no endpoint matches interface 1 and usage 0x0092; refusing to write to an unverified interface".to_string())?;
            endpoint.open_device(api).map_err(|e| format!("Could not open verified K630 HID interface (another application may own it): {e}"))
        })?
    }

    pub fn init_software_mode(&self, device: &HidDevice) -> Result<(), String> {
        let written = device.write(&SOFTWARE_MODE_REPORT).map_err(|e| {
            format!("Failed to send K630 software-mode report (report ID 0x04): {e}")
        })?;
        if written != HID_REPORT_LEN {
            return Err(format!(
                "Short HID write for software-mode report: wrote {written} of {HID_REPORT_LEN} bytes"
            ));
        }
        Ok(())
    }
    pub fn send_rgb_frame(&self, device: &HidDevice, rgb_data: &[u8]) -> Result<(), String> {
        let packets = build_rgb_packets(rgb_data)?;
        for (index, packet) in packets.iter().enumerate() {
            let written = device
                .write(packet)
                .map_err(|e| format!("HID write error on K630 packet {index}: {e}"))?;
            if written != HID_REPORT_LEN {
                return Err(format!(
                    "Short HID write on K630 packet {index}: wrote {written} of {HID_REPORT_LEN} bytes"
                ));
            }
            if index + 1 < RGB_PACKET_COUNT {
                thread::sleep(Duration::from_millis(1));
            }
        }
        Ok(())
    }
}


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mapping_has_61_unique_keys_and_leds_with_valid_payload_offsets() {
        assert_eq!(K630_KEY_IDS.len(), 61);
        assert_eq!(K630_LED_INDICES.len(), 61);
        let mut ids = K630_KEY_IDS.to_vec();
        ids.sort_unstable();
        ids.dedup();
        assert_eq!(ids.len(), 61);
        let mut leds = K630_LED_INDICES.to_vec();
        leds.sort_unstable();
        leds.dedup();
        assert_eq!(leds.len(), 61);
        assert!(
            K630_LED_INDICES
                .iter()
                .all(|&led| usize::from(led) * 3 + 2 < RGB_PAYLOAD_LEN)
        );
        assert_eq!(K630_KEY_IDS[0], "esc");
        assert_eq!(K630_KEY_IDS[56], "space");
        assert_eq!(K630_LED_INDICES[56], 45);
    }

    #[test]
    fn reference_initialization_report_has_expected_bytes_and_length() {
        assert_eq!(
            &SOFTWARE_MODE_REPORT[..7],
            &[0x04, 0x8c, 0, 0x0b, 0x30, 0x50, 1]
        );
        assert!(SOFTWARE_MODE_REPORT[7..].iter().all(|&byte| byte == 0));
        assert_eq!(SOFTWARE_MODE_REPORT.len(), 64);
    }

    #[test]
    fn builds_six_exact_reports_with_reference_headers_offsets_and_checksums() {
        let payload = [0u8; RGB_PAYLOAD_LEN];
        let packets = build_rgb_packets(&payload).unwrap();
        assert_eq!(packets.len(), 6);
        let adjustments = [74u16, 130, 186, 242, 298, 99];
        for (index, packet) in packets.iter().enumerate() {
            let offset = (index * 56) as u16;
            assert_eq!(packet.len(), 64);
            assert_eq!(packet[0], 0x04);
            assert_eq!(
                u16::from_le_bytes([packet[1], packet[2]]),
                adjustments[index]
            );
            assert_eq!(
                &packet[3..8],
                &[0x12, 56, offset as u8, (offset >> 8) as u8, 0]
            );
            assert_eq!(&packet[8..], &[0; 56]);
        }
    }

    #[test]
    fn checksum_includes_data_sum_and_rejects_invalid_chunk() {
        let mut chunk = [0u8; RGB_CHUNK_LEN];
        chunk[0] = 255;
        assert_eq!(packet_checksum(&chunk, 2).unwrap(), 441);
        assert!(packet_checksum(&[0; 55], 0).is_err());
        assert!(packet_checksum(&chunk, 6).is_err());
    }

    #[test]
    fn payload_uses_key_to_led_index_times_three() {
        let payload = build_rgb_payload(&[("space".into(), [12, 34, 56])]).unwrap();
        assert_eq!(&payload[45 * 3..45 * 3 + 3], &[12, 34, 56]);
        assert_eq!(payload.len(), 336);
        assert!(build_rgb_payload(&[("not-a-key".into(), [1, 2, 3])]).is_err());
    }

    #[test]
    fn endpoint_must_match_both_interface_and_usage() {
        assert!(is_verified_endpoint(1, 0x0092));
        assert!(!is_verified_endpoint(1, 0x0006));
        assert!(!is_verified_endpoint(0, 0x0092));
    }
}
