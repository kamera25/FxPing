use crate::FxPingError;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
#[serde(transparent)]
pub struct PayloadSize(u16);

impl PayloadSize {
    pub fn new(size: usize) -> Result<Self, FxPingError> {
        if size <= 65535 {
            Ok(Self(size as u16))
        } else {
            Err(FxPingError::InvalidParameter(format!(
                "Payload size must be between 0 and 65535 (got {})",
                size
            )))
        }
    }

    pub fn value(&self) -> usize {
        self.0 as usize
    }
}

impl Default for PayloadSize {
    fn default() -> Self {
        Self(32)
    }
}

#[cfg(test)]
mod tests {
    pub use super::*;

    #[test]
    fn test_payload_size_valid() {
        assert!(PayloadSize::new(0).is_ok());
        assert!(PayloadSize::new(32).is_ok());
        assert!(PayloadSize::new(65535).is_ok());
        assert_eq!(PayloadSize::new(32).unwrap().value(), 32);
    }

    #[test]
    fn test_payload_size_invalid() {
        assert!(PayloadSize::new(65536).is_err());
    }

    #[test]
    fn test_payload_size_default() {
        assert_eq!(PayloadSize::default().value(), 32);
    }
}
