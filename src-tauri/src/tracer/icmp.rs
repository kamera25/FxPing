use crate::tcpip::hop::Hop;
use crate::tcpip::payload_size::PayloadSize;
use crate::tracer::{TraceFuture, TraceHop, TracerImpl};
use std::net::IpAddr;
use std::time::Duration;
use surge_ping::{Client, Config, PingIdentifier, PingSequence};

pub struct ICMPTracer {
    ip: IpAddr,
    timeout: Duration,
    payload_size: PayloadSize,
    max_hops: Hop,
}

impl ICMPTracer {
    pub fn new(ip: IpAddr, timeout: Duration, payload_size: PayloadSize, max_hops: Hop) -> Self {
        Self {
            ip,
            timeout,
            payload_size,
            max_hops,
        }
    }
}

impl TracerImpl for ICMPTracer {
    fn trace(&self) -> TraceFuture<'_> {
        Box::pin(async move {
            let mut hops = Vec::new();
            let payload = vec![0u8; self.payload_size.value()];

            for ttl in 1..=self.max_hops.value() {
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
        let timeout = Duration::from_secs(1);
        let payload_size = PayloadSize::new(32).unwrap();
        let max_hops = Hop::new(30).unwrap();
        let tracer = ICMPTracer::new(ip, timeout, payload_size, max_hops);

        assert_eq!(tracer.ip, ip);
        assert_eq!(tracer.timeout, timeout);
        assert_eq!(tracer.payload_size, payload_size);
        assert_eq!(tracer.max_hops, max_hops);
    }
}
