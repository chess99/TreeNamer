import { TreeNode } from "../types/TreeNode";

/**
 * Generates a unique ID for new nodes.
 */
export const generateNewId = (): string => {
  return 'new_' + Math.random().toString(36).substring(2, 11);
};

/**
 * Formats a TreeNode structure to a displayable text format with tree connectors.
 * 
 * @param node The tree node to format
 * @param prefix The prefix to use for the current level
 * @param isLast Whether this is the last child of its parent
 * @returns Formatted text representation of the tree
 */
export const formatTreeToText = (node: TreeNode, prefix: string = '', isLast: boolean = true): string => {
  let result = '';
  
  // Don't include root node in formatted output
  if (prefix) {
    const connector = isLast ? '└── ' : '├── ';
    result += `${prefix}${connector}${node.name}${node.is_dir ? '/' : ''}\n`;
  } else {
    result += `${node.name}${node.is_dir ? '/' : ''}\n`;
  }
  
  const childPrefix = prefix + (isLast ? '    ' : '│   ');
  
  node.children.forEach((child: TreeNode, index: number) => {
    const isLastChild = index === node.children.length - 1;
    result += formatTreeToText(child, childPrefix, isLastChild);
  });
  
  return result;
};

/**
 * Builds a mapping from line numbers to node IDs for maintaining identity during edits.
 * 
 * @param text Formatted tree text
 * @param originalJson Original tree structure as JSON string
 * @returns Map of line numbers to node IDs
 */
export const buildIdMapping = (text: string, originalJson: string): Map<number, string> => {
  const idMapping = new Map<number, string>(); // lineNumber -> nodeId
  
  try {
    // Parse original JSON to get node IDs
    const originalTree = JSON.parse(originalJson) as TreeNode;
    const textLines = text.trim().split('\n');
    
    // Simplified line number based mapping assuming line order doesn't change
    const mapIdsToLines = (node: TreeNode, lines: string[], startLine = 0): number => {
      let currentLine = startLine;
      
      // Map this node's ID to the current line
      idMapping.set(currentLine, node.id);
      currentLine++;
      
      // Process children
      for (const child of node.children) {
        currentLine = mapIdsToLines(child, lines, currentLine);
      }
      
      return currentLine;
    };
    
    // Start mapping from the first line (index 0)
    mapIdsToLines(originalTree, textLines);
    
    console.log('Line to ID mapping created:', Object.fromEntries(idMapping));
  } catch (error) {
    console.error('Error building ID mapping:', error);
  }
  
  return idMapping;
};

/**
 * Extracts the actual node name from a line with tree formatting.
 * 
 * @param line Line containing tree formatting characters
 * @returns The clean node name without tree formatting
 */
export const extractNodeName = (line: string): { name: string, isDir: boolean } => {
  // Remove indentation first
  const trimmedLine = line.trim();
  let name = trimmedLine;
  let isDir = false;
  
  // Use a more comprehensive regex to match tree formatting patterns
  // This pattern looks for the last occurrence of either "├── " or "└── "
  // and extracts everything after it as the actual node name
  const treeFormatRegex = /(├──\s|└──\s)(?!.*(?:├──\s|└──\s))(.+)$/;
  const match = trimmedLine.match(treeFormatRegex);
  
  if (match && match[2]) {
    // Extract the actual filename from the match
    name = match[2];
  } else if (trimmedLine.includes('├── ')) {
    // Fallback to simpler string-based extraction
    name = trimmedLine.split('├── ')[1] || '';
  } else if (trimmedLine.includes('└── ')) {
    name = trimmedLine.split('└── ')[1] || '';
  } else if (trimmedLine.includes('│')) {
    // Handle complex indentation with pipe characters
    const parts = trimmedLine.split(/[├└]── /);
    if (parts.length > 1) {
      name = parts[parts.length - 1];
    }
  }
  
  // Check if this is a directory
  if (name.endsWith('/')) {
    name = name.slice(0, -1);
    isDir = true;
  }
  
  // Debug log to verify extracted name
  console.log(`Extracted name from "${trimmedLine}": "${name}" (isDir: ${isDir})`);
  
  return { name, isDir };
};

