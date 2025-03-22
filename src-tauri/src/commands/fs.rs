use std::path::{Path, PathBuf};
use std::fs;
use tauri::command;
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::collections::HashSet;

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
    println!("apply_operations called with path: {}", path);
    
    let base_path = Path::new(path);
    if !base_path.exists() {
        println!("Error: Path does not exist: {}", base_path.display());
        return Err(format!("Path does not exist: {}", base_path.display()));
    }
    
    println!("Extracting paths from tree strings...");
    // Parse the original and modified trees
    let original_paths = parse_tree_text(original_tree)?;
    let modified_paths = parse_tree_text(modified_tree)?;
    
    println!("Original paths: {}, Modified paths: {}", original_paths.len(), modified_paths.len());
    
    println!("Generating operations...");
    // Generate operations
    let operations = generate_operations(path, &original_paths, &modified_paths)?;
    
    println!("Generated {} operations", operations.len());
    
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
    
    println!("All operations applied successfully");
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

pub fn parse_tree_text(tree_text: &str) -> Result<HashMap<String, bool>, String> {
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
            // Use Unicode-aware slicing by converting to a vector of chars first
            name_part.chars().skip(4).collect::<String>()
        } else if name_part.starts_with("└── ") {
            // Use Unicode-aware slicing by converting to a vector of chars first
            name_part.chars().skip(4).collect::<String>()
        } else {
            name_part.to_string()
        };
        
        let is_dir = name.ends_with('/');
        let clean_name = if is_dir { name.trim_end_matches('/').to_string() } else { name };
        
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

