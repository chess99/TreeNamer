import { useState } from 'react';
import DiffViewer from '../DiffView/DiffViewer';
import MonacoEditor from '../Editor/MonacoEditor';
import './DirectoryTree.css';
import TreeView from './TreeView';

interface DirectoryTreeProps {
  originalTree: string;
  onApplyChanges: (modifiedTree: string) => void;
}

const DirectoryTree = ({ originalTree, onApplyChanges }: DirectoryTreeProps) => {
  const [modifiedTree, setModifiedTree] = useState<string>(originalTree);
  const [showDiff, setShowDiff] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'text' | 'tree' | 'split'>('split');
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);

  const handleApplyChanges = () => {
    setShowConfirmDialog(true);
  };

  const confirmApplyChanges = () => {
    onApplyChanges(modifiedTree);
    setShowConfirmDialog(false);
  };

  const cancelApplyChanges = () => {
    setShowConfirmDialog(false);
  };

  const hasChanges = originalTree !== modifiedTree;

  return (
    <div className="directory-tree">
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
          <button onClick={() => setShowDiff(!showDiff)}>
            {showDiff ? 'Hide Diff' : 'Show Diff'}
          </button>
        )}
        
        <button 
          onClick={handleApplyChanges} 
          disabled={!hasChanges}
          className={hasChanges ? 'apply-button' : 'apply-button disabled'}
        >
          Apply Changes
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
        </div>
      )}

      {showConfirmDialog && (
        <div className="confirm-dialog-overlay">
          <div className="confirm-dialog">
            <h3>Confirm Changes</h3>
            <p>Are you sure you want to apply these changes to the file system?</p>
            <p>This will rename and restructure files and directories according to your edits.</p>
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