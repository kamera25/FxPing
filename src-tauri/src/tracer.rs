mod icmp;
mod udp;

use crate::tcpip::hop::Hop;
use crate::tcpip::host::Host;
use crate::tcpip::payload_size::PayloadSize;
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
    pub ttl: u32,
    pub ip: Option<IpAddr>,
    pub fqdn: Option<String>,
    pub time_ms: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TraceResult {
    pub target: String,
    pub ping_ok: bool,
    pub hops: Vec<TraceHop>,
    pub timestamp: String,
}

pub type TraceFuture<'a> = Pin<Box<dyn Future<Output = Result<Vec<TraceHop>, String>> + Send + 'a>>;

pub trait TracerImpl: Send + Sync {
    fn trace(&self) -> TraceFuture<'_>;
}

pub struct Tracer {
    target: String,
    ip: IpAddr,
    timeout: Timeout,
    payload_size: PayloadSize,
    inner: Box<dyn TracerImpl>,
}

impl Tracer {
    pub async fn new(
        target: String,
        timeout_ms: u64,
        payload_size: usize,
        max_hops: Hop,
        protocol: String,
    ) -> Result<Self, String> {
        let payload_size = PayloadSize::new(payload_size)?;
        let timeout = Timeout::new(timeout_ms)?;
        let host = Host::new(&target)?;
        let target_str = host.to_string();

        let ip: IpAddr = match target_str.parse() {
            Ok(ip) => ip,
            Err(_) => {
                use std::net::ToSocketAddrs;
                match format!("{}:0", target_str).to_socket_addrs() {
                    Ok(mut addrs) => addrs
                        .next()
                        .map(|s| s.ip())
                        .ok_or_else(|| format!("Could not resolve target: {}", target_str))?,
                    Err(e) => {
                        return Err(format!("DNS resolution failed for {}: {}", target_str, e))
                    }
                }
            }
        };

        let inner: Box<dyn TracerImpl> = if protocol == "ICMP" {
            Box::new(ICMPTracer::new(ip, timeout, payload_size, max_hops))
        } else {
            Box::new(UDPTracer::new(ip, timeout, max_hops))
        };

        Ok(Self {
            target,
            ip,
            timeout,
            payload_size,
            inner,
        })
    }

    pub async fn trace(&self) -> Result<TraceResult, String> {
        let timestamp = Local::now().format("%Y/%m/%d %H:%M:%S").to_string();

        // Generic client for reachability check
        let config = match self.ip {
            IpAddr::V4(_) => Config::builder().kind(ICMP::V4).build(),
            IpAddr::V6(_) => Config::builder().kind(ICMP::V6).build(),
        };
        let client = Client::new(&config).map_err(|e| e.to_string())?;
        let mut pinger = client.pinger(self.ip, PingIdentifier(0)).await;
        pinger.timeout(self.timeout.value());
        let payload = vec![0u8; self.payload_size.value()];
        let ping_ok = pinger.ping(PingSequence(0), &payload).await.is_ok();

        let hops = self.inner.trace().await?;

        Ok(TraceResult {
            target: self.target.clone(),
            ping_ok,
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
        let hops = Hop::new(30).unwrap();
        let tracer = Tracer::new("127.0.0.1".to_string(), 1000, 32, hops, "ICMP".to_string()).await;
        assert!(tracer.is_ok());
        let tracer = tracer.unwrap();
        assert_eq!(tracer.ip, "127.0.0.1".parse::<IpAddr>().unwrap());
    }

    #[tokio::test]
    async fn test_tracer_new_invalid_host() {
        let hops = Hop::new(30).unwrap();
        let tracer = Tracer::new(
            "invalid...host".to_string(),
            1000,
            32,
            hops,
            "ICMP".to_string(),
        )
        .await;
        assert!(tracer.is_err());
    }

    #[test]
    fn test_trace_result_serialization() {
        let hop = TraceHop {
            ttl: 1,
            ip: Some("192.168.1.1".parse().unwrap()),
            fqdn: Some("router.local".to_string()),
            time_ms: Some(1.23),
        };
        let result = TraceResult {
            target: "8.8.8.8".to_string(),
            ping_ok: true,
            hops: vec![hop],
            timestamp: "2024/01/01 12:00:00".to_string(),
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"target\":\"8.8.8.8\""));
        assert!(json.contains("\"ttl\":1"));
        assert!(json.contains("\"fqdn\":\"router.local\""));
    }
}
