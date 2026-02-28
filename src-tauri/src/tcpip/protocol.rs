use crate::FxPingError;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
pub enum Protocol {
    ICMP,
    UDP,
}

impl FromStr for Protocol {
    type Err = FxPingError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_uppercase().as_str() {
            "ICMP" => Ok(Protocol::ICMP),
            "UDP" => Ok(Protocol::UDP),
            _ => Err(FxPingError::InvalidParameter(format!(
                "Invalid protocol: {}. Must be ICMP or UDP",
                s
            ))),
        }
    }
}

impl std::fmt::Display for Protocol {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Protocol::ICMP => write!(f, "ICMP"),
            Protocol::UDP => write!(f, "UDP"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_protocol_from_str() {
        assert_eq!(Protocol::from_str("icmp").unwrap(), Protocol::ICMP);
        assert_eq!(Protocol::from_str("UDP").unwrap(), Protocol::UDP);
        assert!(Protocol::from_str("TCP").is_err());
    }
}
