# TreeNamer

TreeNamer 是一个目录树可视化和批量重命名工具，使用 Tauri + React 构建。

## 主要功能

- 🔍 **树形可视化** - 直观显示文件和目录结构
- ✏️ **文本编辑模式** - 通过文本编辑轻松重命名和重组文件
- 🔄 **实时预览** - 在应用前查看更改效果
- 🛡️ **安全保护** - 防止对系统目录进行意外修改
- 🌐 **跨平台支持** - 适用于 Windows、macOS 和 Linux

## 技术栈

- **前端**: React + TypeScript
- **后端**: Rust (Tauri)
- **状态管理**: Zustand
- **UI 框架**: TailwindCSS

## 截图

![TreeNamer 截图](./docs/images/screenshot.png)

## 开发

确保已安装 Node.js (>=16) 和 Rust 工具链。

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm tauri dev
```

### 构建

```bash
pnpm tauri build
```

## 贡献

欢迎贡献代码、报告问题或提出功能建议。请查看 `CONTRIBUTING.md` 了解详细信息。

## 许可证

MIT
