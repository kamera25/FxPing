use crate::FxPingError;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
#[serde(transparent)]
pub struct Hop(u32);

impl Hop {
    pub fn new(val: u32) -> Result<Self, FxPingError> {
        if (1..=255).contains(&val) {
            Ok(Hop(val))
        } else {
            Err(FxPingError::InvalidParameter(format!(
                "Hop value must be between 1 and 255. Got: {}",
                val
            )))
        }
    }

    pub fn value(&self) -> u32 {
        self.0
    }
}

impl std::fmt::Display for Hop {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hop_new_valid() {
        assert!(Hop::new(2).is_ok());
        assert!(Hop::new(255).is_ok());
        assert!(Hop::new(30).is_ok());
    }

    #[test]
    fn test_hop_new_invalid() {
        assert!(Hop::new(0).is_err());
        assert!(Hop::new(256).is_err());
    }
}
