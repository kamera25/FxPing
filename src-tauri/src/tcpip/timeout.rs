use crate::FxPingError;
use serde::Serialize;
use std::time::Duration;

#[derive(Debug, Serialize, Clone, Copy, PartialEq, Eq)]
#[serde(transparent)]
pub struct Timeout(std::time::Duration);

impl<'de> serde::Deserialize<'de> for Timeout {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let ms = u64::deserialize(deserializer)?;
        Timeout::new(ms).map_err(serde::de::Error::custom)
    }
}

impl Timeout {
    pub fn new(ms: u64) -> Result<Self, FxPingError> {
        if ms <= 300_000 {
            Ok(Self(Duration::from_millis(ms)))
        } else {
            Err(FxPingError::InvalidParameter(format!(
                "Timeout must be between 0 and 300,000ms (got {}ms)",
                ms
            )))
        }
    }

    pub fn value(&self) -> Duration {
        self.0
    }

    pub fn as_millis(&self) -> u64 {
        self.0.as_millis() as u64
    }
}

impl Default for Timeout {
    fn default() -> Self {
        Self(Duration::from_millis(1000))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_timeout_valid() {
        assert!(Timeout::new(0).is_ok());
        assert!(Timeout::new(1000).is_ok());
        assert!(Timeout::new(300_000).is_ok());
        assert_eq!(Timeout::new(1000).unwrap().as_millis(), 1000);
    }

    #[test]
    fn test_timeout_invalid() {
        assert!(Timeout::new(300_001).is_err());
    }

    #[test]
    fn test_timeout_default() {
        assert_eq!(Timeout::default().as_millis(), 1000);
    }
}
