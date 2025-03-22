# TreeNamer API 参考

本文档详细说明了 TreeNamer 的主要 API 接口，包括 Rust 后端的 Tauri 命令和 JavaScript 前端的 API 调用。

## Rust 后端 API

TreeNamer 的 Rust 后端通过 Tauri 命令暴露以下功能：

### 目录树操作

#### `parse_directory`

解析目录结构并返回JSON表示。

**签名:**
```rust
#[command]
pub fn parse_directory(path: &str, options: Option<DirectoryOptions>) -> Result<String, String>
```

**参数:**
- `path`: 要解析的目录路径
- `options`: 可选的目录解析选项对象:
  ```rust
  pub struct DirectoryOptions {
      pub max_depth: usize,            // 递归深度限制
      pub exclude_pattern: String,     // 排除的文件/目录正则表达式
      pub follow_symlinks: bool,       // 是否跟踪符号链接
      pub show_hidden: bool,           // 是否显示隐藏文件
  }
  ```

**返回:**
- 成功时: JSON字符串，包含目录树结构
- 失败时: 错误消息

**示例:**
```typescript
// 前端调用
const treeJson = await invoke<string>('parse_directory', { path: '/path/to/directory' });
const treeObject = JSON.parse(treeJson);
```

**JSON结构:**
```json
{
  "id": "uuid-string-1",
  "name": "root_dir",
  "is_dir": true,
  "children": [
    {
      "id": "uuid-string-2",
      "name": "folder1",
      "is_dir": true,
      "children": [
        {
          "id": "uuid-string-3",
          "name": "file1.txt",
          "is_dir": false,
          "children": []
        }
      ]
    },
    {
      "id": "uuid-string-4",
      "name": "file2.txt",
      "is_dir": false,
      "children": []
    }
  ]
}
```

### 文件系统操作

#### `apply_operations`

根据原始和修改后的目录树JSON执行文件系统操作。

**签名:**
```rust
#[command]
pub fn apply_operations(path: &str, original_tree: &str, modified_tree: &str) -> Result<Vec<OperationResult>, String>
```

**参数:**
- `path`: 基础目录路径
- `original_tree`: 原始目录树的JSON字符串
- `modified_tree`: 修改后的目录树的JSON字符串

**返回:**
- 成功时: 操作结果数组
- 失败时: 错误消息

**示例:**
```typescript
// 前端调用
const results = await invoke<OperationResult[]>('apply_operations', {
  path: '/path/to/directory',
  originalTree: originalJsonString,
  modifiedTree: modifiedJsonString
});
```

**操作结果类型:**
```typescript
interface OperationResult {
  success: boolean;
  message: string;
}
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

## 文件系统操作 API

### 目录解析

```typescript
/**
 * 解析指定路径的目录结构，生成目录树
 * @param dirPath 需要解析的目录路径
 * @param options 可选的解析选项
 * @returns 以JSON字符串表示的目录树结构
 */
function parseDirectory(
  dirPath: string, 
  options?: {
    maxDepth?: number,          // 最大递归深度
    excludePattern?: string,    // 排除模式
    followSymlinks?: boolean,   // 是否跟随符号链接
    showHidden?: boolean        // 是否显示隐藏文件
  }
): Promise<string>;
```

### 应用文件操作

```typescript
/**
 * 应用文件系统重命名操作
 * @param dirPath 根目录路径
 * @param originalTree 原始目录树的JSON字符串表示
 * @param modifiedTree 修改后目录树的JSON字符串表示
 * @returns 操作结果列表
 */
function applyOperations(
  dirPath: string,
  originalTree: string,
  modifiedTree: string
): Promise<Array<{
  success: boolean,
  message: string
}>>;
```

### 文件系统操作流程

在内部，系统通过比较具有相同ID的节点在原始树和修改树中的路径来确定需要执行的重命名操作:

1. **ID路径映射**: 从两棵树中提取ID到路径的映射
2. **路径比较**: 对于每个共有的ID，比较其路径:
   ```typescript
   if (modifiedPaths[id] !== originalPaths[id]) {
     // 生成重命名操作
     operations.push({
       from: originalPaths[id],
       to: modifiedPaths[id]
     });
   }
   ```
3. **操作排序**: 按深度和类型(文件优先于目录)排序操作
4. **执行操作**: 按排序后的顺序执行重命名操作

### 数据结构

#### TreeNode 结构

```typescript
interface TreeNode {
  id: string;         // 唯一标识符
  name: string;       // 文件或目录名
  is_dir: boolean;    // 是否为目录
  children: TreeNode[]; // 子节点列表
}
```

#### 文件操作

```typescript
enum FileOperation {
  Rename = "rename"
}

interface RenameOperation {
  type: FileOperation.Rename;
  from: string;
  to: string;
}
```

#### 操作结果

```typescript
interface OperationResult {
  success: boolean;
  message: string;
}
```

### 错误处理

文件系统操作可能返回以下错误:

- `PathNotExist`: 指定的路径不存在
- `NotADirectory`: 指定的路径不是目录
- `PermissionDenied`: 没有足够权限执行操作
- `ProtectedPath`: 尝试在受保护的系统路径上执行操作
- `IoError`: 底层I/O错误
