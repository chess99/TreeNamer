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

## 技术问题

### 为什么我的目录树不能正确应用到文件系统？

最常见的原因是目录树文本格式不正确。请确保：

1. 每个目录和文件前都有正确的缩进和分支符号（`├──` 或 `└──`）
2. 目录名称后有斜杠（`/`）
3. 不要包含系统不允许的字符（如：`? * : " < > |`）

### 如何处理大型目录结构？

TreeNamer 设计用于处理中小型目录结构（约 500-1000 个节点）。对于较大的目录结构，我们建议：

1. 分批处理，每次选择较小的子目录
2. 使用过滤功能减少显示的文件数量
3. 对大型结构的操作可能需要更长的处理时间

### 系统如何跟踪文件和目录的变化？

TreeNamer 使用唯一标识符（UUID）跟踪每个文件和目录实体。这使系统能够精确识别哪些实体被重命名、移动或删除，即使它们的路径或名称发生变化。这种设计确保即使在复杂的操作序列中（如多层次的重命名和移动），系统也能正确地应用所有操作。

### 如果我重命名多个文件，系统如何确保正确执行？

系统使用唯一标识符跟踪每个实体，并根据操作类型和路径深度对操作进行排序。这确保了即使在复杂的重命名链中（A→B→C，其中B已存在），操作也能以正确的顺序执行。目录创建会先执行，然后是重命名操作（从深到浅），最后是删除操作（从浅到深）。

### 编辑器中的文本格式与实际的文件系统操作有什么关系？

文本格式仅是用户界面的展示形式。在内部，系统使用JSON数据结构存储目录树信息，包括每个节点的唯一标识符。编辑文本时，系统会解析更改并更新内部JSON结构，然后生成必要的文件系统操作。这种设计将用户界面与底层逻辑分离，提高了系统稳定性。

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

## Technical Questions

### Why is JSON data structure combined with text representation?

The application uses JSON data structure to represent directory tree, but displays it as text format in the user interface. This design has several benefits:

1. **Reliability**: JSON provides a structured data format, making communication between front-end and back-end more reliable and avoiding text parsing errors.
2. **User-friendliness**: Text representation (similar to the output of `tree` command) is intuitive and easy to edit for users.
3. **Separation of concerns**: Separating data structure (JSON) from representation layer (text) makes the code easier to maintain.
4. **Extensibility**: JSON format is easier to add new node attributes or metadata without breaking existing functionality.

### What happens if there's a parsing error when editing the tree?

If there's a parsing error when editing the directory tree text, it might be because the format is incorrect. Please ensure:

1. Each line's indentation is correct (using spaces, each level indented 4 spaces)
2. Directory name ends with a slash (/)
3. Connection symbols (like `├──`, `└──`) are formatted correctly
4. Do not delete or modify the connection lines (│) in indentation

If the problem persists, try abandoning the modification and reloading the directory, or checking if any illegal characters are inserted into the editor.
