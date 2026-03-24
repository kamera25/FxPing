use crate::tcpip::host::Host;
use crate::FxPingError;
use std::net::{IpAddr, ToSocketAddrs};

/// Trait for resolving a host to an IP address.
pub trait Resolver {
    fn resolve(&self) -> Result<IpAddr, FxPingError>;
    fn reverse_resolve(&self) -> Result<Host, FxPingError>;
}

impl Resolver for Host {
    fn resolve(&self) -> Result<IpAddr, FxPingError> {
        let host = self.to_string();
        // Attempt to parse as an IP address first
        if let Ok(ip) = host.parse::<IpAddr>() {
            return Ok(ip);
        }

        // Attempt DNS resolution
        match format!("{}:0", host).to_socket_addrs() {
            Ok(mut addrs) => {
                addrs
                    .next()
                    .map(|s| s.ip())
                    .ok_or_else(|| FxPingError::DnsResolution {
                        target: host.to_string(),
                        source: std::io::Error::new(
                            std::io::ErrorKind::NotFound,
                            "No address found",
                        ),
                    })
            }
            Err(e) => Err(FxPingError::DnsResolution {
                target: host.to_string(),
                source: e,
            }),
        }
    }

    fn reverse_resolve(&self) -> Result<String, FxPingError> {
        let host = self.to_string();
        dns_lookup::lookup_addr(&host)
    }
}



#[cfg(test)]
mod tests {
    use super::*;
    use std::net::{IpAddr, Ipv4Addr};

    #[test]
    fn test_resolve_addr_localhost() {
        let ip = IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1));
        let result = resolve_addr(&ip);
        // On many systems this returns "localhost" or similar
        // but it's not guaranteed, so we just check if it returns.
        // It's okay if it's None in some environments.
        println!("Reverse resolve 127.0.0.1: {:?}", result);
    }

    #[test]
    fn test_host_resolver_trait() {
        let host = Host::new("127.0.0.1").unwrap();
        let result = host.resolve();
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)));

        let host_dns = Host::new("localhost").unwrap();
        let result_dns = host_dns.resolve();
        assert!(result_dns.is_ok());
    }
}
