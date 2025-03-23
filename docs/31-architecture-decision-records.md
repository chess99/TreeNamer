# 架构决策记录 (ADR)

本文档记录了 TreeNamer 项目中的重要架构决策。每个 ADR 描述了我们面临的问题、考虑的选项、做出的决策以及决策理由。

## ADR-001: 选择 Tauri 作为桌面应用程序框架

### 状态

已接受 (2023-06-15)

### 背景

我们需要为 TreeNamer 选择一个桌面应用程序框架，该框架应支持跨平台开发，提供良好的文件系统访问能力，并且性能优良。

### 考虑的选项

1. **Electron** - 基于 Chromium 和 Node.js 的成熟框架
2. **Tauri** - 基于系统原生 WebView 和 Rust 的新兴框架
3. **Qt/QML** - 成熟的 C++ 原生框架
4. **Flutter** - Google 的跨平台 UI 框架

### 决策

选择 **Tauri** 作为 TreeNamer 的应用程序框架。

### 理由

- **性能和资源占用**: Tauri 应用比 Electron 更轻量，内存占用显著更低
- **安全性**: Rust 后端提供内存安全保证，减少潜在漏洞
- **文件系统性能**: Rust 处理文件系统操作的效率高于 Node.js
- **现代前端技术**: 支持使用任何前端框架 (React, Vue, Svelte 等)
- **包大小**: 生成的安装包比 Electron 小得多
- **原生外观**: 利用系统原生 WebView，更贴近各平台体验

### 影响

- 需要同时具备 Rust 和前端开发技能
- 社区和资源相比 Electron 较少
- 需要适应 Rust 的严格所有权系统

## ADR-002: 选择 React 和 TypeScript 构建前端

### 状态

已接受 (2023-06-20)

### 背景

我们需要为 TreeNamer 选择前端技术栈，该技术栈应提供良好的开发体验、类型安全、组件化和状态管理能力。

### 考虑的选项

1. **React + TypeScript** - Facebook 的 UI 库与 Microsoft 的类型系统
2. **Vue.js + TypeScript** - 渐进式 JavaScript 框架
3. **Svelte + TypeScript** - 编译时框架
4. **Angular** - Google 的完整前端框架

### 决策

选择 **React 18** 配合 **TypeScript 5** 构建前端。

### 理由

- **生态系统**: React 拥有最大的组件生态和丰富的第三方库
- **类型安全**: TypeScript 提供静态类型检查，减少运行时错误
- **团队熟悉度**: 团队已有 React 经验，降低学习曲线
- **性能**: React 18 的并发特性提供更好的用户体验
- **社区支持**: 庞大的社区和丰富的学习资源
- **与 Tauri 集成**: 良好的互操作性和集成文档

### 影响

- 需要维护 TypeScript 类型定义
- React 的函数式编程范式需要适应
- 类型定义与 Rust 类型的对齐需要额外工作

## ADR-003: 选择 Zustand 作为状态管理库

### 状态

已接受 (2023-07-02)

### 背景

TreeNamer 需要一个状态管理解决方案来处理应用程序状态、持久化数据和与 Rust 后端的通信。

### 考虑的选项

1. **Redux + Redux Toolkit** - 成熟但相对繁琐的状态管理库
2. **MobX** - 基于可观察对象的响应式状态管理
3. **Zustand** - 轻量级、钩子优先的状态管理
4. **Context API + useReducer** - React 内置的状态管理

### 决策

选择 **Zustand** 作为主要状态管理库。

### 理由

- **简单性**: API 简洁，学习曲线低
- **TypeScript 友好**: 优秀的类型推断和类型安全
- **轻量**: 极小的包大小和运行时开销
- **灵活性**: 易于与其他工具和库集成
- **中间件支持**: 内置对持久化、数据结构不可变性等的支持
- **无样板代码**: 比 Redux 需要更少的样板代码
- **可测试性**: 易于测试和模拟

### 影响

- 相比 Redux，社区规模和资源较少
- 需要建立自己的最佳实践和架构模式
- 对于大型应用可能需要补充额外的工具

## ADR-004: 使用实体标识符跟踪文件系统变更

### 状态

已接受 (2023-08-10)

### 背景

TreeNamer 的核心功能是跟踪和应用文件系统变更，尤其是重命名操作。我们需要一种机制来准确识别原始目录树中的实体与修改后目录树中的实体之间的关系。

### 考虑的选项

1. **基于路径匹配** - 使用文件路径作为标识符
2. **内容哈希** - 使用文件内容的哈希作为标识符
3. **唯一标识符分配** - 为每个实体分配唯一 ID 并在编辑过程中维护
4. **文件系统元数据** - 尝试使用 inode 或其他系统级标识符

### 决策

选择**唯一标识符分配**方法，在内存中为每个文件系统实体分配唯一 ID，并通过操作历史跟踪这些 ID。

### 理由

- **精确跟踪**: 可以精确识别重命名和移动操作
- **独立于系统**: 不依赖于特定操作系统的功能
- **高效**: 避免了内容哈希的计算开销
- **健壮性**: 即使路径完全改变也能识别同一实体
- **支持复杂操作**: 能处理嵌套目录重命名和复合操作

### 影响

- 需要在应用程序会话期间维护 ID 映射
- 不能持久化到文件系统（除非修改文件元数据）
- 实现比简单路径比较更复杂

## ADR-005: 使用两种模式编辑目录树

### 状态

已接受 (2023-09-05)

### 背景

用户需要一种直观且高效的方式来编辑目录结构。我们需要决定提供何种编辑界面。

### 考虑的选项

