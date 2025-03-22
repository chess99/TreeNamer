import React, { useEffect, useState } from 'react';
import MonacoEditor from '../Editor/MonacoEditor';
import './DirectoryTree.css';

interface DirectoryTreeProps {
  originalTree: string;
  onApplyChanges: (modifiedTree: string) => Promise<void>;
}

const DirectoryTree: React.FC<DirectoryTreeProps> = ({ 
  originalTree, 
  onApplyChanges 
}) => {
  const [modifiedTree, setModifiedTree] = useState<string>(originalTree);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: string; message: string } | null>(null);

  // Reset tree when original changes
  useEffect(() => {
    setModifiedTree(originalTree);
  }, [originalTree]);

  // Handle tree modifications
  const handleModifiedTreeChange = (newValue: string) => {
    setModifiedTree(newValue);
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
        {/* Tree view editor */}
        <div className="tree-view">
          {isLoading && (
            <div className="loading-overlay">
              <div className="spinner"></div>
            </div>
          )}
          <MonacoEditor 
            value={modifiedTree} 
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
      </div>
    </div>
  );
};

export default DirectoryTree; 