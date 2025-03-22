use std::path::{Path};
use std::fs;
use tauri::command;
use serde::{Serialize, Deserialize};
use regex::Regex;
use uuid::Uuid;
use std::error::Error;

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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TreeNode {
    pub id: String,
    pub name: String,
    pub is_dir: bool,
    pub children: Vec<TreeNode>,
}

#[command]
pub fn parse_directory(
    #[allow(non_snake_case)] dirPath: String, 
    options: Option<DirectoryOptions>
) -> Result<String, String> {
    println!("parse_directory called with dirPath: {:?}", dirPath);
    println!("parse_directory options parameter: {:?}", options);
    
    let path = Path::new(&dirPath);
    if !path.exists() {
        let error_msg = format!("Path does not exist: {}", dirPath);
        println!("Error: {}", error_msg);
        return Err(error_msg);
    }
    if !path.is_dir() {
        let error_msg = format!("Path is not a directory: {}", dirPath);
        println!("Error: {}", error_msg);
        return Err(error_msg);
    }
    
    let options_to_use = options.unwrap_or_default();
    println!("Using options: {:?}", options_to_use);
    
    let tree = build_tree_with_options(path, options_to_use).map_err(|e| {
        let error_msg = e.to_string();
        println!("Error building tree: {}", error_msg);
        error_msg
    })?;
    
    let json = match serde_json::to_string(&tree) {
        Ok(json) => {
            println!("Successfully serialized tree to JSON. Length: {} bytes", json.len());
            json
        },
        Err(e) => {
            let error_msg = e.to_string();
            println!("Error serializing tree to JSON: {}", error_msg);
            return Err(error_msg);
        }
    };
    
    println!("parse_directory completed successfully");
    Ok(json)
}

pub fn build_tree_with_options(path: &Path, options: DirectoryOptions) -> Result<TreeNode, Box<dyn Error>> {
    println!("parse_directory called with path: {}", path.display());
    
    // Create regex for exclusion pattern
    let exclude_regex = match Regex::new(&options.exclude_pattern) {
        Ok(regex) => regex,
        Err(e) => {
            println!("Error: Invalid exclude pattern: {}", e);
            return Err(format!("Invalid exclude pattern: {}", e).into());
        }
    };
    
    println!("Building tree structure...");
    // Build the tree structure
    let tree = build_tree_internal(path, &exclude_regex, options.max_depth, options.follow_symlinks, options.show_hidden, 0)?;
    
    Ok(tree)
}

pub fn build_tree(path: &Path) -> Result<TreeNode, Box<dyn Error>> {
    build_tree_with_options(path, DirectoryOptions::default())
}

fn build_tree_internal(
    path: &Path, 
    exclude_regex: &Regex, 
    max_depth: usize, 
    follow_symlinks: bool, 
    show_hidden: bool, 
    current_depth: usize
) -> Result<TreeNode, Box<dyn Error>> {
    let name = path.file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string_lossy().to_string());
    
    let mut node = TreeNode {
        id: Uuid::new_v4().to_string(),  // 生成唯一ID
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
        Err(e) => return Err(format!("Failed to read directory {}: {}", path.display(), e).into()),
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
            match build_tree_internal(&entry_path, exclude_regex, max_depth, follow_symlinks, show_hidden, current_depth + 1) {
                Ok(child_node) => children.push(child_node),
                Err(e) => eprintln!("Error processing directory {}: {}", entry_path.display(), e),
            }
        } else {
            // Add file node
            children.push(TreeNode {
                id: Uuid::new_v4().to_string(),  // 生成唯一ID
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

fn format_tree(nodes: &[TreeNode], result: &mut String, prefix: &str, _is_last: bool) {
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