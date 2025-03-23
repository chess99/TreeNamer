import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DirectorySettings from '../DirectorySettings';

// Setup store mock with an object we can modify per test
const loadDirectoryMock = vi.fn().mockResolvedValue(undefined);

// Mock the directory store
vi.mock('../../../store/directoryStore', () => ({
  useDirectoryStore: () => ({
    loadDirectory: loadDirectoryMock
  })
}));

// Add the necessary setup for testing-library
import '@testing-library/jest-dom';

describe('DirectorySettings Component', () => {
  // Reset mocks before each test
  beforeEach(() => {
    loadDirectoryMock.mockClear();
  });

  it('should render all options correctly', () => {
    const onCloseMock = vi.fn();
    
    render(
      <DirectorySettings 
        onClose={onCloseMock}
      />
    );
    
    // Check for the presence of main elements
    expect(screen.getByText(/directory parsing settings/i)).toBeInTheDocument();
    expect(screen.getByText(/maximum depth/i)).toBeInTheDocument();
    expect(screen.getByText(/exclude pattern/i)).toBeInTheDocument();
    expect(screen.getByText(/follow symbolic links/i)).toBeInTheDocument();
    expect(screen.getByText(/show hidden files/i)).toBeInTheDocument();
    
    // Verify initial values - match the defaults in the component
    expect(screen.getByLabelText(/maximum depth/i)).toHaveValue(10);
    expect(screen.getByLabelText(/exclude pattern/i)).toHaveValue('node_modules|.git');
    expect(screen.getByLabelText(/follow symbolic links/i)).not.toBeChecked();
    expect(screen.getByLabelText(/show hidden files/i)).not.toBeChecked();
  });
  
  it('should call loadDirectory and close when Apply is clicked', async () => {
    const onCloseMock = vi.fn();
    
    render(
      <DirectorySettings 
        onClose={onCloseMock}
      />
    );
    
    // Change the settings
    const maxDepthInput = screen.getByLabelText(/maximum depth/i);
    fireEvent.change(maxDepthInput, { target: { value: '15' } });
    
    const excludePatternInput = screen.getByLabelText(/exclude pattern/i);
    fireEvent.change(excludePatternInput, { target: { value: 'node_modules|.git|.vscode' } });
    
    const showHiddenCheckbox = screen.getByLabelText(/show hidden files/i);
    fireEvent.click(showHiddenCheckbox);
    
    // Click apply button
    const applyButton = screen.getByText(/apply/i);
    fireEvent.click(applyButton);
    
    // Wait for async operations to complete
    await waitFor(() => {
      // Verify loadDirectory was called with the updated options
      expect(loadDirectoryMock).toHaveBeenCalledWith({
        maxDepth: 15,
        excludePattern: 'node_modules|.git|.vscode',
        followSymlinks: false,
        showHidden: true
      });
    });
    
    // Verify onClose was called
    expect(onCloseMock).toHaveBeenCalled();
  });
  
  it('should close the dialog when Cancel is clicked', () => {
    const onCloseMock = vi.fn();
    
    render(
      <DirectorySettings 
        onClose={onCloseMock}
      />
    );
    
    // Click cancel button
    const cancelButton = screen.getByText(/cancel/i);
    fireEvent.click(cancelButton);
    
    // Verify onClose was called
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
}); 