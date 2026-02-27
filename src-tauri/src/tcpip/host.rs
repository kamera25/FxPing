use crate::FxPingError;
use serde::{Deserialize, Serialize};
use std::net::IpAddr;
use std::str::FromStr;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Host(String);

impl Host {
    pub fn new(s: &str) -> Result<Self, FxPingError> {
        let s = s.trim();
        if s.is_empty() {
            return Err(FxPingError::HostInvalid("Host cannot be empty".to_string()));
        }

        // 1. Check if it's "localhost"
        if s == "localhost" {
            return Ok(Host(s.to_string()));
        }

        // 2. Check if it's an IP address (IPv4 or IPv6)
        if let Ok(_) = IpAddr::from_str(s) {
            return Ok(Host(s.to_string()));
        }

        // If it looks like an IP (only digits and dots) but did not parse as one,
        // then it's an invalid IP address.
        if s.chars().all(|c| c.is_ascii_digit() || c == '.') {
            return Err(FxPingError::HostInvalid(format!(
                "Invalid IP address: {}",
                s
            )));
        }

        // 3. Check if it's an FQDN
        if s.contains('.') {
            let parts: Vec<&str> = s.split('.').collect();
            if parts.len() < 2 {
                return Err(FxPingError::HostInvalid(format!("Invalid FQDN: {}", s)));
            }

            // Check top-level domain (last part) is not numeric
            if let Some(last_part) = parts.last() {
                if last_part.chars().all(|c| c.is_ascii_digit()) {
                    return Err(FxPingError::HostInvalid(format!(
                        "Invalid FQDN (TLD cannot be numeric): {}",
                        s
                    )));
                }
            }

            for part in parts {
                if part.is_empty() {
                    return Err(FxPingError::HostInvalid(format!(
                        "Invalid FQDN (consecutive dots): {}",
                        s
                    )));
                }
                if part.starts_with('-') || part.ends_with('-') {
                    return Err(FxPingError::HostInvalid(format!(
                        "Invalid FQDN (hyphen at start/end): {}",
                        s
                    )));
                }
                if !part.chars().all(|c| c.is_alphanumeric() || c == '-') {
                    return Err(FxPingError::HostInvalid(format!(
                        "Invalid characters in FQDN: {}",
                        s
                    )));
                }
            }
            return Ok(Host(s.to_string()));
        }

        Err(FxPingError::HostInvalid(format!(
            "Invalid target: {}. Must be IPv4, IPv6, FQDN, or localhost",
            s
        )))
    }
}

impl FromStr for Host {
    type Err = FxPingError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::new(s)
    }
}

impl ToString for Host {
    fn to_string(&self) -> String {
        self.0.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_host_validation() {
        // Valid inputs
        assert!(Host::new("127.0.0.1").is_ok());
        assert!(Host::new("8.8.8.8").is_ok());
        assert!(Host::new("2001:db8::1").is_ok());
        assert!(Host::new("google.com").is_ok());
        assert!(Host::new("www.example.co.jp").is_ok());
        assert!(Host::new("localhost").is_ok());
        assert!(Host::new("my-server.local").is_ok());

        // Invalid IP addresses
        assert!(Host::new("256.0.0.0").is_err());
        assert!(Host::new("192.168.0.256").is_err());
        assert!(Host::new("1.2.3").is_err());
        assert!(Host::new("1.2.3.4.5").is_err());

        // Invalid FQDNs
        assert!(Host::new("google..com").is_err());
        assert!(Host::new("-google.com").is_err());
        assert!(Host::new("google-.com").is_err());
        assert!(Host::new("google.123").is_err()); // Numeric TLD
        assert!(Host::new("123.456").is_err()); // Numeric labels
    }
}
