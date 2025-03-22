use std::path::{Path, PathBuf};
use std::fs;
use tauri::command;
use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};
use std::io;

#[derive(Debug, Serialize)]
pub struct BackupInfo {
    pub path: String,
    pub timestamp: u64,
}

#[command]
pub fn create_backup(path: &str) -> Result<BackupInfo, String> {
    let source_path = Path::new(path);
    if !source_path.exists() {
        return Err(format!("Source path does not exist: {}", path));
    }
    
    // Generate backup path with timestamp
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    
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
    })
}

#[command]
pub fn list_backups(path: &str) -> Result<Vec<BackupInfo>, String> {
    let source_path = Path::new(path);
    let backup_dir = source_path.join(".treenamer_backup");
    
    if !backup_dir.exists() {
        return Ok(Vec::new());
    }
    
    let mut backups = Vec::new();
    
    // Read backup directory entries
    let entries = match fs::read_dir(&backup_dir) {
        Ok(entries) => entries,
        Err(e) => return Err(format!("Failed to read backup directory: {}", e)),
    };
    
    // Process each entry
    for entry_result in entries {
        let entry = match entry_result {
            Ok(entry) => entry,
            Err(e) => {
                eprintln!("Error reading backup entry: {}", e);
                continue;
            }
        };
        
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
        });
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