1. **纯文本编辑器** - 类似于大纲的文本表示
2. **树形图形界面** - 类似文件资源管理器的交互式树
3. **拖放界面** - 基于拖放操作的可视化编辑
4. **混合方法** - 结合多种编辑模式

### 决策

实现**双模式编辑**，包括:

1. 文本编辑模式（主要） - 使用缩进表示层次结构
2. 树视图模式（辅助） - 提供可视化预览和简单编辑

### 理由

- **灵活性**: 同时满足偏好文本和偏好可视化的用户
- **效率**: 文本模式允许快速批量编辑和模式匹配
- **直观性**: 树视图提供直观的结构可视化
- **技术可行性**: 两种表示可以共享底层数据模型
- **适应不同需求**: 简单操作可用树视图，复杂操作可用文本模式

### 影响

- 需要维护两种视图之间的实时同步
- 增加了 UI 复杂性和开发工作量
- 需要确保两种模式的一致用户体验

## ADR-007: 采用暗黑模式支持

### 状态

已接受 (2023-11-15)

### 背景

现代应用程序越来越需要支持暗黑模式，以提高用户体验和减少眼睛疲劳。

### 考虑的选项

1. **仅亮色主题** - 简化开发，忽略暗色模式
2. **仅暗色主题** - 专注于低眼疲劳设计
3. **系统检测的主题** - 自动跟随系统主题设置
4. **用户可选主题** - 允许用户选择亮色或暗色主题

### 决策

实现**用户可选主题**，默认跟随系统设置，但允许用户手动切换。

### 理由

- **可访问性**: 满足不同用户的视觉偏好
- **减少眼睛疲劳**: 在低光环境中提供更舒适的体验
- **现代 UX 期望**: 符合当前应用程序的标准功能
- **用户控制**: 给予用户最大的灵活性
- **设计一致性**: 确保应用在所有模式下都有专业外观

### 影响

- 增加设计和开发复杂性
- 需要测试两种主题下的所有 UI 元素
- 需要实现主题偏好存储

## ADR-008: Use Tauri for Cross-Platform Support

**Date**: 2024-03-15

**Status**: Accepted

**Context**:
We need to build a cross-platform desktop application that can access the file system to rename files and directories. Performance and binary size are important considerations.

**Decision**:
Use Tauri framework combining Rust for the backend and React/TypeScript for the frontend.

**Consequences**:
- Reduced application bundle size compared to Electron
- Better performance due to Rust backend
- Secure access to system resources through Rust's permission system
- Some increased complexity due to language boundary crossing
- Potential learning curve for developers unfamiliar with Rust

## ADR-009: ID Management and Centralized State Architecture

### Status
Accepted

### Context
The application needs a reliable way to track renamed files/folders across tree operations. The previous architecture had state management and ID tracking spread across multiple components, leading to issues with ID consistency and false rename detections.

### Decision
1. **Centralize State Management**
   - Move all tree-related state to the App component
   - Implement clear data flow: backend JSON → formatted text → edited text

2. **ID Management Strategy**
   - Backend generates and assigns IDs when parsing directories
   - Frontend preserves IDs during user edits
   - Two modes for `parseTextToTree`:
     - 'edit': Preserves IDs when parsing user edits
     - 'load': Uses backend tree directly when loading directories

### Consequences
- **Positive**
  - Reliable rename detection through ID preservation
  - Elimination of false renames when reloading directories
  - Simplified debugging with centralized state
  - Clear component responsibilities
  
- **Negative**
  - Slightly more complex core component (App.tsx)
  - Need to maintain two processing modes

### Implementation
The App component now handles:
1. Directory loading (via backend JSON)
2. Text formatting for display 
3. Tracking user edits
4. Applying changes with 'edit' mode parsing

Tree parsing utility modes:
```typescript
parseTextToTree(text, originalJson, 'edit') // For user edits
parseTextToTree(text, originalJson, 'load') // For fresh directory loads
```

## ADR-010: Event-Based State Management

**Date**: 2024-03-18

**Status**: Accepted

**Context**:
We need a state management approach for the React frontend that allows multiple components to react to changes.

**Decision**:
Use an event-based state management pattern with the useContext and useReducer hooks.

**Consequences**:
- Simplified component communication
- Better separation of concerns between UI and logic
- Predictable state updates
- Reduced prop drilling
- Slightly increased complexity for simple operations

## ADR-011: Unicode-Aware Parsing

**Date**: 2024-03-20

**Status**: Accepted

**Context**:
Tree text representation includes unicode characters (like ├, └, │) and filenames may contain unicode characters.

**Decision**:
Use explicit unicode-aware string handling in Rust for parsing and manipulating tree text.

**Consequences**:
- Better support for international characters in filenames
- More robust handling of the tree display characters
- Avoids byte-offset bugs when slicing strings
- Slight performance overhead compared to byte-based operations

## ADR-012: JSON-Based Data Structure for Frontend-Backend Communication

**Date**: 2024-04-04

**Status**: Accepted

**Context**:
The text-based tree representation has been challenging to parse reliably, particularly with complex directory structures. Maintaining character-precise formatting while ensuring accurate parsing between frontend and backend is error-prone.

**Decision**:
Replace text-based tree representation with JSON data structures for communication between frontend and backend. The backend will serialize directory trees as JSON, and the frontend will deserialize, display, and re-serialize modified trees back to JSON for the backend to process.

**Consequences**:
- More robust data passing between frontend and backend
- Elimination of complex text parsing logic and associated bugs
- Clear separation between data model and visual representation
- Frontend can focus on visualization while backend handles data structure
- Ability to add metadata to tree nodes in the future
- Maintains the text-based UI for user editing but with more reliable underlying data structure
- Slightly increased payload size compared to plain text
