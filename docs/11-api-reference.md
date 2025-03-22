# TreeNamer API 参考

本文档详细说明了 TreeNamer 的主要 API 接口，包括 Rust 后端的 Tauri 命令和 JavaScript 前端的 API 调用。

## Rust 后端 API

TreeNamer 的 Rust 后端通过 Tauri 命令暴露以下功能：

### 目录树操作

#### `parse_directory`

解析目录并生成树形表示。

**参数：**
- `path: String` - 要解析的目录路径
- `options: DirectoryOptions` - 目录解析选项

```typescript
interface DirectoryOptions {
  maxDepth: number;            // 最大递归深度
  excludePattern: string;      // 排除文件/目录的正则表达式
  followSymlinks: boolean;     // 是否跟随符号链接
  showHidden: boolean;         // 是否显示隐藏文件
}
```

**返回值：**
- `Result<String, String>` - 成功时返回树形文本，失败时返回错误信息

**示例：**
```javascript
const tree = await invoke('parse_directory', {
  path: '/path/to/directory',
  options: {
    maxDepth: 5,
    excludePattern: 'node_modules|.git',
    followSymlinks: false,
    showHidden: false
  }
});
```

### 文件系统操作

#### `apply_operations`

应用文件系统操作（重命名、创建、删除）。

**参数：**
- `path: String` - 基础目录路径
- `original_tree: String` - 原始目录树文本
- `modified_tree: String` - 修改后的目录树文本

**返回值：**
- `Result<Vec<OperationResult>, String>` - 成功时返回操作结果数组，失败时返回错误信息

```rust
pub struct OperationResult {
    pub success: bool,
    pub message: String,
}
```

**示例：**
```javascript
const results = await invoke('apply_operations', {
  path: '/path/to/directory',
  original_tree: originalTreeText,
  modified_tree: modifiedTreeText
});
```

#### `generate_operations`

生成但不执行文件系统操作。

**参数：**
- `path: String` - 基础目录路径
- `original_tree: String` - 原始目录树文本
- `modified_tree: String` - 修改后的目录树文本

**返回值：**
- `Result<Vec<FileOperation>, String>` - 成功时返回操作数组，失败时返回错误信息

```typescript
enum FileOperationType {
  Rename,
  CreateDir,
  Delete
}

interface FileOperation {
  type: FileOperationType;
  from?: string;  // 仅重命名操作需要
  to?: string;    // 仅重命名操作需要
  path?: string;  // 创建和删除操作需要
}
```

**示例：**
```javascript
const operations = await invoke('generate_operations', {
  path: '/path/to/directory',
  original_tree: originalTreeText,
  modified_tree: modifiedTreeText
});
```

### 备份管理

#### `create_backup`

创建目录的备份。

**参数：**
- `path: String` - 要备份的目录路径

**返回值：**
- `Result<String, String>` - 成功时返回备份路径，失败时返回错误信息

**示例：**
```javascript
const backupPath = await invoke('create_backup', {
  path: '/path/to/directory'
});
```

#### `list_backups`

列出可用的备份。

**参数：**
- `path: String` - 目录路径

**返回值：**
- `Result<Vec<BackupInfo>, String>` - 成功时返回备份信息数组，失败时返回错误信息

```typescript
interface BackupInfo {
  timestamp: string;
  path: string;
  size: number;
}
```

**示例：**
```javascript
const backups = await invoke('list_backups', {
  path: '/path/to/directory'
});
```

#### `restore_backup`

从备份恢复目录。

**参数：**
- `backup_path: String` - 备份路径
- `target_path: String` - 恢复目标路径

**返回值：**
- `Result<bool, String>` - 成功时返回 true，失败时返回错误信息

**示例：**
```javascript
const success = await invoke('restore_backup', {
  backup_path: backupPath,
  target_path: '/path/to/directory'
});
```

## 前端 API

TreeNamer 前端提供以下主要 API：

### 目录树 API

#### `useDirectoryStore`

用于管理目录状态的 Zustand store。

