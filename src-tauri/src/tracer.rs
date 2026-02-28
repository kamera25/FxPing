mod icmp;
mod udp;

use crate::tcpip::hop::Hop;
use crate::tcpip::host::Host;
use crate::tcpip::payload_size::PayloadSize;
use crate::tcpip::protocol::Protocol;
use crate::tcpip::rtt::Rtt;
use crate::tcpip::timeout::Timeout;
use chrono::Local;
use icmp::ICMPTracer;
use serde::{Deserialize, Serialize};
use std::future::Future;
use std::net::IpAddr;
use std::pin::Pin;
use surge_ping::{Client, Config, PingIdentifier, PingSequence, ICMP};
use udp::UDPTracer;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TraceHop {
    pub target: Host,
    pub ttl: Hop,
    pub ip: Option<IpAddr>,
    pub fqdn: Option<String>,
    pub time_ms: Option<Rtt>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TraceResult {
    pub target: Host,
    pub ping_ok: Option<bool>,
    pub hops: Vec<TraceHop>,
    pub timestamp: String,
}

use crate::FxPingError;

pub type TraceFuture<'a> =
    Pin<Box<dyn Future<Output = Result<Vec<TraceHop>, FxPingError>> + Send + 'a>>;

pub trait TracerImpl: Send + Sync {
    fn trace(&self, app: tauri::AppHandle) -> TraceFuture<'_>;
}

pub struct Tracer {
    target: Host,
    ip: IpAddr,
    timeout: Timeout,
    payload_size: PayloadSize,
    inner: Box<dyn TracerImpl>,
}

impl Tracer {
    pub async fn new(
        target: Host,
        timeout: Timeout,
        payload_size: PayloadSize,
        max_hops: Hop,
        protocol: Protocol,
        resolve_hostnames: bool,
    ) -> Result<Self, FxPingError> {
        let ip = crate::resolve::resolve_host(&target.to_string())?;

        let inner: Box<dyn TracerImpl> = if protocol.is_icmp() {
            Box::new(ICMPTracer::new(
                ip,
                timeout,
                payload_size,
                max_hops,
                resolve_hostnames,
            ))
        } else {
            Box::new(UDPTracer::new(ip, timeout, max_hops, resolve_hostnames))
        };

        Ok(Self {
            target,
            ip,
            timeout,
            payload_size,
            inner,
        })
    }

    pub async fn trace(&self, app: tauri::AppHandle) -> Result<TraceResult, FxPingError> {
        use tauri::Emitter;

        let timestamp = Local::now().format("%Y/%m/%d %H:%M:%S").to_string();

        let _ = app.emit(
            "trace-start",
            TraceResult {
                target: self.target.clone(),
                ping_ok: None,
                hops: Vec::new(),
                timestamp: timestamp.clone(),
            },
        );

        // Generic client for reachability check
        let config = match self.ip {
            IpAddr::V4(_) => Config::builder().kind(ICMP::V4).build(),
            IpAddr::V6(_) => Config::builder().kind(ICMP::V6).build(),
        };
        let client = Client::new(&config).map_err(|e| FxPingError::TraceFailed(e.to_string()))?;
        let mut pinger = client.pinger(self.ip, PingIdentifier(0)).await;
        pinger.timeout(self.timeout.value());
        let payload = vec![0u8; self.payload_size.value()];
        let ping_ok = pinger.ping(PingSequence(0), &payload).await.is_ok();

        let _ = app.emit(
            "trace-ping",
            serde_json::json!({
                "target": self.target.to_string(),
                "ping_ok": ping_ok,
            }),
        );

        let hops = self.inner.trace(app).await?;

        Ok(TraceResult {
            target: self.target.clone(),
            ping_ok: Some(ping_ok),
            hops,
            timestamp,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_tracer_new_valid() {
        let target = Host::new("127.0.0.1").unwrap();
        let timeout = Timeout::new(1000).unwrap();
        let payload_size = PayloadSize::new(32).unwrap();
        let hops = Hop::new(30).unwrap();
        let tracer = Tracer::new(target, timeout, payload_size, hops, Protocol::icmp(), true).await;
        assert!(tracer.is_ok());
        let tracer = tracer.unwrap();
        assert_eq!(tracer.ip, "127.0.0.1".parse::<IpAddr>().unwrap());
    }

    #[test]
    fn test_trace_result_serialization() {
        let hop = TraceHop {
            target: Host::new("8.8.8.8").unwrap(),
            ttl: Hop::new(1).unwrap(),
            ip: Some("192.168.1.1".parse().unwrap()),
            fqdn: Some("router.local".to_string()),
            time_ms: Some(Rtt::new(1.23)),
        };
        let result = TraceResult {
            target: Host::new("8.8.8.8").unwrap(),
            ping_ok: Some(true),
            hops: vec![hop],
            timestamp: "2024/01/01 12:00:00".to_string(),
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"target\":\"8.8.8.8\""));
        assert!(json.contains("\"ttl\":1"));
        assert!(json.contains("\"fqdn\":\"router.local\""));
    }
}