pub fn generate_operations(
    base_path: &str, 
    original_paths: &HashMap<String, bool>, 
    modified_paths: &HashMap<String, bool>
) -> Result<Vec<FileOperation>, String> {
    let mut operations = Vec::new();
    let base = Path::new(base_path);
    
    // Track paths that have been processed
    let mut processed_original = HashSet::new();
    let mut processed_modified = HashSet::new();
    
    // Find common parent directories for potential renames
    let mut original_dirs: Vec<_> = original_paths.iter()
        .filter(|(_, &is_dir)| is_dir)
        .map(|(path, _)| path)
        .collect();
    
    let mut modified_dirs: Vec<_> = modified_paths.iter()
        .filter(|(_, &is_dir)| is_dir)
        .map(|(path, _)| path)
        .collect();
    
    // Sort by path length (descending) to process deepest paths first
    original_dirs.sort_by(|a, b| b.len().cmp(&a.len()));
    modified_dirs.sort_by(|a, b| b.len().cmp(&a.len()));
    
    // Step 1: Detect root directory renames first (special case)
    // Find original directories without parents (root level)
    let root_original_dirs: Vec<_> = original_dirs.iter()
        .filter(|path| !path.contains('/') && !processed_original.contains(**path))
        .collect();
    
    // Find modified directories without parents (root level)
    let root_modified_dirs: Vec<_> = modified_dirs.iter()
        .filter(|path| !path.contains('/') && !processed_modified.contains(**path))
        .collect();
    
    // Try to match root directories by content similarity
    for &original_dir in &root_original_dirs {
        let original_children = get_children(original_paths, original_dir);
        
        // If no children, use a name similarity approach
        if original_children.is_empty() {
            continue;
        }
        
        for &modified_dir in &root_modified_dirs {
            if processed_modified.contains(*modified_dir) || original_dir == modified_dir {
                continue;
            }
            
            let modified_children = get_children(modified_paths, modified_dir);
            
            // Try a more lenient threshold for root directories
            if is_similar_directory(&original_children, &modified_children, 0.3) {
                // We found a probable directory rename
                processed_original.insert((*original_dir).clone());
                processed_modified.insert((*modified_dir).clone());
                
                // Add the rename operation
                operations.push(FileOperation::Rename { 
                    from: base.join(original_dir).to_string_lossy().to_string(),
                    to: base.join(modified_dir).to_string_lossy().to_string()
                });
                
                // Mark all children as processed so we don't process them again
                for child in original_children.keys() {
                    processed_original.insert(child.clone());
                }
                
                for child in modified_children.keys() {
                    processed_modified.insert(child.clone());
                }
                
                break;
            }
        }
    }
    
    // Step 2: Detect other directory renames by comparing contents
    for original_dir in &original_dirs {
        if processed_original.contains(*original_dir) {
            continue;
        }
        
        let original_children = get_children(original_paths, original_dir);
        
        for modified_dir in &modified_dirs {
            if processed_modified.contains(*modified_dir) || original_dir == modified_dir {
                continue;
            }
            
            let modified_children = get_children(modified_paths, modified_dir);
            
            // Calculate similarity between directories
            // Use a lower threshold for root level directories
            let threshold = if original_dir.contains('/') { 0.7 } else { 0.5 };
            if is_similar_directory(&original_children, &modified_children, threshold) {
                // We found a probable directory rename
                processed_original.insert((*original_dir).clone());
                processed_modified.insert((*modified_dir).clone());
                
                // Add the rename operation
                operations.push(FileOperation::Rename { 
                    from: base.join(original_dir).to_string_lossy().to_string(),
                    to: base.join(modified_dir).to_string_lossy().to_string()
                });
                
                // Mark all children as processed so we don't process them again
                for child in original_children.keys() {
                    processed_original.insert(child.clone());
                }
                
                for child in modified_children.keys() {
                    processed_modified.insert(child.clone());
                }
                
                break;
            }
        }
    }
    
    // Step 3: Look for file renames by comparing name similarity
    let original_files: Vec<_> = original_paths.iter()
        .filter(|(path, &is_dir)| !is_dir && !processed_original.contains(*path))
        .collect();
    
    let modified_files: Vec<_> = modified_paths.iter()
        .filter(|(path, &is_dir)| !is_dir && !processed_modified.contains(*path))
        .collect();
    
    // For each original file that wasn't processed yet
    for (original_path, _) in &original_files {
        if processed_original.contains(*original_path) {
            continue;
        }
        
        let original_name = Path::new(original_path).file_name()
            .map(|name| name.to_string_lossy().to_string())
            .unwrap_or_default();
            
        let parent_path = Path::new(original_path).parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();
        
        // Find the most similar file in the modified files
        let mut best_match = None;
        let mut best_similarity = 0.0;
        
        for (modified_path, _) in &modified_files {
            if processed_modified.contains(*modified_path) {
                continue;
            }
            
            let modified_name = Path::new(modified_path).file_name()
                .map(|name| name.to_string_lossy().to_string())
                .unwrap_or_default();
                
            let modified_parent = Path::new(modified_path).parent()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default();
            
            // Check if files are in the same or similar directory
            // Consider files in all directories, but with higher similarity requirement
            // for files in different directories
            let parent_match = parent_path == modified_parent || 
                              processed_original.contains(&parent_path);
            
            let min_threshold = if parent_match { 0.3 } else { 0.6 };
            let similarity = name_similarity(&original_name, &modified_name);
            
            if similarity > min_threshold && similarity > best_similarity {
                best_similarity = similarity;
                best_match = Some(modified_path);
            }
        }
        
        if let Some(modified_path) = best_match {
            // Add rename operation
            operations.push(FileOperation::Rename { 
                from: base.join(original_path).to_string_lossy().to_string(),
                to: base.join(modified_path).to_string_lossy().to_string()
            });
            
            processed_original.insert((*original_path).clone());
            processed_modified.insert((*modified_path).clone());
        }
    }
    
    // Step 4: Add creation operations for new directories
    for (path, &is_dir) in modified_paths {
        if !processed_modified.contains(path) && is_dir && !original_paths.contains_key(path) {
            operations.push(FileOperation::CreateDir { 
                path: base.join(path).to_string_lossy().to_string() 
            });
            processed_modified.insert(path.clone());
        }
    }
    
    // Step 5: Add creation operations for new files
    for (path, &is_dir) in modified_paths {
        if !processed_modified.contains(path) && !is_dir && !original_paths.contains_key(path) {
            // This is a new file - but it might be created as part of a parent directory creation
            let parent = Path::new(path).parent().map(|p| p.to_string_lossy().to_string());
            if let Some(parent_path) = parent {
                if !processed_modified.contains(&parent_path) && modified_paths.contains_key(&parent_path) {
                    // Parent will be created, we don't need a separate operation
                    processed_modified.insert(path.clone());
                    continue;
                }
            }
            
            // Create file (handled by the backend as copy from an empty file)
            operations.push(FileOperation::CreateDir { 
                path: base.join(path).to_string_lossy().to_string() 
            });
            processed_modified.insert(path.clone());
        }
    }
    
    // Step 6: Add deletion operations
    for (path, &is_dir) in original_paths {
        if !processed_original.contains(path) {
            operations.push(FileOperation::Delete { 
                path: base.join(path).to_string_lossy().to_string() 
            });
            processed_original.insert(path.clone());
        }
    }
    
    // Sort operations for correct application order
    // 1. First create directories
    // 2. Then rename files/directories
    // 3. Finally delete files/directories
    operations.sort_by(|a, b| {
        match (a, b) {
            (FileOperation::CreateDir { .. }, FileOperation::Rename { .. }) => std::cmp::Ordering::Less,
            (FileOperation::CreateDir { .. }, FileOperation::Delete { .. }) => std::cmp::Ordering::Less,
            (FileOperation::Rename { .. }, FileOperation::Delete { .. }) => std::cmp::Ordering::Less,
            (FileOperation::Rename { .. }, FileOperation::CreateDir { .. }) => std::cmp::Ordering::Greater,
            (FileOperation::Delete { .. }, FileOperation::CreateDir { .. }) => std::cmp::Ordering::Greater,
            (FileOperation::Delete { .. }, FileOperation::Rename { .. }) => std::cmp::Ordering::Greater,
            _ => std::cmp::Ordering::Equal,
        }
    });
    
    Ok(operations)
}

