use std::path::Path;
use tauri::command;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub enum FileOperation {
    Rename { from: String, to: String },
    CreateDir { path: String },
    Delete { path: String },
}

#[derive(Debug, Serialize)]
pub struct OperationResult {
    pub success: bool,
    pub message: String,
}

#[command]
pub fn apply_operations(operations: Vec<FileOperation>) -> Result<Vec<OperationResult>, String> {
    // This is a placeholder implementation
    // We'll implement the actual file operations later
    Ok(operations.iter().map(|_| OperationResult {
        success: true,
        message: "Operation completed successfully".into(),
    }).collect())
}

#[command]
pub fn is_protected_path(path: &str) -> bool {
    let path = Path::new(path);
    let protected_paths = [
        "/System", "/Library", "/usr", 
        "C:\\Windows", "C:\\Program Files", "C:\\Program Files (x86)"
    ];
    
    protected_paths.iter().any(|p| path.starts_with(p))
} 