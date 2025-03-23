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
    
    // 生成需要重命名的操作
    let mut operations = Vec::new();
    
    // 递归函数，遍历整个树来查找有oldPath但没有newPath的节点
    fn collect_rename_operations(
        node: &TreeNode, 
        base_path: &Path, 
        operations: &mut Vec<FileOperation>
    ) {
        // 检查当前节点是否有oldPath属性，表示这是一个重命名操作
        if let Some(old_path) = &node.old_path {
            // 如果有oldPath，则使用该值作为源路径
            let from_path = base_path.join(old_path).to_string_lossy().to_string();
            
            // 构建当前节点的新路径
            let new_path = if let Some(ref new_path) = node.new_path {
                // 如果显式提供了newPath，则使用它
                new_path.clone()
            } else {
                // 否则根据当前位置构建路径
                node.name.clone()
            };
            
            // 创建重命名操作
            println!("Found rename: {} -> {}", old_path, new_path);
            operations.push(FileOperation::Rename {
                from: from_path,
                to: base_path.join(new_path).to_string_lossy().to_string(),
            });
        }
        
        // 递归处理所有子节点
        for child in &node.children {
            collect_rename_operations(child, base_path, operations);
        }
    }
    
    // 从修改后的树开始收集重命名操作
    collect_rename_operations(&modified_node, base_path, &mut operations);
    
    // 如果没有找到任何操作，检查所有节点ID是否都匹配
    if operations.is_empty() {
        println!("No explicit rename operations found with oldPath/newPath. Checking IDs...");
        
        // 检查每个ID是否在两棵树中路径不同，这表示重命名
        for (id, (mod_path, _)) in &modified_id_paths {
            // 查找原始树中相同ID的节点
            if let Some((orig_path, _)) = original_id_paths.get(id) {
                // 如果路径变了，就是重命名操作
                if orig_path != mod_path {
                    println!("Found rename based on ID {}: {} -> {}", id, orig_path, mod_path);
                    
                    operations.push(FileOperation::Rename {
                        from: base_path.join(orig_path).to_string_lossy().to_string(),
                        to: base_path.join(mod_path).to_string_lossy().to_string(),
                    });
                }
            } else {
                // ID在修改后的树中存在，但在原始树中不存在
                println!("Warning: ID {} in modified tree not found in original tree.", id);
            }
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
    
    // 删除操作中可能包含的重复目录路径
    let base_path = Path::new(&dirPath);
    let base_name = base_path.file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    
    // 修复路径中可能包含的重复目录名
    let fixed_operations: Vec<FileOperation> = operations.into_iter()
        .map(|op| match op {
            FileOperation::Rename { from, to } => {
                // 检查路径是否包含重复目录，如 D:\__temp\__temp\file.txt
                let from_fixed = fix_duplicate_path(&from, &base_name);
                let to_fixed = fix_duplicate_path(&to, &base_name);
                
                if from != from_fixed || to != to_fixed {
                    println!("Fixed path:\n  From: {} -> {}\n  To: {} -> {}", 
                        from, from_fixed, to, to_fixed);
                }
                
                FileOperation::Rename { 
                    from: from_fixed,
                    to: to_fixed
                }
            }
        })
        .collect();
    
    // 重命名操作已经按照从文件到目录、从深到浅的顺序排序
    println!("Applying rename operations:");
    for (i, op) in fixed_operations.iter().enumerate() {
        let FileOperation::Rename { from, to } = op;
        println!("  {}. {} -> {}", i+1, from, to);
        
        let result = apply_operation(op);
        results.push(result);
    }
    
    println!("All operations applied successfully");
    Ok(results)
}

// 修复可能包含重复目录的路径
fn fix_duplicate_path(path: &str, base_name: &str) -> String {
    println!("Fixing path: {}", path);
    
    // Windows路径处理: 转换可能的 \ 为 /
    let normalized_path = path.replace('\\', "/");
    
    // 检查路径是否包含重复的基目录名称
    let base_path_pattern = format!("/{}/{}/", base_name, base_name);
    let base_start_pattern = format!("{}/{}/", base_name, base_name);
    
    let fixed_path = if normalized_path.contains(&base_path_pattern) {
        // 修复中间的重复目录名称
        normalized_path.replace(&base_path_pattern, format!("/{}/", base_name).as_str())
    } else if normalized_path.starts_with(&base_start_pattern) {
        // 修复开头的重复目录名称
        normalized_path.replacen(&base_start_pattern, format!("{}/", base_name).as_str(), 1)
    } else {
        normalized_path.clone()
    };
    
    // 如果有修复，记录日志
    if fixed_path != normalized_path {
        println!("  Fixed duplicate directory: {} -> {}", path, fixed_path);
    }
    
    // 转换回适合当前操作系统的路径分隔符
    if cfg!(windows) {
        fixed_path.replace('/', "\\")
    } else {
        fixed_path
    }
}

// 简化测试函数，测试确定目录重复情况
fn test_fix_duplicate_path() {
    println!("Running path fixing tests:");
    
    let test1 = fix_duplicate_path("D:\\__temp\\__temp\\file.txt", "__temp");
    println!("Test 1: D:\\__temp\\__temp\\file.txt -> {}", test1);
    assert_eq!(test1, "D:\\__temp\\file.txt".to_string());
    
    let test2 = fix_duplicate_path("D:\\dir\\dir\\subdir\\file.txt", "dir");
    println!("Test 2: D:\\dir\\dir\\subdir\\file.txt -> {}", test2);
    assert_eq!(test2, "D:\\dir\\subdir\\file.txt".to_string());
    
    let test3 = fix_duplicate_path("D:\\normal\\path\\file.txt", "normal");
    println!("Test 3: D:\\normal\\path\\file.txt -> {}", test3);
    assert_eq!(test3, "D:\\normal\\path\\file.txt".to_string());
    
    println!("Path fixing tests completed!");
}

// 应用操作的函数
fn apply_operation(operation: &FileOperation) -> OperationResult {
    // 运行简单测试
    #[cfg(debug_assertions)]
    test_fix_duplicate_path();
    
    match operation {
        FileOperation::Rename { from, to } => {
            let from_path = Path::new(from);
            let to_path = Path::new(to);
            
            println!("Applying rename operation: from '{}' to '{}'", from, to);
            
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
            
            println!("Attempting to rename file");
            match fs::rename(from_path, to_path) {
                Ok(_) => {
                    println!("Rename successful: {} to {}", from, to);
                    OperationResult {
                        success: true,
                        message: format!("Renamed {} to {}", from, to),
                    }
                },
                Err(e) => {
                    println!("Rename failed: {} to {}: {}", from, to, e);
                    OperationResult {
                        success: false,
                        message: format!("Failed to rename {} to {}: {}", from, to, e),
                    }
                },
            }
        },
    }
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