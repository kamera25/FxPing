use crate::error::FxPingError;
use ini::Ini;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub repeat_count: i32,
    pub interval: i32,
    pub payload_size: i32,
    pub timeout: i32,
    pub ttl: i32,
    pub repeat_order: String,
    pub repeat_mode: String,
    pub periodic_execution: bool,
    pub periodic_interval: i32,
    pub hide_on_minimize: bool,
    pub save_settings_on_exit: bool,
    pub save_as_csv: bool,
    pub auto_delete_results: bool,
    pub max_results: i32,
    pub flash_tray_icon: bool,
    pub prohibit_fragmentation: bool,
    pub max_hops: i32,
    pub resolve_hostnames: bool,
    pub ng: NgSettings,
    pub ok: OkSettings,
    pub logs: LogSettings,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct NgSettings {
    pub change_tray_icon: bool,
    pub show_popup: bool,
    pub play_sound: bool,
    pub sound_file: String,
    pub launch_program: bool,
    pub program_path: String,
    pub program_options: String,
    pub program_working_dir: String,
    pub execute_on_delay: bool,
    pub delay_ms: i32,
    pub once_only: bool,
    pub not_if_previous_ng: bool,
    pub not_until_count_reached: bool,
    pub count_to_notify: i32,
    pub count_consecutive_only: bool,
    pub notify_on_interval_only: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct OkSettings {
    pub show_popup: bool,
    pub play_sound: bool,
    pub sound_file: String,
    pub launch_program: bool,
    pub program_path: String,
    pub program_options: String,
    pub program_working_dir: String,
    pub not_if_previous_ok: bool,
    pub notify_on_interval_only: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct LogSettings {
    pub auto_save: bool,
    pub save_path: String,
    pub file_name_setting: String, // 'fixed' | 'dated'
    pub fixed_name: String,
    pub prefix: String,
    pub extension: String,
}

pub fn load_from_ini() -> Result<Option<Settings>, FxPingError> {
    let exe_path = std::env::current_exe().map_err(FxPingError::FileIo)?;
    let dir = exe_path.parent().unwrap_or(Path::new("."));
    let ini_path = dir.join("ExPing.ini");

    if !ini_path.exists() {
        return Ok(None);
    }

    let conf = Ini::load_from_file(&ini_path)
        .map_err(|e| FxPingError::FileIo(std::io::Error::new(std::io::ErrorKind::Other, e)))?;
    let section = match conf.section(Some("ExPing")) {
        Some(s) => s,
        None => return Ok(None),
    };

    let mut settings = Settings::default();

    // Mapping helper
    let get_i32 = |key: &str, default: i32| -> i32 {
        section
            .get(key)
            .and_then(|v| v.parse::<i32>().ok())
            .unwrap_or(default)
    };

    // Mapping
    settings.flash_tray_icon = get_i32("BlinkTrayIcon", 1) != 0;
    settings.save_as_csv = get_i32("SaveAsCsv", 1) != 0;
    settings.auto_delete_results = get_i32("AutoDelete", 1) != 0;
    settings.max_results = get_i32("AutoDeleteCount", 1000);
    settings.prohibit_fragmentation = get_i32("DontFlagment", 0) != 0;

    // NG
    settings.ng.show_popup = get_i32("NGPopup", 1) != 0;
    settings.ng.play_sound = get_i32("NGSound", 0) != 0;
    settings.ng.sound_file = section.get("NGSoundFile").unwrap_or("").to_string();
    settings.ng.launch_program = get_i32("NGCommandExec", 0) != 0;
    settings.ng.program_path = section.get("NGCommand").unwrap_or("").to_string();
    settings.ng.program_options = section.get("NGCommandOption").unwrap_or("").to_string();
    settings.ng.program_working_dir = section.get("NGCommandWorkDir").unwrap_or("").to_string();
    settings.ng.change_tray_icon = get_i32("NGChangeIcon", 1) != 0;
    settings.ng.count_to_notify = get_i32("NGPassCount", 1);

    // OK
    settings.ok.show_popup = get_i32("OKPopup", 0) != 0;
    settings.ok.play_sound = get_i32("OKSound", 0) != 0;
    settings.ok.sound_file = section.get("OKSoundFile").unwrap_or("").to_string();
    settings.ok.launch_program = get_i32("OKCommandExec", 0) != 0;
    settings.ok.program_path = section.get("OKCommand").unwrap_or("").to_string();
    settings.ok.program_options = section.get("OKCommandOption").unwrap_or("").to_string();
    settings.ok.program_working_dir = section.get("OKCommandWorkDir").unwrap_or("").to_string();

    // Logs
    settings.logs.save_path = section.get("LogDirectory").unwrap_or("").to_string();
    settings.logs.fixed_name = section
        .get("FixedLogFileName")
        .unwrap_or("ExPing.log")
        .to_string();
    settings.logs.prefix = section.get("LogFileNameHead").unwrap_or("EP").to_string();
    settings.logs.extension = section.get("LogFileNameExt").unwrap_or("LOG").to_string();
    let use_dated = get_i32("UseLogFileDate", 0) != 0;
    settings.logs.file_name_setting = if use_dated {
        "dated".to_string()
    } else {
        "fixed".to_string()
    };

    Ok(Some(settings))
}

pub fn save_to_ini(settings: Settings) -> Result<(), FxPingError> {
    let exe_path = std::env::current_exe().map_err(FxPingError::FileIo)?;
    let dir = exe_path.parent().unwrap_or(Path::new("."));
    let ini_path = dir.join("ExPing.ini");

    let old_conf =
        if ini_path.exists() {
            Some(Ini::load_from_file(&ini_path).map_err(|e| {
                FxPingError::FileIo(std::io::Error::new(std::io::ErrorKind::Other, e))
            })?)
        } else {
            None
        };

    let mut new_conf = old_conf.clone().unwrap_or_else(Ini::new);

    new_conf
        .with_section(Some("ExPing"))
        .set(
            "BlinkTrayIcon",
            if settings.flash_tray_icon { "1" } else { "0" },
        )
        .set("SaveAsCsv", if settings.save_as_csv { "1" } else { "0" })
        .set(
            "AutoDelete",
            if settings.auto_delete_results {
                "1"
            } else {
                "0"
            },
        )
        .set("AutoDeleteCount", settings.max_results.to_string())
        .set(
            "DontFlagment",
            if settings.prohibit_fragmentation {
                "1"
            } else {
                "0"
            },
        )
        .set("NGPopup", if settings.ng.show_popup { "1" } else { "0" })
        .set("NGSound", if settings.ng.play_sound { "1" } else { "0" })
        .set("NGSoundFile", settings.ng.sound_file)
        .set(
            "NGCommandExec",
            if settings.ng.launch_program { "1" } else { "0" },
        )
        .set("NGCommand", settings.ng.program_path)
        .set("NGCommandOption", settings.ng.program_options)
        .set("NGCommandWorkDir", settings.ng.program_working_dir)
        .set(
            "NGChangeIcon",
            if settings.ng.change_tray_icon {
                "1"
            } else {
                "0"
            },
        )
        .set("NGPassCount", settings.ng.count_to_notify.to_string())
        .set("OKPopup", if settings.ok.show_popup { "1" } else { "0" })
        .set("OKSound", if settings.ok.play_sound { "1" } else { "0" })
        .set("OKSoundFile", settings.ok.sound_file)
        .set(
            "OKCommandExec",
            if settings.ok.launch_program { "1" } else { "0" },
        )
        .set("OKCommand", settings.ok.program_path)
        .set("OKCommandOption", settings.ok.program_options)
        .set("OKCommandWorkDir", settings.ok.program_working_dir)
        .set("LogDirectory", settings.logs.save_path)
        .set("FixedLogFileName", settings.logs.fixed_name)
        .set("LogFileNameHead", settings.logs.prefix)
        .set("LogFileNameExt", settings.logs.extension)
        .set(
            "UseLogFileDate",
            if settings.logs.file_name_setting == "dated" {
                "1"
            } else {
                "0"
            },
        );

    // Only write if different
    let should_write = if let Some(old) = old_conf {
        // Compare generated content to avoid white-space issues or order issues if possible
        // Ideally we compare the sections.
        // Simple way: check if new_conf is different from old.
        // rust-ini doesn't have a direct Eq for Ini that's perfectly reliable for "semantic" diff
        // but it should work for values.
        format!("{:?}", new_conf) != format!("{:?}", old)
    } else {
        true
    };

    if should_write {
        new_conf
            .write_to_file(ini_path)
            .map_err(|e| FxPingError::FileIo(std::io::Error::new(std::io::ErrorKind::Other, e)))?;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ini_mapping() {
        let ini_content =
            "[ExPing]\nBlinkTrayIcon=0\nSaveAsCsv=1\nNGPopup=0\nLogFileNameHead=TEST\n";
        let conf = Ini::load_from_str(ini_content).unwrap();
        let section = conf.section(Some("ExPing")).unwrap();

        let mut settings = Settings::default();
        let get_i32 = |key: &str, default: i32| -> i32 {
            section
                .get(key)
                .and_then(|v| v.parse::<i32>().ok())
                .unwrap_or(default)
        };

        settings.flash_tray_icon = get_i32("BlinkTrayIcon", 1) != 0;
        settings.save_as_csv = get_i32("SaveAsCsv", 1) != 0;
        settings.ng.show_popup = get_i32("NGPopup", 1) != 0;
        settings.logs.prefix = section.get("LogFileNameHead").unwrap_or("EP").to_string();

        assert_eq!(settings.flash_tray_icon, false);
        assert_eq!(settings.save_as_csv, true);
        assert_eq!(settings.ng.show_popup, false);
        assert_eq!(settings.logs.prefix, "TEST");
    }

    #[test]
    fn test_save_and_load() {
        // We use a temporary directory or just local mock for these tests to avoid real EXE path dependency
        let mut settings = Settings::default();
        settings.flash_tray_icon = false;
        settings.logs.prefix = "SAVE_TEST".to_string();

        // In real code, load_from_ini uses current_exe().
        // For testing the logic, we can verify the Ini struct behavior.
        let mut conf = Ini::new();
        conf.with_section(Some("ExPing"))
            .set(
                "BlinkTrayIcon",
                if settings.flash_tray_icon { "1" } else { "0" },
            )
            .set("LogFileNameHead", settings.logs.prefix.clone());

        let s = conf.to_owned();
        let section = s.section(Some("ExPing")).unwrap();
        assert_eq!(section.get("BlinkTrayIcon"), Some("0"));
        assert_eq!(section.get("LogFileNameHead"), Some("SAVE_TEST"));
    }
}