**状态：**
```typescript
interface DirectoryState {
  path: string | null;
  originalTree: string | null;
  modifiedTree: string | null;
  isLoading: boolean;
  error: string | null;
  operations: FileOperation[];
  
  // 行为
  loadDirectory: (path: string, options: DirectoryOptions) => Promise<void>;
  updateModifiedTree: (tree: string) => void;
  generateOperations: () => Promise<FileOperation[]>;
  applyOperations: () => Promise<OperationResult[]>;
}
```

**示例：**
```javascript
import { useDirectoryStore } from '../store/directoryStore';

// 在组件中
const { 
  path, 
  originalTree, 
  loadDirectory, 
  updateModifiedTree,
  applyOperations 
} = useDirectoryStore();

// 加载目录
await loadDirectory('/path/to/directory', {
  maxDepth: 5,
  excludePattern: 'node_modules|.git',
  followSymlinks: false,
  showHidden: false
});

// 更新修改后的树
updateModifiedTree(editedTreeText);

// 应用操作
const results = await applyOperations();
```

### 备份 API

#### `useBackupStore`

用于管理备份的 Zustand store。

**状态：**
```typescript
interface BackupState {
  backups: BackupInfo[];
  isLoading: boolean;
  error: string | null;
  
  // 行为
  loadBackups: (path: string) => Promise<void>;
  createBackup: (path: string) => Promise<string>;
  restoreBackup: (backupPath: string, targetPath: string) => Promise<boolean>;
}
```

**示例：**
```javascript
import { useBackupStore } from '../store/backupStore';

// 在组件中
const { 
  backups, 
  loadBackups, 
  createBackup, 
  restoreBackup 
} = useBackupStore();

// 加载备份
await loadBackups('/path/to/directory');

// 创建备份
const backupPath = await createBackup('/path/to/directory');

// 恢复备份
const success = await restoreBackup(backupPath, '/path/to/directory');
```

### 实用工具 API

#### `TreeUtils`

Tree 相关工具函数。

**方法：**
- `parsePlainText(text: string): TreeNode[]` - 将文本转换为树节点数组
- `formatNodes(nodes: TreeNode[]): string` - 将树节点数组格式化为文本
- `findDifferences(original: string, modified: string): Difference[]` - 查找差异

**示例：**
```javascript
import { TreeUtils } from '../utils/treeUtils';

// 解析文本
const nodes = TreeUtils.parsePlainText(treeText);

// 格式化节点
const formattedText = TreeUtils.formatNodes(nodes);

// 查找差异
const diffs = TreeUtils.findDifferences(originalText, modifiedText);
```

#### `FileSystemUtils`

文件系统实用工具。

**方法：**
- `isValidPath(path: string): boolean` - 检查路径是否有效
- `sanitizeFileName(name: string): string` - 净化文件名（移除非法字符）
- `getRelativePath(base: string, full: string): string` - 获取相对路径

**示例：**
```javascript
import { FileSystemUtils } from '../utils/fsUtils';

// 检查路径
const isValid = FileSystemUtils.isValidPath(userInputPath);

// 净化文件名
const safeName = FileSystemUtils.sanitizeFileName(userInputName);

// 获取相对路径
const relativePath = FileSystemUtils.getRelativePath(basePath, fullPath);
```

## 事件系统

TreeNamer 使用 Tauri 事件系统在后端和前端之间通信：

### 进度更新事件

```javascript
import { listen } from '@tauri-apps/api/event';

// 监听操作进度
const unlisten = await listen('operation-progress', (event) => {
  const { operation, progress, total } = event.payload;
  // 更新 UI
  updateProgressBar(progress / total);
});

// 清理
onUnmount(() => {
  unlisten();
});
```

### 文件系统变更事件

```javascript
import { listen } from '@tauri-apps/api/event';

// 监听外部文件系统变更
const unlisten = await listen('fs-change', (event) => {
  const { path, type } = event.payload;
  // 更新 UI
  refreshTreeIfNeeded(path, type);
});

// 清理
onUnmount(() => {
  unlisten();
});
``` 