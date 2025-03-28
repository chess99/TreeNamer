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
      console.log('Merged frontend options:', mergedOptions);
      
      // Convert to the format expected by Rust
      const rustOptions: RustDirectoryOptions = {
        max_depth: mergedOptions.maxDepth,
        exclude_pattern: mergedOptions.excludePattern,
        follow_symlinks: mergedOptions.followSymlinks,
        show_hidden: mergedOptions.showHidden
      };
      console.log('Converted Rust options:', rustOptions);
      
      // Call the Rust function to parse the directory
      const invokeParams = { 
        dirPath: directoryPath,
        options: rustOptions
      };
      console.log('Calling parse_directory with params:', JSON.stringify(invokeParams));
      
      try {
        const result = await invoke<string>('parse_directory', invokeParams);
        console.log('Invoke successful, received data length:', result?.length || 0);
        
        set({ 
          originalTree: result, 
          isLoading: false
        });
      } catch (invokeErr) {
        console.error('Invoke error details:', {
          error: invokeErr,
          errorType: typeof invokeErr,
          errorMessage: invokeErr instanceof Error ? invokeErr.message : String(invokeErr),
          errorStack: invokeErr instanceof Error ? invokeErr.stack : undefined,
          params: invokeParams
        });
        throw invokeErr;
      }
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
      
      console.log('Applying operations...');
      // Call the Rust function to apply the changes
      await invoke('apply_operations', { 
        dirPath: directoryPath,
        originalTree: originalTree,
        modifiedTree: modifiedTree
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
        dirPath: directoryPath,
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