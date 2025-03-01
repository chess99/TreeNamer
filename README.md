# TreeNamer - 目录树重命名工具

## 项目概述

TreeNamer 是一款可视化目录树编辑与批量重命名工具，支持通过类似代码编辑器的交互方式直接修改目录结构，并安全同步到实际文件系统。  
**核心功能**：目录树可视化编辑、多光标操作、正则替换、分屏差异对比、安全应用修改。

---

## 主要功能

| 功能                 | 描述                                                                 |
|----------------------|----------------------------------------------------------------------|
| **目录树可视化**     | 以文本形式展示文件夹结构（类似`tree`命令），支持拖拽文件夹或手动选择 |
| **编辑器交互**       | 类VSCode编辑体验，支持多光标、正则替换、撤销重做                     |
| **分屏差异对比**     | 左右分屏显示修改前后的目录树，高亮增/删/改操作（类似Git Diff）       |
| **安全应用修改**     | 执行前自动备份原目录结构，支持回滚                                   |
| **跨平台支持**       | 兼容 Windows/macOS/Linux                                            |

---

## 快速开始

### 安装

```bash
# 克隆仓库
git clone https://github.com/your-repo/TreeNamer.git

# 安装依赖
npm install

# 启动应用
npm start
```

### 使用说明

1. **加载目录**  
   - 点击`Open Folder`按钮或拖拽文件夹到窗口。
   - 自动生成目录树文本（示例）：

     ```
     my_folder/
     ├── document.txt
     └── images/
         ├── photo1.jpg
         └── photo2.jpg
     ```

2. **编辑目录树**  
   - 使用多光标编辑或正则替换（`Ctrl+R`）修改文件名/路径。
   - 实时对比差异（右侧面板）：

     ![Diff对比示例](screenshots/diff-example.png)

3. **应用修改**  
   - 点击`Apply Changes`确认执行，自动备份原文件。

---

## 技术栈

| 模块           | 技术选型                                 |
|----------------|------------------------------------------|
| **前端框架**   | Tauri + React                           |
| **编辑器核心** | Monaco Editor（VSCode同款编辑器内核）    |
| **Diff算法**   | diff-match-patch                         |
| **目录树解析** | Rust + 自定义解析器                      |
| **打包工具**   | Tauri CLI                               |

---

## 注意事项

- **备份机制**：执行修改前自动生成`.treenamer_backup`文件夹保存原始结构。
- **路径格式**：编辑时使用`/`作为路径分隔符，应用时自动适配操作系统。
- **权限问题**：修改系统保护目录时需手动授权。

---

## 开发计划

- [x] 基础目录树渲染与编辑  
- [ ] 正则替换与多光标支持（开发中）  
- [ ] 差异对比可视化（规划中）  

---

## 许可证

[MIT License](LICENSE) © 2024 TreeNamer Team
