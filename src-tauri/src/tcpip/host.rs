use crate::FxPingError;
use serde::{Deserialize, Serialize};
use std::net::IpAddr;
use std::str::FromStr;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(transparent)]
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
        let mut check_s = s.to_string();
        if let Some(pos) = check_s.find('%') {
            check_s.truncate(pos);
        }
        if let Ok(_) = IpAddr::from_str(&check_s) {
            return Ok(Host(s.to_string()));
        }

        // If it looks like an IP (only digits and dots) but did not parse as one, it will fall through to FQDN check.

        // 3. Check if it's an FQDN or a valid hostname
        static VALID_HOST_RE: std::sync::LazyLock<regex::Regex> = std::sync::LazyLock::new(|| {
            regex::Regex::new(r"^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$").unwrap()
        });

        if VALID_HOST_RE.is_match(s) {
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

impl std::fmt::Display for Host {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_host_validation() {
        // Valid inputs
        assert!(Host::new("127.0.0.1").is_ok()); // 数字だけのホスト名も現在は許容
        assert!(Host::new("198.51.100.1").is_ok());
        assert!(Host::new("2001:db8::1").is_ok());
        assert!(Host::new("2001:0DB8::1%en0").is_ok());
        assert!(Host::new("google.com").is_ok());
        assert!(Host::new("www.example.co.jp").is_ok());
        assert!(Host::new("localhost").is_ok());
        assert!(Host::new("my-server.local").is_ok());

        // Added valid test cases
        assert!(Host::new("aaa").is_ok()); // 最小構成のラベルとして成立
        assert!(Host::new("my-dev-env").is_ok()); // ハイフンが含まれていてもOK
        assert!(Host::new("aaa.local").is_ok()); // FQDN形式もこの正規表現でカバー

        // Invalid inputs
        assert!(Host::new("-aaa").is_err()); // 先頭にハイフンは使えない
        assert!(Host::new("aaa_server").is_err()); // アンダースコアは標準規格外
        assert!(Host::new("google..com").is_err());
        assert!(Host::new("-google.com").is_err());
        assert!(Host::new("google-.com").is_err());
    }
}
