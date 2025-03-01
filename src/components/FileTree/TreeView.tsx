import { useState } from 'react';
import './TreeView.css';

interface TreeViewProps {
  treeText: string;
}

interface TreeNode {
  name: string;
  isDirectory: boolean;
  children: TreeNode[];
  level: number;
  path: string;
}

const TreeView = ({ treeText }: TreeViewProps) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  // Parse the tree text into a structured format
  const parseTreeText = (text: string): TreeNode[] => {
    const lines = text.split('\n');
    const rootNodes: TreeNode[] = [];
    let parentStack: TreeNode[] = [];
    
    lines.forEach(line => {
      if (!line.trim()) return;
      
      // Calculate the level based on indentation
      const match = line.match(/^(\s*)([├└]── )?(.+)$/);
      if (!match) return;
      
      const [, indent, , name] = match;
      const level = indent ? Math.floor(indent.length / 4) : 0;
      const isDirectory = name.endsWith('/');
      const cleanName = isDirectory ? name.slice(0, -1) : name;
      
      // Create the path
      let path = cleanName;
      if (level > 0 && parentStack.length >= level) {
        const parent = parentStack[level - 1];
        path = `${parent.path}/${cleanName}`;
      }
      
      const node: TreeNode = {
        name: cleanName,
        isDirectory,
        children: [],
        level,
        path
      };
      
      // Add to parent or root
      if (level === 0) {
        rootNodes.push(node);
        parentStack = [node];
      } else {
        // Adjust parent stack if needed
        while (parentStack.length > level) {
          parentStack.pop();
        }
        
        const parent = parentStack[level - 1];
        parent.children.push(node);
        
        if (isDirectory) {
          parentStack[level] = node;
        }
      }
    });
    
    return rootNodes;
  };
  
  const toggleNode = (path: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };
  
  const renderNode = (node: TreeNode, index: number) => {
    const isExpanded = expandedNodes.has(node.path);
    
    return (
      <div key={`${node.path}-${index}`} className="tree-node">
        <div 
          className="tree-node-content"
          style={{ paddingLeft: `${node.level * 20}px` }}
        >
          {node.isDirectory && (
            <span 
              className={`tree-node-icon ${isExpanded ? 'expanded' : ''}`}
              onClick={() => toggleNode(node.path)}
            >
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          
          <span className={`tree-node-name ${node.isDirectory ? 'directory' : 'file'}`}>
            {node.name}
          </span>
        </div>
        
        {node.isDirectory && isExpanded && (
          <div className="tree-node-children">
            {node.children.map((child, i) => 
              renderNode(child, i)
            )}
          </div>
        )}
      </div>
    );
  };
  
  const treeNodes = parseTreeText(treeText);
  
  return (
    <div className="tree-view">
      {treeNodes.map((node, i) => renderNode(node, i))}
    </div>
  );
};

export default TreeView; 