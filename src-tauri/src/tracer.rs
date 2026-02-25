use crate::host::Host;
use chrono::Local;
use serde::{Deserialize, Serialize};
use std::net::IpAddr;
use std::str::FromStr;
use std::time::Duration;
use surge_ping::{Client, Config, IcmpPacket, PingIdentifier, PingSequence};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TraceHop {
    pub ttl: u32,
    pub ip: String,
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
                            IcmpPacket::V4(p) => p.get_real_dest().to_string(),
                            IcmpPacket::V6(p) => p.get_real_dest().to_string(),
                        };
                        let hop_ip_str = hop_ip.clone();
                        let fqdn = match IpAddr::from_str(&hop_ip_str) {
                            Ok(addr) => dns_lookup::lookup_addr(&addr).ok(),
                            Err(_) => None,
                        };

                        hops.push(TraceHop {
                            ttl,
                            ip: hop_ip,
                            fqdn,
                            time_ms: Some(duration.as_secs_f64() * 1000.0),
                        });

                        if hop_ip_str == self.ip.to_string() {
                            break;
                        }
                    }
                    Err(_) => {
                        hops.push(TraceHop {
                            ttl,
                            ip: "*".to_string(),
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
                                        ip: "*".to_string(),
                                        fqdn: None,
                                        time_ms: None,
                                    });
                                } else if parts.len() >= 3 {
                                    let hop_ip = parts[1].to_string();
                                    let mut time_ms = None;
                                    // find "ms" index and parse preceding element as time
                                    for i in 2..parts.len() {
                                        if parts[i] == "ms" {
                                            time_ms = parts[i - 1].parse::<f64>().ok();
                                            break;
                                        }
                                    }

                                    let fqdn = match IpAddr::from_str(&hop_ip) {
                                        Ok(addr) => dns_lookup::lookup_addr(&addr).ok(),
                                        Err(_) => None,
                                    };

                                    hops.push(TraceHop {
                                        ttl,
                                        ip: hop_ip.clone(),
                                        fqdn,
                                        time_ms,
                                    });

                                    if hop_ip == target_ip {
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
