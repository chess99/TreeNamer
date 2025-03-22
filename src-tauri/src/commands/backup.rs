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

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupInfo {
    pub path: String,
    pub timestamp: u64,
    pub is_virtual: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct VirtualBackup {
    timestamp: u64,
    description: String,
    base_directory: String,
    entities: Vec<FileEntity>,
}

#[derive(Debug, Serialize, Deserialize)]
struct FileEntity {
    id: String,
    path: String,
    is_directory: bool,
}

// Get the central backup directory for the platform
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
    
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    
    // If tree_text is provided, create a virtual backup
    if let Some(tree_content) = tree_text {
        return create_virtual_backup(path, tree_content, timestamp);
    } else {
        // Traditional full backup (copy files)
        return create_full_backup(source_path, timestamp);
    }
}

fn create_virtual_backup(source_path: &str, tree_content: &str, timestamp: u64) -> Result<BackupInfo, String> {
    // Create central backup directory
    let backup_dir = get_backup_dir();
    if let Err(e) = fs::create_dir_all(&backup_dir) {
        return Err(format!("Failed to create backup directory: {}", e));
    }
    
    // Parse tree text to create virtual structure
    let entities = match parse_tree_to_entities(tree_content) {
        Ok(entities) => entities,
        Err(e) => return Err(format!("Failed to parse tree text: {}", e)),
    };
    
    // Create the virtual backup structure
    let virtual_backup = VirtualBackup {
        timestamp,
        description: format!("Backup created at {}", timestamp),
        base_directory: source_path.to_string(),
        entities,
    };
    
    // Serialize to JSON
    let json = match serde_json::to_string_pretty(&virtual_backup) {
        Ok(json) => json,
        Err(e) => return Err(format!("Failed to serialize backup: {}", e)),
    };
    
    // Generate a filename with timestamp
    let backup_filename = format!("virtual_backup_{}.json", timestamp);
    let backup_file_path = backup_dir.join(backup_filename);
    
    // Write to file
    let mut file = match File::create(&backup_file_path) {
        Ok(file) => file,
        Err(e) => return Err(format!("Failed to create backup file: {}", e)),
    };
    
    if let Err(e) = file.write_all(json.as_bytes()) {
        return Err(format!("Failed to write backup file: {}", e));
    }
    
    Ok(BackupInfo {
        path: backup_file_path.to_string_lossy().to_string(),
        timestamp,
        is_virtual: true,
    })
}

