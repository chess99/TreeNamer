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
  lastUndoPoint: string | null;
  isLoading: boolean;
  error: string | null;
  lastBackupPath: string | null;
  setDirectoryPath: (path: string) => void;
  loadDirectory: (options?: Partial<DirectoryOptions>) => Promise<void>;
  applyChanges: (modifiedTree: string) => Promise<void>;
  undoLastChange: () => Promise<void>;
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
  lastUndoPoint: null,
  isLoading: false,
  error: null,
  lastBackupPath: null,

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
        isLoading: false,
        lastUndoPoint: null,
        lastBackupPath: null 
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
      
      // Save current state as undo point
      set({ lastUndoPoint: originalTree });
      
      console.log('Creating virtual backup...');
      // Create a virtual backup before applying changes
      const backupInfo = await invoke<BackupInfo>('create_backup', { 
        path: directoryPath,
        tree_text: originalTree
      });
      
      console.log('Backup created:', backupInfo);
      // Store the backup path for potential undo
      set({ lastBackupPath: backupInfo.path });
      console.log('Last backup path set to:', backupInfo.path);
      
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
  
  undoLastChange: async () => {
    const { directoryPath, lastBackupPath } = get();
    
    if (!directoryPath) {
      console.error('Error: No directory path specified');
      set({ error: 'No directory path specified' });
      return;
    }
    
    console.log('Starting undo last change...', { directoryPath, lastBackupPath });
    
    try {
      set({ isLoading: true, error: null });
      
      // 直接调用后端的撤销函数
      console.log('Calling undo_last_change with path:', directoryPath);
      await invoke('undo_last_change', { path: directoryPath });
      console.log('undo_last_change completed successfully');
      
      // 重新加载目录
      const rustOptions: RustDirectoryOptions = {
        max_depth: defaultOptions.maxDepth,
        exclude_pattern: defaultOptions.excludePattern,
        follow_symlinks: defaultOptions.followSymlinks,
        show_hidden: defaultOptions.showHidden
      };
      
      console.log('Reloading directory after undo...');
      const result = await invoke<string>('parse_directory', { 
        path: directoryPath,
        options: rustOptions
      });
      console.log('Directory reload completed');
      
      set({ 
        originalTree: result, 
        isLoading: false,
        error: null,
        lastUndoPoint: null,
        lastBackupPath: null
      });
      console.log('Undo operation completed successfully');
    } catch (e) {
      console.error('Error undoing changes:', e);
      set({ error: String(e), isLoading: false });
    }
  },

  resetError: () => set({ error: null }),
})); 