use crate::FxPingError;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
#[serde(transparent)]
pub struct Protocol(ProtocolInner);

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
enum ProtocolInner {
    ICMP,
    UDP,
}

impl Protocol {
    pub fn icmp() -> Self {
        Self(ProtocolInner::ICMP)
    }

    pub fn udp() -> Self {
        Self(ProtocolInner::UDP)
    }

    pub fn is_icmp(&self) -> bool {
        matches!(self.0, ProtocolInner::ICMP)
    }

    #[allow(dead_code)]
    pub fn is_udp(&self) -> bool {
        matches!(self.0, ProtocolInner::UDP)
    }
}

impl FromStr for Protocol {
    type Err = FxPingError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_uppercase().as_str() {
            "ICMP" => Ok(Protocol::icmp()),
            "UDP" => Ok(Protocol::udp()),
            _ => Err(FxPingError::InvalidParameter(format!(
                "Invalid protocol: {}. Must be ICMP or UDP",
                s
            ))),
        }
    }
}

impl std::fmt::Display for Protocol {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self.0 {
            ProtocolInner::ICMP => write!(f, "ICMP"),
            ProtocolInner::UDP => write!(f, "UDP"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_protocol_from_str() {
        assert!(Protocol::from_str("icmp").unwrap().is_icmp());
        assert!(Protocol::from_str("UDP").unwrap().is_udp());
        assert!(Protocol::from_str("TCP").is_err());
    }

    #[test]
    fn test_protocol_helpers() {
        assert!(Protocol::icmp().is_icmp());
        assert!(!Protocol::icmp().is_udp());
        assert!(Protocol::udp().is_udp());
        assert!(!Protocol::udp().is_icmp());
    }
}