fn create_full_backup(source_path: &Path, timestamp: u64) -> Result<BackupInfo, String> {
    // Generate backup path with timestamp in the source directory
    let backup_dir = source_path.join(".treenamer_backup").join(timestamp.to_string());
    
    // Create backup directory
    if let Err(e) = fs::create_dir_all(&backup_dir) {
        return Err(format!("Failed to create backup directory: {}", e));
    }
    
    // Copy files to backup directory
    if let Err(e) = copy_dir_all(source_path, &backup_dir) {
        return Err(format!("Failed to copy files to backup directory: {}", e));
    }
    
    Ok(BackupInfo {
        path: backup_dir.to_string_lossy().to_string(),
        timestamp,
        is_virtual: false,
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
pub fn list_backups(path: &str) -> Result<Vec<BackupInfo>, String> {
    let mut backups = Vec::new();
    
    // First, check traditional backups in the current directory
    let source_path = Path::new(path);
    let local_backup_dir = source_path.join(".treenamer_backup");
    
    if local_backup_dir.exists() {
        if let Ok(entries) = fs::read_dir(&local_backup_dir) {
            for entry_result in entries {
                if let Ok(entry) = entry_result {
                    let entry_path = entry.path();
                    
                    // Skip non-directories
                    if !entry_path.is_dir() {
                        continue;
                    }
                    
                    // Parse timestamp from directory name
                    let timestamp_str = match entry_path.file_name() {
                        Some(name) => name.to_string_lossy().to_string(),
                        None => continue,
                    };
                    
                    let timestamp = match timestamp_str.parse::<u64>() {
                        Ok(ts) => ts,
                        Err(_) => continue, // Skip if not a valid timestamp
                    };
                    
                    backups.push(BackupInfo {
                        path: entry_path.to_string_lossy().to_string(),
                        timestamp,
                        is_virtual: false,
                    });
                }
            }
        }
    }
    
    // Then, check virtual backups in the central directory
    let central_backup_dir = get_backup_dir();
    if central_backup_dir.exists() {
        if let Ok(entries) = fs::read_dir(&central_backup_dir) {
            for entry_result in entries {
                if let Ok(entry) = entry_result {
                    let entry_path = entry.path();
                    
                    // Only process JSON files
                    if !entry_path.is_file() || !entry_path.extension().map_or(false, |ext| ext == "json") {
                        continue;
                    }
                    
                    // Verify this backup is for the requested directory
                    if let Ok(content) = fs::read_to_string(&entry_path) {
                        let backup_result: Result<VirtualBackup, _> = serde_json::from_str(&content);
                        if let Ok(backup) = backup_result {
                            if backup.base_directory == path {
                                backups.push(BackupInfo {
                                    path: entry_path.to_string_lossy().to_string(),
                                    timestamp: backup.timestamp,
                                    is_virtual: true,
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Sort backups by timestamp (newest first)
    backups.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    
    Ok(backups)
}

#[command]
pub fn restore_backup(backup_path: &str) -> Result<(), String> {
    let backup_path = Path::new(backup_path);
    if !backup_path.exists() {
        return Err(format!("Backup path does not exist: {}", backup_path.display()));
    }
    
    // Check if it's a virtual backup (JSON file) or a traditional backup (directory)
    if backup_path.is_file() && backup_path.extension().map_or(false, |ext| ext == "json") {
        return restore_virtual_backup(backup_path);
    } else if backup_path.is_dir() {
        return restore_full_backup(backup_path);
    } else {
        return Err("Invalid backup type".to_string());
    }
}

fn restore_virtual_backup(backup_path: &Path) -> Result<(), String> {
    // Read and parse the virtual backup
    let content = match fs::read_to_string(backup_path) {
        Ok(content) => content,
        Err(e) => return Err(format!("Failed to read backup file: {}", e)),
    };
    
    let backup: VirtualBackup = match serde_json::from_str(&content) {
        Ok(backup) => backup,
        Err(e) => return Err(format!("Failed to parse backup file: {}", e)),
    };
    
    // Get the target directory
    let target_dir = Path::new(&backup.base_directory);
    if !target_dir.exists() {
        return Err(format!("Target directory does not exist: {}", backup.base_directory));
    }
    
    // Generate operations to transform the current directory to match the backup
    let operations = match generate_restore_operations(target_dir, &backup.entities) {
        Ok(ops) => ops,
        Err(e) => return Err(format!("Failed to generate restore operations: {}", e)),
    };
    
    // Apply operations
    for op in operations {
        if let Err(e) = apply_restore_operation(&op) {
            return Err(format!("Failed to apply operation: {}", e));
        }
    }
    
    Ok(())
}

#[derive(Debug)]
enum RestoreOperation {
    CreateDir { path: String },
    Rename { from: String, to: String },
    Delete { path: String },
}

fn generate_restore_operations(target_dir: &Path, backup_entities: &[FileEntity]) -> Result<Vec<RestoreOperation>, String> {
    // Implementation for generating restore operations
    // This is a simplified version - the actual implementation would need to:
    // 1. Scan the current directory structure
    // 2. Compare with the backup entities
    // 3. Generate operations to transform the current structure to match the backup
    
    let mut operations = Vec::new();
    
    // For now, just recreate the directory structure
    for entity in backup_entities {
        let target_path = target_dir.join(&entity.path);
        
        if entity.is_directory {
            operations.push(RestoreOperation::CreateDir { 
                path: target_path.to_string_lossy().to_string() 
            });
        }
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

fn restore_full_backup(backup_path: &Path) -> Result<(), String> {
    // Get the parent directory of the backup (the original directory)
    let original_dir = match backup_path.parent().and_then(|p| p.parent()) {
        Some(dir) => dir,
        None => return Err("Invalid backup path structure".to_string()),
    };
    
    // Create a temporary directory for the current state
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    
    let temp_dir = original_dir.join(".treenamer_temp").join(timestamp.to_string());
    
    // Create temp directory
    if let Err(e) = fs::create_dir_all(&temp_dir) {
        return Err(format!("Failed to create temporary directory: {}", e));
    }
    
    // Move current files to temp directory
    if let Err(e) = move_dir_contents(original_dir, &temp_dir) {
        return Err(format!("Failed to move current files to temporary directory: {}", e));
    }
    
    // Copy backup files to original directory
    if let Err(e) = copy_dir_all(backup_path, original_dir) {
        // If restore fails, try to move back the temp files
        let _ = move_dir_contents(&temp_dir, original_dir);
        return Err(format!("Failed to restore backup: {}", e));
    }
    
    // Clean up temp directory
    let _ = fs::remove_dir_all(temp_dir);
    
    Ok(())
}

// Helper function to copy a directory recursively
fn copy_dir_all(src: &Path, dst: &Path) -> io::Result<()> {
    if !dst.exists() {
        fs::create_dir_all(dst)?;
    }
    
    for entry_result in fs::read_dir(src)? {
        let entry = entry_result?;
        let entry_path = entry.path();
        let file_name = entry.file_name();
        let target_path = dst.join(&file_name);
        
        // Skip .treenamer_backup directory
        if file_name == ".treenamer_backup" || file_name == ".treenamer_temp" {
            continue;
        }
        
        if entry_path.is_dir() {
            copy_dir_all(&entry_path, &target_path)?;
        } else {
            fs::copy(&entry_path, &target_path)?;
        }
    }
    
    Ok(())
}

// Helper function to move directory contents
fn move_dir_contents(src: &Path, dst: &Path) -> io::Result<()> {
    if !dst.exists() {
        fs::create_dir_all(dst)?;
    }
    
    for entry_result in fs::read_dir(src)? {
        let entry = entry_result?;
        let entry_path = entry.path();
        let file_name = entry.file_name();
        let target_path = dst.join(&file_name);
        
        // Skip .treenamer_backup and .treenamer_temp directories
        if file_name == ".treenamer_backup" || file_name == ".treenamer_temp" {
            continue;
        }
        
        // Move the file or directory
        fs::rename(&entry_path, &target_path)?;
    }
    
    Ok(())
} 