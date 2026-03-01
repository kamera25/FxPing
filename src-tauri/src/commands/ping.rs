use crate::error::FxPingError;
use crate::pinger::{PingResult, Pinger};
use crate::tcpip::hop::Hop;
use crate::tcpip::host::Host;
use crate::tcpip::payload_size::PayloadSize;
use crate::tcpip::timeout::Timeout;

#[tauri::command]
pub async fn ping_target(
    target: Host,
    remarks: String,
    timeout_ms: Timeout,
    payload_size: PayloadSize,
    ttl: Hop,
) -> Result<PingResult, FxPingError> {
    match Pinger::new(target.clone(), timeout_ms, payload_size, ttl).await {
        Ok(pinger) => pinger.ping(remarks).await,
        Err(FxPingError::DnsResolution { .. }) => Ok(PingResult {
            target,
            ip: None,
            time_ms: None,
            status: "server can't find NXDOMAIN".to_string(),
            timestamp: chrono::Local::now().format("%Y/%m/%d %H:%M:%S").to_string(),
            remarks,
        }),
        Err(e) => Err(e),
    }
}

#[tauri::command]
pub fn validate_host(_host: Host) -> Result<(), FxPingError> {
    Ok(())
}
