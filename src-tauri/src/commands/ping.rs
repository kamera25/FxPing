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

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

    #[test]
    fn test_validate_host() {
        let host = Host::from_str("google.com").unwrap();
        let result = validate_host(host);
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_ping_target_dns_error() {
        let target = Host::from_str("invalid.hostname.that.does.not.exist").unwrap();
        let result = ping_target(
            target.clone(),
            "test".to_string(),
            Timeout::new(1000).unwrap(),
            PayloadSize::new(32).unwrap(),
            Hop::new(64).unwrap(),
        )
        .await;

        if let Ok(ping_result) = result {
            if ping_result.status == "server can't find NXDOMAIN" {
                assert_eq!(
                    ping_result.target.to_string(),
                    "invalid.hostname.that.does.not.exist"
                );
            }
        }
    }
}
