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
  const [viewMode, setViewMode] = useState<'text' | 'tree'>('text');

  const handleApplyChanges = () => {
    onApplyChanges(modifiedTree);
  };

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
        </div>
        
        {viewMode === 'text' && (
          <button onClick={() => setShowDiff(!showDiff)}>
            {showDiff ? 'Hide Diff' : 'Show Diff'}
          </button>
        )}
        
        <button onClick={handleApplyChanges}>Apply Changes</button>
      </div>

      {viewMode === 'tree' ? (
        <div className="tree-view-container">
          <TreeView treeText={originalTree} />
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
    </div>
  );
};

export default DirectoryTree; 