import { vi } from 'vitest';

/**
 * Helper function to mock monaco-editor for testing
 */
export function mockMonacoEditor() {
  // Create mock functions
  const mockCreateDiffEditor = vi.fn().mockReturnValue({
    setModel: vi.fn(),
    getLineChanges: vi.fn().mockReturnValue([
      {
        originalStartLineNumber: 1,
        originalEndLineNumber: 2,
        modifiedStartLineNumber: 1,
        modifiedEndLineNumber: 3
      }
    ]),
    dispose: vi.fn()
  });

  const mockCreateModel = vi.fn().mockImplementation((content) => ({
    dispose: vi.fn(),
    getValue: () => content
  }));

  // Return the mocked objects
  return {
    editor: {
      createDiffEditor: mockCreateDiffEditor,
      createModel: mockCreateModel
    }
  };
} 