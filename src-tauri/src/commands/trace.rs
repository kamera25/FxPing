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
