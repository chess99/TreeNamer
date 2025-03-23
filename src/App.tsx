import { invoke } from '@tauri-apps/api/core';
import { confirm, open } from '@tauri-apps/plugin-dialog';
import { useEffect, useRef, useState } from 'react';
import './App.css';
import MonacoEditor from './components/Editor/MonacoEditor';
import TreeValidator from './components/FileTree/TreeValidator';
import { TreeNode } from './types/TreeNode';
import { formatTreeToText, parseTextToTree, validateRootNameChange } from './utils/treeUtils';

function App() {
  // Core state
  const [directoryPath, setDirectoryPath] = useState<string>('');
  const [treeJson, setTreeJson] = useState<string>(''); // Backend JSON
  const [editedTreeText, setEditedTreeText] = useState<string>(''); // User-edited text
  const [isEdited, setIsEdited] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: string; message: string } | null>(null);
  // Add state to track window size changes
  const [windowSize, setWindowSize] = useState<{ width: number; height: number }>({ 
    width: window.innerWidth, 
    height: window.innerHeight 
  });
  
  // Reference to original text for true comparison
  const originalTextRef = useRef<string>('');

  // Timer reference for debouncing validation
  const validationTimerRef = useRef<number | null>(null);
  
  // Flag to disable validation during programmatic changes
  const skipValidationRef = useRef<boolean>(false);
  
  // Reference to always have the latest treeJson value
  const treeJsonRef = useRef<string>('');
  
  // Update ref when treeJson changes
  useEffect(() => {
    treeJsonRef.current = treeJson;
  }, [treeJson]);

  // Handle window resize events
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    
    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Format JSON to text when treeJson changes
  useEffect(() => {
    if (treeJson) {
      try {
        // Set flag to skip validation for programmatic changes
        skipValidationRef.current = true;
        
        const parsedTree = JSON.parse(treeJson) as TreeNode;
        const formattedText = formatTreeToText(parsedTree);
        
        // Set state variables and reference
        setEditedTreeText(formattedText);
        originalTextRef.current = formattedText;
        
        // Reset edited state
        setIsEdited(false);
        
        // Allow validation again after a short delay to ensure UI updates first
        setTimeout(() => {
          skipValidationRef.current = false;
        }, 100);
      } catch (error) {
        console.error('Error formatting tree JSON:', error);
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
      const parsedTree = parseTextToTree(editedTreeText, treeJsonRef.current);
      
      if (!parsedTree) {
        throw new Error('Failed to parse edited tree');
      }
      
      // Convert to JSON for backend
      const modifiedJson = JSON.stringify(parsedTree);
      
      console.log('Current treeJson before apply:', treeJsonRef.current.substring(0, 50) + '...');
      
      // Apply changes via backend
      await invoke('apply_operations', {
        dirPath: directoryPath,
        originalTree: treeJsonRef.current,
        modifiedTree: modifiedJson
      });
      
      // Reload directory to get fresh tree
      await loadDirectory(directoryPath);
      
      // Show success notification
      setNotification({ type: 'success', message: '修改成功应用' });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error('Error applying changes:', err);
      setNotification({ type: 'error', message: `应用修改出错: ${err}` });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Validate root name and show warning if changed
  const validateRootName = (text: string) => {
    if (!treeJsonRef.current || skipValidationRef.current) return;
    
    try {
      console.log('Validating root name with current treeJson:', treeJsonRef.current.substring(0, 50) + '...');
      const validation = validateRootNameChange(text, treeJsonRef.current);
      
      if (validation.changed) {
        // Show warning about root name change
        setNotification({
          type: 'warning',
          message: '根节点的名称不能修改，将会被自动重置。'
        });
        
        // Reset root name in the editor
        const lines = text.trim().split('\n');
        lines[0] = validation.originalName;
        const correctedText = lines.join('\n');
        
        // Update the editor with corrected text
        setEditedTreeText(correctedText);
        
        // Clear notification after a delay
        setTimeout(() => setNotification(null), 4000);
      }
    } catch (error) {
      console.error('Error validating root name:', error);
    }
  };

  // Centralized function to load directory
  const loadDirectory = async (path: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Set flag to skip validation for programmatic changes
      skipValidationRef.current = true;
      
      console.log('Loading directory:', path);
      console.log('Current treeJson before loading:', treeJson ? treeJson.substring(0, 50) + '...' : 'empty');
      console.log('Calling parse_directory with params:', { dirPath: path });
      
      try {
        // Get tree directly from backend
        const result = await invoke<string>('parse_directory', { dirPath: path });
        console.log('Parse directory successful, received data length:', result?.length || 0);
        console.log('New treeJson data:', result.substring(0, 50) + '...');
        
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
    
    // Normalize whitespace for both texts to avoid detecting insignificant whitespace changes
    const normalizedNew = newValue.trim().replace(/\s+/g, ' ');
    const normalizedOriginal = originalTextRef.current.trim().replace(/\s+/g, ' ');
    
    // Compare with original reference to detect actual changes
    setIsEdited(normalizedNew !== normalizedOriginal);
    
    // Only validate if not triggered by programmatic changes
    if (!skipValidationRef.current) {
      // Debounce root name validation
      if (validationTimerRef.current) {
        window.clearTimeout(validationTimerRef.current);
      }
      
      validationTimerRef.current = window.setTimeout(() => {
        validateRootName(newValue);
      }, 500);
    }
  };

  return (
    <div className="app-container">
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
          <button 
            onClick={async () => {
              if (isEdited) {
                // Use Tauri's dialog API which returns a Promise
                const confirmed = await confirm(
                  "您有未应用的修改。继续刷新将丢失这些修改。是否继续？",
                  { title: "确认刷新", kind: "warning" }
                );
                
                if (confirmed) {
                  handleLoad();
                }
              } else {
                handleLoad();
              }
            }} 
            disabled={!directoryPath.trim() || isLoading}
            className="refresh-button"
            title="刷新"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
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
                height="100%"
                key={`editor-${windowSize.width}-${windowSize.height}`}
              />
            </div>

            {/* Action buttons */}
            <div className="action-buttons">
              <button 
                className="button secondary" 
                onClick={() => alert("Diff view will be implemented here")}
                disabled={isLoading || !isEdited}
              >
                查看差异
              </button>
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
