# TreeNamer 常见问题 (FAQ)

## 基本问题

### 什么是 TreeNamer？

TreeNamer 是一个目录树可视化和重命名工具，它允许您以文本或图形方式编辑目录结构，然后将这些更改应用到实际文件系统。该工具特别适合批量重命名文件和重组目录结构。

### TreeNamer 可以在哪些操作系统上运行？

TreeNamer 是一个跨平台应用程序，支持：

- Windows 10/11
- macOS 11+
- Ubuntu 20.04+/Debian 11+ 和其他主流 Linux 发行版

### TreeNamer 是免费的吗？

是的，TreeNamer 是一个开源项目，采用 MIT 许可证发布，完全免费使用。

## 功能问题

### TreeNamer 如何处理大型目录？

TreeNamer 使用 Rust 实现高效的目录遍历和操作，并通过以下优化策略处理大型目录：

- 并行目录扫描
- 虚拟滚动渲染大型树
- 流式加载大目录
- 操作分批执行

对于非常大的目录（超过 10 万个文件），您可以使用排除模式和最大深度设置来限制处理范围。

### 我可以使用正则表达式进行批量重命名吗？

是的，TreeNamer 支持通过内置的正则表达式替换功能进行批量重命名。在编辑器模式下，按 `Ctrl+H` (Windows/Linux) 或 `Cmd+H` (Mac) 打开替换对话框，启用正则表达式选项，然后输入匹配模式和替换文本。

### TreeNamer 如何防止错误操作？

TreeNamer 提供了安全措施来防止意外操作：

1. **虚拟备份和撤销功能**：每次应用更改前，TreeNamer 会自动创建当前目录结构的轻量级虚拟备份。如果您对更改不满意，可以使用撤销功能快速恢复到之前的状态。

2. **预览更改**：应用更改前，您可以预览将执行的操作，确保它们符合您的预期。

3. **确认对话框**：对文件系统进行重大更改时会显示确认对话框。

虚拟备份不复制实际文件内容，只保存目录结构信息，因此速度快且不占用大量空间。备份存储在用户配置目录中（例如 Windows 上的 `%APPDATA%\TreeNamer\backups`），不会干扰您的工作目录。

### 是否可以仅预览更改而不实际应用它们？

是的，点击"预览更改"按钮将显示将执行的操作列表，但不会对文件系统进行任何更改。这让您可以在实际应用更改之前查看并确认它们是否符合预期。

## 技术问题

### TreeNamer 如何检测文件重命名？

TreeNamer 使用唯一 ID 和路径映射来跟踪文件系统实体。当您在编辑器中修改目录结构时，系统会通过比较原始路径和当前路径的差异来检测重命名操作。这种方法确保了即使在复杂的嵌套目录重命名中也能准确识别各个文件和目录的变化。

### 如何处理权限问题？

在某些情况下，对特定目录的操作可能需要管理员权限：

- **Windows**：右键点击 TreeNamer 快捷方式，选择"以管理员身份运行"
- **macOS**：不常见，但可能需要修改目标文件夹的权限
- **Linux**：使用 `sudo` 启动应用程序，或修改文件/目录权限

注意：TreeNamer 会在操作失败时提供详细的错误消息，包括可能的权限问题。

### 可以处理非英文文件名和路径吗？

是的，TreeNamer 完全支持 Unicode，可以处理各种语言的文件名和路径，包括中文、日文、韩文、俄文等非拉丁字符。

## 使用问题

### 无法重命名某些文件怎么办？

如果无法重命名特定文件，可能是因为：

1. **文件被锁定**：文件可能被其他程序使用。关闭可能使用该文件的所有应用程序，然后重试。
2. **权限不足**：您可能没有修改该文件的权限。尝试以管理员/超级用户身份运行 TreeNamer。
3. **路径长度限制**：某些系统（特别是 Windows）有路径长度限制。尝试使用较短的文件名。
4. **非法字符**：文件名可能包含在目标操作系统中非法的字符。TreeNamer 会检测并警告此类情况。

### 操作预览显示的更改与我的编辑不符怎么办？

这可能是由于：

