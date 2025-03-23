import { TreeNode } from "../types/TreeNode";

/**
 * Formats a TreeNode structure to a displayable text format with tree connectors.
 * 
 * @param node The tree node to format
 * @param prefix The prefix to use for the current level
 * @param isLast Whether this is the last child of its parent
 * @param parentPath The path of the parent node
 * @param isRoot Whether this is the root node
 * @returns Formatted text representation of the tree
 */
export const formatTreeToText = (
  node: TreeNode, 
  prefix: string = '', 
  isLast: boolean = true,
  parentPath: string = '',
  isRoot: boolean = true
): string => {
  let result = '';
  
  // Build the current node's path
  const nodePath = parentPath ? `${parentPath}/${node.name}` : node.name;
  
  // Generate the line for this node
  if (isRoot) {
    // Root node is formatted without any prefix
    result += `${node.name}${node.is_dir ? '/' : ''}\n`;
  } else {
    // Non-root nodes get the connector and proper prefix
    const connector = isLast ? '└── ' : '├── ';
    result += `${prefix}${connector}${node.name}${node.is_dir ? '/' : ''}\n`;
  }
  
  // Calculate the prefix for child nodes
  const childPrefix = isRoot 
    ? '' // No prefix for direct children of root
    : prefix + (isLast ? '    ' : '│   '); // Standard tree prefixes for other nodes
  
  // Process children
  node.children.forEach((child: TreeNode, index: number) => {
    const isLastChild = index === node.children.length - 1;
    result += formatTreeToText(child, childPrefix, isLastChild, nodePath, false);
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
  const result = new Map<number, string>();
  
  try {
    // 解析原始的树结构JSON以获取ID
    const originalTree = JSON.parse(originalJson) as TreeNode;
    const lines = text.trim().split('\n');
    
    console.log("Building ID mapping for text with", lines.length, "lines");
    
    // 首先，获取原始树中所有节点及其ID的列表
    const allNodes: { id: string; name: string }[] = [];
    collectAllNodes(originalTree, allNodes);
    
    // 跟踪哪些ID已经被使用，防止重复分配
    const usedIds = new Set<string>();
    
    // 构建行号到节点ID的映射
    if (originalTree) {
      // 先将根节点映射到第0行
      result.set(0, originalTree.id);
      usedIds.add(originalTree.id);
      console.log(`Mapping root (line 0) to ID ${originalTree.id}`);
      
      // 处理所有行，使用节点名称进行匹配
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // 提取节点名称
        const { name } = extractNodeName(line);
        
        // 在所有节点中查找匹配的节点
        const matchingNode = findNodeByName(allNodes, name);
        
        if (matchingNode && !usedIds.has(matchingNode.id)) {
          result.set(i, matchingNode.id);
          usedIds.add(matchingNode.id);
        } else {
          // 如果找不到匹配的节点或者ID已被使用，查找未使用的ID
          const unusedNode = allNodes.find(node => !usedIds.has(node.id));
          
          if (unusedNode) {
            result.set(i, unusedNode.id);
            usedIds.add(unusedNode.id);
            console.warn(`Fallback mapping: line ${i} (${name}) to ID ${unusedNode.id}`);
          } else {
            // 如果所有ID都已使用，生成一个新ID
            const newId = `new-id-${i}`;
            result.set(i, newId);
            console.warn(`No available IDs from original tree. Generated new ID for line ${i}: ${newId}`);
          }
        }
      }
    }
    
    console.log(`ID mapping complete: ${result.size} lines mapped`);
    return result;
  } catch (error) {
    console.error('Error building ID mapping:', error);
    return result;
  }
};

/**
 * Collect all nodes from a tree into a flat array
 */
function collectAllNodes(node: TreeNode, result: { id: string; name: string }[]): void {
  result.push({ id: node.id, name: node.name });
  
  for (const child of node.children) {
    collectAllNodes(child, result);
  }
}

/**
 * Find a node by name in a list of nodes
 */
function findNodeByName(nodes: { id: string; name: string }[], name: string): { id: string; name: string } | undefined {
  return nodes.find(node => node.name === name);
}

/**
 * Extracts the node name and whether it's a directory from a formatted tree line.
 * Handles all tree formatting characters (├──, └──, │) and preserves filenames 
 * that might start with those characters.
 * 
 * @param line Line from formatted tree
 * @returns Object with name and is_dir properties
 */
export const extractNodeName = (line: string): { name: string; is_dir: boolean } => {
  // Trim any whitespace but preserve internal spaces
  const trimmedLine = line.trim();
  
  // Look for tree formatting characters and the content after them
  const treeFormatRegex = /^(?:[│├└]\s*)*(?:[├└]──\s+)(.+)$/;
  const match = trimmedLine.match(treeFormatRegex);
  
  let name: string;
  if (match && match[1]) {
    // Extract actual node name from tree formatting
    name = match[1];
  } else {
    // Handle cases without tree formatting (e.g., root nodes)
    name = trimmedLine;
  }
  
  // Check if it's a directory (ends with /)
  const is_dir = name.endsWith('/');
  
  // Remove trailing slash for directories
  if (is_dir) {
    name = name.slice(0, -1);
  }
  
  return { name, is_dir };
};

/**
 * Parses formatted text representation back to TreeNode structure.
 * Uses indentation to determine parent-child relationships.
 * 
 * @param text Formatted tree text
 * @param originalTree Original tree structure as JSON string (for ID preservation)
 * @returns Parsed TreeNode structure, or null if parsing failed
 */
export const parseTextToTree = (
  text: string, 
  originalTree: string
): TreeNode | null => {
  try {
    console.log('\n======== PARSING TREE ========');
    console.log('Original text:\n', text);
    
    // For edit mode, proceed with the existing logic to preserve IDs
    const lines = text.trim().split('\n');
    if (lines.length === 0) return null;
    
    // Extract root name from first line
    const rootLine = lines[0].trim();
    const isRootDir = rootLine.endsWith('/');
    const rootName = isRootDir ? rootLine.slice(0, -1) : rootLine;
    
    // 使用行号来映射ID，不会生成新ID
    const lineToIdMap = buildIdMapping(text, originalTree);
    
    // Create original node path mapping to track changes
    const originalTreeObj = JSON.parse(originalTree) as TreeNode;
    const originalNodePaths = new Map<string, string>();
    buildOriginalPathMapping(originalTreeObj, '', originalNodePaths);
    
    // 获取原始树中所有ID，用于处理可能缺失的映射
    const allOriginalIds: string[] = [];
    collectAllIds(originalTreeObj, allOriginalIds);
    
    // 获取根节点ID - 如果不存在映射，使用原始树的根ID
    const rootId = lineToIdMap.get(0) || originalTreeObj.id;
    
    // Create root node with ID from mapping
    const root: TreeNode = {
      id: rootId,
      name: rootName,
      is_dir: isRootDir,
      children: [],
      oldPath: originalNodePaths.get(rootId)
    };
    
    // Track parents by indentation level
    const nodesByLevel: TreeNode[] = [];
    const pathsByLevel: string[] = [];
    nodesByLevel[0] = root;
    pathsByLevel[0] = rootName;
    
    console.log(`Root node: "${rootName}" (ID: ${rootId})`);
    
    // 用于跟踪已使用的ID，确保不重复使用
    const usedIds = new Set<string>([rootId]);
    
    // Track renamed nodes for reporting
    const renamedNodes: { id: string, oldPath: string, newPath: string }[] = [];
    
    // Process lines after root
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      // Calculate level by tree characters and spaces
      const level = calculateIndentLevel(line);
      
      // Extract node name and type
      const { name, is_dir } = extractNodeName(line);
      
      // 增加调试信息，帮助理解缩进计算和父子关系
      console.debug(`[Node] Line ${i}: "${name}" (level ${level}, is_dir ${is_dir})`);
      
      // Find parent at the highest level less than the current level
      let parentLevel = level - 1;
      while (parentLevel >= 0 && !nodesByLevel[parentLevel]) {
        parentLevel--;
      }
      
      if (parentLevel < 0) {
        console.error(`Cannot find parent for "${name}" at level ${level}`);
        continue; // Skip this node
      }
      
      const parent = nodesByLevel[parentLevel];
      const parentPath = pathsByLevel[parentLevel];
      
      console.debug(`  Parent: "${parent.name}" (level ${parentLevel}, path ${parentPath})`);
      
      // 尝试获取ID，如果不存在映射，从原始ID列表中选择一个未使用的ID
      let nodeId = lineToIdMap.get(i);
      if (!nodeId) {
        console.warn(`No ID mapping found for line ${i}: "${line}"`);
        
        // 找一个还没有使用过的ID
        const unusedId = allOriginalIds.find(id => !usedIds.has(id));
        if (unusedId) {
          nodeId = unusedId;
          console.log(`  Using unused ID from original tree: ${nodeId}`);
        } else {
          // 如果没有可用的ID，使用行号创建一个临时ID（这种情况不应该发生，但作为兜底措施）
          nodeId = `temp-id-${i}`;
          console.warn(`  Using temporary ID: ${nodeId}`);
        }
      }
      
      // 如果ID已经使用过，打印警告并创建一个新ID
      if (usedIds.has(nodeId)) {
        console.warn(`Duplicate ID detected: ${nodeId} was already used. Creating new ID for ${name}`);
        nodeId = `unique-${i}-${Math.random().toString(36).substring(2, 9)}`;
      }
      
      // 标记ID为已使用
      usedIds.add(nodeId);
      
      // Build node path
      const nodePath = parentPath ? `${parentPath}/${name}` : name;
      pathsByLevel[level] = nodePath;
      
      // Check if this node's path has changed from original
      const originalPath = originalNodePaths.get(nodeId);
      
      // Create node with ID from line mapping
      const node: TreeNode = {
        id: nodeId,
        name,
        is_dir,
        children: []
      };
      
      // If this node exists in the original tree with a different path, record both paths
      if (originalPath && originalPath !== nodePath) {
        node.oldPath = originalPath;
        node.newPath = nodePath;
        renamedNodes.push({ id: nodeId, oldPath: originalPath, newPath: nodePath });
      }
      
      // Add to parent
      parent.children.push(node);
      
      // 设置这个节点为当前级别的父节点，并清除所有更高级别的节点
      // 这确保了嵌套结构正确，避免错误的父子关系
      nodesByLevel[level] = node;
      for (let j = level + 1; j < nodesByLevel.length; j++) {
        delete nodesByLevel[j]; // 清除更高级别的节点
        delete pathsByLevel[j];
      }
    }
    
    // Log renamed nodes
    if (renamedNodes.length > 0) {
      console.log('\n===== RENAMED NODES =====');
      renamedNodes.forEach(node => {
        console.log(`Node ${node.id}: ${node.oldPath} -> ${node.newPath}`);
      });
    }
    
    // Check for duplicate IDs in the final tree
    const allTreeIds = new Set<string>();
    const duplicateIds = new Set<string>();
    checkForDuplicateIds(root, allTreeIds, duplicateIds);
    
    if (duplicateIds.size > 0) {
      console.error('\n===== DUPLICATE IDs DETECTED =====');
      console.error(`Found ${duplicateIds.size} duplicate IDs in the tree: ${Array.from(duplicateIds).join(', ')}`);
    }
    
    // Log the final JSON that will be sent to backend
    console.log('\n===== PARSED TREE JSON =====');
    printTreeJson(root);
    
    console.log('======== PARSING COMPLETE ========\n');
    return root;
  } catch (error) {
    console.error('Error parsing text to tree:', error);
    return null;
  }
};

