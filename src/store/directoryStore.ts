import { invoke } from '@tauri-apps/api/core';
import { create } from 'zustand';

interface DirectoryOptions {
  maxDepth: number;
  excludePattern: string;
  followSymlinks: boolean;
  showHidden: boolean;
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
      
      // Call the Rust function to parse the directory
      const result = await invoke<string>('parse_directory', { 
        path: directoryPath,
        options: mergedOptions
      });
      
      set({ originalTree: result, isLoading: false });
    } catch (e) {
      set({ error: e as string, isLoading: false });
    }
  },

  applyChanges: async (modifiedTree) => {
    try {
      set({ isLoading: true, error: null });
      
      // TODO: Implement the actual changes application
      // This is a placeholder for now
      console.log('Applying changes:', modifiedTree);
      
      // We would need to parse the tree and generate file operations
      // Then call the Rust function to apply the operations
      
      set({ isLoading: false });
    } catch (e) {
      set({ error: e as string, isLoading: false });
    }
  },

  resetError: () => set({ error: null }),
})); 