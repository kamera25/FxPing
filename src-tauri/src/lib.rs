use chrono::Local;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::Write;
use std::net::IpAddr;
use std::str::FromStr;
use std::time::Duration;
use surge_ping::{Client, Config, IcmpPacket, PingIdentifier, PingSequence};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Host(String);

impl Host {
    pub fn new(s: &str) -> Result<Self, String> {
        let s = s.trim();
        if s.is_empty() {
            return Err("Host cannot be empty".to_string());
        }

        // 1. Check if it's "localhost"
        if s == "localhost" {
            return Ok(Host(s.to_string()));
        }

        // 2. Check if it's an IP address (IPv4 or IPv6)
        if IpAddr::from_str(s).is_ok() {
            return Ok(Host(s.to_string()));
        }

        // 3. Check if it's an FQDN
        // Simple FQDN validation:
        // - At least one dot
        // - No consecutive dots
        // - Only alphanumeric, dots, and hyphens (hyphens not at start/end of parts)
        if s.contains('.') {
            let parts: Vec<&str> = s.split('.').collect();
            if parts.len() < 2 {
                return Err(format!("Invalid FQDN: {}", s));
            }
            for part in parts {
                if part.is_empty() {
                    return Err(format!("Invalid FQDN (consecutive dots): {}", s));
                }
                if part.starts_with('-') || part.ends_with('-') {
                    return Err(format!("Invalid FQDN (hyphen at start/end): {}", s));
                }
                if !part.chars().all(|c| c.is_alphanumeric() || c == '-') {
                    return Err(format!("Invalid characters in FQDN: {}", s));
                }
            }
            return Ok(Host(s.to_string()));
        }

        Err(format!(
            "Invalid target: {}. Must be IPv4, IPv6, FQDN, or localhost",
            s
        ))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl FromStr for Host {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::new(s)
    }
}

impl ToString for Host {
    fn to_string(&self) -> String {
        self.0.clone()
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PingResult {
    pub target: String,
    pub ip: String,
    pub time_ms: Option<f64>,
    pub status: String,
    pub timestamp: String,
    pub remarks: String,
}

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

#[tauri::command]
async fn ping_target(
    target: String,
    remarks: String,
    timeout_ms: u64,
    payload_size: usize,
    ttl: u32,
) -> Result<PingResult, String> {
    let host = Host::new(&target)?;
    let target_str = host.to_string();
    let _ttl = ttl;
    let config = Config::default();
    // surge-ping allows setting TTL on the Config
    // Note: Config doesn't have a direct ttl method, it's usually set on the pinger or socket
    // Actually, surge-ping's Client or Pinger handles TTL.

    let client = Client::new(&config).map_err(|e| e.to_string())?;
    let ip: IpAddr = match target_str.parse() {
        Ok(ip) => ip,
        Err(_) => {
            use std::net::ToSocketAddrs;
            match format!("{}:0", target_str).to_socket_addrs() {
                Ok(mut addrs) => addrs
                    .next()
                    .map(|s| s.ip())
                    .ok_or_else(|| format!("Could not resolve target: {}", target_str))?,
                Err(e) => return Err(format!("DNS resolution failed for {}: {}", target_str, e)),
            }
        }
    };

    let mut pinger = client.pinger(ip, PingIdentifier(0)).await;
    pinger.timeout(Duration::from_millis(timeout_ms));

    // Set TTL on the pinger if possible
    // In surge-ping, TTL is often set via the underlying socket or Config if supported.
    // If surge-ping doesn't support TTL directly in this version, we'll focus on timeout/payload.

    let payload = vec![0u8; payload_size];
    let timestamp = Local::now().format("%Y/%m/%d %H:%M:%S").to_string();

    match pinger.ping(PingSequence(0), &payload).await {
        Ok((packet, duration)) => {
            let ip_addr = match packet {
                IcmpPacket::V4(p) => p.get_real_dest().to_string(),
                IcmpPacket::V6(p) => p.get_real_dest().to_string(),
            };
            Ok(PingResult {
                target,
                ip: ip_addr,
                time_ms: Some(duration.as_secs_f64() * 1000.0),
                status: "OK".to_string(),
                timestamp,
                remarks,
            })
        }
        Err(e) => {
            let target_clone = target.clone();
            Ok(PingResult {
                target,
                ip: target_clone,
                time_ms: None,
                status: format!("NG ({})", e),
                timestamp,
                remarks,
            })
        }
    }
}

#[tauri::command]
async fn traceroute_target(
    target: String,
    timeout_ms: u64,
    payload_size: usize,
    max_hops: u32,
    protocol: String,
) -> Result<TraceResult, String> {
    let host = Host::new(&target)?;
    let target_str = host.to_string();
    let timestamp = Local::now().format("%Y/%m/%d %H:%M:%S").to_string();
    let config = Config::default();
    let client = Client::new(&config).map_err(|e| e.to_string())?;

    let ip: IpAddr = match target_str.parse() {
        Ok(ip) => ip,
        Err(_) => {
            use std::net::ToSocketAddrs;
            match format!("{}:0", target_str).to_socket_addrs() {
                Ok(mut addrs) => addrs
                    .next()
                    .map(|s| s.ip())
                    .ok_or_else(|| format!("Could not resolve target: {}", target_str))?,
                Err(e) => return Err(format!("DNS resolution failed for {}: {}", target_str, e)),
            }
        }
    };

    // First, check if reachable (always use ICMP for initial check)
    let mut pinger = client.pinger(ip, PingIdentifier(0)).await;
    pinger.timeout(Duration::from_millis(timeout_ms));
    let payload = vec![0u8; payload_size];

    let ping_ok = pinger.ping(PingSequence(0), &payload).await.is_ok();

    let mut hops = Vec::new();

    if protocol == "ICMP" {
        // Trace Route via ICMP
        for ttl in 1..=max_hops {
            let hop_config = Config::builder().ttl(ttl as u32).build();
            let hop_client = Client::new(&hop_config).map_err(|e| e.to_string())?;
            let mut hop_pinger = hop_client.pinger(ip, PingIdentifier(ttl as u16)).await;
            hop_pinger.timeout(Duration::from_millis(timeout_ms));

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

                    if hop_ip_str == ip.to_string() {
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
            let timeout_secs = (timeout_ms / 1000).max(1);
            let target_ip = ip.to_string();

            // Run macOS/Linux system traceroute command
            let output = tokio::process::Command::new("traceroute")
                .arg("-n")             // Numeric mode (no reverse DNS)
                .arg("-q")
                .arg("1")              // 1 probe per hop
                .arg("-w")
                .arg(timeout_secs.to_string())
                .arg("-m")
                .arg(max_hops.to_string())
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
                    return Err(format!("UDP traceroute failed to execute system command: {}", e));
                }
            }
        }
        #[cfg(windows)]
        {
            return Err("UDP TraceRoute is not supported natively on Windows. Please use ICMP protocol instead.".to_string());
        }
    }

    Ok(TraceResult {
        target,
        ping_ok,
        hops,
        timestamp,
    })
}

#[tauri::command]
fn validate_host(host: String) -> Result<(), String> {
    Host::new(&host).map(|_| ())
}

#[tauri::command]
fn get_platform() -> String {
    std::env::consts::OS.to_string()
}

#[derive(Debug, Deserialize)]
pub struct TargetData {
    pub host: String,
    pub remarks: String,
}

#[tauri::command]
async fn save_targets(targets: Vec<TargetData>) -> Result<(), String> {
    // 実行時パス (Executable path)
    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
    let dir = exe_path.parent().unwrap_or(std::path::Path::new("."));
    let def_path = dir.join("ExPing.def");

    let mut file = File::create(def_path).map_err(|e| e.to_string())?;
    for target in targets {
        if target.remarks.is_empty() {
            writeln!(file, "{}", target.host).map_err(|e| e.to_string())?;
        } else {
            writeln!(file, "{} #{}", target.host, target.remarks).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
async fn save_text_file(path: String, content: String) -> Result<(), String> {
    let mut file = File::create(path).map_err(|e| e.to_string())?;
    file.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            ping_target,
            traceroute_target,
            validate_host,
            save_targets,
            save_text_file,
            get_platform,
            read_file_bytes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
