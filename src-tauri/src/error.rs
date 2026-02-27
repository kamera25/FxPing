use serde::{Serialize, Serializer};

#[derive(thiserror::Error, Debug)]
pub enum FxPingError {
    #[error("DNS resolution failure: {target}: {source}")]
    DnsResolution {
        target: String,
        source: std::io::Error,
    },
    #[error("Ping failure: {0}")]
    PingFailed(String),
    #[error("File IO error: {0}")]
    FileIo(#[from] std::io::Error),
    #[error("Invalid parameter: {0}")]
    InvalidParameter(String),
    #[error("Traceroute failure: {0}")]
    TraceFailed(String),
    #[error("Host invalid: {0}")]
    HostInvalid(String),
    #[error("Internal error: {0}")]
    Internal(String),
}

impl Serialize for FxPingError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
