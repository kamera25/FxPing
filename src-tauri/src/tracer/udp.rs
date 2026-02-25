use crate::tracer::{TraceFuture, TraceHop, TracerImpl};
use std::net::IpAddr;
use std::str::FromStr;
use std::time::Duration;

pub struct UDPTracer {
    ip: IpAddr,
    timeout: Duration,
    max_hops: u32,
}

impl UDPTracer {
    pub fn new(ip: IpAddr, timeout: Duration, max_hops: u32) -> Self {
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

                let output = tokio::process::Command::new("traceroute")
                    .arg("-n")
                    .arg("-q")
                    .arg("1")
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
                Err("UDP TraceRoute is not supported natively on Windows. Please use ICMP protocol instead.".to_string())
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
        let max_hops = 30;
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
}
