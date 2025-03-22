use std::path::{Path, PathBuf};
use std::fs;
use tauri::command;
use serde::{Serialize, Deserialize};
use std::time::{SystemTime, UNIX_EPOCH};
use std::io;
use uuid::Uuid;
use std::env;
use std::fs::File;
use std::io::Write;
use md5;

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupInfo {
    pub path: String,
    pub timestamp: u64,
}

#[derive(Debug, Serialize, Deserialize)]
struct VirtualBackup {
    timestamp: u64,
    base_directory: String,
    entities: Vec<FileEntity>,
}

#[derive(Debug, Serialize, Deserialize)]
struct FileEntity {
    id: String,
    path: String,
    is_directory: bool,
}

// 获取最近一次备份的路径
fn get_last_backup_path(dir_path: &str) -> PathBuf {
    let backup_dir = get_backup_dir();
    let _timestamp = get_timestamp_string();
    
    // 使用目录路径的哈希作为标识符，确保不同目录的备份不会冲突
    let path_hash = format!("{:x}", md5::compute(dir_path));
    backup_dir.join(format!("last_backup_{}.json", path_hash))
}

// 获取当前时间戳
fn get_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

// 获取当前时间戳字符串
fn get_timestamp_string() -> String {
    get_timestamp().to_string()
}

// 获取应用程序备份目录
fn get_backup_dir() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let appdata = env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
        Path::new(&appdata).join("TreeNamer").join("backups")
    }
    
    #[cfg(target_os = "macos")]
    {
        let home = env::var("HOME").unwrap_or_else(|_| ".".to_string());
        Path::new(&home).join("Library").join("Application Support").join("TreeNamer").join("backups")
    }
    
    #[cfg(target_os = "linux")]
    {
        let home = env::var("HOME").unwrap_or_else(|_| ".".to_string());
        Path::new(&home).join(".treenamer").join("backups")
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Path::new(".").join(".treenamer").join("backups")
    }
}

#[command]
pub fn create_backup(path: &str, tree_text: Option<&str>) -> Result<BackupInfo, String> {
    let source_path = Path::new(path);
    if !source_path.exists() {
        return Err(format!("Source path does not exist: {}", path));
    }
    
    // 尝试从tree_text创建虚拟备份，如果没有提供则自动生成
    let tree_content = match tree_text {
        Some(content) => content.to_string(),
        None => match crate::commands::parse_directory(path, None) {
            Ok(content) => content,
            Err(e) => return Err(format!("Failed to auto-generate tree text: {}", e)),
        },
    };
    
    // 创建备份目录
    let backup_dir = get_backup_dir();
    if let Err(e) = fs::create_dir_all(&backup_dir) {
        return Err(format!("Failed to create backup directory: {}", e));
    }
    
    // 解析树结构为实体列表
    let entities = match parse_tree_to_entities(&tree_content) {
        Ok(entities) => entities,
        Err(e) => return Err(format!("Failed to parse tree text: {}", e)),
    };
    
    // 创建虚拟备份
    let timestamp = get_timestamp();
    let virtual_backup = VirtualBackup {
        timestamp,
        base_directory: path.to_string(),
        entities,
    };
    
    // 序列化为JSON
    let json = match serde_json::to_string_pretty(&virtual_backup) {
        Ok(json) => json,
        Err(e) => return Err(format!("Failed to serialize backup: {}", e)),
    };
    
    // 保存到文件
    let backup_path = get_last_backup_path(path);
    let mut file = match File::create(&backup_path) {
        Ok(file) => file,
        Err(e) => return Err(format!("Failed to create backup file: {}", e)),
    };
    
    if let Err(e) = file.write_all(json.as_bytes()) {
        return Err(format!("Failed to write backup file: {}", e));
    }
    
    Ok(BackupInfo {
        path: backup_path.to_string_lossy().to_string(),
        timestamp,
    })
}

