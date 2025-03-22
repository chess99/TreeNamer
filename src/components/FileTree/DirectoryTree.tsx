import { useEffect, useState } from 'react';
import DiffViewer from '../DiffView/DiffViewer';
import MonacoEditor from '../Editor/MonacoEditor';
import './DirectoryTree.css';
import TreeView from './TreeView';

interface DirectoryTreeProps {
  originalTree: string;
  onApplyChanges: (modifiedTree: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

interface Operation {
  type: 'rename' | 'create' | 'delete';
  path: string;
  newPath?: string;
}

const DirectoryTree = ({ originalTree, onApplyChanges, isLoading, error }: DirectoryTreeProps) => {
  const [modifiedTree, setModifiedTree] = useState<string>(originalTree);
  const [showDiff, setShowDiff] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'text' | 'tree' | 'split'>('split');
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [operationsList, setOperationsList] = useState<Operation[]>([]);
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);

  // Update modified tree when original tree changes
  useEffect(() => {
    setModifiedTree(originalTree);
  }, [originalTree]);

  // Show notification when error changes
  useEffect(() => {
    if (error) {
      setNotification({ type: 'error', message: error });
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Monitor loading state changes
  useEffect(() => {
    console.log("Loading state changed:", isLoading);
    if (isLoading) {
      // When loading starts, show the notification
      setNotification({ type: 'info', message: 'Applying changes...' });
    } else if (notification?.type === 'info' && notification?.message === 'Applying changes...') {
      // When loading ends and we still have the loading notification, clear it or show success
      console.log("Loading finished, updating notification");
      setNotification({ type: 'success', message: 'Changes applied successfully!' });
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        console.log("Auto-clearing notification after loading finished");
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, notification]);

  // Handle parsing of operations
  useEffect(() => {
    if (originalTree && modifiedTree && originalTree !== modifiedTree) {
      // This is a simplified version - the actual parsing would be more complex
      // and should match the logic in the Rust backend
      try {
        const operations = parseOperations(originalTree, modifiedTree);
        setOperationsList(operations);
      } catch (e) {
        console.error('Error parsing operations:', e);
      }
    } else {
      setOperationsList([]);
    }
  }, [originalTree, modifiedTree]);

  const parseOperations = (original: string, modified: string): Operation[] => {
    // This is a placeholder implementation
    // In a real implementation, this would analyze the tree diffs and identify 
    // specific operations (e.g., renames, creations, deletions)
    const operations: Operation[] = [];
    
    // Split trees into lines
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    
    // Simple diff algorithm to identify changes
    const added = modifiedLines.filter(line => !originalLines.includes(line));
    const removed = originalLines.filter(line => !modifiedLines.includes(line));
    
    // Create operations based on diffs
    for (const line of removed) {
      if (line.trim()) {
        operations.push({
          type: 'delete',
          path: line.trim().replace(/[├└]── /, '').replace(/\/$/, '')
        });
      }
    }
    
    for (const line of added) {
      if (line.trim()) {
        operations.push({
          type: 'create',
          path: line.trim().replace(/[├└]── /, '').replace(/\/$/, '')
        });
      }
    }
    
    return operations;
  };

  const handleApplyChanges = () => {
    if (operationsList.length > 0) {
      setShowConfirmDialog(true);
    } else {
      setNotification({ type: 'info', message: 'No changes to apply' });
      // Auto-hide after 3 seconds
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const confirmApplyChanges = () => {
    console.log('Confirming apply changes...');
    
    // The notification will be handled by the loading state effect
    // We just need to call the apply changes function and close the dialog
    onApplyChanges(modifiedTree)
      .catch((error) => {
        console.error('Error occurred while applying changes', error);
        // Errors will be handled by the error effect
      });
      
    setShowConfirmDialog(false);
  };

  const cancelApplyChanges = () => {
    setShowConfirmDialog(false);
  };

  const hasChanges = originalTree !== modifiedTree;

  const closeNotification = () => {
    setNotification(null);
  };

  return (
    <div className="directory-tree">
      {notification && (
        <div className={`notification ${notification.type}`}>
          <span>{notification.message}</span>
          <button onClick={closeNotification}>×</button>
        </div>
      )}
      
      <div className="tree-controls">
        <div className="view-toggle">
          <button 
            className={viewMode === 'text' ? 'active' : ''} 
            onClick={() => setViewMode('text')}
          >
            Text View
          </button>
          <button 
            className={viewMode === 'tree' ? 'active' : ''} 
            onClick={() => setViewMode('tree')}
          >
            Tree View
          </button>
          <button 
            className={viewMode === 'split' ? 'active' : ''} 
            onClick={() => setViewMode('split')}
          >
            Split View
          </button>
        </div>
        
        {viewMode === 'text' && (
          <button 
            onClick={() => setShowDiff(!showDiff)}
            className={showDiff ? 'active' : ''}
          >
            {showDiff ? 'Hide Diff' : 'Show Diff'}
          </button>
        )}
        
        <button 
          onClick={handleApplyChanges} 
          disabled={!hasChanges || isLoading}
          className={hasChanges && !isLoading ? 'apply-button' : 'apply-button disabled'}
        >
          {isLoading ? 'Applying...' : 'Apply Changes'}
        </button>
      </div>

      {viewMode === 'tree' ? (
        <div className="tree-view-container">
          <TreeView treeText={modifiedTree} />
        </div>
      ) : viewMode === 'split' ? (
        <div className="tree-split-container">
          <div className="tree-original">
            <h3>Original Tree</h3>
            <MonacoEditor value={originalTree} readOnly={true} height="500px" />
          </div>
          <div className="tree-modified">
            <h3>Modified Tree</h3>
            <MonacoEditor 
              value={modifiedTree} 
              onChange={setModifiedTree} 
              height="500px" 
            />
          </div>
          {operationsList.length > 0 && (
            <div className="operations-preview">
              <h3>Changes to be Applied</h3>
              <ul className="operations-list">
                {operationsList.map((op, index) => (
                  <li key={index} className={`operation-item ${op.type}`}>
                    <span className="operation-type">{op.type.toUpperCase()}</span>
                    <span className="operation-path">{op.path}</span>
                    {op.newPath && (
                      <span className="operation-path-new">→ {op.newPath}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : showDiff ? (
        <div className="tree-diff-container">
          <div className="tree-original">
            <h3>Original Tree</h3>
            <MonacoEditor value={originalTree} readOnly={true} height="400px" />
          </div>
          <div className="tree-diff">
            <h3>Changes</h3>
            <DiffViewer original={originalTree} modified={modifiedTree} />
          </div>
        </div>
      ) : (
        <div className="tree-edit-container">
          <h3>Edit Directory Tree</h3>
          <MonacoEditor 
            value={modifiedTree} 
            onChange={setModifiedTree} 
            height="500px" 
          />
          {operationsList.length > 0 && (
            <div className="operations-preview">
              <h3>Changes to be Applied</h3>
              <ul className="operations-list">
                {operationsList.map((op, index) => (
                  <li key={index} className={`operation-item ${op.type}`}>
                    <span className="operation-type">{op.type.toUpperCase()}</span>
                    <span className="operation-path">{op.path}</span>
                    {op.newPath && (
                      <span className="operation-path-new">→ {op.newPath}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {showConfirmDialog && (
        <div className="confirm-dialog-overlay">
          <div className="confirm-dialog">
            <h3>Confirm Changes</h3>
            <p>Are you sure you want to apply these changes to the file system?</p>
            <div className="operations-summary">
              <ul className="operations-list">
                {operationsList.map((op, index) => (
                  <li key={index} className={`operation-item ${op.type}`}>
                    <span className="operation-type">{op.type.toUpperCase()}</span>
                    <span className="operation-path">{op.path}</span>
                    {op.newPath && (
                      <span className="operation-path-new">→ {op.newPath}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <p className="warning">This will rename and restructure files and directories according to your edits.</p>
            <div className="confirm-actions">
              <button onClick={cancelApplyChanges}>Cancel</button>
              <button onClick={confirmApplyChanges} className="danger">Apply Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectoryTree; 