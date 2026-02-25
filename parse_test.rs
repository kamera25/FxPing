use std::net::IpAddr;
use std::str::FromStr;

#[derive(Debug, PartialEq)]
pub struct TraceHop {
    pub ttl: u32,
    pub ip: Option<IpAddr>,
    pub fqdn: Option<String>,
    pub time_ms: Option<f64>,
}

fn parse_tracert_windows(stdout: &str, target_ip: &str) -> Vec<TraceHop> {
    let mut hops = Vec::new();
    for line in stdout.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with("Tracing") || line.starts_with("over") || line.starts_with("Trace") {
            continue;
        }

        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.is_empty() {
            continue;
        }

        if let Ok(ttl) = parts[0].parse::<u32>() {
            // "1 * * * Request timed out." -> parts[0] is "1", parts[1..] are "*" or "ms" or "<1" etc
            let mut ip_str = None;
            let mut time_ms = None;
            
            // Search from right to left to find IP
            if let Some(last) = parts.last() {
                if let Ok(ip) = IpAddr::from_str(last) {
                    ip_str = Some(last.to_string());
                } else if last == &"out." {
                    // "Request timed out."
                }
            }

            // Find first occurrence of "ms" to get time
            for (i, part) in parts.iter().enumerate() {
                if *part == "ms" && i > 0 {
                    let prev = parts[i - 1];
                    let time = if prev.starts_with('<') {
                        prev[1..].parse::<f64>().ok()
                    } else {
                        prev.parse::<f64>().ok()
                    };
                    if time_ms.is_none() {
                        time_ms = time;
                    }
                }
            }

            let hop_ip = ip_str.as_ref().and_then(|s| IpAddr::from_str(s).ok());
            let fqdn = hop_ip.and_then(|addr| dns_lookup::lookup_addr(&addr).ok());

            hops.push(TraceHop {
                ttl,
                ip: hop_ip,
                fqdn,
                time_ms,
            });

            if let Some(ref s) = ip_str {
                if s == target_ip {
                    break;
                }
            }
        }
    }
    hops
}

fn main() {
    let out = r#"
Tracing route to 8.8.8.8 over a maximum of 30 hops

  1    <1 ms    <1 ms    <1 ms  192.168.1.1
  2     *        *        *     Request timed out.
  3    11 ms    11.5 ms    11 ms  10.0.0.1
  4    13 ms    12 ms    13 ms  8.8.8.8

Trace complete.
"#;
    let res = parse_tracert_windows(out, "8.8.8.8");
    for r in res {
        println!("{:?}", r);
    }
}
