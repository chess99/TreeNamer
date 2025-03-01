use serde::Serialize;
use std::fmt;

#[derive(Debug, Serialize)]
pub enum ErrorType {
    PERMISSION_DENIED,
    FILE_NOT_FOUND,
    PATH_ALREADY_EXISTS,
    SYSTEM_ERROR,
    USER_ABORT,
    INVALID_FILENAME,
    DISK_FULL,
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
                error_type: ErrorType::PERMISSION_DENIED,
                message: "Permission denied".into(),
                path: None,
                recoverable: false,
            },
            std::io::ErrorKind::NotFound => AppError {
                error_type: ErrorType::FILE_NOT_FOUND,
                message: "File not found".into(),
                path: None,
                recoverable: false,
            },
            std::io::ErrorKind::AlreadyExists => AppError {
                error_type: ErrorType::PATH_ALREADY_EXISTS,
                message: "Path already exists".into(),
                path: None,
                recoverable: true,
            },
            _ => AppError {
                error_type: ErrorType::SYSTEM_ERROR,
                message: error.to_string(),
                path: None,
                recoverable: false,
            }
        }
    }
} 