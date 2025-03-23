import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useEffect, useState } from 'react';
import './App.css';
import MonacoEditor from './components/Editor/MonacoEditor';
import TreeValidator from './components/FileTree/TreeValidator';
import { TreeNode } from './types/TreeNode';
import { formatTreeToText, parseTextToTree } from './utils/treeUtils';

function App() {
  // Core state
  const [directoryPath, setDirectoryPath] = useState<string>('');
  const [treeJson, setTreeJson] = useState<string>(''); // Backend JSON
  const [treeText, setTreeText] = useState<string>(''); // Formatted text for display
  const [editedTreeText, setEditedTreeText] = useState<string>(''); // User-edited text
  const [isEdited, setIsEdited] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: string; message: string } | null>(null);

  // Format JSON to text when treeJson changes
  useEffect(() => {
    if (treeJson) {
      try {
        const parsedTree = JSON.parse(treeJson) as TreeNode;
        const formattedText = formatTreeToText(parsedTree);
        setTreeText(formattedText);
        setEditedTreeText(formattedText);
        setIsEdited(false);
      } catch (error) {
        console.error('Error formatting tree JSON:', error);
        setTreeText('Error formatting tree data');
        setEditedTreeText('Error formatting tree data');
      }
    }
  }, [treeJson]);

  const handleBrowse = async () => {
    try {
      console.log('Browse button clicked');
      
      // Open directory selection dialog
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择目录'
      });
      
      if (selected && typeof selected === 'string') {
        console.log('Selected directory:', selected);
        setDirectoryPath(selected);
        await loadDirectory(selected);
      }
    } catch (err) {
      console.error('Error in handleBrowse:', err);
      setError(`打开目录时出错: ${err}`);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDirectoryPath(e.target.value);
  };

  const handleInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && directoryPath.trim()) {
      await loadDirectory(directoryPath);
    }
  };

  const handleLoad = async () => {
    if (directoryPath.trim()) {
      await loadDirectory(directoryPath);
    }
  };

  // Centralized function to load directory
  const loadDirectory = async (path: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Loading directory:', path);
      console.log('Calling parse_directory with params:', { dirPath: path });
      
      try {
        // Get tree directly from backend
        const result = await invoke<string>('parse_directory', { dirPath: path });
        console.log('Parse directory successful, received data length:', result?.length || 0);
        
        // Set the tree JSON (will trigger useEffect to format to text)
        setTreeJson(result);
        console.log('Tree content updated');
      } catch (invokeErr) {
        console.error('Invoke error details:', {
          error: invokeErr,
          errorType: typeof invokeErr,
          errorMessage: invokeErr instanceof Error ? invokeErr.message : String(invokeErr),
          errorStack: invokeErr instanceof Error ? invokeErr.stack : undefined
        });
        throw invokeErr;
      }
    } catch (err) {
      console.error('Error loading directory:', err);
      setError(`解析目录时出错: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle user edits to tree text
  const handleTreeTextChange = (newValue: string) => {
    setEditedTreeText(newValue);
    setIsEdited(newValue !== treeText);
  };

  // Handle applying changes
  const handleApplyChanges = async () => {
    if (!isEdited) {
      setNotification({ type: 'info', message: '没有修改需要应用' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Applying changes to directory:', directoryPath);
      
      // Parse edited text back to tree structure to preserve IDs
      const parsedTree = parseTextToTree(editedTreeText, treeJson);
      
      if (!parsedTree) {
        throw new Error('Failed to parse edited tree');
      }
      
      // Convert to JSON for backend
      const modifiedJson = JSON.stringify(parsedTree);
      
      // Apply changes via backend
      await invoke('apply_operations', {
        dirPath: directoryPath,
        originalTree: treeJson,
        modifiedTree: modifiedJson
      });
      
      // Reload directory to get fresh tree
      await loadDirectory(directoryPath);
      
      setNotification({ type: 'success', message: '修改成功应用' });
    } catch (err) {
      console.error('Error applying changes:', err);
      setNotification({ type: 'error', message: `应用修改出错: ${err}` });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>TreeNamer</h1>
        <p>通过编辑目录树结构来批量重命名文件和文件夹</p>
      </header>

      <main>
        <div className="controls">
          <button onClick={handleBrowse}>浏览...</button>
          <input 
            type="text" 
            value={directoryPath} 
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder="输入目录路径或点击浏览选择目录"
            className="directory-input"
          />
          <button onClick={handleLoad} disabled={!directoryPath.trim() || isLoading}>
            {isLoading ? '加载中...' : '加载'}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {isLoading && !treeJson && (
          <div className="loading">
            <div className="spinner"></div>
            <p>加载中...</p>
          </div>
        )}

        {treeJson && (
          <div className="tree-operations-layout">
            {/* Tree view editor */}
            <div className="tree-view">
              {isLoading && (
                <div className="loading-overlay">
                  <div className="spinner"></div>
                </div>
              )}
              <MonacoEditor 
                value={editedTreeText} 
                onChange={handleTreeTextChange} 
                height="500px"
              />
            </div>

            {/* Action buttons */}
            <div className="action-buttons">
              <button 
                className="button" 
                onClick={handleApplyChanges}
                disabled={isLoading || !isEdited}
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
            {import.meta.env.DEV && <TreeValidator treeText={editedTreeText} treeJson={treeJson} />}
          </div>
        )}

        {!treeJson && !isLoading && (
          <div className="no-content">
            <p>请选择一个目录来开始</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
