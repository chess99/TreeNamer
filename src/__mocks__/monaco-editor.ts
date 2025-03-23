// Mock implementation for monaco-editor
import { vi } from 'vitest';

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

// Export the mock
export const editor = {
  createDiffEditor: mockCreateDiffEditor,
  createModel: mockCreateModel
};

export default {
  editor
}; 