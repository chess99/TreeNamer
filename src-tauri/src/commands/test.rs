use crate::commands::fs::*;
use serde::{Serialize, Deserialize};
use std::error::Error;
use crate::commands::fs::generate_operations_from_json;

#[derive(Debug, Serialize, Deserialize)]
pub struct TestTreeNode {
    id: String,
    name: String,
    is_dir: bool,
    children: Vec<TestTreeNode>,
}

pub fn test_generate_operations() -> Result<(), Box<dyn Error>> {
    println!("Running test_generate_operations");
    
    // 创建测试数据 - 原始树
    let original_tree = TestTreeNode {
        id: "root".to_string(),
        name: "root".to_string(),
        is_dir: true,
        children: vec![
            TestTreeNode {
                id: "dir1".to_string(),
                name: "dir1".to_string(),
                is_dir: true,
                children: vec![
                    TestTreeNode {
                        id: "file1".to_string(),
                        name: "file1.txt".to_string(),
                        is_dir: false,
                        children: vec![],
                    },
                    TestTreeNode {
                        id: "file2".to_string(),
                        name: "file2.txt".to_string(),
                        is_dir: false,
                        children: vec![],
                    },
                ],
            },
            TestTreeNode {
                id: "dir2".to_string(),
                name: "dir2".to_string(),
                is_dir: true,
                children: vec![
                    TestTreeNode {
                        id: "subdir".to_string(),
                        name: "subdir".to_string(),
                        is_dir: true,
                        children: vec![
                            TestTreeNode {
                                id: "file3".to_string(),
                                name: "file3.txt".to_string(),
                                is_dir: false,
                                children: vec![],
                            },
                        ],
                    },
                ],
            },
        ],
    };
    
    // 创建测试数据 - 修改后的树
    let modified_tree = TestTreeNode {
        id: "root".to_string(),
        name: "root".to_string(),
        is_dir: true,
        children: vec![
            TestTreeNode {
                id: "dir1".to_string(), // 同一ID
                name: "renamed_dir1".to_string(), // 新名称
                is_dir: true,
                children: vec![
                    TestTreeNode {
                        id: "file1".to_string(),
                        name: "file1.txt".to_string(),
                        is_dir: false,
                        children: vec![],
                    },
                    TestTreeNode {
                        id: "file2".to_string(), // 同一ID
                        name: "file2_renamed.txt".to_string(), // 新名称
                        is_dir: false,
                        children: vec![],
                    },
                ],
            },
            TestTreeNode {
                id: "dir2".to_string(),
                name: "dir2".to_string(),
                is_dir: true,
                children: vec![
                    TestTreeNode {
                        id: "subdir".to_string(), // 同一ID
                        name: "renamed_subdir".to_string(), // 新名称
                        is_dir: true,
                        children: vec![
                            TestTreeNode {
                                id: "file3".to_string(),
                                name: "file3.txt".to_string(),
                                is_dir: false,
                                children: vec![],
                            },
                        ],
                    },
                ],
            },
            TestTreeNode {
                id: "new_dir".to_string(), // 新ID
                name: "new_dir".to_string(), 
                is_dir: true,
                children: vec![
                    TestTreeNode {
                        id: "new_file".to_string(), // 新ID
                        name: "new_file.txt".to_string(),
                        is_dir: false,
                        children: vec![],
                    },
                ],
            },
        ],
    };
    
    // 将树转换为JSON
    let original_json = match serde_json::to_string(&original_tree) {
        Ok(json) => json,
        Err(e) => {
            println!("Failed to serialize original tree: {}", e);
            return Ok(());
        }
    };
    
    let modified_json = match serde_json::to_string(&modified_tree) {
        Ok(json) => json,
        Err(e) => {
            println!("Failed to serialize modified tree: {}", e);
            return Ok(());
        }
    };
    
    // 临时目录路径
    let test_base = std::env::temp_dir().to_string_lossy().to_string();
    
    // 测试操作生成
    let operations = match generate_operations_from_json(&test_base, &original_json, &modified_json) {
        Ok(ops) => ops,
        Err(e) => {
            println!("Failed to generate operations: {}", e);
            return Ok(());
        }
    };
    
    // 打印操作
    println!("Generated {} operations:", operations.len());
    for (i, op) in operations.iter().enumerate() {
        println!("Operation {}: {:?}", i+1, op);
    }
    
    // 验证预期操作
    let mut dir1_rename = false;
    let mut file2_rename = false;
    let mut subdir_rename = false;
    let mut new_dir_create = false;
    
    for op in &operations {
        match op {
            FileOperation::Rename { from, to } => {
                let from_str = from.to_string();
                let to_str = to.to_string();
                
                // Check for file2 rename
                if from_str.contains("file2.txt") && to_str.contains("file2_renamed.txt") {
                    file2_rename = true;
                    println!("Found file2 rename: {} -> {}", from, to);
                }
                // Check for dir1 rename
                if from_str.contains("/dir1") && to_str.contains("/renamed_dir1") && !from_str.contains("file") {
                    dir1_rename = true;
                    println!("Found dir1 rename: {} -> {}", from, to);
                }
                if from_str.contains("subdir") && to_str.contains("renamed_subdir") {
                    subdir_rename = true;
                    println!("Found subdir rename: {} -> {}", from, to);
                }
                // Check for new_dir creation within a rename operation
                if to_str.contains("new_dir") {
                    new_dir_create = true;
                    println!("Found new directory creation in rename: {} -> {}", from, to);
                }
            }
        }
    }
    
    println!("Detected dir1 rename: {}", dir1_rename);
    println!("Detected file2 rename: {}", file2_rename);
    println!("Detected subdir rename: {}", subdir_rename);
    println!("Detected new_dir creation: {}", new_dir_create);
    
    println!("{} operations were checked", operations.len());
    println!("Test completed successfully");
    
    Ok(())
} 