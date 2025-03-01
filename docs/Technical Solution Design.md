# TreeNamer 技术方案设计

## 一、系统架构

### 1. 整体架构图

```plaintext
+-------------------------+
|      前端 (Web View)     |
|     (Tauri + React UI)  |
+-------------------------+
|  - 目录树编辑器          |  ← 基于Monaco Editor
|  - Diff对比视图          |  ← 集成diff-match-patch
|  - 用户交互逻辑          |
+------------+------------+
             ↑ Tauri API 调用
+------------+------------+
|       后端 (Rust)        |
+-------------------------+
|  - 文件系统操作          |  ← std::fs模块
|  - 目录树解析器          |  ← 自定义递归扫描器
|  - 备份/回滚管理器       |
+-------------------------+
```

## 二、核心模块设计

### 1. 目录树解析器

#### 输入输出

- **输入**：文件夹绝对路径  
- **输出**：标准化目录树文本（符合tree命令格式）  
- **示例**：

  ```rust
  // 生成逻辑 (Rust)
  fn parse_directory(path: &str, options: DirectoryOptions) -> Result<String, Error> {
    // 实现目录解析逻辑
  }
  
  // 前端调用 (JavaScript)
  invoke('parse_directory', { 
    path: '/projects',
    options: {
      maxDepth: 5,
      exclude: 'node_modules'
    }
  });
  ```

#### 关键技术点

- **递归扫描**：使用`std::fs::read_dir`遍历目录
- **符号统一化**：将Windows路径分隔符`\`转换为`/`
- **性能优化**：利用Rust的并行迭代器处理大型目录

### 2. 编辑器内核

#### Monaco Editor集成方案

```javascript
// 初始化双编辑器实例
const originalEditor = monaco.editor.create(leftPanel, {
  value: initialTreeText,
  readOnly: true, // 左侧只读
  minimap: { enabled: false }
});

const editableEditor = monaco.editor.create(rightPanel, {
  value: initialTreeText, 
  multiCursorModifier: 'ctrlCmd', // 多光标支持
  quickSuggestions: false
});

// 实时Diff计算
editableEditor.onDidChangeModelContent(() => {
  const diffs = diff.diff_main(
    originalEditor.getValue(),
    editableEditor.getValue()
  );
  renderDiffDecorations(diffs); // 差异高亮
});
```

#### 多光标与正则替换

- **多光标**：继承Monaco原生支持（`Ctrl+Click`/`Alt+拖动`）
- **正则替换**：调用`editor.trigger`执行替换命令

  ```javascript
  editor.trigger('keyboard', 'actions.find', {
    searchString: regex,
    replaceString: replacement,
    isRegex: true
  });
  ```

### 3. 差异对比引擎

#### 定制化Diff算法

| 变更类型      | 识别策略                              |
|---------------|--------------------------------------|
| 文件重命名    | 相同路径层级+不同文件名              |
| 目录移动      | 相同文件名+父级路径变化              |
| 结构变更      | 子树整体位移检测（LCS算法优化）       |

#### 差异标记规则

```typescript
interface DiffMarker {
  type: 'add' | 'delete' | 'modify';
  lineNumber: number;
  content: string;
  // 可视化样式
  className: 'diff-add' | 'diff-del' | 'diff-mod'; 
}
```

### 4. 文件系统操作器

#### 事务性执行流程

```mermaid
sequenceDiagram
  用户->>+前端: 点击"应用修改"
  前端->>+Rust后端: 调用apply_changes API
  Rust后端->>+备份管理器: 创建备份(.treenamer_backup)
  备份管理器-->>-Rust后端: 返回备份路径
  Rust后端->>+操作队列: 生成原子操作列表
  loop 每个操作
    操作队列->>文件系统: 执行rename/mkdir/rmdir
    文件系统-->>操作队列: 返回结果
  end
  Rust后端-->>-前端: 返回操作结果
  前端-->>-用户: 显示成功/失败报告
```

#### 关键API

```rust
enum FileOperation {
    Rename { from: String, to: String },
    CreateDir { path: String },
    Delete { path: String },
}

fn apply_operations(ops: Vec<FileOperation>) -> Result<(), Error> {
    let mut rollback_steps = Vec::new();
    
    for op in ops {
        let backup = pre_check(&op)?;
        rollback_steps.push(backup);
        execute_operation(op)?;
    }
    
    Ok(())
}

fn rollback(steps: Vec<RollbackStep>) -> Result<(), Error> {
    for step in steps.iter().rev() {
        execute_rollback(step)?;
    }
    Ok(())
}
```

## 三、关键技术决策

### 1. 前后端通信优化

| 场景                | 技术方案                              | 数据格式          |
|---------------------|--------------------------------------|-------------------|
| 目录加载            | Tauri命令API + 流式传输              | JSON              |
| 实时Diff计算        | 前端自主处理，避免跨进程延迟          | 无                |
| 大文件操作进度反馈  | Tauri事件系统                        | 进度百分比        |

### 2. 安全防护设计

- **路径校验**：禁止操作系统保护目录（如`/System`、`C:\Windows`）
- **符号链接处理**：默认跳过符号链接，提供选项开关
- **权限控制**：利用Tauri的细粒度权限系统限制文件访问范围

## 四、性能优化策略

| 模块                | 优化手段                              | 目标指标          |
|---------------------|--------------------------------------|-------------------|
| 目录树渲染          | 虚拟滚动（react-window）             | 1万节点60fps      |
| Diff计算            | Web Worker并行计算                   | 0延迟响应         |
| 文件操作            | Rust并行处理 + 异步队列              | 每秒1000+操作     |

---

## 五、测试方案

### 1. 单元测试

```rust
#[test]
fn test_parse_nested_directory() {
    let tree = parse_directory("test/fixtures/nested", Default::default()).unwrap();
    assert!(tree.contains("nested/"));
    assert!(tree.contains("└── child/"));
}
```

```javascript
test('识别目录移动', () => {
  const oldTree = 'parent/\n└── child/';
  const newTree = 'new_parent/\n└── child/';
  const diffs = calculateStructureDiff(oldTree, newTree);
  expect(diffs[0].type).toBe('move');
});
```

### 2. 端到端测试

使用**WebdriverIO**模拟用户操作：

```javascript
it('should rename files using regex', async () => {
  await browser.url('/');
  await $('#drop-zone').setValue('/test/folder');
  await $('.editor').waitForDisplayed();
  await browser.keys(['Control', 'r']);
  await $('#regex-input').setValue('\d+');
  await $('#replace-all').click();
  await $('#apply-changes').click();
});
```

## 六、部署与维护

### 1. 打包配置

```toml
[package]
name = "treenamer"
version = "0.1.0"
edition = "2021"

[dependencies]
tauri = { version = "1.5", features = ["api-all"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

[build-dependencies]
tauri-build = { version = "1.5", features = [] }

{
  "build": {
    "distDir": "../dist",
    "devPath": "http://localhost:3000"
  },
  "bundle": {
    "identifier": "com.treenamer.app",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

### 2. 更新策略

- 自动更新：集成Tauri自动更新API
- 渠道管理：稳定版（Stable）与测试版（Beta）双通道
