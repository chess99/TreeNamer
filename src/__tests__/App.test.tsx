import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';

// Import test utilities
import '@testing-library/jest-dom';

// Mock components that use monaco-editor
vi.mock('../components/Editor/MonacoEditor', () => ({
  default: vi.fn().mockImplementation(({ value, onChange }) => (
    <div data-testid="monaco-editor">
      <textarea 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        data-testid="mock-editor-textarea"
      />
    </div>
  ))
}));

vi.mock('../components/DiffViewer/DiffViewer', () => ({
  default: vi.fn().mockImplementation(({ originalText, modifiedText, onClose, onApply }) => (
    <div data-testid="diff-viewer">
      <div>Original: {originalText}</div>
      <div>Modified: {modifiedText}</div>
      <button onClick={onClose}>返回</button>
      <button onClick={onApply}>应用修改</button>
    </div>
  ))
}));

// Mock the TreeValidator component
vi.mock('../components/FileTree/TreeValidator', () => ({
  default: vi.fn().mockImplementation(({ treeText }) => (
    <div data-testid="tree-validator">
      <div>Tree text: {treeText}</div>
    </div>
  ))
}));

// Mock the Tauri core invoke function
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockImplementation((cmd, args) => {
    if (cmd === 'parse_directory') {
      return JSON.stringify({
        id: 'root',
        name: 'test_dir',
        is_dir: true,
        children: [
          {
            id: 'file1',
            name: 'file1.txt',
            is_dir: false,
            children: []
          },
          {
            id: 'dir1',
            name: 'dir1',
            is_dir: true,
            children: [
              {
                id: 'file2',
                name: 'file2.txt',
                is_dir: false,
                children: []
              }
            ]
          }
        ]
      });
    }
    if (cmd === 'apply_operations') {
      return Promise.resolve();
    }
    return Promise.reject(new Error(`Unknown command: ${cmd}`));
  })
}));

// Mock Tauri dialog plugin
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn().mockResolvedValue('/test/directory/path'),
  confirm: vi.fn().mockResolvedValue(true)
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the initial UI correctly', () => {
    render(<App />);
    
    // Check for main UI elements
    expect(screen.getByPlaceholderText('输入目录路径或点击浏览选择目录')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /浏览/i })).toBeInTheDocument();
    expect(screen.getByText('请选择一个目录来开始')).toBeInTheDocument();
  });

  it('allows directory path input via text field', () => {
    render(<App />);
    
    const input = screen.getByPlaceholderText('输入目录路径或点击浏览选择目录');
    fireEvent.change(input, { target: { value: '/test/path' } });
    
    expect(input).toHaveValue('/test/path');
  });

  it('loads directory data when the Browse button is clicked', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    const { open } = await import('@tauri-apps/plugin-dialog');
    
    render(<App />);
    
    // Click browse button
    const browseButton = screen.getByRole('button', { name: /浏览/i });
    fireEvent.click(browseButton);
    
    // Wait for async operations
    await waitFor(() => {
      expect(open).toHaveBeenCalledWith(expect.objectContaining({
        directory: true,
        multiple: false
      }));
      expect(invoke).toHaveBeenCalledWith('parse_directory', expect.anything());
    });
    
    // Check that tree data was loaded and processed
    await waitFor(() => {
      // The mock editor should be displayed
      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    });
  });

  it('loads directory data when the Load button is clicked', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    
    render(<App />);
    
    // Enter directory path
    const input = screen.getByPlaceholderText('输入目录路径或点击浏览选择目录');
    fireEvent.change(input, { target: { value: '/test/manual/path' } });
    
    // Check for refresh button (instead of load button)
    const refreshButton = screen.getByTitle('刷新');
    fireEvent.click(refreshButton);
    
    // Wait for async operations
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('parse_directory', expect.objectContaining({
        dirPath: '/test/manual/path'
      }));
    });
    
    // Check that editor is displayed
    await waitFor(() => {
      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    });
  });

  it('handles text editing and shows edited status', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    
    render(<App />);
    
    // Set up initial state with directory loaded
    const input = screen.getByPlaceholderText('输入目录路径或点击浏览选择目录');
    fireEvent.change(input, { target: { value: '/test/manual/path' } });
    
    // Use refresh button instead of load button
    const refreshButton = screen.getByTitle('刷新');
    fireEvent.click(refreshButton);
    
    // Wait for tree to load
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('parse_directory', expect.anything());
    });
    
    // Wait for the editor to be available
    await waitFor(() => {
      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    });
    
    // Simulate editing the tree text
    const mockEditorTextarea = screen.getByTestId('mock-editor-textarea');
    fireEvent.change(mockEditorTextarea, { target: { value: 'test_dir\n  └── new_file.txt' } });
    
    // Check that the edit triggered the isEdited state
    await waitFor(() => {
      // The apply button should be visible
      const applyButton = screen.getByRole('button', { name: /应用修改/i });
      expect(applyButton).toBeInTheDocument();
    });
  });

  it('shows error notification when API calls fail', async () => {
    const { invoke } = await import('@tauri-apps/api/core');
    
    // Override the mock to simulate an error
    vi.mocked(invoke).mockRejectedValueOnce(new Error('API error'));
    
    render(<App />);
    
    // Set up directory and trigger load
    const input = screen.getByPlaceholderText('输入目录路径或点击浏览选择目录');
    fireEvent.change(input, { target: { value: '/test/error/path' } });
    
    // Use refresh button instead of load button
    const refreshButton = screen.getByTitle('刷新');
    fireEvent.click(refreshButton);
    
    // Wait for error notification
    await waitFor(() => {
      // Check for error message in the UI
      expect(screen.getByText(/API error/i)).toBeInTheDocument();
    });
  });
}); 