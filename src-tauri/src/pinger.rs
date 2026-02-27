use crate::tcpip::hop::Hop;
use crate::tcpip::payload_size::PayloadSize;
use crate::tcpip::timeout::Timeout;
use chrono::Local;
use serde::{Deserialize, Serialize};
use std::net::IpAddr;
use surge_ping::{Client, Config, PingIdentifier, PingSequence, ICMP};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PingResult {
    pub target: String,
    pub ip: IpAddr,
    pub time_ms: Option<f64>,
    pub status: String,
    pub timestamp: String,
    pub remarks: String,
}

pub struct Pinger {
    target: String,
    ip: IpAddr,
    timeout: Timeout,
    payload_size: PayloadSize,
    ttl: Hop,
}

impl Pinger {
    pub async fn new(
        target: String,
        timeout_ms: u64,
        payload_size: usize,
        ttl: u32,
    ) -> Result<Self, String> {
        let payload_size = PayloadSize::new(payload_size)?;
        let timeout = Timeout::new(timeout_ms)?;
        let ttl = Hop::new(ttl)?;
        let host = crate::tcpip::host::Host::new(&target)?;
        let target_str = host.to_string();
        let ip = crate::resolve::resolve_host(&target_str)?;

        Ok(Self {
            target,
            ip,
            timeout,
            payload_size,
            ttl,
        })
    }

    pub async fn ping(&self, remarks: String) -> Result<PingResult, String> {
        let config = match self.ip {
            IpAddr::V4(_) => Config::builder()
                .kind(ICMP::V4)
                .ttl(self.ttl.value())
                .build(),
            IpAddr::V6(_) => Config::builder()
                .kind(ICMP::V6)
                .ttl(self.ttl.value())
                .build(),
        };
        let client = Client::new(&config).map_err(|e| e.to_string())?;

        let mut pinger = client.pinger(self.ip, PingIdentifier(0)).await;
        pinger.timeout(self.timeout.value());

        let payload = vec![0u8; self.payload_size.value()];
        let timestamp = Local::now().format("%Y/%m/%d %H:%M:%S").to_string();

        match pinger.ping(PingSequence(0), &payload).await {
            Ok((packet, duration)) => {
                let ip = match packet {
                    surge_ping::IcmpPacket::V4(p) => p.get_real_dest().into(),
                    surge_ping::IcmpPacket::V6(p) => p.get_real_dest().into(),
                };
                Ok(PingResult {
                    target: self.target.clone(),
                    ip,
                    time_ms: Some(duration.as_secs_f64() * 1000.0),
                    status: "OK".to_string(),
                    timestamp,
                    remarks,
                })
            }
            Err(e) => Ok(PingResult {
                target: self.target.clone(),
                ip: self.ip,
                time_ms: None,
                status: format!("NG ({})", e),
                timestamp,
                remarks,
            }),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::IpAddr;

    #[tokio::test]
    async fn test_pinger_new_valid_ip() {
        let pinger = Pinger::new("127.0.0.1".to_string(), 1000, 32, 64).await;
        assert!(pinger.is_ok());
        let pinger = pinger.unwrap();
        assert_eq!(pinger.ip, "127.0.0.1".parse::<IpAddr>().unwrap());
        assert_eq!(pinger.timeout.as_millis(), 1000);
        assert_eq!(pinger.payload_size.value(), 32);
        assert_eq!(pinger.ttl.value(), 64);
    }

    #[tokio::test]
    async fn test_pinger_new_valid_ipv6() {
        let pinger = Pinger::new("::1".to_string(), 1000, 32, 64).await;
        assert!(pinger.is_ok());
        let pinger = pinger.unwrap();
        assert_eq!(pinger.ip, "::1".parse::<IpAddr>().unwrap());
        assert_eq!(pinger.timeout.as_millis(), 1000);
        assert_eq!(pinger.payload_size.value(), 32);
        assert_eq!(pinger.ttl.value(), 64);
    }

    #[tokio::test]
    async fn test_pinger_new_invalid_target() {
        let pinger = Pinger::new("invalid...host".to_string(), 1000, 32, 64).await;
        assert!(pinger.is_err());
    }

    #[test]
    fn test_ping_result_serialization() {
        let result = PingResult {
            target: "8.8.8.8".to_string(),
            ip: "8.8.8.8".parse().unwrap(),
            time_ms: Some(12.34),
            status: "OK".to_string(),
            timestamp: "2024/01/01 12:00:00".to_string(),
            remarks: "test".to_string(),
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"target\":\"8.8.8.8\""));
        assert!(json.contains("\"time_ms\":12.34"));
        assert!(json.contains("\"status\":\"OK\""));
    }
}