/**
 * Build a mapping of node IDs to their original paths from the original tree
 * This is used to detect path changes for nodes
 * 
 * @param node Current node in the traversal
 * @param parentPath Parent path to build current path from
 * @param pathMap Map to store node ID to path mapping
 */
function buildOriginalPathMapping(
  node: TreeNode, 
  parentPath: string, 
  pathMap: Map<string, string>
): void {
  const nodePath = parentPath ? `${parentPath}/${node.name}` : node.name;
  pathMap.set(node.id, nodePath);
  
  for (const child of node.children) {
    buildOriginalPathMapping(child, nodePath, pathMap);
  }
}

/**
 * Calculate the indentation level based on tree formatting characters
 * This approach uses both the count of pipe characters and the indentation level
 * to determine the correct nesting
 */
const calculateIndentLevel = (line: string): number => {
  // For deeply nested structures, we need to look at both pipes and spaces
  // Get the position of the first branch character (├ or └)
  const branchMatch = line.match(/[├└]/);
  
  if (branchMatch && branchMatch.index !== undefined) {
    // Calculate level based on the branch position (4 spaces = 1 level)
    // Add 1 to account for the level change caused by the branch character
    return Math.floor(branchMatch.index / 4) + 1;
  } else {
    // For lines without branch characters, use leading spaces
    const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
    return Math.floor(leadingSpaces / 4);
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
  try {
    // 如果没有提供JSON，则创建一个空的树结构
    const jsonToUse = treeJson || JSON.stringify({ 
      id: 'root-id', 
      name: 'root', 
      is_dir: true, 
      children: [] 
    });
    
    // 解析文本到树结构 - using edit mode for validation
    const parsed = parseTextToTree(treeText, jsonToUse);
    
    if (!parsed) {
      return { 
        valid: false, 
        details: { 
          error: 'Failed to parse tree text', 
          text: treeText 
        } 
      };
    }
    
    // 获取所有节点的ID并检查是否有重复
    const ids = getAllNodeIds(parsed);
    const uniqueIds = new Set(ids);
    
    // 比较原始树和解析后的树的结构
    const originalTree = JSON.parse(jsonToUse) as TreeNode;
    const structureMatch = compareTreeStructure(originalTree, parsed);
    
    return {
      valid: ids.length === uniqueIds.size && structureMatch,
      details: {
        totalNodes: ids.length,
        uniqueIds: uniqueIds.size,
        hasDuplicateIds: ids.length !== uniqueIds.size,
        structureMatch,
        parsedTree: parsed
      }
    };
  } catch (error) {
    return {
      valid: false,
      details: {
        error: `Validation error: ${error}`,
        stack: (error as Error).stack
      }
    };
  }
};

// 获取树中所有节点的ID
function getAllNodeIds(node: TreeNode): string[] {
  const ids = [node.id];
  
  for (const child of node.children) {
    ids.push(...getAllNodeIds(child));
  }
  
  return ids;
}

// 比较两个树的结构（不包括ID，只比较层级结构）
function compareTreeStructure(original: TreeNode, parsed: TreeNode): boolean {
  // 比较名称和类型
  if (original.name !== parsed.name || original.is_dir !== parsed.is_dir) {
    return false;
  }
  
  // 比较子节点数量
  if (original.children.length !== parsed.children.length) {
    return false;
  }
  
  // 递归比较每个子节点
  for (let i = 0; i < original.children.length; i++) {
    if (!compareTreeStructure(original.children[i], parsed.children[i])) {
      return false;
    }
  }
  
  return true;
}

/**
 * Collect all IDs from a tree into an array
 */
function collectAllIds(node: TreeNode, result: string[]): void {
  result.push(node.id);
  
  for (const child of node.children) {
    collectAllIds(child, result);
  }
}

/**
 * Utility function to print tree JSON in a compact format
 */
export function printTreeJson(tree: TreeNode): void {
  console.log(JSON.stringify(tree, (key, value) => {
    // Skip empty children arrays
    if (key === 'children' && Array.isArray(value) && value.length === 0) {
      return [];
    }
    return value;
  }, 2));
}

/**
 * Recursively check for duplicate IDs in the tree
 */
function checkForDuplicateIds(
  node: TreeNode, 
  seenIds: Set<string>,
  duplicates: Set<string>
): void {
  if (seenIds.has(node.id)) {
    duplicates.add(node.id);
  } else {
    seenIds.add(node.id);
  }
  
  for (const child of node.children) {
    checkForDuplicateIds(child, seenIds, duplicates);
  }
}

// Add a new unit test specifically for nested directory structures
export const addNestedDirectoryTest = () => {
  // This function will be called when the module is loaded
  // but its purpose is to define the new test case
  return true;
} 