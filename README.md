# TreeNamer

TreeNamer is a directory tree visualization and renaming tool built with Tauri, React, and TypeScript. It allows users to edit directory structures in a text-based interface and apply those changes to the actual file system.

## Features

- Directory tree visualization in both text and graphical formats
- Text-based editing of directory structures
- Visual diff comparison between original and modified trees
- Safe application of changes with automatic backups
- Cross-platform support (Windows, macOS, Linux)

## Documentation

- [Project Overview](docs/01-project-overview.md)
- [Development Setup](docs/02-development-setup.md)
- [Product Design Document](docs/Product%20Design%20Document.md)
- [Technical Solution Design](docs/Technical%20Solution%20Design.md)
- [Implementation Action Plan](docs/Implementation%20Action%20Plan.md)

## Quick Start

### Prerequisites

**IMPORTANT**: This project requires specific development environment setup. For detailed prerequisites and troubleshooting, please refer to the [Development Setup](docs/02-development-setup.md) guide.

Quick summary of requirements:

- **Node.js**: Version 22.11.0 (configured via .nvmrc)
- **Rust**: **Nightly channel** required for Tauri 2.0 beta
- **pnpm**: For package management

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
