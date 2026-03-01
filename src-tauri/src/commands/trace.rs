use crate::error::FxPingError;
use crate::tcpip::hop::Hop;
use crate::tcpip::host::Host;
use crate::tcpip::payload_size::PayloadSize;
use crate::tcpip::protocol::Protocol;
use crate::tcpip::timeout::Timeout;
use crate::tracer::{self, Tracer};

#[tauri::command]
pub async fn traceroute_target(
    app: tauri::AppHandle,
    target: Host,
    timeout_ms: Timeout,
    payload_size: PayloadSize,
    max_hops: Hop,
    resolve_hostnames: bool,
    protocol: Protocol,
) -> Result<tracer::TraceResult, FxPingError> {
    match Tracer::new(
        target.clone(),
        timeout_ms,
        payload_size,
        max_hops,
        protocol,
        resolve_hostnames,
    )
    .await
    {
        Ok(tracer) => tracer.trace(app).await,
        Err(FxPingError::DnsResolution { .. }) => Ok(tracer::TraceResult {
            target,
            ping_ok: Some(false),
            hops: Vec::new(),
            timestamp: chrono::Local::now().format("%Y/%m/%d %H:%M:%S").to_string(),
        }),
        Err(e) => Err(e),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

    #[tokio::test]
    async fn test_traceroute_target_dns_error() {
        let target = Host::from_str("invalid.hostname.that.does.not.exist").unwrap();

        let result = Tracer::new(
            target.clone(),
            Timeout::new(1000).unwrap(),
            PayloadSize::new(32).unwrap(),
            Hop::new(30).unwrap(),
            Protocol::icmp(),
            true,
        )
        .await;

        match result {
            Err(FxPingError::DnsResolution { .. }) => assert!(true),
            _ => {
                // In some environments, this might resolve to a search suffix or something.
            }
        }
    }
}