fn parse_tree_to_entities(tree_text: &str) -> Result<Vec<FileEntity>, String> {
    let mut entities = Vec::new();
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
    entities.push(FileEntity {
        id: Uuid::new_v4().to_string(),
        path: root_name.to_string(),
        is_directory: true,
    });
    
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
            name_part.chars().skip(4).collect::<String>()
        } else if name_part.starts_with("└── ") {
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
        current_path.push(clean_name.clone());
        
        // Add to entities
        let full_path = current_path.join("/");
        entities.push(FileEntity {
            id: Uuid::new_v4().to_string(),
            path: full_path,
            is_directory: is_dir,
        });
    }
    
    Ok(entities)
}

#[command]
pub fn undo_last_change(path: &str) -> Result<(), String> {
    println!("undo_last_change called with path: {}", path);
    
    let source_path = Path::new(path);
    if !source_path.exists() {
        println!("Error: Directory does not exist: {}", path);
        return Err(format!("Directory does not exist: {}", path));
    }
    
    // 获取最近一次备份的路径
    let backup_path = get_last_backup_path(path);
    println!("Looking for backup at path: {:?}", backup_path);
    
    if !backup_path.exists() {
        println!("Error: No previous backup found at {:?}", backup_path);
        return Err("No previous backup found to undo changes".to_string());
    }
    
    println!("Found backup file, attempting to restore...");
    // 从备份恢复
    let result = restore_virtual_backup(&backup_path);
    match &result {
        Ok(_) => println!("Successfully restored from backup"),
        Err(e) => println!("Failed to restore from backup: {}", e),
    }
    
    result
}

fn restore_virtual_backup(backup_path: &Path) -> Result<(), String> {
    println!("Attempting to restore from backup file: {:?}", backup_path);
    
    // Read and parse the virtual backup
    let content = match fs::read_to_string(backup_path) {
        Ok(content) => {
            println!("Successfully read backup file, content length: {} bytes", content.len());
            content
        },
        Err(e) => {
            println!("Failed to read backup file: {}", e);
            return Err(format!("Failed to read backup file: {}", e));
        }
    };
    
    let backup: VirtualBackup = match serde_json::from_str::<VirtualBackup>(&content) {
        Ok(backup) => {
            println!("Successfully parsed backup data with {} entities", backup.entities.len());
            backup
        },
        Err(e) => {
            println!("Failed to parse backup file: {}", e);
            return Err(format!("Failed to parse backup file: {}", e));
        }
    };
    
    // Get the target directory
    let target_dir = Path::new(&backup.base_directory);
    println!("Target directory for restore: {:?}", target_dir);
    
    if !target_dir.exists() {
        println!("Target directory does not exist: {:?}", target_dir);
        return Err(format!("Target directory does not exist: {}", backup.base_directory));
    }
    
    // Generate operations to transform the current directory to match the backup
    println!("Generating restore operations...");
    let operations = match generate_restore_operations(target_dir, &backup.entities) {
        Ok(ops) => {
            println!("Generated {} restore operations", ops.len());
            ops
        },
        Err(e) => {
            println!("Failed to generate restore operations: {}", e);
            return Err(format!("Failed to generate restore operations: {}", e));
        }
    };
    
    // Apply operations
    println!("Applying {} restore operations", operations.len());
    for (index, op) in operations.iter().enumerate() {
        println!("Applying operation {}/{}: {:?}", index + 1, operations.len(), op);
        if let Err(e) = apply_restore_operation(op) {
            println!("Failed to apply operation: {}", e);
            return Err(format!("Failed to apply operation: {}", e));
        }
    }
    
    println!("All restore operations completed successfully");
    Ok(())
}

#[derive(Debug)]
enum RestoreOperation {
    CreateDir { path: String },
    Rename { from: String, to: String },
    Delete { path: String },
}

