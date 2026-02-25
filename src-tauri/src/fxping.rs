use serde::Deserialize;
use std::fs::File;
use std::io::Write;

mod pinger;
mod tcpip;
mod tracer;

use pinger::{PingResult, Pinger};
use tcpip::hop::Hop;
use tcpip::host::Host;
use tracer::Tracer;

#[tauri::command]
async fn ping_target(
    target: String,
    remarks: String,
    timeout_ms: u64,
    payload_size: usize,
    _ttl: u32,
) -> Result<PingResult, String> {
    let pinger = Pinger::new(target, timeout_ms, payload_size).await?;
    pinger.ping(remarks).await
}

#[tauri::command]
async fn traceroute_target(
    target: String,
    timeout_ms: u64,
    payload_size: usize,
    max_hops: u32,
    protocol: String,
) -> Result<tracer::TraceResult, String> {
    let hops = Hop::new(max_hops)?;
    let tracer = Tracer::new(target, timeout_ms, payload_size, hops, protocol).await?;
    tracer.trace().await
}

#[tauri::command]
fn validate_host(host: String) -> Result<(), String> {
    Host::new(&host).map(|_| ())
}

#[tauri::command]
fn get_platform() -> String {
    std::env::consts::OS.to_string()
}

#[derive(Debug, Deserialize)]
pub struct TargetData {
    pub host: String,
    pub remarks: String,
}

#[tauri::command]
async fn save_targets(targets: Vec<TargetData>) -> Result<(), String> {
    // 実行時パス (Executable path)
    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
    let dir = exe_path.parent().unwrap_or(std::path::Path::new("."));
    let def_path = dir.join("ExPing.def");

    let mut file = File::create(def_path).map_err(|e| e.to_string())?;
    for target in targets {
        if target.remarks.is_empty() {
            writeln!(file, "{}", target.host).map_err(|e| e.to_string())?;
        } else {
            writeln!(file, "{} #{}", target.host, target.remarks).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
async fn save_text_file(path: String, content: String) -> Result<(), String> {
    let mut file = File::create(path).map_err(|e| e.to_string())?;
    file.write_all(content.as_bytes())
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            ping_target,
            traceroute_target,
            validate_host,
            save_targets,
            save_text_file,
            get_platform,
            read_file_bytes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
