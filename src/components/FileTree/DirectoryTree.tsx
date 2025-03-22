import React, { useEffect, useState } from 'react';
import { TreeNode } from '../../types/TreeNode';
import { formatTreeToText, parseTextToTree } from '../../utils/treeUtils';
import MonacoEditor from '../Editor/MonacoEditor';
import './DirectoryTree.css';
import TreeValidator from './TreeValidator';

interface DirectoryTreeProps {
  originalTree: string; // JSON string of TreeNode
  onApplyChanges: (modifiedTree: string) => Promise<void>; // JSON string of TreeNode
}

const DirectoryTree: React.FC<DirectoryTreeProps> = ({ 
  originalTree, 
  onApplyChanges 
}) => {
  const [modifiedTree, setModifiedTree] = useState<string>(originalTree);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: string; message: string } | null>(null);
  const [treeView, setTreeView] = useState<string>('');

  // Reset tree when original changes
  useEffect(() => {
    setModifiedTree(originalTree);
    
    // Format JSON for display
    try {
      const parsedTree = JSON.parse(originalTree) as TreeNode;
      const formattedText = formatTreeToText(parsedTree);
      setTreeView(formattedText);
    } catch (error) {
      console.error('Error parsing tree JSON:', error);
      setTreeView('Error parsing tree data');
    }
  }, [originalTree]);

  // Handle tree modifications in text format
  const handleModifiedTreeChange = (newValue: string) => {
    setTreeView(newValue);
    
    try {
      // Parse text back to tree structure
      const parsedTree = parseTextToTree(newValue, originalTree);
      if (parsedTree) {
        // Convert tree to JSON
        const jsonTree = JSON.stringify(parsedTree);
        setModifiedTree(jsonTree);
      }
    } catch (error) {
      console.error('Error parsing modified tree:', error);
      // Still update the text view even if parsing fails
    }
  };

  // Handle apply changes
  const handleApplyChanges = async () => {
    if (modifiedTree === originalTree) {
      setNotification({ type: 'info', message: '没有修改需要应用' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    try {
      setIsLoading(true);
      await onApplyChanges(modifiedTree);
      setNotification({ type: 'success', message: '修改成功应用' });
    } catch (error) {
      console.error('应用修改时出错', error);
      setNotification({ type: 'error', message: `应用修改出错: ${error}` });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <div className="directory-tree-container">
      <div className="tree-operations-layout">
        {/* Tree view editor - now showing formatted text representation of JSON tree */}
        <div className="tree-view">
          {isLoading && (
            <div className="loading-overlay">
              <div className="spinner"></div>
            </div>
          )}
          <MonacoEditor 
            value={treeView} 
            onChange={handleModifiedTreeChange} 
            height="500px"
          />
        </div>

        {/* Action buttons */}
        <div className="action-buttons">
          <button 
            className="button" 
            onClick={handleApplyChanges}
            disabled={isLoading || modifiedTree === originalTree}
          >
            应用修改
          </button>
        </div>

        {/* Notification */}
        {notification && (
          <div className={`notification ${notification.type}`}>
            {notification.message}
          </div>
        )}
        
        {/* Add Tree Validator component in debug mode */}
        {import.meta.env.DEV && <TreeValidator treeText={treeView} treeJson={originalTree} />}
      </div>
    </div>
  );
};

export default DirectoryTree; 