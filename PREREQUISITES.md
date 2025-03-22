# TreeNamer Development Prerequisites

This document outlines all the necessary prerequisites and setup steps to develop or run the TreeNamer application.

## Required Software

### 1. Node.js and pnpm

- Install Node.js (v16 or higher) from [https://nodejs.org/](https://nodejs.org/)
- Install pnpm globally:

  ```bash
  npm install -g pnpm
  ```

### 2. Rust Setup

#### Important: This project requires the Rust Nightly Toolchain

- Install Rust using rustup:
  - Windows: Download and run rustup-init.exe from [https://rustup.rs/](https://rustup.rs/)
  - macOS/Linux:

    ```bash
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
    ```
  
- Install and configure the nightly toolchain:

  ```bash
  rustup toolchain install nightly
  rustup override set nightly
  ```

- Verify installation:

  ```bash
  rustc --version  # Should show nightly in the version string
  cargo --version
  ```

### 3. Platform-specific Dependencies

#### Windows

- Install Visual Studio Build Tools:
  - Download from [Visual C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
  - Select the "Desktop development with C++" workload during installation
  - This includes the required Windows SDK and C++ tools

#### macOS

- Install Xcode Command Line Tools:

  ```bash
  xcode-select --install
  ```

#### Linux (Ubuntu/Debian)

- Install required packages:

  ```bash
  sudo apt update
  sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
  ```

## Project Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/treenamer.git
   cd treenamer
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Run the development server:

   ```bash
   pnpm tauri dev
   ```

## Common Issues and Troubleshooting

### Cargo.lock Version Error

If you see an error about the lock file version:

```
error: failed to parse lock file ... lock file version `4` was found, but this version of Cargo does not understand this lock file
```

Ensure you're using the nightly toolchain:

```bash
rustup override set nightly
```

And delete the existing Cargo.lock:

```bash
rm src-tauri/Cargo.lock  # For Linux/macOS
del src-tauri\Cargo.lock  # For Windows
```

### Path Environment Variable Issues

If you're using VSCode and terminal commands like `rustc` work in a regular terminal but not in VSCode:

- Close VSCode completely
- Reopen VSCode and try again
- If still not working, make sure `%USERPROFILE%\.cargo\bin` is in your PATH environment variable

### Plugin Errors

If you encounter plugin-related errors, verify that:

1. The plugins are correctly registered in `src-tauri/src/main.rs` with:
   ```rust
   .plugin(tauri_plugin_name::init())
   ```

2. The `tauri.conf.json` file has the correct plugin configuration:
   - For Tauri 2.0 beta, some plugins are registered in code only, not in config
   - The `shell` plugin should be configured with `"open": true`
   - Remove any plugin entries that are handled in the Rust code, such as:
     ```json
     // INCORRECT
     "dialog": {} // or "dialog": true
     ```

3. If you still have issues, refer to the [Tauri 2.0 Plugin Documentation](https://v2.tauri.app/plugins)

## Minimum System Requirements

- 4GB RAM (8GB recommended)
- Modern CPU (dual-core or better)
- 1GB free disk space
- Windows 10/11, macOS 10.15+, or modern Linux distribution
