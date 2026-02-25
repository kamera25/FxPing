use crate::tcpip::hop::Hop;
use crate::tracer::{TraceFuture, TraceHop, TracerImpl};
use std::net::IpAddr;
use std::str::FromStr;
use std::time::Duration;

pub struct UDPTracer {
    ip: IpAddr,
    timeout: Duration,
    max_hops: Hop,
}

impl UDPTracer {
    pub fn new(ip: IpAddr, timeout: Duration, max_hops: Hop) -> Self {
        Self {
            ip,
            timeout,
            max_hops,
        }
    }
}

impl TracerImpl for UDPTracer {
    fn trace(&self) -> TraceFuture<'_> {
        Box::pin(async move {
            #[cfg(unix)]
            {
                let timeout_secs = (self.timeout.as_millis() / 1000).max(1);
                let target_ip = self.ip.to_string();

                let cmd = match self.ip {
                    IpAddr::V4(_) => "traceroute",
                    IpAddr::V6(_) => "traceroute6",
                };

                let output = tokio::process::Command::new(cmd)
                    .arg("-n")
                    .arg("-q")
                    .arg("1")
                    .arg("-w")
                    .arg(timeout_secs.to_string())
                    .arg("-m")
                    .arg(self.max_hops.value().to_string())
                    .arg(&target_ip)
                    .output()
                    .await;

                match output {
                    Ok(output) => {
                        let stdout = String::from_utf8_lossy(&output.stdout);
                        let hops = parse_traceroute_output(&stdout, &target_ip);
                        Ok(hops)
                    }
                    Err(e) => Err(format!(
                        "UDP traceroute failed to execute system command: {}",
                        e
                    )),
                }
            }
            #[cfg(windows)]
            {
                let ip = self.ip;
                let timeout = self.timeout;
                let max_hops = self.max_hops.value();

                tokio::task::spawn_blocking(move || {
                    let mut hops = Vec::new();

                    use socket2::{Domain, Protocol, Socket, Type};
                    use std::net::{SocketAddr, Ipv4Addr, Ipv6Addr};
                    use std::time::Instant;

                    let domain = if ip.is_ipv4() { Domain::IPV4 } else { Domain::IPV6 };
                    
                    let icmp_protocol = if ip.is_ipv4() { Protocol::ICMPV4 } else { Protocol::ICMPV6 };
                    let recv_socket = match Socket::new(domain, Type::RAW, Some(icmp_protocol)) {
                        Ok(s) => s,
                        Err(e) => return Err(format!("UDP traceroute on Windows requires Administrator privileges to create raw sockets. Error: {}", e)),
                    };
                    
                    if let Err(e) = recv_socket.set_read_timeout(Some(timeout)) {
                        return Err(format!("Failed to set read timeout on RAW socket: {}", e));
                    }
                    
                    let bind_addr = if ip.is_ipv4() {
                        SocketAddr::new(IpAddr::V4(Ipv4Addr::UNSPECIFIED), 0)
                    } else {
                        SocketAddr::new(IpAddr::V6(Ipv6Addr::UNSPECIFIED), 0)
                    };
                    if let Err(e) = recv_socket.bind(&bind_addr.into()) {
                        return Err(format!("Failed to bind RAW socket: {}", e));
                    }

                    let send_socket = match Socket::new(domain, Type::DGRAM, Some(Protocol::UDP)) {
                        Ok(s) => s,
                        Err(e) => return Err(format!("Failed to create UDP socket: {}", e)),
                    };

                    let payload = [0u8; 32];
                    let mut recv_buf = [std::mem::MaybeUninit::uninit(); 1024];

                    for ttl in 1..=max_hops {
                        if ip.is_ipv4() {
                            if let Err(e) = send_socket.set_ttl(ttl as u32) {
                                return Err(format!("Failed to set TTL: {}", e));
                            }
                        } else {
                            if let Err(e) = send_socket.set_unicast_hops_v6(ttl as u32) {
                                return Err(format!("Failed to set TTL for IPv6: {}", e));
                            }
                        }

                        let start_time = Instant::now();
                        
                        let current_target = SocketAddr::new(ip, 33434 + ttl as u16);
                        if let Err(e) = send_socket.send_to(&payload, &current_target.into()) {
                            return Err(format!("Failed to send UDP packet: {}", e));
                        }

                        let mut hop_ip = None;
                        let mut time_ms = None;
                        
                        loop {
                            match recv_socket.recv_from(&mut recv_buf) {
                                Ok((_, addr)) => {
                                    if let Some(sockaddr) = addr.as_socket() {
                                        hop_ip = Some(sockaddr.ip());
                                        time_ms = Some(start_time.elapsed().as_secs_f64() * 1000.0);
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

                        let fqdn = hop_ip.and_then(|addr| dns_lookup::lookup_addr(&addr).ok());

                        hops.push(TraceHop {
                            ttl: ttl as u32,
                            ip: hop_ip,
                            fqdn,
                            time_ms,
                        });

                        if hop_ip == Some(ip) {
                            break;
                        }
                    }

                    Ok(hops)
                }).await.unwrap_or_else(|e| Err(format!("Task execution failed: {}", e)))
            }
        })
    }
}

#[cfg(unix)]
fn parse_traceroute_output(stdout: &str, target_ip: &str) -> Vec<TraceHop> {
    let mut hops = Vec::new();
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
                for i in 2..parts.len() {
                    if parts[i] == "ms" {
                        time_ms = parts[i - 1].parse::<f64>().ok();
                        break;
                    }
                }

                let fqdn = hop_ip.and_then(|addr| dns_lookup::lookup_addr(&addr).ok());

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
    hops
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::Ipv4Addr;

    #[test]
    fn test_udp_tracer_new() {
        let ip = IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1));
        let timeout = Duration::from_secs(1);
        let max_hops = Hop::new(30).unwrap();
        let tracer = UDPTracer::new(ip, timeout, max_hops);

        assert_eq!(tracer.ip, ip);
        assert_eq!(tracer.timeout, timeout);
        assert_eq!(tracer.max_hops, max_hops);
    }

    #[test]
    fn test_udp_tracer_new_ipv6() {
        let ip = "::1".parse::<IpAddr>().unwrap();
        let timeout = Duration::from_secs(1);
        let max_hops = Hop::new(30).unwrap();
        let tracer = UDPTracer::new(ip, timeout, max_hops);

        assert_eq!(tracer.ip, ip);
        assert_eq!(tracer.timeout, timeout);
        assert_eq!(tracer.max_hops, max_hops);
    }

    #[test]
    #[cfg(unix)]
    fn test_parse_traceroute_output() {
        let target_ip = "8.8.8.8";
        let stdout = r#"
1  192.168.1.1  0.5 ms
2  *
3  8.8.8.8  10.2 ms
"#;
        let hops = parse_traceroute_output(stdout, target_ip);

        assert_eq!(hops.len(), 3);

        assert_eq!(hops[0].ttl, 1);
        assert_eq!(hops[0].ip, Some(IpAddr::V4(Ipv4Addr::new(192, 168, 1, 1))));
        assert_eq!(hops[0].time_ms, Some(0.5));

        assert_eq!(hops[1].ttl, 2);
        assert_eq!(hops[1].ip, None);
        assert_eq!(hops[1].time_ms, None);

        assert_eq!(hops[2].ttl, 3);
        assert_eq!(hops[2].ip, Some(IpAddr::V4(Ipv4Addr::new(8, 8, 8, 8))));
        assert_eq!(hops[2].time_ms, Some(10.2));
    }

    #[test]
    #[cfg(unix)]
    fn test_parse_traceroute_output_ipv6() {
        let target_ip = "2001:4860:4860::8888";
        let stdout = r#"
1  2001:db8::1  0.5 ms
2  *
3  2001:4860:4860::8888  10.2 ms
"#;
        let hops = parse_traceroute_output(stdout, target_ip);

        assert_eq!(hops.len(), 3);

        assert_eq!(hops[0].ttl, 1);
        assert_eq!(hops[0].ip, Some("2001:db8::1".parse::<IpAddr>().unwrap()));
        assert_eq!(hops[0].time_ms, Some(0.5));

        assert_eq!(hops[1].ttl, 2);
        assert_eq!(hops[1].ip, None);
        assert_eq!(hops[1].time_ms, None);

        assert_eq!(hops[2].ttl, 3);
        assert_eq!(
            hops[2].ip,
            Some("2001:4860:4860::8888".parse::<IpAddr>().unwrap())
        );
        assert_eq!(hops[2].time_ms, Some(10.2));
    }
}
