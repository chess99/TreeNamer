# 常见问题 (FAQ)

## 基本使用

### TreeNamer 是什么？

TreeNamer 是一个专门用于批量重命名文件和目录的工具，特别适合处理大型目录结构。它允许您以文本方式查看和编辑目录结构，然后将更改应用到实际文件系统。

### 文本视图中的符号是什么意思？

- `├──` 表示一个普通节点（文件或目录）
- `└──` 表示父级的最后一个子节点
- `│   ` 表示垂直连接线，用于保持层次结构的可视化

### 如何使用 TreeNamer？

1. 选择要处理的目录
2. 在文本编辑器中编辑目录树结构
3. 预览更改
4. 应用更改到文件系统

### 如何将更改应用到实际文件系统？

编辑完目录树后，点击"应用更改"按钮。TreeNamer 会分析您的更改并将它们转换为实际的文件系统操作（重命名、移动等）。

## 功能与限制

### TreeNamer 支持哪些操作？

- 文件和目录重命名
- 目录结构重组（移动文件和目录）
- 批量同时处理多个文件和目录

### 我可以添加或删除文件和目录吗？

TreeNamer 主要用于重命名和重组现有文件结构，而不是创建或删除内容。它无法执行以下操作：

- 创建新文件或目录
- 删除现有文件或目录
- 修改文件内容

### 是否会修改文件内容？

不会。TreeNamer 只会重命名文件和目录，不会修改任何文件的内容。

## 安全和错误处理

### 使用 TreeNamer 安全吗？

TreeNamer 提供了一些安全机制：

1. **预览功能**：在应用前可以查看将要进行的更改
2. **受保护路径检查**：防止对系统关键目录进行更改
3. **错误处理**：如果发生错误，会提供详细信息并尽可能回滚更改

### 如果我的更改导致错误怎么办？

如果在应用更改过程中发生错误，TreeNamer 会：

1. 显示错误消息，说明问题所在
2. 提供可能的解决方案建议
3. 尽可能回滚已完成的更改

## 性能与兼容性

### TreeNamer 能处理多大的目录？

TreeNamer 可以处理包含数千个文件的目录，但性能会随着目录大小的增加而降低。对于非常大的目录（>10,000 个文件），可能需要更长的处理时间。

### 支持哪些操作系统？

TreeNamer 支持：

- Windows 10/11
- macOS 10.15+
- 主流 Linux 发行版（Ubuntu、Fedora 等）

## 高级功能

### 如何处理名称冲突？

当检测到重命名操作可能导致名称冲突时，TreeNamer 会：

1. 在应用前显示警告
2. 提供解决冲突的建议
3. 允许您修改重命名计划以避免冲突

### 如何使用正则表达式进行批量重命名？

TreeNamer 目前不直接支持正则表达式批量重命名。但您可以：

1. 在文本编辑模式中使用编辑器的查找替换功能
2. 应用这些更改作为重命名计划

# Frequently Asked Questions (FAQ)

## Basic Usage

### What is TreeNamer?

TreeNamer is a specialized tool for batch renaming files and directories, particularly suited for large directory structures. It allows you to view and edit directory structures as text, then apply the changes to the actual file system.

### What do the symbols in the text view mean?

- `├──` indicates a regular node (file or directory)
- `└──` indicates the last child of a parent
- `│   ` represents vertical connection lines to maintain visual hierarchy

### How do I use TreeNamer?

1. Select a directory to work with
2. Edit the directory tree structure in the text editor
3. Preview your changes
4. Apply changes to the file system

### How do I apply changes to the actual file system?

After editing the directory tree, click the "Apply Changes" button. TreeNamer will analyze your changes and translate them into actual file system operations (rename, move, etc.).

## Features and Limitations

### What operations does TreeNamer support?

- File and directory renaming
- Directory structure reorganization (moving files and directories)
- Batch processing of multiple files and directories simultaneously

### Can I add or delete files and directories?

TreeNamer is primarily designed for renaming and reorganizing existing file structures, not creating or deleting content. It cannot perform the following operations:

- Create new files or directories
- Delete existing files or directories
- Modify file contents

### Will it modify file contents?

No. TreeNamer will only rename files and directories, without modifying any file contents.

## Safety and Error Handling

### Is using TreeNamer safe?

TreeNamer provides several safety mechanisms:

1. **Preview functionality**: See what changes will be made before applying them
2. **Protected path checks**: Prevents changes to system-critical directories
3. **Error handling**: Provides detailed information if errors occur and attempts to roll back changes when possible

### What happens if my changes cause an error?

If an error occurs during the application of changes, TreeNamer will:

1. Display an error message explaining the issue
2. Provide suggestions for possible solutions
3. Attempt to roll back completed changes when possible

## Performance and Compatibility

### How large a directory can TreeNamer handle?

TreeNamer can process directories containing thousands of files, but performance will decrease with directory size. For very large directories (>10,000 files), processing may take longer.

### Which operating systems are supported?

TreeNamer supports:

- Windows 10/11
- macOS 10.15+
- Major Linux distributions (Ubuntu, Fedora, etc.)

## Advanced Features

### How are name conflicts handled?

When TreeNamer detects that a rename operation might cause a name conflict, it will:

1. Show a warning before applying
2. Provide suggestions for resolving conflicts
3. Allow you to modify the rename plan to avoid conflicts

### How can I use regular expressions for batch renaming?

TreeNamer currently doesn't directly support regex batch renaming. However, you can:

1. Use your editor's find-and-replace functionality in text edit mode
2. Apply these changes as your rename plan
