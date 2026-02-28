use crate::tcpip::hop::Hop;
use crate::tcpip::host::Host;
use crate::tcpip::rtt::Rtt;
use crate::tcpip::timeout::Timeout;
use crate::tracer::{TraceFuture, TraceHop, TracerImpl};
use std::net::IpAddr;
use std::str::FromStr;

pub struct UDPTracer {
    ip: IpAddr,
    timeout: Timeout,
    max_hops: Hop,
    resolve_hostnames: bool,
}

impl UDPTracer {
    pub fn new(ip: IpAddr, timeout: Timeout, max_hops: Hop, resolve_hostnames: bool) -> Self {
        Self {
            ip,
            timeout,
            max_hops,
            resolve_hostnames,
        }
    }
}

impl TracerImpl for UDPTracer {
    fn trace(&self, app: tauri::AppHandle) -> TraceFuture<'_> {
        Box::pin(async move {
            use tauri::Emitter;
            let target_host = Host::new(&self.ip.to_string()).unwrap_or_else(|_| Host::new("0.0.0.0").unwrap());

            #[cfg(unix)]
            {
                use tokio::io::{AsyncBufReadExt, BufReader};
                use std::process::Stdio;

                let timeout_secs = (self.timeout.as_millis() / 1000).max(1);

                let cmd = match self.ip {
                    IpAddr::V4(_) => "traceroute",
                    IpAddr::V6(_) => "traceroute6",
                };

                let mut child = tokio::process::Command::new(cmd)
                    .arg("-n")
                    .arg("-q")
                    .arg("1")
                    .arg("-w")
                    .arg(timeout_secs.to_string())
                    .arg("-m")
                    .arg(self.max_hops.value().to_string())
                    .arg(&self.ip.to_string())
                    .stdout(Stdio::piped())
                    .spawn()
                    .map_err(|e| crate::FxPingError::TraceFailed(format!("Failed to spawn traceroute command: {}", e)))?;

                let stdout = child.stdout.take().ok_or_else(|| crate::FxPingError::TraceFailed("Failed to capture stdout".to_string()))?;
                let mut reader = BufReader::new(stdout).lines();
                let mut hops = Vec::new();

                while let Ok(Some(line)) = reader.next_line().await {
                    if let Some(hop) = parse_line_to_hop(&line, &target_host, self.resolve_hostnames) {
                        let _ = app.emit("trace-hop", hop.clone());
                        hops.push(hop);
                    }
                }

                let _ = child.wait().await;
                Ok(hops)
            }
            #[cfg(windows)]
            {
                let ip = self.ip;
                let timeout = self.timeout.value();
                let max_hops = self.max_hops;
                let resolve_hostnames = self.resolve_hostnames;

                tokio::task::spawn_blocking(move || {
                    let mut hops = Vec::new();

                    use socket2::{Domain, Protocol, Socket, Type};
                    use std::net::{SocketAddr, Ipv4Addr, Ipv6Addr};
                    use std::time::Instant;

                    let domain = if ip.is_ipv4() { Domain::IPV4 } else { Domain::IPV6 };
                    
                    let icmp_protocol = if ip.is_ipv4() { Protocol::ICMPV4 } else { Protocol::ICMPV6 };
                    let recv_socket = match Socket::new(domain, Type::RAW, Some(icmp_protocol)) {
                        Ok(s) => s,
                        Err(e) => return Err(crate::FxPingError::TraceFailed(format!("UDP traceroute on Windows requires Administrator privileges to create raw sockets. Error: {}", e))),
                    };
                    
                    if let Err(e) = recv_socket.set_read_timeout(Some(timeout)) {
                        return Err(crate::FxPingError::TraceFailed(format!("Failed to set read timeout on RAW socket: {}", e)));
                    }
                    
                    let bind_addr = if ip.is_ipv4() {
                        SocketAddr::new(IpAddr::V4(Ipv4Addr::UNSPECIFIED), 0)
                    } else {
                        SocketAddr::new(IpAddr::V6(Ipv6Addr::UNSPECIFIED), 0)
                    };
                    if let Err(e) = recv_socket.bind(&bind_addr.into()) {
                        return Err(crate::FxPingError::TraceFailed(format!("Failed to bind RAW socket: {}", e)));
                    }

                    let send_socket = match Socket::new(domain, Type::DGRAM, Some(Protocol::UDP)) {
                        Ok(s) => s,
                        Err(e) => return Err(crate::FxPingError::TraceFailed(format!("Failed to create UDP socket: {}", e))),
                    };

                    let payload = [0u8; 32];
                    let mut recv_buf = [std::mem::MaybeUninit::uninit(); 1024];

                    for ttl_val in 1..=max_hops.value() {
                        let ttl = Hop::new(ttl_val as u32).unwrap_or(max_hops);
                        if ip.is_ipv4() {
                            if let Err(e) = send_socket.set_ttl(ttl.value()) {
                                return Err(crate::FxPingError::TraceFailed(format!("Failed to set TTL: {}", e)));
                            }
                        } else {
                            if let Err(e) = send_socket.set_unicast_hops_v6(ttl.value()) {
                                return Err(crate::FxPingError::TraceFailed(format!("Failed to set TTL for IPv6: {}", e)));
                            }
                        }

                        let start_time = Instant::now();
                        
                        let current_target = SocketAddr::new(ip, 33434 + ttl.value() as u16);
                        if let Err(e) = send_socket.send_to(&payload, &current_target.into()) {
                            return Err(crate::FxPingError::TraceFailed(format!("Failed to send UDP packet: {}", e)));
                        }

                        let mut hop_ip = None;
                        let mut time_ms = None;
                        
                        loop {
                            match recv_socket.recv_from(&mut recv_buf) {
                                Ok((_, addr)) => {
                                    if let Some(sockaddr) = addr.as_socket() {
                                        hop_ip = Some(sockaddr.ip());
                                        time_ms = Some(Rtt::new(start_time.elapsed().as_secs_f64() * 1000.0));
                                    }
                                    break;
                                }
                                Err(e) if e.kind() == std::io::ErrorKind::WouldBlock || e.kind() == std::io::ErrorKind::TimedOut => {
                                    break;
                                }
                                Err(_) => {
                                    if start_time.elapsed() >= timeout {
                                        break;
                                    }
                                }
                            }
                        }

                        let fqdn = if resolve_hostnames {
                            hop_ip.and_then(|addr| crate::resolve::resolve_addr(&addr))
                        } else {
                            None
                        };

                        let hop = TraceHop {
                            target: target_host.clone(),
                            ttl,
                            ip: hop_ip,
                            fqdn,
                            time_ms,
                        };

                        let _ = app.emit("trace-hop", hop.clone());
                        hops.push(hop);

                        if hop_ip == Some(ip) {
                            break;
                        }
                    }

                    Ok(hops)
                }).await.unwrap_or_else(|e| Err(crate::FxPingError::Internal(format!("Task execution failed: {}", e))))
            }
        })
    }
}

