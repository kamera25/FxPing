use serde::{Serialize, Deserialize};
use surge_ping::{Client, Config, PingIdentifier, PingSequence, IcmpPacket};
use std::net::IpAddr;
use std::time::Duration;
use chrono::Local;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PingResult {
    pub target: String,
    pub ip: String,
    pub time_ms: Option<f64>,
    pub status: String,
    pub timestamp: String,
}

#[tauri::command]
async fn ping_target(target: String) -> Result<PingResult, String> {
    let config = Config::default();
    let client = Client::new(&config).map_err(|e| e.to_string())?;
    let ip: IpAddr = target.parse().map_err(|_| format!("Invalid IP address: {}", target))?;
    
    let mut pinger = client.pinger(ip, PingIdentifier(0)).await;
    pinger.timeout(Duration::from_secs(1));
    
    let payload = [0u8; 32];
    let timestamp = Local::now().format("%Y/%m/%d %H:%M:%S").to_string();
    
    match pinger.ping(PingSequence(0), &payload).await {
        Ok((packet, duration)) => {
            let ip_addr = match packet {
                IcmpPacket::V4(p) => p.get_real_dest().to_string(),
                IcmpPacket::V6(p) => p.get_real_dest().to_string(),
            };
            Ok(PingResult {
                target,
                ip: ip_addr,
                time_ms: Some(duration.as_secs_f64() * 1000.0),
                status: "OK".to_string(),
                timestamp,
            })
        },
        Err(e) => {
            let target_clone = target.clone();
            Ok(PingResult {
                target,
                ip: target_clone,
                time_ms: None,
                status: format!("NG ({})", e),
                timestamp,
            })
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![ping_target])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