1. **语法错误**：确保您的树结构格式正确，每个目录以 `/` 结尾，缩进正确。
2. **非法文件名**：检查是否使用了非法字符或保留名称（如 Windows 上的 CON、PRN 等）。
3. **编辑未保存**：确保最近的编辑已应用到预览中（编辑器会自动实时更新，但有时可能需要点击编辑区域外部触发更新）。

### 如何撤销已应用的更改？

如果您应用了不希望的更改，可以通过以下方式撤销：

1. 在应用更改后，点击"撤销"按钮
2. 系统将自动恢复到应用更改前的状态

注意，TreeNamer 仅支持撤销最近的一次更改。如果您已经进行了多次操作，或者关闭并重新打开了应用，则无法使用撤销功能。在进行重大更改前，建议先预览操作。

## 排障和性能

### TreeNamer 在处理大目录时很慢怎么办？

尝试以下优化：

1. 减少目录深度：设置较低的"最大深度"值
2. 排除不相关文件：使用"排除模式"设置（如 `node_modules|.git|.DS_Store`）
3. 增加系统资源：关闭其他内存密集型应用程序
4. 分批处理：对大型目录的子目录分别进行操作

### 为什么我的编辑没有反映在预览中？

确保：

1. 您的编辑使用了正确的格式（目录以 `/` 结尾，文件没有）
2. 编辑保存成功（应该自动保存，但您可以点击编辑器外部确保更新）
3. 没有语法或解析错误（检查控制台是否有错误消息）

### 在 Windows 上使用时看到 "权限被拒绝" 错误怎么办？

Windows 上的某些特殊目录（如 Program Files、Windows 目录）受系统保护：

1. 以管理员身份运行 TreeNamer
2. 将文件复制到一个您有完全控制权的目录中进行编辑，然后再移回
3. 检查文件不是只读的（右键属性）
4. 检查防病毒软件是否阻止了操作

### 遇到 "byte index is not a char boundary" 错误怎么办？

如果您在应用目录重命名时遇到 "byte index is not a char boundary" 错误，这通常是由于树结构文本中包含特殊 Unicode 字符（如树图形符号 ├ 和 └）导致的字符边界解析问题。最新版本已修复此问题，请确保您使用的是最新版本的 TreeNamer。如果仍然遇到此问题，请尝试：

1. 避免手动编辑带有树形图形的文本
2. 使用图形模式而非文本模式进行编辑
3. 上报问题并附带您试图解析的目录树字符串样例

### What should I do if I encounter a "byte index is not a char boundary" error?

If you encounter a "byte index is not a char boundary" error when applying directory renames, this is typically caused by Unicode character boundary parsing issues in the tree structure text, especially with tree graphic symbols like ├ and └. The latest version has fixed this issue, so make sure you're using the most recent version of TreeNamer. If you still encounter this problem, try:

1. Avoid manually editing text with tree graphics
2. Use the graphical mode instead of text mode for editing
3. Report the issue with an example of the directory tree string you're trying to parse

### 应用在启动时崩溃怎么办？

尝试以下排障步骤：

1. 确保您的操作系统满足最低要求
2. 检查是否安装了所有必要的系统依赖
3. 卸载并重新安装应用程序
4. 查看应用程序日志（通常位于用户目录下的 `.treenamer/logs`）
5. 在项目 GitHub 上报告问题

### How does TreeNamer prevent accidental changes?

TreeNamer provides multiple safeguards to prevent unwanted changes:

1. **Virtual backups and undo functionality**: Before applying any changes, TreeNamer automatically creates a lightweight virtual backup of your current directory structure. If you're not satisfied with the changes, you can use the undo feature to quickly revert to the previous state.

2. **Change preview**: Before applying changes, you can preview the operations that will be performed, ensuring they match your intentions.

3. **Confirmation dialogs**: Significant file system changes require confirmation.

Virtual backups don't copy actual file contents, only storing directory structure information, making them fast and space-efficient. They're stored in your user configuration directory (e.g., `%APPDATA%\TreeNamer\backups` on Windows), keeping your working directory clean.

### How do I undo changes I've already applied?

If you've applied changes that you want to reverse:

1. After applying changes, click the "Undo" button
2. The system will automatically restore the state from before your most recent change

Note that TreeNamer only supports undoing the most recent change. If you've made multiple operations or closed and reopened the application, the undo function won't be available. For major changes, it's recommended to preview the operations first.
