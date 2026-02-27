use serde::Deserialize;
use std::fs::File;
use std::io::Write;

mod error;
mod pinger;
mod resolve;
mod tcpip;
mod tracer;

pub use error::FxPingError;
use pinger::{PingResult, Pinger};
use tcpip::hop::Hop;
use tcpip::host::Host;
use tracer::Tracer;

// --- Security Policy ---
// このアプリケーションは、Ping（ICMP）および Traceroute 以外の外部通信を行わない設計になっています。
// フロントエンドは tauri.conf.json の CSP によって `connect-src 'none'` とされており、
// バックエンドでも HTTP/HTTPS ライブラリ（reqwest 等）の導入は制限されています。
// 新しい機能を追加する際は、不必要なネットワーク通信が発生しないよう十分注意してください。
// ------------------------

#[tauri::command]
async fn ping_target(
    target: String,
    remarks: String,
    timeout_ms: u64,
    payload_size: usize,
    ttl: u32,
) -> Result<PingResult, FxPingError> {
    let pinger = Pinger::new(target, timeout_ms, payload_size, ttl).await?;
    pinger.ping(remarks).await
}

#[tauri::command]
async fn traceroute_target(
    app: tauri::AppHandle,
    target: String,
    timeout_ms: u64,
    payload_size: usize,
    max_hops: u32,
    resolve_hostnames: bool,
    protocol: String,
) -> Result<tracer::TraceResult, FxPingError> {
    let hops = Hop::new(max_hops)?;
    let tracer = Tracer::new(
        target,
        timeout_ms,
        payload_size,
        hops,
        protocol,
        resolve_hostnames,
    )
    .await?;
    tracer.trace(app).await
}

#[tauri::command]
fn validate_host(host: String) -> Result<(), FxPingError> {
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
async fn save_targets(targets: Vec<TargetData>) -> Result<(), FxPingError> {
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
async fn save_text_file(path: String, content: String) -> Result<(), FxPingError> {
    let mut file = File::create(path)?;
    file.write_all(content.as_bytes())?;
    Ok(())
}

#[tauri::command]
async fn append_text_file(path: String, content: String) -> Result<(), FxPingError> {
    use std::fs::OpenOptions;
    let mut file = OpenOptions::new().create(true).append(true).open(path)?;
    file.write_all(content.as_bytes())?;
    Ok(())
}

#[tauri::command]
fn read_file_bytes(path: String) -> Result<Vec<u8>, FxPingError> {
    Ok(std::fs::read(&path)?)
}

#[tauri::command]
fn is_admin() -> bool {
    #[cfg(windows)]
    {
        // On Windows, checking if we have admin privileges by trying to open the SCManager
        // or by using "net session" (which is usually what people use in scripts).
        // Another common way is to check if we can open the physical drive for reading.
        // But a simple way is to use "net session" and check the exit code.
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
        // On Unix, check if the effective user ID is 0 (root).
        // However, traceroute often doesn't need root if it's suid or uses capabilities.
        // For UDP traceroute, it depends on the system.
        // In many cases, it's safer to just return true for Unix unless specifically restricted.
        unsafe { libc::getuid() == 0 }
    }
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
            append_text_file,
            get_platform,
            read_file_bytes,
            is_admin
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
