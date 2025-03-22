# TreeNamer Project Overview

## Project Summary

TreeNamer is a directory tree visualization and renaming tool built with Tauri, React, and TypeScript. It allows users to edit directory structures in a text-based interface and apply those changes to the actual file system.

## Current State

The project is in early development with the following progress:

1. **Frontend**: React application with Chakra UI v3 for styling
2. **Backend**: Tauri with Rust for file system operations
3. **Current Focus**: Setting up the development environment and resolving configuration issues

## Technical Stack

- **Frontend**:
  - React with TypeScript
  - Vite as build tool
  - Chakra UI v3 for component library
  - Monaco Editor (planned for tree editing)

- **Backend**:
  - Tauri v2 (beta)
  - Rust for file system operations

## Issues Resolved

1. **Tauri Configuration**: Updated `tauri.conf.json` to use the new configuration format:
   - Replaced `devPath` and `distDir` with `beforeDevCommand`, `beforeBuildCommand`, and `frontendDist`
   - Added plugin configurations for `shell` and `dialog`

2. **TypeScript Errors**: Fixed errors in:
   - `TreeView.tsx`: Removed unused variables (`currentLevel`, `connector`, `isLast`)
   - `theme.ts`: Updated to use Chakra UI v3's theming system with `createSystem`, `defineConfig`, and `mergeConfigs`

3. **Build Process**: Successfully built the frontend with `pnpm build`, generating the `dist` directory

## Project Structure

```
treenamer/
├── src/                      # Frontend React code
│   ├── components/           # UI components
│   │   ├── FileTree/         # Directory tree components
│   │   └── ...               # Other components
│   ├── styles/               # Global styles
│   ├── App.tsx               # Main application component
│   └── main.tsx              # Entry point
├── src-tauri/                # Rust backend code
│   ├── src/
│   │   ├── main.rs           # Entry point
│   │   ├── commands/         # Tauri commands
│   │   │   ├── tree.rs       # Directory tree parsing
│   │   │   └── backup.rs     # Backup management
│   │   └── error.rs          # Error handling module
│   ├── Cargo.toml            # Rust dependencies
│   └── tauri.conf.json       # Tauri configuration
├── public/                   # Static assets
└── package.json              # Node.js dependencies
```

## Key Features (Planned)

1. **Directory Tree Visualization**: Display directory structure in a tree format
2. **Interactive Editing**: Edit directory names and structure in a text-based interface
3. **Diff View**: Show differences between original and edited directory structure
4. **Safe Application**: Apply changes with backup and rollback capabilities

## Next Steps

1. **Implement Core Features**:
   - Directory tree parsing and visualization
   - Text-based editing interface
   - Diff view for changes
   - Safe application of changes

2. **Testing and Refinement**:
   - Test on different platforms (Windows, macOS, Linux)
   - Refine UI and UX
   - Add error handling and recovery mechanisms

## Development Workflow

1. **Code on Local Machine**: Develop and test the application locally
2. **Use Version Control**: Commit changes frequently and push to a remote repository
3. **Test Thoroughly**: Test on different platforms and with different directory structures
