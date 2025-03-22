import { invoke } from '@tauri-apps/api/core';
import { create } from 'zustand';

interface DirectoryOptions {
  maxDepth: number;
  excludePattern: string;
  followSymlinks: boolean;
  showHidden: boolean;
}

// This interface matches the Rust struct
interface RustDirectoryOptions {
  max_depth: number;
  exclude_pattern: string;
  follow_symlinks: boolean;
  show_hidden: boolean;
}

interface BackupInfo {
  path: string;
  timestamp: number;
  is_virtual: boolean;
}

interface DirectoryState {
  directoryPath: string;
  originalTree: string;
  isLoading: boolean;
  error: string | null;
  backups: BackupInfo[];
  setDirectoryPath: (path: string) => void;
  loadDirectory: (options?: Partial<DirectoryOptions>) => Promise<void>;
  applyChanges: (modifiedTree: string) => Promise<void>;
  resetError: () => void;
  loadBackups: () => Promise<void>;
  restoreBackup: (backupPath: string) => Promise<void>;
}

const defaultOptions: DirectoryOptions = {
  maxDepth: 10,
  excludePattern: 'node_modules|.git',
  followSymlinks: false,
  showHidden: false,
};

export const useDirectoryStore = create<DirectoryState>((set, get) => ({
  directoryPath: '',
  originalTree: '',
  isLoading: false,
  error: null,
  backups: [],

  setDirectoryPath: (path) => set({ directoryPath: path }),

  loadDirectory: async (options = {}) => {
    const { directoryPath } = get();
    
    if (!directoryPath) {
      set({ error: 'Please enter a directory path' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      
      const mergedOptions = { ...defaultOptions, ...options };
      
      // Convert to the format expected by Rust
      const rustOptions: RustDirectoryOptions = {
        max_depth: mergedOptions.maxDepth,
        exclude_pattern: mergedOptions.excludePattern,
        follow_symlinks: mergedOptions.followSymlinks,
        show_hidden: mergedOptions.showHidden
      };
      
      // Call the Rust function to parse the directory
      const result = await invoke<string>('parse_directory', { 
        path: directoryPath,
        options: rustOptions
      });
      
      set({ originalTree: result, isLoading: false });
    } catch (e) {
      console.error('Error loading directory:', e);
      set({ error: String(e), isLoading: false });
    }
  },

  applyChanges: async (modifiedTree) => {
    const { directoryPath, originalTree } = get();
    
    if (!directoryPath) {
      set({ error: 'No directory path specified' });
      return;
    }
    
    if (originalTree === modifiedTree) {
      set({ error: 'No changes to apply' });
      return;
    }
    
    try {
      set({ isLoading: true, error: null });
      
      // Create a virtual backup before applying changes
      await invoke('create_backup', { 
        path: directoryPath,
        tree_text: originalTree
      });
      
      // Call the Rust function to apply the changes
      await invoke('apply_operations', { 
        path: directoryPath,
        originalTree,
        modifiedTree
      });
      
      // Reload the directory to reflect changes
      const rustOptions: RustDirectoryOptions = {
        max_depth: defaultOptions.maxDepth,
        exclude_pattern: defaultOptions.excludePattern,
        follow_symlinks: defaultOptions.followSymlinks,
        show_hidden: defaultOptions.showHidden
      };
      
      const result = await invoke<string>('parse_directory', { 
        path: directoryPath,
        options: rustOptions
      });
      
      // Reload backups
      get().loadBackups();
      
      set({ 
        originalTree: result, 
        isLoading: false,
        error: null
      });
    } catch (e) {
      console.error('Error applying changes:', e);
      set({ error: String(e), isLoading: false });
    }
  },

  resetError: () => set({ error: null }),
  
  loadBackups: async () => {
    const { directoryPath } = get();
    
    if (!directoryPath) {
      return;
    }
    
    try {
      const backups = await invoke<BackupInfo[]>('list_backups', { 
        path: directoryPath 
      });
      
      set({ backups });
    } catch (e) {
      console.error('Error loading backups:', e);
      // Don't set error state as this is a secondary operation
    }
  },
  
  restoreBackup: async (backupPath) => {
    try {
      set({ isLoading: true, error: null });
      
      await invoke('restore_backup', { backupPath });
      
      // Reload the directory after restore
      const { directoryPath } = get();
      const rustOptions: RustDirectoryOptions = {
        max_depth: defaultOptions.maxDepth,
        exclude_pattern: defaultOptions.excludePattern,
        follow_symlinks: defaultOptions.followSymlinks,
        show_hidden: defaultOptions.showHidden
      };
      
      const result = await invoke<string>('parse_directory', { 
        path: directoryPath,
        options: rustOptions
      });
      
      set({ 
        originalTree: result, 
        isLoading: false,
        error: null
      });
    } catch (e) {
      console.error('Error restoring backup:', e);
      set({ error: String(e), isLoading: false });
    }
  }
})); 