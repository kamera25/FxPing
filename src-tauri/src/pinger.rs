use crate::tcpip::host::Host;
use chrono::Local;
use serde::{Deserialize, Serialize};
use std::net::IpAddr;
use std::time::Duration;
use surge_ping::{Client, Config, PingIdentifier, PingSequence};

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
    timeout: Duration,
    payload_size: usize,
}

impl Pinger {
    pub async fn new(target: String, timeout_ms: u64, payload_size: usize) -> Result<Self, String> {
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

        Ok(Self {
            target,
            ip,
            timeout: Duration::from_millis(timeout_ms),
            payload_size,
        })
    }

    pub async fn ping(&self, remarks: String) -> Result<PingResult, String> {
        let config = Config::default();
        let client = Client::new(&config).map_err(|e| e.to_string())?;

        let mut pinger = client.pinger(self.ip, PingIdentifier(0)).await;
        pinger.timeout(self.timeout);

        let payload = vec![0u8; self.payload_size];
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
        let pinger = Pinger::new("127.0.0.1".to_string(), 1000, 32).await;
        assert!(pinger.is_ok());
        let pinger = pinger.unwrap();
        assert_eq!(pinger.ip, "127.0.0.1".parse::<IpAddr>().unwrap());
        assert_eq!(pinger.timeout, Duration::from_millis(1000));
        assert_eq!(pinger.payload_size, 32);
    }

    #[tokio::test]
    async fn test_pinger_new_invalid_target() {
        let pinger = Pinger::new("invalid...host".to_string(), 1000, 32).await;
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
