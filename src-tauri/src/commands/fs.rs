use std::path::Path;
use std::fs;
use tauri::command;
use serde::{Serialize, Deserialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum FileOperation {
    Rename { from: String, to: String },
}

#[derive(Debug, Serialize)]
pub struct OperationResult {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct TreeNode {
    id: String,
    name: String,
    is_dir: bool,
    children: Vec<TreeNode>,
    #[serde(rename = "oldPath")]
    old_path: Option<String>,
    #[serde(rename = "newPath")]
    new_path: Option<String>,
}

// 将TreeNode转换为HashMap<id -> (path, is_dir)>
fn tree_node_to_id_paths(node: &TreeNode, parent_path: &str) -> HashMap<String, (String, bool)> {
    let mut id_paths = HashMap::new();
    
    let current_path = if parent_path.is_empty() {
        node.name.clone()
    } else {
        format!("{}/{}", parent_path, node.name)
    };
    
    // 存储节点ID -> (路径, 是否是目录)
    id_paths.insert(node.id.clone(), (current_path.clone(), node.is_dir));
    
    for child in &node.children {
        let child_id_paths = tree_node_to_id_paths(child, &current_path);
        id_paths.extend(child_id_paths);
    }
    
    id_paths
}

// 将TreeNode转换为HashMap<path -> id>
pub fn tree_node_to_path_ids(node: &TreeNode, parent_path: &str) -> HashMap<String, String> {
    let mut path_ids = HashMap::new();
    
    let current_path = if parent_path.is_empty() {
        node.name.clone()
    } else {
        format!("{}/{}", parent_path, node.name)
    };
    
    // 存储路径 -> 节点ID
    path_ids.insert(current_path.clone(), node.id.clone());
    
    for child in &node.children {
        let child_path_ids = tree_node_to_path_ids(child, &current_path);
        path_ids.extend(child_path_ids);
    }
    
    path_ids
}

// 用于调试的转换函数，生成与以前相同的路径->is_dir映射
fn tree_node_to_paths(node: &TreeNode, parent_path: &str) -> HashMap<String, bool> {
    let mut paths = HashMap::new();
    
    let current_path = if parent_path.is_empty() {
        node.name.clone()
    } else {
        format!("{}/{}", parent_path, node.name)
    };
    
    paths.insert(current_path.clone(), node.is_dir);
    
    for child in &node.children {
        let child_paths = tree_node_to_paths(child, &current_path);
        paths.extend(child_paths);
    }
    
    paths
}

// 新函数：仅生成操作但不执行，用于测试
pub fn generate_operations_from_json(
    base_path: &str, 
    original_tree: &str, 
    modified_tree: &str
) -> Result<Vec<FileOperation>, String> {
    println!("generate_operations_from_json called with path: {}", base_path);
    
    let base_path = Path::new(base_path);
    if !base_path.exists() {
        println!("Error: Path does not exist: {}", base_path.display());
        return Err(format!("Path does not exist: {}", base_path.display()));
    }
    
    println!("Parsing tree JSON...");
    // Parse the original and modified trees from JSON
    let original_node: TreeNode = match serde_json::from_str(original_tree) {
        Ok(tree) => tree,
        Err(e) => {
            println!("Error parsing original tree JSON: {}", e);
            return Err(format!("Invalid original tree JSON: {}", e));
        }
    };
    
    let modified_node: TreeNode = match serde_json::from_str(modified_tree) {
        Ok(tree) => tree,
        Err(e) => {
            println!("Error parsing modified tree JSON: {}", e);
            return Err(format!("Invalid modified tree JSON: {}", e));
        }
    };
    
    // 构建每个ID对应的路径映射
    let original_id_paths = tree_node_to_id_paths(&original_node, "");
    let modified_id_paths = tree_node_to_id_paths(&modified_node, "");
    
    println!("Original IDs: {}, Modified IDs: {}", 
             original_id_paths.len(), modified_id_paths.len());
    
    // 输出所有ID信息进行调试
    println!("Original ID paths:");
    for (id, (path, is_dir)) in &original_id_paths {
        println!("  ID: {}, Path: {}, IsDir: {}", id, path, is_dir);
    }
    
    println!("Modified ID paths:");
    for (id, (path, is_dir)) in &modified_id_paths {
        println!("  ID: {}, Path: {}, IsDir: {}", id, path, is_dir);
    }
    
    // 获取基本路径的文件名，用于创建绝对路径
    let base_dir_name = base_path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");
    
    // 生成需要重命名的操作
    let mut operations = Vec::new();
    
    // 遍历所有ID，检查是否有路径变化
    for (id, (mod_path, _)) in &modified_id_paths {
        // 查找原始树中相同ID的节点
        if let Some((orig_path, _)) = original_id_paths.get(id) {
            // 如果路径变了，就是重命名操作
            if orig_path != mod_path {
                println!("Found rename: {} -> {}", orig_path, mod_path);
                
                // 将相对路径转换为绝对路径
                let from_absolute = base_path.join(orig_path.trim_start_matches(&format!("{}/", base_dir_name)));
                let to_absolute = base_path.join(mod_path.trim_start_matches(&format!("{}/", base_dir_name)));
                
                operations.push(FileOperation::Rename {
                    from: from_absolute.to_string_lossy().to_string(),
                    to: to_absolute.to_string_lossy().to_string(),
                });
            }
        } else {
            // ID在修改后的树中存在，但在原始树中不存在
            println!("Warning: ID {} in modified tree not found in original tree.", id);
        }
    }
    
    // 对重命名操作按照路径深度排序，深度更大的路径（文件）先处理
    operations.sort_by(|a, b| {
        let (FileOperation::Rename { from: from_a, .. }, FileOperation::Rename { from: from_b, .. }) = (a, b);
        // 先按照是否为目录排序（文件优先）
        let a_is_dir = Path::new(from_a).is_dir();
        let b_is_dir = Path::new(from_b).is_dir();
        
        if a_is_dir != b_is_dir {
            return if a_is_dir { std::cmp::Ordering::Greater } else { std::cmp::Ordering::Less };
        }
        
        // 然后按照路径深度排序（深度大的优先）
        let a_components = Path::new(from_a).components().count();
        let b_components = Path::new(from_b).components().count();
        return b_components.cmp(&a_components);
    });
    
    println!("Generated {} operations", operations.len());
    
    // 显示所有生成的操作
    for (i, op) in operations.iter().enumerate() {
        let FileOperation::Rename { from, to } = op;
        println!("Operation {}: {} -> {}", i+1, from, to);
    }
    
    Ok(operations)
}

#[command]
pub fn apply_operations(
    #[allow(non_snake_case)] dirPath: String, 
    #[allow(non_snake_case)] originalTree: String, 
    #[allow(non_snake_case)] modifiedTree: String
) -> Result<Vec<OperationResult>, String> {
    println!("apply_operations called with path: {}", dirPath);
    
    // 首先生成操作 - 现在只会生成重命名操作
    let operations = generate_operations_from_json(&dirPath, &originalTree, &modifiedTree)?;
    
    // 应用操作
    let mut results = Vec::new();
    
    // 重命名操作已经按照从文件到目录、从深到浅的顺序排序
    println!("Applying rename operations:");
    for (i, op) in operations.iter().enumerate() {
        let FileOperation::Rename { from, to } = op;
        println!("  {}. {} -> {}", i+1, from, to);
        
        let result = apply_operation(op);
        results.push(result);
    }
    
    println!("All operations applied successfully");
    Ok(results)
}

// 应用操作的函数
fn apply_operation(operation: &FileOperation) -> OperationResult {
    match operation {
        FileOperation::Rename { from, to } => {
            // 转换路径分隔符，在Windows系统上转换为反斜杠
            let from_normalized = if cfg!(windows) {
                from.replace('/', "\\")
            } else {
                from.clone()
            };
            
            let to_normalized = if cfg!(windows) {
                to.replace('/', "\\")
            } else {
                to.clone()
            };
            
            let from_path = Path::new(&from_normalized);
            let to_path = Path::new(&to_normalized);
            
            println!("Applying rename operation: from '{}' to '{}'", from_normalized, to_normalized);
            
            // Check if paths exist
            println!("From path exists: {}", from_path.exists());
            if let Some(parent) = to_path.parent() {
                println!("To parent exists: {}", parent.exists());
            }
            
            // Create parent directories if they don't exist
            if let Some(parent) = to_path.parent() {
                if !parent.exists() {
                    println!("Creating parent directory: {}", parent.display());
                    if let Err(e) = fs::create_dir_all(parent) {
                        println!("Failed to create parent directory: {}", e);
                        return OperationResult {
                            success: false,
                            message: format!("Failed to create parent directory: {}", e),
                        };
                    }
                    println!("Parent directory created successfully");
                }
            }
            
            // 如果源路径不存在，报告错误
            if !from_path.exists() {
                println!("Source path does not exist: {}", from_path.display());
                return OperationResult {
                    success: false,
                    message: format!("Source path does not exist: {}", from_path.display()),
                };
            }
            
            // 对目录的特殊处理
            if from_path.is_dir() {
                // 如果目标路径已经存在，先尝试删除（如果是空目录）
                if to_path.exists() && to_path.is_dir() {
                    println!("Target directory already exists, checking if it's empty...");
                    match fs::read_dir(to_path) {
                        Ok(entries) => {
                            if entries.count() == 0 {
                                println!("Target directory is empty, removing it");
                                if let Err(e) = fs::remove_dir(to_path) {
                                    println!("Failed to remove empty target directory: {}", e);
                                    // 继续尝试重命名，可能会失败
                                }
                            } else {
                                println!("Target directory is not empty, rename operation will likely fail");
                            }
                        },
                        Err(e) => {
                            println!("Failed to read target directory: {}", e);
                            // 继续尝试重命名，可能会失败
                        }
                    }
                }
            }
            
            println!("Attempting to rename file");
            match fs::rename(from_path, to_path) {
                Ok(_) => {
                    println!("Rename successful: {} to {}", from_normalized, to_normalized);
                    OperationResult {
                        success: true,
                        message: format!("Renamed {} to {}", from_normalized, to_normalized),
                    }
                },
                Err(e) => {
                    // 如果重命名失败，尝试手动实现目录复制和删除
                    if from_path.is_dir() && e.kind() == std::io::ErrorKind::DirectoryNotEmpty {
                        println!("Directory rename failed because directory not empty, trying manual copy...");
                        if let Err(copy_err) = copy_dir_recursively(from_path, to_path) {
                            println!("Failed to manually copy directory: {}", copy_err);
                            return OperationResult {
                                success: false,
                                message: format!("Failed to rename directory: {}. Manual copy also failed: {}", e, copy_err),
                            };
                        }
                        
                        // 复制成功后，删除源目录 (如果可能)
                        match fs::remove_dir_all(from_path) {
                            Ok(_) => {
                                println!("Successfully copied directory and removed original");
                                OperationResult {
                                    success: true,
                                    message: format!("Manually copied directory from {} to {}", from_normalized, to_normalized),
                                }
                            },
                            Err(rm_err) => {
                                println!("Directory copied but failed to remove original: {}", rm_err);
                                OperationResult {
                                    success: true, // 仍然认为是成功的，因为内容已经复制
                                    message: format!("Copied directory from {} to {} but could not remove original: {}", 
                                        from_normalized, to_normalized, rm_err),
                                }
                            }
                        }
                    } else {
                        println!("Rename failed: {} to {}: {}", from_normalized, to_normalized, e);
                        OperationResult {
                            success: false,
                            message: format!("Failed to rename {} to {}: {}", from_normalized, to_normalized, e),
                        }
                    }
                },
            }
        },
    }
}

// 递归复制目录及其内容
fn copy_dir_recursively(from: &Path, to: &Path) -> std::io::Result<()> {
    // 确保目标目录存在
    if !to.exists() {
        fs::create_dir_all(to)?;
    }
    
    // 遍历源目录中的所有条目
    for entry in fs::read_dir(from)? {
        let entry = entry?;
        let from_path = entry.path();
        let to_path = to.join(entry.file_name());
        
        if from_path.is_dir() {
            // 递归复制子目录
            copy_dir_recursively(&from_path, &to_path)?;
        } else {
            // 复制文件
            fs::copy(&from_path, &to_path)?;
        }
    }
    
    Ok(())
}

// 以下函数保持不变，但在新算法中可能不再需要
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

// 其他辅助函数保持不变
#[command]
pub fn is_protected_path(path: &str) -> bool {
    let path = Path::new(path);
    let protected_paths = [
        "/System", "/Library", "/usr", 
        "C:\\Windows", "C:\\Program Files", "C:\\Program Files (x86)"
    ];
    
    protected_paths.iter().any(|p| path.starts_with(p))
} 