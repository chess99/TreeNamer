# TreeNamer

TreeNamer 是一个用于可视化和批量重命名目录结构的桌面应用程序。它允许用户以文本或树形视图的方式编辑目录结构，然后将更改应用到实际文件系统。

![TreeNamer Screenshot](./screenshots/treenamer-main.png)

## 主要功能

- 📁 **目录树可视化** - 直观显示目录结构
- ✏️ **双模式编辑** - 支持文本和树形视图编辑
- 👁️ **即时预览** - 在应用更改前查看操作预览
- 🔄 **智能重命名检测** - 准确识别文件和目录的重命名
- 🔒 **自动备份系统** - 在应用更改前自动创建备份
- 🌓 **暗色模式支持** - 提供亮色和暗色主题

## 快速开始

### 安装

下载适用于您操作系统的安装包：

- [Windows 安装包](https://github.com/yourusername/treenamer/releases/latest)
- [macOS 安装包](https://github.com/yourusername/treenamer/releases/latest)
- [Linux 安装包](https://github.com/yourusername/treenamer/releases/latest)

### 基本使用

1. 启动 TreeNamer
2. 点击"打开目录"按钮选择一个目录
3. 使用文本编辑器或树形视图编辑目录结构
4. 点击"预览更改"查看将执行的操作
5. 点击"应用更改"执行文件系统操作

更详细的使用说明，请参考[用户手册](docs/20-user-manual.md)。

## 文档

TreeNamer 提供了全面的文档：

### 用户文档

- [用户手册](docs/20-user-manual.md) - 详细使用说明
- [常见问题](docs/21-faq.md) - 常见问题解答

### 开发者文档

- [项目概述](docs/01-project-overview.md) - 项目介绍和架构
- [开发环境设置](docs/02-development-setup.md) - 配置开发环境
- [技术方案设计](docs/10-technical-solution-design.md) - 技术架构和设计
- [API参考](docs/11-api-reference.md) - API接口文档
- [性能优化指南](docs/12-performance-optimization.md) - 性能优化策略
- [贡献指南](docs/30-contributing-guide.md) - 如何参与项目开发
- [架构决策记录](docs/31-architecture-decision-records.md) - 主要架构决策

完整的文档列表可以在[文档指南](docs/00-documentation-guide.md)中找到。

## 开发

### 先决条件

- [Node.js](https://nodejs.org/) (v16+)
- [Rust](https://www.rust-lang.org/tools/install) (1.60+)
- Windows 用户：需要 Visual Studio C++ 构建工具

### 设置开发环境

```bash
# 克隆仓库
git clone https://github.com/yourusername/treenamer.git
cd treenamer

# 安装依赖
npm install

# 启动开发服务器
npm run tauri dev
```

详细的开发环境设置请参考[开发环境设置](docs/02-development-setup.md)。

## 贡献

我们欢迎各种形式的贡献，包括但不限于：

- 代码贡献
- 文档改进
- 问题报告
- 功能建议

请参阅[贡献指南](docs/30-contributing-guide.md)了解如何参与。

## 许可证

TreeNamer 采用 [MIT 许可证](LICENSE)发布。

## 联系我们

- GitHub Issues: [https://github.com/yourusername/treenamer/issues](https://github.com/yourusername/treenamer/issues)
- 电子邮件: [maintainer@example.com](mailto:maintainer@example.com)
