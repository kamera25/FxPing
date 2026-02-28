use crate::tcpip::hop::Hop;
use crate::tcpip::host::Host;
use crate::tcpip::payload_size::PayloadSize;
use crate::tcpip::rtt::Rtt;
use crate::tcpip::timeout::Timeout;
use crate::FxPingError;
use chrono::Local;
use serde::{Deserialize, Serialize};
use std::net::IpAddr;
use surge_ping::{Client, Config, PingIdentifier, PingSequence, ICMP};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PingResult {
    pub target: Host,
    pub ip: IpAddr,
    pub time_ms: Option<Rtt>,
    pub status: String,
    pub timestamp: String,
    pub remarks: String,
}

pub struct Pinger {
    target: Host,
    ip: IpAddr,
    timeout: Timeout,
    payload_size: PayloadSize,
    ttl: Hop,
}

impl Pinger {
    pub async fn new(
        target: Host,
        timeout: Timeout,
        payload_size: PayloadSize,
        ttl: Hop,
    ) -> Result<Self, FxPingError> {
        let ip = crate::resolve::resolve_host(&target.to_string())?;

        Ok(Self {
            target,
            ip,
            timeout,
            payload_size,
            ttl,
        })
    }

    pub async fn ping(&self, remarks: String) -> Result<PingResult, FxPingError> {
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
        let client = Client::new(&config).map_err(|e| FxPingError::PingFailed(e.to_string()))?;

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
                    time_ms: Some(Rtt::new(duration.as_secs_f64() * 1000.0)),
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
        let target = Host::new("127.0.0.1").unwrap();
        let timeout = Timeout::new(1000).unwrap();
        let payload_size = PayloadSize::new(32).unwrap();
        let ttl = Hop::new(64).unwrap();
        let pinger = Pinger::new(target, timeout, payload_size, ttl).await;
        assert!(pinger.is_ok());
        let pinger = pinger.unwrap();
        assert_eq!(pinger.ip, "127.0.0.1".parse::<IpAddr>().unwrap());
        assert_eq!(pinger.timeout.as_millis(), 1000);
        assert_eq!(pinger.payload_size.value(), 32);
        assert_eq!(pinger.ttl.value(), 64);
    }

    #[tokio::test]
    async fn test_pinger_new_valid_ipv6() {
        let target = Host::new("::1").unwrap();
        let timeout = Timeout::new(1000).unwrap();
        let payload_size = PayloadSize::new(32).unwrap();
        let ttl = Hop::new(64).unwrap();
        let pinger = Pinger::new(target, timeout, payload_size, ttl).await;
        assert!(pinger.is_ok());
        let pinger = pinger.unwrap();
        assert_eq!(pinger.ip, "::1".parse::<IpAddr>().unwrap());
        assert_eq!(pinger.timeout.as_millis(), 1000);
        assert_eq!(pinger.payload_size.value(), 32);
        assert_eq!(pinger.ttl.value(), 64);
    }

    #[test]
    fn test_ping_result_serialization() {
        let result = PingResult {
            target: Host::new("198.51.100.1").unwrap(),
            ip: "198.51.100.1".parse().unwrap(),
            time_ms: Some(Rtt::new(12.34)),
            status: "OK".to_string(),
            timestamp: "2024/01/01 12:00:00".to_string(),
            remarks: "test".to_string(),
        };

        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"target\":\"198.51.100.1\""));
        assert!(json.contains("\"time_ms\":12.34"));
        assert!(json.contains("\"status\":\"OK\""));
    }
}
