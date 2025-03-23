/**
 * NOTE: These tests can be enabled by setting up Vitest environment
 * To enable:
 * 1. Add vitest to the project: pnpm add -D vitest
 * 2. Configure vitest in vite.config.ts
 * 3. Uncomment this file
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TreeNode } from '../../types/TreeNode';
import {
  buildIdMapping,
  extractNodeName,
  formatTreeToText,
  parseTextToTree
} from '../treeUtils';

describe('Tree Utility Functions', () => {
  // Mock console functions for all tests
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Test for formatTreeToText
  describe('formatTreeToText', () => {
    it('should format a simple tree correctly', () => {
      const tree = {
        id: 'root-id',
        name: 'root',
        is_dir: true,
        children: [
          {
            id: 'child1-id',
            name: 'child1',
            is_dir: false,
            children: []
          },
          {
            id: 'child2-id',
            name: 'child2',
            is_dir: true,
            children: [
              {
                id: 'grandchild-id',
                name: 'grandchild',
                is_dir: false,
                children: []
              }
            ]
          }
        ]
      };
      
      const expectedText = 
`root/
├── child1
└── child2/
    └── grandchild
`;
      
      const result = formatTreeToText(tree);
      expect(result).toBe(expectedText);
    });
  });

  // Test for extractNodeName
  describe('extractNodeName', () => {
    it('should correctly extract node name from line with standard prefix', () => {
      const line = '├── folder1/';
      const result = extractNodeName(line);
      expect(result.name).toBe('folder1');
      expect(result.is_dir).toBe(true);
    });
    
    it('should handle lines with pipes', () => {
      const result = extractNodeName('│   ├── file.txt');
      expect(result.name).toBe('file.txt');
      expect(result.is_dir).toBe(false);
    });
    
    it('should preserve filenames that start with ─', () => {
      const line = '└── ─example-file.txt';
      const result = extractNodeName(line);
      expect(result.name).toBe('─example-file.txt');
      expect(result.is_dir).toBe(false);
    });
  });

  // Test for buildIdMapping
  describe('buildIdMapping', () => {
    it('should create a correct mapping from lines to IDs', () => {
      const treeText = 
`root/
├── folder1/
└── folder2/
    └── file.txt
`;
      
      const originalJson = JSON.stringify({
        id: 'root-id',
        name: 'root',
        is_dir: true,
        children: [
          {
            id: 'folder1-id',
            name: 'folder1',
            is_dir: true,
            children: []
          },
          {
            id: 'folder2-id',
            name: 'folder2',
            is_dir: true,
            children: [
              {
                id: 'file-id',
                name: 'file.txt',
                is_dir: false,
                children: []
              }
            ]
          }
        ]
      });
      
      const mapping = buildIdMapping(treeText, originalJson);
      
      expect(mapping.get(0)).toBe('root-id');
      expect(mapping.get(1)).toBe('folder1-id');
      expect(mapping.get(2)).toBe('folder2-id');
      expect(mapping.get(3)).toBe('file-id');
    });
  });

  // Test for parseTextToTree
  describe('parseTextToTree', () => {
    it('should correctly parse tree text with formatting characters', () => {
      const treeText = 
`root/
├── folder1/
└── folder2/
    └── file.txt
`;
      
      const originalJson = JSON.stringify({
        id: 'root-id',
        name: 'root',
        is_dir: true,
        children: [
          {
            id: 'folder1-id',
            name: 'folder1',
            is_dir: true,
            children: []
          },
          {
            id: 'folder2-id',
            name: 'folder2',
            is_dir: true,
            children: [
              {
                id: 'file-id',
                name: 'file.txt',
                is_dir: false,
                children: []
              }
            ]
          }
        ]
      });
      
      const result = parseTextToTree(treeText, originalJson);
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe('root-id');
      expect(result?.name).toBe('root');
      expect(result?.children.length).toBe(2);
      
      // Check folder2's children to ensure file.txt is under folder2
      const folder2 = result?.children.find(child => child.name === 'folder2');
      expect(folder2?.children.length).toBe(1);
      expect(folder2?.children[0].name).toBe('file.txt');
    });
    
    it('should handle deeply nested structures', () => {
      const treeText = 
`root/
├── level1/
│   └── level2/
│       └── level3/
│           └── file.txt
└── sibling/
`;
      
      const originalJson = JSON.stringify({
        id: 'root-id',
        name: 'root',
        is_dir: true,
        children: []
      });
      
      const result = parseTextToTree(treeText, originalJson);
      
      expect(result).not.toBeNull();
      expect(result?.name).toBe('root');
      
      // Check level1 node
      const level1 = result?.children.find(child => child.name === 'level1');
      expect(level1).not.toBeUndefined();
      expect(level1?.is_dir).toBe(true);
      
      // Check level2 node
      const level2 = level1?.children.find(child => child.name === 'level2');
      expect(level2).not.toBeUndefined();
      
      // Check level3 node
      const level3 = level2?.children.find(child => child.name === 'level3');
      expect(level3).not.toBeUndefined();
      
      // Check file.txt is under level3
      expect(level3?.children.length).toBe(1);
      expect(level3?.children[0].name).toBe('file.txt');
    });
    
    it('should correctly handle directory structures with multiple levels of nesting', () => {
      // Test case specifically for the issue with nested folder structure
      const treeText = 
`__temp/
    ├── folder1/
    ├── folder2/
    │   └── nested_folder/
    │       └── document11.txt
    ├── folder3/
    └── Outlive12.epub
`;
      
      const originalJson = JSON.stringify({
        id: 'root-id',
        name: '__temp',
        is_dir: true,
        children: []
      });
      
      const result = parseTextToTree(treeText, originalJson);
      
      // Check the result structure
      expect(result).not.toBeNull();
      expect(result?.name).toBe('__temp');
      expect(result?.children.length).toBe(4); // 3 folders + 1 file
      
      // Check folder2 and its nested structure
      const folder2 = result?.children.find(child => child.name === 'folder2');
      expect(folder2).not.toBeUndefined();
      expect(folder2?.is_dir).toBe(true);
      
      // Check nested_folder under folder2
      const nestedFolder = folder2?.children.find(child => child.name === 'nested_folder');
      expect(nestedFolder).not.toBeUndefined();
      expect(nestedFolder?.is_dir).toBe(true);
      
      // Check document11.txt is under nested_folder
      expect(nestedFolder?.children.length).toBe(1);
      expect(nestedFolder?.children[0].name).toBe('document11.txt');
      
      // Verify the file is not directly under folder2
      const documentDirectlyUnderFolder2 = folder2?.children.find(
        child => child.name === 'document11.txt' && child.is_dir === false
      );
      expect(documentDirectlyUnderFolder2).toBeUndefined();
      
      // Check Outlive12.epub is directly under root
      const outliveFile = result?.children.find(child => child.name === 'Outlive12.epub');
      expect(outliveFile).not.toBeUndefined();
      expect(outliveFile?.is_dir).toBe(false);
    });

    it('should correctly preserve filenames with ─ prefix', () => {
      const treeText = 
`root/
└── ─example-file.txt
`;
      
      const originalJson = JSON.stringify({
        id: 'root-id',
        name: 'root',
        is_dir: true,
        children: []
      });
      
      const result = parseTextToTree(treeText, originalJson);
      
      expect(result).not.toBeNull();
      expect(result?.children.length).toBe(1);
      expect(result?.children[0].name).toBe('─example-file.txt');
    });
  });
});

/**
 * Helper function to get all node paths from a TreeNode
 * Used in various test utilities to verify tree structure
 */
export function getAllPaths(node: TreeNode, parentPath: string = ''): string[] {
  const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
  const paths = [currentPath];
  
  for (const child of node.children) {
    const childPaths = getAllPaths(child, currentPath);
    paths.push(...childPaths);
  }
  
  return paths;
} 