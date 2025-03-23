import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TreeValidator from '../TreeValidator';

// Import test utilities
import '@testing-library/jest-dom';

// Mock the validateTreeParsing utility
vi.mock('../../../utils/treeUtils', () => ({
  validateTreeParsing: vi.fn().mockImplementation((treeText, treeJson) => {
    // Return different validation results based on input
    if (treeText.includes('invalid')) {
      return {
        valid: false,
        details: {
          parsedLines: 3,
          errors: ['Invalid indentation at line 2', 'Missing node name at line 3'],
          warnings: ['Root name mismatch']
        }
      };
    }
    return {
      valid: true,
      details: {
        parsedLines: 5,
        errors: [],
        warnings: []
      }
    };
  })
}));

describe('TreeValidator Component', () => {
  beforeEach(() => {
    // Clear mocks and console
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('renders loading state initially', () => {
    render(<TreeValidator treeText="" />);
    expect(screen.getByText(/validating tree/i)).toBeInTheDocument();
  });

  it('displays valid status for valid tree text', () => {
    render(<TreeValidator treeText="root\n  ├── file1.txt\n  └── dir1\n      └── file2.txt" />);
    
    // Check for valid status
    expect(screen.getByText(/status: valid/i)).toBeInTheDocument();
    expect(screen.getByText(/lines parsed: 5/i)).toBeInTheDocument();
    
    // Check that no error or warning sections are shown
    expect(screen.queryByText(/errors:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/warnings:/i)).not.toBeInTheDocument();
  });

  it('displays errors and warnings for invalid tree text', () => {
    render(<TreeValidator treeText="invalid\n wrong indentation\n missing name" treeJson="{}" />);
    
    // Check for invalid status
    expect(screen.getByText(/status: invalid/i)).toBeInTheDocument();
    expect(screen.getByText(/lines parsed: 3/i)).toBeInTheDocument();
    
    // Check for error and warning sections
    expect(screen.getByText(/errors:/i)).toBeInTheDocument();
    expect(screen.getByText(/warnings:/i)).toBeInTheDocument();
    
    // Check for specific error and warning messages
    expect(screen.getByText(/invalid indentation at line 2/i)).toBeInTheDocument();
    expect(screen.getByText(/missing node name at line 3/i)).toBeInTheDocument();
    expect(screen.getByText(/root name mismatch/i)).toBeInTheDocument();
  });

  it('logs validation results to console', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    
    render(<TreeValidator treeText="root\n  ├── file1.txt" />);
    
    // Verify that validation results were logged
    expect(consoleSpy).toHaveBeenCalledWith(
      'Tree Validation Results:',
      expect.objectContaining({
        valid: true,
        details: expect.any(Object)
      })
    );
  });
}); 