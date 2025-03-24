# TreeNamer Keyboard Shortcuts Design

## Overview

This document outlines the keyboard shortcuts design for TreeNamer, providing a comprehensive reference for developers and users. The shortcuts are designed to enhance productivity and provide quick access to commonly used features while maintaining consistency with platform standards and avoiding conflicts.

## Design Principles

1. **Intuitiveness**: Shortcuts should be easy to remember using mnemonic associations
2. **Consistency**: Follow platform conventions where possible (especially macOS standards)
3. **Discoverability**: Make shortcuts visible and easy to discover for new users
4. **Ergonomics**: Minimize awkward key combinations that might cause discomfort
5. **Conflict Avoidance**: Ensure shortcuts don't conflict with each other or with system shortcuts

## Application Shortcuts

| Function | Shortcut (macOS) | Shortcut (Windows/Linux) | Rationale |
|----------|------------------|--------------------------|-----------|
| View Diff | `⌘⇧D` | `Ctrl+Shift+D` | "D" for Diff with Shift to avoid conflicts |
| Apply Changes | `⌘⇧Enter` | `Ctrl+Shift+Enter` | Standard convention for confirming actions with Shift |
| Reload | `⌘⇧R` | `Ctrl+Shift+R` | Industry standard for reload actions with Shift |
| Browse/Open Directory | `⌘⇧O` | `Ctrl+Shift+O` | Standard "open" convention with Shift |
| Sort Tree | `⌘⇧S` | `Ctrl+Shift+S` | "S" for Sort with Shift modifier |
| AI Command Input | `⌘K` | `Ctrl+K` | Follows Cursor convention, easy to access |
| Preferences/Settings | `⌘,` | `Ctrl+,` | Standard on macOS, adopted for cross-platform |
| Help | `⌘?` | `F1` | Platform-specific standards |

## Special Interactions

### Command Palette

A command palette will appear when the Command key (⌘ on macOS, Ctrl on Windows/Linux) is held for more than 800ms without pressing another key. This helps users discover and remember available shortcuts.

**Design Considerations:**

- Semi-transparent overlay that doesn't completely obscure the workspace
- Organized categorically for easy scanning
- Dismisses automatically when the modifier key is released
- Includes all available commands with their shortcuts
- Supports both keyboard navigation and mouse selection

### Tooltip Design

Every button in the interface will have a tooltip that appears on hover, containing:

1. A concise description of the function (under 30 characters)
2. The associated keyboard shortcut

**Format:** "Action description (shortcut)"

**Example Tooltips:**

- "Compare Changes (⌘⇧D)"
- "Apply Changes (⌘⇧Enter)"
- "Open Directory (⌘⇧O)"

## Platform-Specific Considerations

1. **macOS:**
   - Uses ⌘ (Command) as the primary modifier
   - Uses ⇧ (Shift) as the secondary modifier
   - Follows established macOS conventions (⌘, for preferences, etc.)

2. **Windows/Linux:**
   - Uses Ctrl as the primary modifier
   - Uses Shift as the secondary modifier
   - Replaces macOS-specific shortcuts with platform equivalents

## Implementation Notes

- Shortcuts should only be active when the application is in focus
- The application should handle platform detection to display appropriate shortcut hints
- All shortcuts should be configurable in a preferences panel (future enhancement)
- Accessibility considerations should be made for users who may have difficulty with certain combinations
- Standard text editor shortcuts (⌘F, ⌘Z, etc.) are handled by the editor component and don't need custom implementation

## Future Considerations

- User-configurable shortcuts
- Context-aware shortcut suggestions
- Integration with system-wide shortcut utilities
- Touch Bar support on compatible macOS devices

---

This document will be updated as the application evolves and user feedback is incorporated.

Last updated: 2025-03-23
