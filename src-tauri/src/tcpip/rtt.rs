use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq)]
#[serde(transparent)]
pub struct Rtt(f64);

impl Rtt {
    pub fn new(ms: f64) -> Self {
        Self(ms)
    }

    #[allow(dead_code)]
    pub fn value(&self) -> f64 {
        self.0
    }
}

impl std::fmt::Display for Rtt {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:.2} ms", self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rtt_display() {
        let rtt = Rtt::new(12.3456);
        assert_eq!(format!("{}", rtt), "12.35 ms");
    }
}
