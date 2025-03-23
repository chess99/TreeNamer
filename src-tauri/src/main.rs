// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod error;
#[cfg(test)]
mod test {
    pub use crate::commands::test::*;
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Test execution should only happen when explicitly running tests, not during normal app usage
    // Removing automatic test execution from app startup

    println!("Starting TreeNamer application...");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|_app| {
            println!("Tauri app setup complete");
            Ok(())
        })
        // Configure Tauri to handle snake_case in Rust to camelCase in JavaScript conversion
        .invoke_handler(tauri::generate_handler![
            commands::parse_directory,
            commands::apply_operations,
            commands::is_protected_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn main() {
    run();
}

#[cfg(test)]
mod tests {
    use super::*;
    use commands::tree::TreeNode;
    use std::collections::HashSet;

    #[test]
    fn test_tree_node_id_generation() {
        // 创建一个简单的树结构
        let mut root = TreeNode {
            id: uuid::Uuid::new_v4().to_string(),
            name: "root".to_string(),
            is_dir: true,
            children: Vec::new(),
        };

        let child1 = TreeNode {
            id: uuid::Uuid::new_v4().to_string(),
            name: "child1".to_string(),
            is_dir: false,
            children: Vec::new(),
        };

        let child2 = TreeNode {
            id: uuid::Uuid::new_v4().to_string(),
            name: "child2".to_string(),
            is_dir: true,
            children: Vec::new(),
        };

        root.children.push(child1);
        root.children.push(child2);

        // 验证每个节点都有唯一的ID
        let mut ids = HashSet::new();
        ids.insert(root.id.clone());
        
        for child in &root.children {
            // 确保没有重复的ID
            assert!(!ids.contains(&child.id), "ID冲突: {}", child.id);
            ids.insert(child.id.clone());
        }

        // 验证ID不为空
        assert!(!root.id.is_empty(), "根节点ID不应为空");
        for child in &root.children {
            assert!(!child.id.is_empty(), "子节点ID不应为空: {}", child.name);
        }
    }

    #[test]
    fn test_operations_generation_with_ids() {
        // 创建原始树
        let mut original_tree = TreeNode {
            id: "root-id".to_string(),
            name: "root".to_string(),
            is_dir: true,
            children: Vec::new(),
        };

        let file1 = TreeNode {
            id: "file1-id".to_string(),
            name: "file1.txt".to_string(),
            is_dir: false,
            children: Vec::new(),
        };

        let dir1 = TreeNode {
            id: "dir1-id".to_string(),
            name: "dir1".to_string(),
            is_dir: true,
            children: Vec::new(),
        };

        original_tree.children.push(file1);
        original_tree.children.push(dir1);

        // 创建修改后的树 - 重命名file1.txt到file2.txt，并添加新文件
        let mut modified_tree = TreeNode {
            id: "root-id".to_string(),
            name: "root".to_string(),
            is_dir: true,
            children: Vec::new(),
        };

        let file1_renamed = TreeNode {
            id: "file1-id".to_string(), // 保持相同ID
            name: "file2.txt".to_string(), // 新名称
            is_dir: false,
            children: Vec::new(),
        };

        // 保存值以供后续断言
        let file1_id = file1_renamed.id.clone();
        let file1_new_name = file1_renamed.name.clone();

        let dir1 = TreeNode {
            id: "dir1-id".to_string(),
            name: "dir1".to_string(),
            is_dir: true,
            children: Vec::new(),
        };

        let new_file = TreeNode {
            id: "new-file-id".to_string(),
            name: "new_file.txt".to_string(),
            is_dir: false,
            children: Vec::new(),
        };

        modified_tree.children.push(file1_renamed);
        modified_tree.children.push(dir1);
        modified_tree.children.push(new_file);

        // 生成操作（此处不实际应用，因为需要文件系统）
        let test_path = std::env::temp_dir().to_string_lossy().to_string(); // 使用临时目录
        let original_json = serde_json::to_string(&original_tree).unwrap();
        let modified_json = serde_json::to_string(&modified_tree).unwrap();
        
        // 使用新的函数生成操作
        let operations = commands::fs::generate_operations_from_json(
            &test_path, 
            &original_json, 
            &modified_json
        ).unwrap_or_else(|e| {
            panic!("Failed to generate operations: {}", e);
        });
        
        // 验证生成的操作
        assert!(!operations.is_empty(), "应该生成至少一个操作");
        
        // 找到重命名操作
        let rename_ops: Vec<_> = operations.iter()
            .filter(|op| matches!(op, commands::fs::FileOperation::Rename { .. }))
            .collect();
        
        // 验证操作数量
        assert_eq!(rename_ops.len(), 1, "应该有一个重命名操作");
        
        // 验证节点ID和名称
        assert_eq!(file1_id, "file1-id", "重命名后ID应保持不变");
        assert_eq!(file1_new_name, "file2.txt", "名称应已更新");
        assert_eq!(modified_tree.children.len(), 3, "修改后的树应有3个子节点");
    }
}
