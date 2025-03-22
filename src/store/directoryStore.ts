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
}

interface DirectoryState {
  directoryPath: string;
  originalTree: string;
  isLoading: boolean;
  error: string | null;
  setDirectoryPath: (path: string) => void;
  loadDirectory: (options?: Partial<DirectoryOptions>) => Promise<void>;
  applyChanges: (modifiedTree: string) => Promise<void>;
  resetError: () => void;
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
      
      set({ 
        originalTree: result, 
        isLoading: false
      });
    } catch (e) {
      console.error('Error loading directory:', e);
      set({ error: String(e), isLoading: false });
    }
  },

  applyChanges: async (modifiedTree) => {
    const { directoryPath, originalTree } = get();
    
    if (!directoryPath) {
      console.error('Error: No directory path specified');
      set({ error: 'No directory path specified' });
      return Promise.reject('No directory path specified');
    }
    
    if (originalTree === modifiedTree) {
      console.error('Error: No changes to apply');
      set({ error: 'No changes to apply' });
      return Promise.reject('No changes to apply');
    }
    
    try {
      console.log('Starting to apply changes...');
      set({ isLoading: true, error: null });
      
      console.log('Creating virtual backup...');
      // Create a virtual backup before applying changes
      const backupInfo = await invoke<BackupInfo>('create_backup', { 
        path: directoryPath,
        tree_text: originalTree
      });
      
      console.log('Backup created:', backupInfo);
      
      console.log('Applying operations...');
      // Call the Rust function to apply the changes
      await invoke('apply_operations', { 
        path: directoryPath,
        originalTree,
        modifiedTree
      });
      
      console.log('Operations applied successfully, reloading directory...');
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
      
      console.log('Directory reloaded, updating state...');
      set({ 
        originalTree: result, 
        isLoading: false,
        error: null
      });
      console.log('Changes applied successfully');
      
      return Promise.resolve();
    } catch (e) {
      console.error('Error applying changes:', e);
      set({ error: String(e), isLoading: false });
      return Promise.reject(e);
    }
  },

  resetError: () => set({ error: null }),
})); 