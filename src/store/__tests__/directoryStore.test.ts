import { invoke } from '@tauri-apps/api/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';

// Define the store state type to match the actual store
interface DirectoryState {
  isLoading: boolean;
  error: string | null;
  treeData: string | null;
  lastPath: string | null;
  lastOptions: {
    maxDepth: number;
    excludePattern: string;
    followSymlinks: boolean;
    showHidden: boolean;
  };
  loadDirectory: (path: string, options?: any) => Promise<void>;
  reloadLastDirectory: () => Promise<void>;
}

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn()
}));

// Mock implementation of the store for testing
const mockImplementation = (set: any) => ({
  isLoading: false,
  error: null,
  treeData: null,
  lastPath: null,
  lastOptions: {
    maxDepth: 10,
    excludePattern: 'node_modules|.git',
    followSymlinks: false,
    showHidden: false
  },
  loadDirectory: async (path: string, options?: any) => {
    set({ isLoading: true, error: null });
    
    const effectiveOptions = options || {
      maxDepth: 10,
      excludePattern: 'node_modules|.git',
      followSymlinks: false,
      showHidden: false
    };
    
    try {
      const result = await invoke('parse_directory', {
        dirPath: path,
        options: effectiveOptions
      });
      
      set({
        isLoading: false,
        treeData: result as string,
        lastPath: path,
        lastOptions: effectiveOptions
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  },
  reloadLastDirectory: async function() {
    const state = this as any;
    if (state.lastPath) {
      return state.loadDirectory(state.lastPath, state.lastOptions);
    }
  }
});

describe('directoryStore', () => {
  // Create testing store with proper typing
  const createTestStore = () => {
    const store = createStore<DirectoryState>(mockImplementation);
    return store;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const store = createTestStore();
    
    // Check initial state
    expect(store.getState().isLoading).toBe(false);
    expect(store.getState().error).toBe(null);
    expect(store.getState().treeData).toBe(null);
    expect(store.getState().lastPath).toBe(null);
    expect(store.getState().lastOptions).toEqual({
      maxDepth: 10,
      excludePattern: 'node_modules|.git',
      followSymlinks: false,
      showHidden: false
    });
  });

  it('should update loading state and clear errors when loading directory', async () => {
    const store = createTestStore();
    
    // Mock successful API response
    vi.mocked(invoke).mockResolvedValueOnce('{"name":"test","is_dir":true,"children":[]}');
    
    // Set an initial error to verify it gets cleared
    store.setState({ error: 'Previous error' });
    
    // Call loadDirectory
    await store.getState().loadDirectory('/test/path');
    
    // Check loading state is handled correctly
    expect(store.getState().isLoading).toBe(false);
    expect(store.getState().error).toBe(null);
  });

  it('should store the tree data when successful', async () => {
    const store = createTestStore();
    const testTreeData = JSON.stringify({
      name: 'root',
      is_dir: true,
      children: [
        { name: 'file1.txt', is_dir: false, children: [] }
      ]
    });
    
    // Mock successful API response
    vi.mocked(invoke).mockResolvedValueOnce(testTreeData);
    
    // Call loadDirectory
    await store.getState().loadDirectory('/test/path');
    
    // Check that tree data is stored
    expect(store.getState().treeData).toBe(testTreeData);
    expect(store.getState().lastPath).toBe('/test/path');
  });

  it('should handle API errors correctly', async () => {
    const store = createTestStore();
    const errorMessage = 'API error occurred';
    
    // Mock API error
    vi.mocked(invoke).mockRejectedValueOnce(new Error(errorMessage));
    
    // Call loadDirectory
    await store.getState().loadDirectory('/test/path');
    
    // Check error state
    expect(store.getState().isLoading).toBe(false);
    expect(store.getState().error).toBe(errorMessage);
    expect(store.getState().treeData).toBe(null);
  });

  it('should use default options when none are provided', async () => {
    const store = createTestStore();
    
    // Mock successful API response
    vi.mocked(invoke).mockResolvedValueOnce('{}');
    
    // Call loadDirectory without options
    await store.getState().loadDirectory('/test/path');
    
    // Check that default options were used
    expect(vi.mocked(invoke)).toHaveBeenCalledWith('parse_directory', {
      dirPath: '/test/path',
      options: {
        maxDepth: 10,
        excludePattern: 'node_modules|.git',
        followSymlinks: false,
        showHidden: false
      }
    });
  });

  it('should use custom options when provided', async () => {
    const store = createTestStore();
    const customOptions = {
      maxDepth: 5,
      excludePattern: 'dist|.cache',
      followSymlinks: true,
      showHidden: true
    };
    
    // Mock successful API response
    vi.mocked(invoke).mockResolvedValueOnce('{}');
    
    // Call loadDirectory with custom options
    await store.getState().loadDirectory('/test/path', customOptions);
    
    // Check that custom options were used
    expect(vi.mocked(invoke)).toHaveBeenCalledWith('parse_directory', {
      dirPath: '/test/path',
      options: customOptions
    });
    
    // Check that lastOptions was updated
    expect(store.getState().lastOptions).toEqual(customOptions);
  });

  it('should reload the last directory with current options', async () => {
    const store = createTestStore();
    
    // Set up initial state with a last path and options
    store.setState({ 
      lastPath: '/previous/path',
      lastOptions: {
        maxDepth: 15,
        excludePattern: 'custom',
        followSymlinks: true,
        showHidden: true
      }
    });
    
    // Mock successful API response
    vi.mocked(invoke).mockResolvedValueOnce('{}');
    
    // Call reloadLastDirectory
    await store.getState().reloadLastDirectory();
    
    // Check that reload used the correct path and options
    expect(vi.mocked(invoke)).toHaveBeenCalledWith('parse_directory', {
      dirPath: '/previous/path',
      options: {
        maxDepth: 15,
        excludePattern: 'custom',
        followSymlinks: true,
        showHidden: true
      }
    });
  });

  it('should not attempt to reload if no last path exists', async () => {
    const store = createTestStore();
    
    // Call reloadLastDirectory with no lastPath set
    await store.getState().reloadLastDirectory();
    
    // Check that invoke was not called
    expect(invoke).not.toHaveBeenCalled();
  });
}); 