fn generate_restore_operations(target_dir: &Path, backup_entities: &[FileEntity]) -> Result<Vec<RestoreOperation>, String> {
    println!("Generating restore operations for {} entities", backup_entities.len());
    
    let mut operations = Vec::new();
    
    // 首先，确保目标目录存在
    if !target_dir.exists() {
        if let Err(e) = fs::create_dir_all(target_dir) {
            return Err(format!("Failed to create target directory: {}", e));
        }
    }
    
    // 我们将针对每一个备份的实体创建恢复操作
    for entity in backup_entities {
        let relative_path = &entity.path;
        let target_path = target_dir.join(relative_path);
        
        println!("Processing entity: {} (is_dir: {})", relative_path, entity.is_directory);
        
        if entity.is_directory {
            // 对于目录，如果不存在就创建它
            if !target_path.exists() {
                println!("Directory does not exist, creating: {:?}", target_path);
                operations.push(RestoreOperation::CreateDir { 
                    path: target_path.to_string_lossy().to_string() 
                });
            } else if !target_path.is_dir() {
                // 如果存在但不是目录，需要先删除再创建
                println!("Path exists but is not a directory, will recreate: {:?}", target_path);
                operations.push(RestoreOperation::Delete { 
                    path: target_path.to_string_lossy().to_string() 
                });
                operations.push(RestoreOperation::CreateDir { 
                    path: target_path.to_string_lossy().to_string() 
                });
            }
        } else {
            // 对于文件，我们在恢复时只需确保它所在的目录存在
            // 这是一个简化的实现，实际的文件内容恢复需要更复杂的逻辑
            if let Some(parent) = target_path.parent() {
                if !parent.exists() {
                    println!("Parent directory does not exist, creating: {:?}", parent);
                    operations.push(RestoreOperation::CreateDir { 
                        path: parent.to_string_lossy().to_string() 
                    });
                }
            }
        }
    }
    
    // 将所有冗余的目录创建操作合并
    operations.sort_by(|a, b| {
        match (a, b) {
            (RestoreOperation::CreateDir { path: path_a }, RestoreOperation::CreateDir { path: path_b }) => {
                path_a.cmp(path_b)
            },
            _ => std::cmp::Ordering::Equal,
        }
    });
    operations.dedup_by(|a, b| {
        match (a, b) {
            (RestoreOperation::CreateDir { path: path_a }, RestoreOperation::CreateDir { path: path_b }) => {
                path_a == path_b
            },
            _ => false,
        }
    });
    
    // 打印操作列表以便调试
    println!("Generated {} restore operations", operations.len());
    for op in &operations {
        println!("Operation: {:?}", op);
    }
    
    Ok(operations)
}

fn apply_restore_operation(operation: &RestoreOperation) -> Result<(), io::Error> {
    match operation {
        RestoreOperation::CreateDir { path } => {
            let dir_path = Path::new(path);
            if !dir_path.exists() {
                fs::create_dir_all(dir_path)?;
            }
        },
        RestoreOperation::Rename { from, to } => {
            let from_path = Path::new(from);
            let to_path = Path::new(to);
            
            if from_path.exists() && !to_path.exists() {
                if let Some(parent) = to_path.parent() {
                    if !parent.exists() {
                        fs::create_dir_all(parent)?;
                    }
                }
                
                fs::rename(from_path, to_path)?;
            }
        },
        RestoreOperation::Delete { path } => {
            let delete_path = Path::new(path);
            if delete_path.exists() {
                if delete_path.is_dir() {
                    fs::remove_dir_all(delete_path)?;
                } else {
                    fs::remove_file(delete_path)?;
                }
            }
        },
    }
    
    Ok(())
}

// Function to list all backups for a specific directory
#[command]
pub fn list_backups(path: &str) -> Result<Vec<BackupInfo>, String> {
    let backup_dir = get_backup_dir();
    if !backup_dir.exists() {
        // Return empty list if backup directory doesn't exist yet
        return Ok(Vec::new());
    }
    
    // Create a hash from the directory path
    let path_hash = format!("{:x}", md5::compute(path));
    let _backup_pattern = format!("last_backup_{}.json", path_hash);
    
    let mut backups = Vec::new();
    
    // Look for the last backup file
    let backup_path = get_last_backup_path(path);
    if backup_path.exists() {
        match fs::metadata(&backup_path) {
            Ok(metadata) => {
                // Convert the modified time to a timestamp
                if let Ok(modified) = metadata.modified() {
                    if let Ok(duration) = modified.duration_since(UNIX_EPOCH) {
                        let timestamp = duration.as_secs();
                        backups.push(BackupInfo {
                            path: backup_path.to_string_lossy().to_string(),
                            timestamp,
                        });
                    }
                }
            },
            Err(_) => {
                // Skip if we can't read metadata
            }
        }
    }
    
    Ok(backups)
} 