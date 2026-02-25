use crate::host::Host;
use chrono::Local;
use serde::{Deserialize, Serialize};
use std::net::IpAddr;
use std::str::FromStr;
use std::time::Duration;
use surge_ping::{Client, Config, PingIdentifier, PingSequence};

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

pub struct Tracer {
    target: String,
    ip: IpAddr,
    timeout: Duration,
    payload_size: usize,
    max_hops: u32,
    protocol: String,
}

impl Tracer {
    pub async fn new(
        target: String,
        timeout_ms: u64,
        payload_size: usize,
        max_hops: u32,
        protocol: String,
    ) -> Result<Self, String> {
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
            max_hops,
            protocol,
        })
    }

    pub async fn trace(&self) -> Result<TraceResult, String> {
        let timestamp = Local::now().format("%Y/%m/%d %H:%M:%S").to_string();
        let config = Config::default();
        let client = Client::new(&config).map_err(|e| e.to_string())?;

        // First, check if reachable (always use ICMP for initial check)
        let mut pinger = client.pinger(self.ip, PingIdentifier(0)).await;
        pinger.timeout(self.timeout);
        let payload = vec![0u8; self.payload_size];

        let ping_ok = pinger.ping(PingSequence(0), &payload).await.is_ok();

        let mut hops = Vec::new();

        if self.protocol == "ICMP" {
            // Trace Route via ICMP
            for ttl in 1..=self.max_hops {
                let hop_config = Config::builder().ttl(ttl as u32).build();
                let hop_client = Client::new(&hop_config).map_err(|e| e.to_string())?;
                let mut hop_pinger = hop_client.pinger(self.ip, PingIdentifier(ttl as u16)).await;
                hop_pinger.timeout(self.timeout);

                match hop_pinger.ping(PingSequence(ttl as u16), &payload).await {
                    Ok((packet, duration)) => {
                        let hop_ip = match packet {
                            surge_ping::IcmpPacket::V4(p) => p.get_real_dest().into(),
                            surge_ping::IcmpPacket::V6(p) => p.get_real_dest().into(),
                        };
                        let fqdn = dns_lookup::lookup_addr(&hop_ip).ok();

                        hops.push(TraceHop {
                            ttl,
                            ip: Some(hop_ip),
                            fqdn,
                            time_ms: Some(duration.as_secs_f64() * 1000.0),
                        });

                        if hop_ip == self.ip {
                            break;
                        }
                    }
                    Err(_) => {
                        hops.push(TraceHop {
                            ttl,
                            ip: None,
                            fqdn: None,
                            time_ms: None,
                        });
                    }
                }
            }
        } else {
            // Trace Route via UDP
            #[cfg(unix)]
            {
                let timeout_secs = (self.timeout.as_millis() / 1000).max(1);
                let target_ip = self.ip.to_string();

                // Run macOS/Linux system traceroute command
                let output = tokio::process::Command::new("traceroute")
                    .arg("-n") // Numeric mode (no reverse DNS)
                    .arg("-q")
                    .arg("1") // 1 probe per hop
                    .arg("-w")
                    .arg(timeout_secs.to_string())
                    .arg("-m")
                    .arg(self.max_hops.to_string())
                    .arg(&target_ip)
                    .output()
                    .await;

                match output {
                    Ok(output) => {
                        let stdout = String::from_utf8_lossy(&output.stdout);
                        for line in stdout.lines() {
                            let parts: Vec<&str> = line.split_whitespace().collect();
                            if parts.is_empty() {
                                continue;
                            }

                            if let Ok(ttl) = parts[0].parse::<u32>() {
                                if parts.len() >= 2 && parts[1] == "*" {
                                    hops.push(TraceHop {
                                        ttl,
                                        ip: None,
                                        fqdn: None,
                                        time_ms: None,
                                    });
                                } else if parts.len() >= 3 {
                                    let hop_ip_str = parts[1].to_string();
                                    let hop_ip = IpAddr::from_str(&hop_ip_str).ok();
                                    let mut time_ms = None;
                                    // find "ms" index and parse preceding element as time
                                    for i in 2..parts.len() {
                                        if parts[i] == "ms" {
                                            time_ms = parts[i - 1].parse::<f64>().ok();
                                            break;
                                        }
                                    }

                                    let fqdn =
                                        hop_ip.and_then(|addr| dns_lookup::lookup_addr(&addr).ok());

                                    hops.push(TraceHop {
                                        ttl,
                                        ip: hop_ip,
                                        fqdn,
                                        time_ms,
                                    });

                                    if hop_ip_str == target_ip {
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        return Err(format!(
                            "UDP traceroute failed to execute system command: {}",
                            e
                        ));
                    }
                }
            }
            #[cfg(windows)]
            {
                return Err("UDP TraceRoute is not supported natively on Windows. Please use ICMP protocol instead.".to_string());
            }
        }

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
        let tracer = Tracer::new("127.0.0.1".to_string(), 1000, 32, 30, "ICMP".to_string()).await;
        assert!(tracer.is_ok());
        let tracer = tracer.unwrap();
        assert_eq!(tracer.ip, "127.0.0.1".parse::<IpAddr>().unwrap());
        assert_eq!(tracer.max_hops, 30);
        assert_eq!(tracer.protocol, "ICMP");
    }

    #[tokio::test]
    async fn test_tracer_new_invalid() {
        let tracer = Tracer::new(
            "invalid...host".to_string(),
            1000,
            32,
            30,
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
