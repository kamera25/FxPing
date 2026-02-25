use crate::host::Host;
use chrono::Local;
use serde::{Deserialize, Serialize};
use std::net::IpAddr;
use std::time::Duration;
use surge_ping::{Client, Config, IcmpPacket, PingIdentifier, PingSequence};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PingResult {
    pub target: String,
    pub ip: String,
    pub time_ms: Option<f64>,
    pub status: String,
    pub timestamp: String,
    pub remarks: String,
}

pub struct Pinger {
    pub target: String,
    pub ip: IpAddr,
    pub timeout: Duration,
    pub payload_size: usize,
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
                let ip_addr = match packet {
                    IcmpPacket::V4(p) => p.get_real_dest().to_string(),
                    IcmpPacket::V6(p) => p.get_real_dest().to_string(),
                };
                Ok(PingResult {
                    target: self.target.clone(),
                    ip: ip_addr,
                    time_ms: Some(duration.as_secs_f64() * 1000.0),
                    status: "OK".to_string(),
                    timestamp,
                    remarks,
                })
            }
            Err(e) => Ok(PingResult {
                target: self.target.clone(),
                ip: self.target.clone(),
                time_ms: None,
                status: format!("NG ({})", e),
                timestamp,
                remarks,
            }),
        }
    }
}
