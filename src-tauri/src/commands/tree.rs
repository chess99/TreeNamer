use std::path::{Path, PathBuf};
use std::fs;
use tauri::command;
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use regex::Regex;

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

#[derive(Debug)]
struct TreeNode {
    name: String,
    is_dir: bool,
    children: Vec<TreeNode>,
}

#[command]
pub fn parse_directory(path: &str, options: Option<DirectoryOptions>) -> Result<String, String> {
    let options = options.unwrap_or_default();
    
    let path = Path::new(path);
    if !path.exists() {
        return Err(format!("Path does not exist: {}", path.display()));
    }
    
    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", path.display()));
    }
    
    // Create regex for exclusion pattern
    let exclude_regex = match Regex::new(&options.exclude_pattern) {
        Ok(regex) => regex,
        Err(e) => return Err(format!("Invalid exclude pattern: {}", e)),
    };
    
    // Build the tree structure
    let tree = build_tree(path, &exclude_regex, options.max_depth, options.follow_symlinks, options.show_hidden, 0)?;
    
    // Format the tree as text
    let mut result = String::new();
    let root_name = path.file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string_lossy().to_string());
    
    result.push_str(&format!("{}/\n", root_name));
    format_tree(&tree.children, &mut result, "", true);
    
    Ok(result)
}

fn build_tree(
    path: &Path, 
    exclude_regex: &Regex, 
    max_depth: usize, 
    follow_symlinks: bool, 
    show_hidden: bool, 
    current_depth: usize
) -> Result<TreeNode, String> {
    let name = path.file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string_lossy().to_string());
    
    let mut node = TreeNode {
        name,
        is_dir: true,
        children: Vec::new(),
    };
    
    // Stop recursion if we've reached max depth
    if current_depth >= max_depth {
        return Ok(node);
    }
    
    // Read directory entries
    let entries = match fs::read_dir(path) {
        Ok(entries) => entries,
        Err(e) => return Err(format!("Failed to read directory {}: {}", path.display(), e)),
    };
    
    // Process each entry
    let mut children = Vec::new();
    for entry_result in entries {
        let entry = match entry_result {
            Ok(entry) => entry,
            Err(e) => {
                eprintln!("Error reading entry: {}", e);
                continue;
            }
        };
        
        let entry_path = entry.path();
        let entry_name = entry_path.file_name()
            .map(|name| name.to_string_lossy().to_string())
            .unwrap_or_default();
        
        // Skip hidden files if not showing them
        if !show_hidden && entry_name.starts_with('.') {
            continue;
        }
        
        // Skip excluded patterns
        if exclude_regex.is_match(&entry_name) {
            continue;
        }
        
        let metadata = match if follow_symlinks {
            fs::metadata(&entry_path)
        } else {
            fs::symlink_metadata(&entry_path)
        } {
            Ok(metadata) => metadata,
            Err(e) => {
                eprintln!("Error reading metadata for {}: {}", entry_path.display(), e);
                continue;
            }
        };
        
        if metadata.is_dir() {
            // Recursively process subdirectory
            match build_tree(&entry_path, exclude_regex, max_depth, follow_symlinks, show_hidden, current_depth + 1) {
                Ok(child_node) => children.push(child_node),
                Err(e) => eprintln!("Error processing directory {}: {}", entry_path.display(), e),
            }
        } else {
            // Add file node
            children.push(TreeNode {
                name: entry_name,
                is_dir: false,
                children: Vec::new(),
            });
        }
    }
    
    // Sort children: directories first, then files, both alphabetically
    children.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.cmp(&b.name),
        }
    });
    
    node.children = children;
    Ok(node)
}

fn format_tree(nodes: &[TreeNode], result: &mut String, prefix: &str, is_last: bool) {
    for (i, node) in nodes.iter().enumerate() {
        let is_last_node = i == nodes.len() - 1;
        let connector = if is_last_node { "└── " } else { "├── " };
        
        result.push_str(&format!("{}{}", prefix, connector));
        
        if node.is_dir {
            result.push_str(&format!("{}/\n", node.name));
            
            let new_prefix = if is_last_node {
                format!("{}    ", prefix)
            } else {
                format!("{}│   ", prefix)
            };
            
            format_tree(&node.children, result, &new_prefix, is_last_node);
        } else {
            result.push_str(&format!("{}\n", node.name));
        }
    }
} 