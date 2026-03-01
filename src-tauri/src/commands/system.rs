use crate::error::FxPingError;

#[tauri::command]
pub fn get_platform() -> String {
    std::env::consts::OS.to_string()
}

#[tauri::command]
pub async fn launch_external_program(
    path: String,
    options: String,
    working_dir: String,
) -> Result<(), FxPingError> {
    let mut command = std::process::Command::new(&path);
    if !options.is_empty() {
        for arg in options.split_whitespace() {
            command.arg(arg);
        }
    }
    if !working_dir.is_empty() {
        command.current_dir(working_dir);
    }

    command.spawn()?;
    Ok(())
}

#[tauri::command]
pub fn play_sound_native(path: String) -> bool {
    let _ = path;
    return false;
}

#[tauri::command]
pub fn show_main_window(window: tauri::Window) {
    window.show().unwrap();
}

#[tauri::command]
pub fn is_admin() -> bool {
    #[cfg(windows)]
    {
        std::process::Command::new("net")
            .arg("session")
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    }
    #[cfg(unix)]
    {
        unsafe { libc::getuid() == 0 }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_platform() {
        let platform = get_platform();
        assert_eq!(platform, std::env::consts::OS);
    }

    #[test]
    fn test_play_sound_native() {
        assert_eq!(play_sound_native("test.wav".to_string()), false);
    }

    #[test]
    fn test_is_admin() {
        // This will depend on the environment (sudo or not)
        // But we can at least check it returns a boolean.
        let _ = is_admin();
    }
}
