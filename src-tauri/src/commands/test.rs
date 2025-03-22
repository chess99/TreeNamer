use crate::commands::fs::*;
use std::collections::HashMap;

pub fn test_generate_operations() {
    println!("Running test_generate_operations");
    
    // Create test data
    let mut original_paths = HashMap::new();
    original_paths.insert("dir1".to_string(), true);
    original_paths.insert("dir1/file1.txt".to_string(), false);
    original_paths.insert("dir1/file2.txt".to_string(), false);
    original_paths.insert("dir2".to_string(), true);
    original_paths.insert("dir2/subdir".to_string(), true);
    original_paths.insert("dir2/subdir/file3.txt".to_string(), false);
    
    let mut modified_paths = HashMap::new();
    modified_paths.insert("renamed_dir1".to_string(), true);
    modified_paths.insert("renamed_dir1/file1.txt".to_string(), false);
    modified_paths.insert("renamed_dir1/file2_renamed.txt".to_string(), false);
    modified_paths.insert("dir2".to_string(), true);
    modified_paths.insert("dir2/renamed_subdir".to_string(), true);
    modified_paths.insert("dir2/renamed_subdir/file3.txt".to_string(), false);
    modified_paths.insert("new_dir".to_string(), true);
    modified_paths.insert("new_dir/new_file.txt".to_string(), false);
    
    // Test operation generation
    let operations = match generate_operations("test_base", &original_paths, &modified_paths) {
        Ok(ops) => ops,
        Err(e) => {
            println!("Failed to generate operations: {}", e);
            return;
        }
    };
    
    // Print operations
    println!("Generated {} operations:", operations.len());
    for (i, op) in operations.iter().enumerate() {
        println!("Operation {}: {:?}", i+1, op);
    }
    
    // Verify expected operations
    let mut dir1_rename = false;
    let mut file2_rename = false;
    let mut subdir_rename = false;
    
    for op in &operations {
        match op {
            FileOperation::Rename { from, to } => {
                let from_str = from.to_string();
                let to_str = to.to_string();
                
                if from_str.contains("dir1") && !from_str.contains("file") && to_str.contains("renamed_dir1") {
                    dir1_rename = true;
                    println!("Found dir1 rename: {} -> {}", from, to);
                }
                if from_str.contains("file2.txt") && to_str.contains("file2_renamed.txt") {
                    file2_rename = true;
                    println!("Found file2 rename: {} -> {}", from, to);
                }
                if from_str.contains("subdir") && to_str.contains("renamed_subdir") {
                    subdir_rename = true;
                    println!("Found subdir rename: {} -> {}", from, to);
                }
            },
            _ => {}
        }
    }
    
    println!("Detected dir1 rename: {}", dir1_rename);
    println!("Detected file2 rename: {}", file2_rename);
    println!("Detected subdir rename: {}", subdir_rename);
} 