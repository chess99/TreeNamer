# TreeNamer 贡献指南

感谢您考虑为 TreeNamer 项目做出贡献！这份指南将帮助您了解贡献流程以及如何有效地参与到项目中来。

## 开发环境设置

### 先决条件

开始贡献之前，请确保您的系统上安装了以下软件：

- [Node.js](https://nodejs.org/) (v16+)
- [Rust](https://www.rust-lang.org/tools/install) (1.60+)
- [Git](https://git-scm.com/)
- 针对 Rust 开发的 Visual Studio C++ 构建工具（仅限 Windows）

### 克隆仓库

```bash
git clone https://github.com/yourusername/treenamer.git
cd treenamer
```

### 安装依赖

```bash
# 安装前端依赖
npm install

# 安装 Tauri CLI
npm install -g @tauri-apps/cli
```

### 运行开发服务器

```bash
# 启动开发服务器 (包括 Rust 后端)
npm run tauri dev
```

## 项目结构

TreeNamer 采用 Tauri 框架，该框架结合了 Web 前端和 Rust 后端。项目结构如下：

```
/
├── src/                  # 前端代码 (React)
│   ├── components/       # React 组件
│   ├── stores/           # 状态管理 (Zustand)
│   ├── styles/           # CSS 和主题
│   └── utils/            # 工具函数
│
├── src-tauri/            # Rust 后端代码
│   ├── src/
│   │   ├── commands/     # Tauri 命令实现
│   │   ├── models/       # 数据模型
│   │   └── main.rs       # 程序入口
│   ├── Cargo.toml        # Rust 依赖管理
│   └── tauri.conf.json   # Tauri 配置
│
├── docs/                 # 项目文档
├── tests/                # 测试文件
├── package.json          # Node.js 依赖管理
└── README.md             # 项目概述
```

## 贡献流程

### 1. 查找任务

开始贡献前，请查看[问题列表](https://github.com/yourusername/treenamer/issues)寻找标记为 "good first issue" 的任务，或查看我们的[项目看板](https://github.com/yourusername/treenamer/projects)了解当前开发计划。

### 2. 创建分支

为您的贡献创建一个新的特性分支：

```bash
git checkout -b feature/your-feature-name
```

遵循分支命名约定：

- `feature/*` - 新功能
- `bugfix/*` - 错误修复
- `docs/*` - 文档更新
- `refactor/*` - 代码重构

### 3. 开发和测试

在您的更改过程中：

- 遵循[代码风格指南](#代码风格指南)
- 为新功能添加测试
- 确保所有现有测试通过
- 保持提交信息清晰和有意义

### 4. 提交更改

请使用有意义的提交信息：

```bash
git commit -m "feat: 实现目录比较功能"
```

我们采用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat`: 新功能
- `fix`: 错误修复
- `docs`: 文档更改
- `style`: 不影响代码功能的格式更改
- `refactor`: 既不修复错误也不添加功能的代码更改
- `test`: 添加或修改测试
- `chore`: 其他更改

### 5. 发起拉取请求

当您的更改准备好时，请提交拉取请求(PR)：

1. 推送您的分支到 GitHub：

   ```bash
   git push origin feature/your-feature-name
   ```

2. 通过 GitHub 界面创建拉取请求
3. 填写 PR 模板，包括清晰的描述和对关联问题的引用
4. 等待代码审查和反馈

## 代码风格指南

### Rust 代码风格

- 使用 `rustfmt` 格式化代码
- 遵循 [Rust API 指南](https://rust-lang.github.io/api-guidelines/)
- 使用有意义的变量名和函数名
- 添加文档注释 (`///`) 到公共函数和结构体
- 使用 `cargo clippy` 检查代码质量

### JavaScript/TypeScript 代码风格

- 使用 ES6+ 特性
- 使用 TypeScript 类型标注
- 优先使用函数式组件而非类组件
- 使用有意义的变量名和组件名
- 遵循 [React 最佳实践](https://reactjs.org/docs/thinking-in-react.html)

## 测试指南

### 后端测试

在 `src-tauri/src` 目录中为每个模块编写单元测试：

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_directory() {
        // 测试代码
    }
}
```

运行测试：

```bash
cd src-tauri
cargo test
```

### 前端测试

使用 Jest 和 React Testing Library 为组件编写测试：

```javascript
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

test('renders correctly', () => {
  render(<MyComponent />);
  expect(screen.getByText('Expected Text')).toBeInTheDocument();
});
```

运行测试：

```bash
npm test
```

## 文档贡献

文档改进对项目同样重要！您可以：

1. 更新或改进现有文档
2. 添加教程或使用示例
3. 改进代码注释
4. 创建或更新API参考

## 报告问题

如果您发现了错误或有改进建议，请在 GitHub 上[创建问题](https://github.com/yourusername/treenamer/issues/new)。

请包含：

- 问题的简要摘要
- 重现步骤
- 预期行为
- 实际行为
- 环境信息（操作系统、软件版本等）
- 相关截图（如适用）

## 代码审查

所有提交都要经过代码审查。作为审查者或被审查者：

- 保持礼貌和尊重
- 专注于代码，而非个人
- 解释您的推理
- 提出具体的改进建议

## 持续集成

我们使用 GitHub Actions 进行持续集成。每个提交和PR都会运行以下检查：

- 代码风格检查 (rustfmt, eslint)
- 单元测试
- 构建验证

确保您的更改通过所有检查。

## 许可证

通过贡献代码，您同意您的贡献将在项目许可证下发布。TreeNamer 使用 [MIT 许可证](LICENSE)。

## 联系我们

如果您有任何问题，可以：

- 在 GitHub 问题上评论
- 加入我们的[社区讨论](https://github.com/yourusername/treenamer/discussions)
- 发送电子邮件至 [maintainer@example.com](mailto:maintainer@example.com)

感谢您对 TreeNamer 的贡献！
