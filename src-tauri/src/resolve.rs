use std::net::{IpAddr, ToSocketAddrs};

/// Resolves a hostname or IP string to an IpAddr.
/// Handles both literal IP addresses and hostnames.
pub fn resolve_host(host: &str) -> Result<IpAddr, String> {
    // Attempt to parse as an IP address first
    if let Ok(ip) = host.parse::<IpAddr>() {
        return Ok(ip);
    }

    // Attempt DNS resolution
    match format!("{}:0", host).to_socket_addrs() {
        Ok(mut addrs) => addrs
            .next()
            .map(|s| s.ip())
            .ok_or_else(|| format!("Could not resolve target: {}", host)),
        Err(e) => Err(format!("DNS resolution failed for {}: {}", host, e)),
    }
}

/// Resolves an IpAddr to a hostname (reverse DNS).
/// Returns None if resolution fails.
pub fn resolve_addr(addr: &IpAddr) -> Option<String> {
    dns_lookup::lookup_addr(addr).ok()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::{IpAddr, Ipv4Addr};

    #[test]
    fn test_resolve_host_ip() {
        let ip_str = "127.0.0.1";
        let result = resolve_host(ip_str);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)));
    }

    #[test]
    fn test_resolve_host_ipv6() {
        let ip_str = "::1";
        let result = resolve_host(ip_str);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "::1".parse::<IpAddr>().unwrap());
    }

    #[test]
    fn test_resolve_host_dns() {
        // localhost should resolve on most systems
        let result = resolve_host("localhost");
        assert!(result.is_ok());
    }

    #[test]
    fn test_resolve_host_invalid() {
        let result = resolve_host("invalid...host...name");
        assert!(result.is_err());
    }

    #[test]
    fn test_resolve_addr_localhost() {
        let ip = IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1));
        let result = resolve_addr(&ip);
        // On many systems this returns "localhost" or similar
        // but it's not guaranteed, so we just check if it returns.
        // It's okay if it's None in some environments.
        println!("Reverse resolve 127.0.0.1: {:?}", result);
    }
}
