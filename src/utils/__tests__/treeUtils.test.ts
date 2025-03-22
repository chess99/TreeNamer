/**
 * NOTE: These tests can be enabled by setting up Vitest environment
 * To enable:
 * 1. Add vitest to the project: pnpm add -D vitest
 * 2. Configure vitest in vite.config.ts
 * 3. Uncomment this file
 */

/*
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TreeNode } from '../../types/TreeNode';
import {
  generateNewId,
  formatTreeToText,
  buildIdMapping,
  extractNodeName,
  parseTextToTree
} from '../treeUtils';

describe('Tree Utility Functions', () => {
  // Test for generateNewId
  describe('generateNewId', () => {
    it('should generate a unique ID with correct format', () => {
      const id = generateNewId();
      expect(id).toMatch(/^new_[a-z0-9]{9}$/);
    });
    
    it('should generate different IDs on each call', () => {
      const id1 = generateNewId();
      const id2 = generateNewId();
      expect(id1).not.toEqual(id2);
    });
  });

  // Test for formatTreeToText
  describe('formatTreeToText', () => {
    it('should format a simple tree correctly', () => {
      const tree: TreeNode = {
        id: 'root-id',
        name: 'root',
        is_dir: true,
        children: [
          {
            id: 'file1-id',
            name: 'file1.txt',
            is_dir: false,
            children: []
          },
          {
            id: 'dir1-id',
            name: 'dir1',
            is_dir: true,
            children: [
              {
                id: 'file2-id',
                name: 'file2.txt',
                is_dir: false,
                children: []
              }
            ]
          }
        ]
      };
      
      const expectedText = 
`root/
├── file1.txt
└── dir1/
    └── file2.txt
`;
      
      const result = formatTreeToText(tree);
      expect(result).toEqual(expectedText);
    });
  });

  // Test for extractNodeName
  describe('extractNodeName', () => {
    let consoleLogSpy: any;
    
    beforeEach(() => {
      // Mock console.log to prevent output during test
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });
    
    afterEach(() => {
      consoleLogSpy.mockRestore();
    });
    
    it('should extract name from line with ├── prefix', () => {
      const line = '    ├── file1.txt';
      const result = extractNodeName(line);
      expect(result.name).toEqual('file1.txt');
      expect(result.isDir).toBe(false);
    });
    
    it('should extract name from line with └── prefix', () => {
      const line = '    └── dir1/';
      const result = extractNodeName(line);
      expect(result.name).toEqual('dir1');
      expect(result.isDir).toBe(true);
    });
    
    it('should extract name from line with complex indentation', () => {
      const line = '    │   └── file2.txt';
      const result = extractNodeName(line);
      expect(result.name).toEqual('file2.txt');
      expect(result.isDir).toBe(false);
    });
    
    it('should handle lines without tree formatting', () => {
      const line = 'plainfile.txt';
      const result = extractNodeName(line);
      expect(result.name).toEqual('plainfile.txt');
      expect(result.isDir).toBe(false);
    });

    it('should preserve filenames that actually start with ─', () => {
      const line = '    ├── ─ with-dash-prefix.txt';
      const result = extractNodeName(line);
      expect(result.name).toEqual('─ with-dash-prefix.txt');
    });
  });

  // Test for buildIdMapping
  describe('buildIdMapping', () => {
    let consoleLogSpy: any;
    let consoleErrorSpy: any;
    
    beforeEach(() => {
      // Mock console functions to prevent output during test
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });
    
    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
    
    it('should create a correct mapping from lines to IDs', () => {
      const tree: TreeNode = {
        id: 'root-id',
        name: 'root',
        is_dir: true,
        children: [
          {
            id: 'file1-id',
            name: 'file1.txt',
            is_dir: false,
            children: []
          }
        ]
      };
      
      const treeJson = JSON.stringify(tree);
      const treeText = formatTreeToText(tree);
      
      const mapping = buildIdMapping(treeText, treeJson);
      
      expect(mapping.get(0)).toEqual('root-id');
      expect(mapping.get(1)).toEqual('file1-id');
    });
  });

  // Test for parseTextToTree
  describe('parseTextToTree', () => {
    let consoleLogSpy: any;
    let consoleErrorSpy: any;
    
    beforeEach(() => {
      // Mock console functions to prevent output during test
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });
    
    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
    
    it('should correctly parse tree text with formatting characters', () => {
      const treeJson = JSON.stringify({
        id: 'root-id',
        name: '__temp',
        is_dir: true,
        children: [
          {
            id: 'folder1-id',
            name: 'folder1',
            is_dir: true,
            children: [
              {
                id: 'file1-id',
                name: 'file1.txt',
                is_dir: false,
                children: []
              },
              {
                id: 'file2-id',
                name: 'file2.txt',
                is_dir: false,
                children: []
              }
            ]
          },
          {
            id: 'folder2-id',
            name: 'folder2',
            is_dir: true,
            children: [
              {
                id: 'file3-id',
                name: 'file3.txt',
                is_dir: false,
                children: []
              }
            ]
          }
        ]
      });
      
      const treeText = `__temp/
├── folder1/
│   ├── file1.txt
│   └── file2.txt
└── folder2/
    └── file3.txt`;
      
      const result = parseTextToTree(treeText, treeJson);
      
      expect(result).not.toBeNull();
      expect(result?.name).toBe('__temp');
      expect(result?.children.length).toBe(2);
      
      const folder1 = result?.children[0];
      expect(folder1?.name).toBe('folder1');
      expect(folder1?.is_dir).toBe(true);
      expect(folder1?.id).toBe('folder1-id');
      expect(folder1?.children.length).toBe(2);
      
      expect(folder1?.children[0].name).toBe('file1.txt');
      expect(folder1?.children[1].name).toBe('file2.txt');
      
      const folder2 = result?.children[1];
      expect(folder2?.name).toBe('folder2');
      expect(folder2?.children[0].name).toBe('file3.txt');
    });
    
    it('should correctly preserve filenames with ─ prefix', () => {
      const treeJson = JSON.stringify({
        id: 'root-id',
        name: '__temp',
        is_dir: true,
        children: [
          {
            id: 'folder1-id',
            name: 'folder1',
            is_dir: true,
            children: []
          },
          {
            id: 'file1-id',
            name: '─ with-dash-prefix.txt',
            is_dir: false,
            children: []
          }
        ]
      });
      
      // Tree with a filename that has a legitimate dash prefix
      const treeText = `__temp/
├── folder1/
└── ─ with-dash-prefix.txt`;
      
      const result = parseTextToTree(treeText, treeJson);
      
      expect(result).not.toBeNull();
      expect(result?.children[0].name).toBe('folder1');
      expect(result?.children[1].name).toBe('─ with-dash-prefix.txt');
    });
  });
});
*/ 