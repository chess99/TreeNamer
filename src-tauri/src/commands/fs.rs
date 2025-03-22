use std::path::{Path, PathBuf};
use std::fs;
use tauri::command;
use serde::{Serialize, Deserialize};
use std::collections::HashMap;

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
pub fn apply_operations(path: &str, original_tree: &str, modified_tree: &str) -> Result<Vec<OperationResult>, String> {
    // Parse the original and modified trees
    let original_paths = parse_tree_text(original_tree)?;
    let modified_paths = parse_tree_text(modified_tree)?;
    
    // Generate operations
    let operations = generate_operations(path, &original_paths, &modified_paths)?;
    
    // Apply operations
    let mut results = Vec::new();
    
    // First create new directories
    let create_ops: Vec<_> = operations.iter()
        .filter(|op| matches!(op, FileOperation::CreateDir { .. }))
        .collect();
    
    for op in create_ops {
        if let FileOperation::CreateDir { path } = op {
            let result = apply_operation(op);
            results.push(result);
        }
    }
    
    // Then rename files and directories
    let rename_ops: Vec<_> = operations.iter()
        .filter(|op| matches!(op, FileOperation::Rename { .. }))
        .collect();
    
    for op in rename_ops {
        if let FileOperation::Rename { from, to } = op {
            let result = apply_operation(op);
            results.push(result);
        }
    }
    
    // Finally delete files and directories
    let delete_ops: Vec<_> = operations.iter()
        .filter(|op| matches!(op, FileOperation::Delete { .. }))
        .collect();
    
    for op in delete_ops {
        if let FileOperation::Delete { path } = op {
            let result = apply_operation(op);
            results.push(result);
        }
    }
    
    Ok(results)
}

fn apply_operation(operation: &FileOperation) -> OperationResult {
    match operation {
        FileOperation::Rename { from, to } => {
            let from_path = Path::new(from);
            let to_path = Path::new(to);
            
            // Create parent directories if they don't exist
            if let Some(parent) = to_path.parent() {
                if !parent.exists() {
                    if let Err(e) = fs::create_dir_all(parent) {
                        return OperationResult {
                            success: false,
                            message: format!("Failed to create parent directory: {}", e),
                        };
                    }
                }
            }
            
            match fs::rename(from_path, to_path) {
                Ok(_) => OperationResult {
                    success: true,
                    message: format!("Renamed {} to {}", from, to),
                },
                Err(e) => OperationResult {
                    success: false,
                    message: format!("Failed to rename {} to {}: {}", from, to, e),
                },
            }
        },
        FileOperation::CreateDir { path } => {
            let dir_path = Path::new(path);
            match fs::create_dir_all(dir_path) {
                Ok(_) => OperationResult {
                    success: true,
                    message: format!("Created directory {}", path),
                },
                Err(e) => OperationResult {
                    success: false,
                    message: format!("Failed to create directory {}: {}", path, e),
                },
            }
        },
        FileOperation::Delete { path } => {
            let delete_path = Path::new(path);
            let result = if delete_path.is_dir() {
                fs::remove_dir_all(delete_path)
            } else {
                fs::remove_file(delete_path)
            };
            
            match result {
                Ok(_) => OperationResult {
                    success: true,
                    message: format!("Deleted {}", path),
                },
                Err(e) => OperationResult {
                    success: false,
                    message: format!("Failed to delete {}: {}", path, e),
                },
            }
        },
    }
}

fn parse_tree_text(tree_text: &str) -> Result<HashMap<String, bool>, String> {
    let mut paths = HashMap::new();
    let lines: Vec<&str> = tree_text.split('\n').collect();
    
    if lines.is_empty() {
        return Err("Empty tree text".to_string());
    }
    
    // Parse the root directory name
    let root_line = lines[0].trim();
    if !root_line.ends_with('/') {
        return Err("Root line must be a directory".to_string());
    }
    
    let root_name = root_line.trim_end_matches('/');
    paths.insert(root_name.to_string(), true); // true = is directory
    
    let mut current_path = Vec::new();
    current_path.push(root_name.to_string());
    
    for line in lines.iter().skip(1) {
        if line.trim().is_empty() {
            continue;
        }
        
        // Calculate the level based on indentation
        let indent_count = line.chars().take_while(|c| c.is_whitespace()).count();
        let level = indent_count / 4 + 1; // +1 because root is level 0
        
        // Adjust current path based on level
        while current_path.len() > level {
            current_path.pop();
        }
        
        // Extract the name
        let name_part = line.trim_start();
        let name = if name_part.starts_with("├── ") {
            &name_part[4..]
        } else if name_part.starts_with("└── ") {
            &name_part[4..]
        } else {
            name_part
        };
        
        let is_dir = name.ends_with('/');
        let clean_name = if is_dir { name.trim_end_matches('/') } else { name };
        
        // Update current path
        if current_path.len() == level {
            current_path.pop();
        }
        current_path.push(clean_name.to_string());
        
        // Add to paths
        let full_path = current_path.join("/");
        paths.insert(full_path, is_dir);
    }
    
    Ok(paths)
}

fn generate_operations(
    base_path: &str, 
    original_paths: &HashMap<String, bool>, 
    modified_paths: &HashMap<String, bool>
) -> Result<Vec<FileOperation>, String> {
    let mut operations = Vec::new();
    let base = Path::new(base_path);
    
    // Find deleted paths
    for (path, is_dir) in original_paths {
        if !modified_paths.contains_key(path) {
            let full_path = base.join(path);
            operations.push(FileOperation::Delete { 
                path: full_path.to_string_lossy().to_string() 
            });
        }
    }
    
    // Find new paths (directories first)
    for (path, is_dir) in modified_paths {
        if !original_paths.contains_key(path) && *is_dir {
            let full_path = base.join(path);
            operations.push(FileOperation::CreateDir { 
                path: full_path.to_string_lossy().to_string() 
            });
        }
    }
    
    // Find renamed paths
    // This is a simple implementation that doesn't handle complex renames
    // A more sophisticated algorithm would be needed for that
    
    Ok(operations)
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