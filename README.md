# TreeNamer

TreeNamer is a directory tree visualization and renaming tool built with Tauri, React, and TypeScript. It allows users to edit directory structures in a text-based interface and apply those changes to the actual file system.

## Features

- Directory tree visualization in both text and graphical formats
- Text-based editing of directory structures
- Visual diff comparison between original and modified trees
- Safe application of changes with automatic backups
- Cross-platform support (Windows, macOS, Linux)

## Development Setup

### Prerequisites

- **Node.js**: Version 22.11.0 (configured via .nvmrc)

  ```bash
  # If you use nvm, simply run:
  nvm use
  ```

- **Rust**: Version 1.75.0 (configured via rust-toolchain.toml)

  ```bash
  # Rustup will automatically use the correct version
  rustup show
  ```

- **pnpm**: For package management

  ```bash
  npm install -g pnpm
  ```

### System Dependencies

#### Windows

- No additional dependencies required

#### macOS

```bash
brew install webkit2gtk-4.1
```

#### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

### Installation

1. Clone the repository

   ```bash
   git clone https://github.com/yourusername/treenamer.git
   cd treenamer
   ```

2. Install dependencies

   ```bash
   pnpm install
   ```

3. Run the development server

   ```bash
   pnpm tauri dev
   ```

## Building for Production

```bash
pnpm tauri build
```

This will create platform-specific installers in the `src-tauri/target/release/bundle` directory.

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

## License

[MIT](LICENSE)
