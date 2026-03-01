use crate::error::FxPingError;
use crate::tcpip::host::Host;
use serde::Deserialize;
use std::fs::File;
use std::io::Write;

#[derive(Debug, Deserialize)]
pub struct TargetData {
    pub host: Host,
    pub remarks: String,
}

#[tauri::command]
pub async fn load_def_targets() -> Result<Option<String>, FxPingError> {
    let exe_path = std::env::current_exe()?;
    let dir = exe_path.parent().unwrap_or(std::path::Path::new("."));
    let def_path = dir.join("ExPing.def");

    if def_path.exists() {
        let content = std::fs::read_to_string(def_path)?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn save_targets(targets: Vec<TargetData>) -> Result<(), FxPingError> {
    // 実行時パス (Executable path)
    let exe_path = std::env::current_exe()?;
    let dir = exe_path.parent().unwrap_or(std::path::Path::new("."));
    let def_path = dir.join("ExPing.def");

    let mut file = File::create(def_path)?;
    for target in targets {
        if target.remarks.is_empty() {
            writeln!(file, "{}", target.host)?;
        } else {
            writeln!(file, "{} #{}", target.host, target.remarks)?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn save_text_file(path: String, content: String) -> Result<(), FxPingError> {
    let mut file = File::create(path)?;
    file.write_all(content.as_bytes())?;
    Ok(())
}

#[tauri::command]
pub async fn append_text_file(path: String, content: String) -> Result<(), FxPingError> {
    use std::fs::OpenOptions;
    let mut file = OpenOptions::new().create(true).append(true).open(path)?;
    file.write_all(content.as_bytes())?;
    Ok(())
}

#[tauri::command]
pub fn read_file_bytes(path: String) -> Result<Vec<u8>, FxPingError> {
    Ok(std::fs::read(&path)?)
}
