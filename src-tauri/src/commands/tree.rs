use std::path::Path;
use tauri::command;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct DirectoryOptions {
    pub max_depth: usize,
    pub exclude_pattern: String,
    pub follow_symlinks: bool,
    pub show_hidden: bool,
}

impl Default for DirectoryOptions {
    fn default() -> Self {
        Self {
            max_depth: 10,
            exclude_pattern: String::from("node_modules|.git"),
            follow_symlinks: false,
            show_hidden: false,
        }
    }
}

#[command]
pub fn parse_directory(path: &str, options: Option<DirectoryOptions>) -> Result<String, String> {
    let options = options.unwrap_or_default();
    
    // This is a placeholder implementation
    // We'll implement the actual directory parsing later
    let path = Path::new(path);
    if !path.exists() {
        return Err(format!("Path does not exist: {}", path.display()));
    }
    
    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", path.display()));
    }
    
    // Return a simple tree representation for now
    Ok(format!("{}/\n├── file1.txt\n└── folder/\n    └── file2.txt", 
        path.file_name().unwrap_or_default().to_string_lossy()))
} 