use crate::tcpip::hop::Hop;
use crate::tcpip::host::Host;
use crate::tcpip::payload_size::PayloadSize;
use crate::tcpip::rtt::Rtt;
use crate::tcpip::timeout::Timeout;
use crate::tracer::{TraceFuture, TraceHop, TracerImpl};
use std::net::IpAddr;
use surge_ping::{Client, Config, PingIdentifier, PingSequence, ICMP};

pub struct ICMPTracer {
    ip: IpAddr,
    timeout: Timeout,
    payload_size: PayloadSize,
    max_hops: Hop,
    resolve_hostnames: bool,
}

impl ICMPTracer {
    pub fn new(
        ip: IpAddr,
        timeout: Timeout,
        payload_size: PayloadSize,
        max_hops: Hop,
        resolve_hostnames: bool,
    ) -> Self {
        Self {
            ip,
            timeout,
            payload_size,
            max_hops,
            resolve_hostnames,
        }
    }
}

impl TracerImpl for ICMPTracer {
    fn trace(&self, app: tauri::AppHandle) -> TraceFuture<'_> {
        Box::pin(async move {
            use tauri::Emitter;
            let mut hops = Vec::new();
            let payload = vec![0u8; self.payload_size.value()];
            let target_host =
                Host::new(&self.ip.to_string()).unwrap_or_else(|_| Host::new("0.0.0.0").unwrap());

            for ttl_val in 1..=self.max_hops.value() {
                let ttl = Hop::new(ttl_val as u32).unwrap_or(self.max_hops);
                let builder = Config::builder().ttl(ttl.value());
                let hop_config = match self.ip {
                    IpAddr::V4(_) => builder.kind(ICMP::V4).build(),
                    IpAddr::V6(_) => builder.kind(ICMP::V6).build(),
                };
                let hop_client = Client::new(&hop_config)
                    .map_err(|e| crate::FxPingError::TraceFailed(e.to_string()))?;
                let mut hop_pinger = hop_client
                    .pinger(self.ip, PingIdentifier(ttl.value() as u16))
                    .await;
                hop_pinger.timeout(self.timeout.value());

                let hop = match hop_pinger
                    .ping(PingSequence(ttl.value() as u16), &payload)
                    .await
                {
                    Ok((packet, duration)) => {
                        let hop_ip = match packet {
                            surge_ping::IcmpPacket::V4(p) => p.get_real_dest().into(),
                            surge_ping::IcmpPacket::V6(p) => p.get_real_dest().into(),
                        };
                        let fqdn = if self.resolve_hostnames {
                            &hop_ip.reverse_resolve().ok()
                        } else {
                            None
                        };

                        TraceHop {
                            target: target_host.clone(),
                            ttl,
                            ip: Some(hop_ip),
                            fqdn,
                            time_ms: Some(Rtt::new(duration.as_secs_f64() * 1000.0)),
                        }
                    }
                    Err(_) => TraceHop {
                        target: target_host.clone(),
                        ttl,
                        ip: None,
                        fqdn: None,
                        time_ms: None,
                    },
                };

                let _ = app.emit("trace-hop", hop.clone());
                let hop_ip = hop.ip;
                hops.push(hop);

                if hop_ip == Some(self.ip) {
                    break;
                }
            }
            Ok(hops)
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::Ipv4Addr;

    #[test]
    fn test_icmp_tracer_new() {
        let ip = IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1));
        let timeout = Timeout::new(1000).unwrap();
        let payload_size = PayloadSize::new(32).unwrap();
        let max_hops = Hop::new(30).unwrap();
        let tracer = ICMPTracer::new(ip, timeout, payload_size, max_hops, true);

        assert_eq!(tracer.ip, ip);
        assert_eq!(tracer.timeout, timeout);
        assert_eq!(tracer.payload_size, payload_size);
        assert_eq!(tracer.max_hops, max_hops);
    }
}