// Helper function to get all children of a directory
pub fn get_children(paths: &HashMap<String, bool>, dir_path: &str) -> HashMap<String, bool> {
    let mut children = HashMap::new();
    let prefix = if dir_path.ends_with('/') { dir_path } else { &format!("{}/", dir_path) };
    
    for (path, &is_dir) in paths {
        if path != dir_path && path.starts_with(prefix) {
            children.insert(path.clone(), is_dir);
        }
    }
    
    children
}

// Helper function to check if two directories are similar based on their children
pub fn is_similar_directory(dir1: &HashMap<String, bool>, dir2: &HashMap<String, bool>, threshold: f64) -> bool {
    if dir1.is_empty() && dir2.is_empty() {
        return true;
    }
    
    if dir1.is_empty() || dir2.is_empty() {
        return false;
    }
    
    // Get all filenames from both directories
    let names1: HashSet<_> = dir1.keys()
        .filter_map(|path| Path::new(path).file_name())
        .map(|name| name.to_string_lossy().to_string())
        .collect();
    
    let names2: HashSet<_> = dir2.keys()
        .filter_map(|path| Path::new(path).file_name())
        .map(|name| name.to_string_lossy().to_string())
        .collect();
    
    // Calculate Jaccard similarity (intersection / union)
    let intersection = names1.intersection(&names2).count() as f64;
    let union = names1.union(&names2).count() as f64;
    
    intersection / union >= threshold
}

// Helper function to calculate string similarity
pub fn name_similarity(name1: &str, name2: &str) -> f64 {
    if name1 == name2 {
        return 1.0;
    }
    
    // Simple similarity measure: length of longest common substring / max length
    let len1 = name1.chars().count();
    let len2 = name2.chars().count();
    
    if len1 == 0 || len2 == 0 {
        return 0.0;
    }
    
    // Find common prefix
    let common_prefix_len = name1.chars().zip(name2.chars())
        .take_while(|(c1, c2)| c1 == c2)
        .count();
    
    // Find common suffix
    let common_suffix_len = name1.chars().rev().zip(name2.chars().rev())
        .take_while(|(c1, c2)| c1 == c2)
        .count();
    
    // Ensure we don't double-count in small strings
    let common_len = std::cmp::min(common_prefix_len + common_suffix_len, std::cmp::max(len1, len2));
    
    common_len as f64 / std::cmp::max(len1, len2) as f64
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