/**
 * Parses formatted text representation back to TreeNode structure.
 * 
 * @param text Formatted tree text
 * @param originalTree Original tree structure as JSON string
 * @returns Parsed TreeNode structure, or null if parsing failed
 */
export const parseTextToTree = (text: string, originalTree: string): TreeNode | null => {
  try {
    // Preserve original ID mappings
    const idMapping = buildIdMapping(text, originalTree);
    
    const lines = text.trim().split('\n');
    if (lines.length === 0) return null;
    
    // Extract root name from first line
    const rootLine = lines[0].trim();
    const isRootDir = rootLine.endsWith('/');
    const rootName = isRootDir ? rootLine.slice(0, -1) : rootLine;
    
    // Get root node ID
    const rootId = idMapping.get(0) || generateNewId();
    
    const root: TreeNode = {
      id: rootId,
      name: rootName,
      is_dir: isRootDir,
      children: []
    };
    
    const stack: [TreeNode, number][] = [[root, 0]]; // [node, level]
    let currentLine = 1; // Start from first line (skip root line)
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      // Calculate indentation level
      const indentMatch = line.match(/^(\s*)/);
      const indentLength = indentMatch ? indentMatch[1].length : 0;
      const level = Math.floor(indentLength / 4) + 1;
      
      // Extract node info without adding unintended prefixes
      const { name, isDir } = extractNodeName(line);
      
      // Get node ID from mapping
      const nodeId = idMapping.get(currentLine) || generateNewId();
      
      const node: TreeNode = {
        id: nodeId,
        name,
        is_dir: isDir,
        children: []
      };
      
      currentLine++;
      
      // Find parent node based on indentation level
      while (stack.length > 0 && stack[stack.length - 1][1] >= level) {
        stack.pop();
      }
      
      if (stack.length > 0) {
        const parent = stack[stack.length - 1][0];
        parent.children.push(node);
      }
      
      if (isDir) {
        stack.push([node, level]);
      }
    }
    
    return root;
  } catch (error) {
    console.error('Error parsing text to tree:', error);
    return null;
  }
};

/**
 * Validates that tree text parsing correctly preserves filenames with special characters.
 * This function is useful for testing and debugging tree parsing logic.
 * 
 * @param treeText The original tree text
 * @param treeJson The original tree structure as JSON string
 * @returns An object containing validation results
 */
export const validateTreeParsing = (treeText: string, treeJson?: string): { valid: boolean; details: any } => {
  const details: any = {
    parsedLines: 0,
    warnings: [],
    errors: []
  };
  
  try {
    if (!treeText.trim()) {
      details.errors.push('Tree text is empty');
      return { valid: false, details };
    }
    
    // Parse the tree text
    const parsedTree = parseTextToTree(treeText, treeJson || '');
    
    if (!parsedTree) {
      details.errors.push('Failed to parse tree text to tree structure');
      return { valid: false, details };
    }
    
    // Re-format the parsed tree to text
    const reformattedText = formatTreeToText(parsedTree);
    
    // Compare original text structure with reformatted text 
    // (ignoring whitespace differences in indentation)
    const originalLines = treeText.split('\n').map(line => line.trim()).filter(line => line);
    const reformattedLines = reformattedText.split('\n').map(line => line.trim()).filter(line => line);
    
    details.parsedLines = originalLines.length;
    
    if (originalLines.length !== reformattedLines.length) {
      details.warnings.push(`Line count mismatch: original=${originalLines.length}, reformatted=${reformattedLines.length}`);
    }
    
    // Check for differences in node names
    for (let i = 0; i < Math.min(originalLines.length, reformattedLines.length); i++) {
      const original = originalLines[i];
      const reformatted = reformattedLines[i];
      
      const originalName = extractNodeName(original).name;
      const reformattedName = extractNodeName(reformatted).name;
      
      if (originalName !== reformattedName) {
        details.errors.push(`Node name mismatch at line ${i + 1}: original="${originalName}", reformatted="${reformattedName}"`);
      }
    }
    
    const isValid = details.errors.length === 0;
    return { valid: isValid, details };
  } catch (error) {
    details.errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
    return { valid: false, details };
  }
}; 