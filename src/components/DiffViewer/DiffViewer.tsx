import * as monaco from 'monaco-editor';
import React, { useEffect, useRef, useState } from 'react';
import './DiffViewer.css';

interface DiffViewerProps {
  originalText: string;
  modifiedText: string;
  onClose: () => void;
  onApply: () => void;
}

interface LineChange {
  originalStartLineNumber: number;
  originalEndLineNumber: number;
  modifiedStartLineNumber: number;
  modifiedEndLineNumber: number;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ 
  originalText, 
  modifiedText, 
  onClose, 
  onApply 
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const [diffStats, setDiffStats] = useState({ added: 0, removed: 0 });
  
  // Add ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Remove event listener on cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);
  
  useEffect(() => {
    // Setup Monaco diff editor on mount
    if (containerRef.current) {
      // Create the diff editor
      editorRef.current = monaco.editor.createDiffEditor(containerRef.current, {
        renderSideBySide: true,
        automaticLayout: true,
        readOnly: true,
        minimap: { enabled: false },
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        contextmenu: false,
        scrollbar: {
          vertical: 'visible',
          horizontal: 'visible',
        },
        fontSize: 14,
        wordWrap: 'on',
      });
      
      // Set original and modified models
      const originalModel = monaco.editor.createModel(originalText, 'plaintext');
      const modifiedModel = monaco.editor.createModel(modifiedText, 'plaintext');
      
      editorRef.current.setModel({
        original: originalModel,
        modified: modifiedModel
      });
      
      // Calculate accurate diff statistics after the editor is ready
      setTimeout(() => {
        calculateDiffStats();
      }, 100);
    }
    
    // Cleanup on unmount
    return () => {
      if (editorRef.current) {
        const model = editorRef.current.getModel();
        model?.original.dispose();
        model?.modified.dispose();
        editorRef.current.dispose();
      }
    };
  }, [originalText, modifiedText]);
  
  // Calculate accurate diff statistics using line-by-line comparison
  const calculateDiffStats = () => {
    // Use Monaco's built-in diff algorithm
    if (editorRef.current) {
      const lineChanges = editorRef.current.getLineChanges();
      if (lineChanges) {
        let addedCount = 0;
        let removedCount = 0;
        
        lineChanges.forEach(change => {
          // Count removed lines
          if (change.originalEndLineNumber > 0) {
            removedCount += change.originalEndLineNumber - change.originalStartLineNumber + 1;
          }
          
          // Count added lines
          if (change.modifiedEndLineNumber > 0) {
            addedCount += change.modifiedEndLineNumber - change.modifiedStartLineNumber + 1;
          }
        });
        
        setDiffStats({ added: addedCount, removed: removedCount });
      }
    }
  };
  
  return (
    <div className="diff-viewer">
      <div className="diff-header">
        <h2>文件修改对比</h2>
        <div className="diff-stats">
          <span className="stat added">+{diffStats.added}</span>
          <span className="stat removed">-{diffStats.removed}</span>
        </div>
      </div>
      
      <div className="diff-content" ref={containerRef}></div>
      
      <div className="diff-footer">
        <button className="button secondary" onClick={onClose}>
          返回
        </button>
        <button className="button" onClick={onApply}>
          应用修改
        </button>
      </div>
    </div>
  );
};

export default DiffViewer; 