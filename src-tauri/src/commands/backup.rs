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