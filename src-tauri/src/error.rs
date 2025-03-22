use serde::Serialize;
use std::fmt;

#[derive(Debug, Serialize)]
pub enum ErrorType {
    PermissionDenied,
    FileNotFound,
    PathAlreadyExists,
    SystemError,
    UserAbort,
    InvalidFilename,
    DiskFull,
}

#[derive(Debug, Serialize)]
pub struct AppError {
    pub error_type: ErrorType,
    pub message: String,
    pub path: Option<String>,
    pub recoverable: bool,
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}: {}", self.error_type, self.message)
    }
}

impl From<std::io::Error> for AppError {
    fn from(error: std::io::Error) -> Self {
        match error.kind() {
            std::io::ErrorKind::PermissionDenied => AppError {
                error_type: ErrorType::PermissionDenied,
                message: "Permission denied".into(),
                path: None,
                recoverable: false,
            },
            std::io::ErrorKind::NotFound => AppError {
                error_type: ErrorType::FileNotFound,
                message: "File not found".into(),
                path: None,
                recoverable: false,
            },
            std::io::ErrorKind::AlreadyExists => AppError {
                error_type: ErrorType::PathAlreadyExists,
                message: "Path already exists".into(),
                path: None,
                recoverable: true,
            },
            _ => AppError {
                error_type: ErrorType::SystemError,
                message: error.to_string(),
                path: None,
                recoverable: false,
            }
        }
    }
} 