#[cfg(unix)]
fn parse_line_to_hop(line: &str, target_host: &Host, resolve_hostnames: bool) -> Option<TraceHop> {
    let parts: Vec<&str> = line.split_whitespace().collect();
    if parts.is_empty() {
        return None;
    }

    if let Ok(ttl_val) = parts[0].parse::<u32>() {
        let ttl = Hop::new(ttl_val).ok()?;
        if parts.len() >= 2 && parts[1] == "*" {
            return Some(TraceHop {
                target: target_host.clone(),
                ttl,
                ip: None,
                fqdn: None,
                time_ms: None,
            });
        } else if parts.len() >= 3 {
            let hop_ip_str = parts[1].to_string();
            let hop_ip = IpAddr::from_str(&hop_ip_str).ok();
            let mut time_ms = None;
            for i in 2..parts.len() {
                if parts[i] == "ms" {
                    if let Ok(ms) = parts[i - 1].parse::<f64>() {
                        time_ms = Some(Rtt::new(ms));
                    }
                    break;
                }
            }

            let fqdn = if resolve_hostnames {
                hop_ip.and_then(|addr| crate::resolve::resolve_addr(&addr))
            } else {
                None
            };

            return Some(TraceHop {
                target: target_host.clone(),
                ttl,
                ip: hop_ip,
                fqdn,
                time_ms,
            });
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::Ipv4Addr;

    #[test]
    fn test_udp_tracer_new() {
        let ip = IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1));
        let timeout = Timeout::new(1000).unwrap();
        let max_hops = Hop::new(30).unwrap();
        let tracer = UDPTracer::new(ip, timeout, max_hops, true);

        assert_eq!(tracer.ip, ip);
        assert_eq!(tracer.timeout, timeout);
        assert_eq!(tracer.max_hops, max_hops);
    }

    #[test]
    #[cfg(unix)]
    fn test_parse_line_to_hop() {
        let target_host = Host::new("8.8.8.8").unwrap();
        let line1 = "1  192.168.1.1  0.5 ms";
        let hop1 = parse_line_to_hop(line1, &target_host, true).unwrap();
        assert_eq!(hop1.ttl.value(), 1);
        assert_eq!(hop1.ip, Some(IpAddr::V4(Ipv4Addr::new(192, 168, 1, 1))));
        assert_eq!(hop1.time_ms.map(|r| r.value()), Some(0.5));

        let line2 = "2  *";
        let hop2 = parse_line_to_hop(line2, &target_host, true).unwrap();
        assert_eq!(hop2.ttl.value(), 2);
        assert_eq!(hop2.ip, None);

        let line3 = "3  8.8.8.8  10.2 ms";
        let hop3 = parse_line_to_hop(line3, &target_host, true).unwrap();
        assert_eq!(hop3.ttl.value(), 3);
        assert_eq!(hop3.ip, Some(IpAddr::V4(Ipv4Addr::new(8, 8, 8, 8))));
        assert_eq!(hop3.time_ms.map(|r| r.value()), Some(10.2));
    }
}
