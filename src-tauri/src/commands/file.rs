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

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;
    use std::fs;

    #[tokio::test]
    async fn test_save_and_read_text_file() {
        let mut path = env::temp_dir();
        path.push("test_save.txt");
        let path_str = path.to_str().unwrap().to_string();
        let content = "Hello, World!".to_string();

        let result = save_text_file(path_str.clone(), content.clone()).await;
        assert!(result.is_ok());

        let read_result = read_file_bytes(path_str.clone());
        assert!(read_result.is_ok());
        assert_eq!(read_result.unwrap(), content.as_bytes());

        fs::remove_file(path).unwrap();
    }

    #[tokio::test]
    async fn test_append_text_file() {
        let mut path = env::temp_dir();
        path.push("test_append.txt");
        let path_str = path.to_str().unwrap().to_string();

        // Initial save
        let content1 = "First line\n".to_string();
        save_text_file(path_str.clone(), content1.clone())
            .await
            .unwrap();

        // Append
        let content2 = "Second line".to_string();
        let result = append_text_file(path_str.clone(), content2.clone()).await;
        assert!(result.is_ok());

        let read_result = read_file_bytes(path_str.clone());
        assert!(read_result.is_ok());
        let expected = format!("{}{}", content1, content2);
        assert_eq!(read_result.unwrap(), expected.as_bytes());

        fs::remove_file(path).unwrap();
    }
}
