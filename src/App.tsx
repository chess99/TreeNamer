import { invoke } from '@tauri-apps/api/core';
import { confirm, open } from '@tauri-apps/plugin-dialog';
import { useEffect, useRef, useState } from 'react';
import './App.css';
import DiffViewer from './components/DiffViewer/DiffViewer';
import MonacoEditor from './components/Editor/MonacoEditor';
import TreeValidator from './components/FileTree/TreeValidator';
import { TreeNode } from './types/TreeNode';
import { checkDuplicatesAndMerges, formatTreeToText, parseTextToTree, validateRootNameChange } from './utils/treeUtils';

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
  // Add state to control diff view visibility
  const [showDiffView, setShowDiffView] = useState<boolean>(false);
  
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

  // Update window size on resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

  // Function to apply tree text changes
  const handleApplyChanges = async () => {
    if (!isEdited) return;
    
    try {
      setIsLoading(true);
      
      // Parse the edited text back to a tree structure
      const parsedTree = parseTextToTree(editedTreeText, treeJsonRef.current);
      
      if (!parsedTree) {
        throw new Error('Failed to parse tree structure');
      }
      
      // Check for duplicate files and folder merges
      const duplicateCheck = checkDuplicatesAndMerges(parsedTree);
      
      // If there are duplicate files, show error and abort
      if (!duplicateCheck.valid) {
        const errorMessages = duplicateCheck.fileErrors.map(err => {
          // Get the filenames (last part of path)
          const filenames = err.duplicates.map(d => d.split('/').pop() || '');
          
          // Count occurrences of each filename
          const filenameCount = new Map<string, number>();
          for (const name of filenames) {
            filenameCount.set(name, (filenameCount.get(name) || 0) + 1);
          }
          
          // Format the message - if all filenames are the same, show filename (count)
          // Otherwise, show the list of filenames as before
          if (filenameCount.size === 1) {
            const filename = Array.from(filenameCount.keys())[0];
            const count = filenameCount.get(filename) || 0;
            return `Directory "${err.path}" has ${count} duplicate files with name: ${filename}`;
          } else {
            return `Directory "${err.path}" has duplicate files: ${filenames.join(', ')}`;
          }
        }).join('\n');
        
        showNotification('error', `Cannot apply changes: Duplicate files detected.\n${errorMessages}`);
        setIsLoading(false);
        return;
      }
      
      // If there are folder merges, show confirmation dialog
      if (duplicateCheck.folderMerges.length > 0) {
        const folderMergeMessages = duplicateCheck.folderMerges.map(merge => 
          `Directory "${merge.path}" has folders that will be merged: ${merge.folders.map(f => f.split('/').pop()).join(', ')}`
        ).join('\n');
        
        // Use Tauri's dialog API which returns a Promise
        const confirmed = await confirm(
          `The following folders will be merged:\n${folderMergeMessages}\n\nDo you want to continue?`,
          { title: "Confirm Folder Merges", kind: "warning" }
        );
        
        if (!confirmed) {
          setIsLoading(false);
          return;
        }
      }
      
      // Call the backend to apply the changes
      await invoke('apply_operations', {
        dirPath: directoryPath,
        originalTree: treeJsonRef.current,
        modifiedTree: JSON.stringify(parsedTree)
      });
      
      // Reload directory to get fresh tree
      await loadDirectory(directoryPath);
      
      // Close diff view if it's open
      if (showDiffView) {
        setShowDiffView(false);
      }
      
      // Show success notification
      showNotification('success', '变更已成功应用');
    } catch (error) {
      console.error('Error applying changes:', error);
      setError(`应用变更时出错: ${error}`);
      showNotification('error', `应用变更时出错: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Validate root name in edited text
  const validateRootName = (text: string) => {
    // Skip validation if flag is set
    if (skipValidationRef.current) {
      return;
    }
    
    // Skip if there's no tree loaded yet
    if (!treeJsonRef.current) {
      return;
    }

    try {
      const validationResult = validateRootNameChange(text, treeJsonRef.current);
      
      if (validationResult.changed) {
        // Set the skip flag to avoid re-triggering validation during the reset
        skipValidationRef.current = true;
        
        // Show warning message
        showNotification('warning', `根目录名称不能被修改，已自动恢复为原始名称: ${validationResult.originalName}`);
        
        // Reset the root name in the editor by replacing just the first line
        const lines = text.split('\n');
        lines[0] = validationResult.originalName;
        const correctedText = lines.join('\n');
        
        setEditedTreeText(correctedText);
        
        // Clear the skip flag after a short delay
        setTimeout(() => {
          skipValidationRef.current = false;
        }, 100);
      }
    } catch (error) {
      console.error('Error during root name validation:', error);
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

  // Show notification message
  const showNotification = (type: string, message: string) => {
    setNotification({ 
      type, 
      message 
    });
    
    // Clear notification after 6 seconds or longer for errors
    setTimeout(() => {
      setNotification(null);
    }, type === 'error' ? 10000 : 6000);
  };

  // Handle tree text changes
  const handleTreeTextChange = (value: string) => {
    setEditedTreeText(value);
    
    // Skip validation for programmatic changes
    if (skipValidationRef.current) {
      return;
    }
    
    // Set isEdited based on comparison with original text
    const hasChanged = value !== originalTextRef.current;
    setIsEdited(hasChanged);
    
    // Debounce validation to avoid too many checks
    if (validationTimerRef.current) {
      clearTimeout(validationTimerRef.current);
    }
    
    validationTimerRef.current = setTimeout(() => {
      validateRootName(value);
    }, 500) as unknown as number;
  };

  // Handle showing diff view
  const handleShowDiff = () => {
    // Make sure we don't validate while showing diff
    skipValidationRef.current = true;
    setShowDiffView(true);
  };

  // Handle closing diff view
  const handleCloseDiff = () => {
    // Re-enable validation when back to editing
    setTimeout(() => {
      skipValidationRef.current = false;
    }, 100);
    setShowDiffView(false);
  };

  return (
    <div className="app-container">
      {showDiffView ? (
        /* Full-screen Diff Viewer */
        <DiffViewer 
          originalText={originalTextRef.current}
          modifiedText={editedTreeText}
          onClose={handleCloseDiff}
          onApply={handleApplyChanges}
        />
      ) : (
        /* Main Application UI */
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
                  onClick={handleShowDiff}
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
                  {notification.message.split('\n').map((line, i) => (
                    <p key={i} style={{ margin: i === 0 ? '0 0 8px 0' : '4px 0' }}>
                      {line}
                    </p>
                  ))}
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
      )}
    </div>
  );
}

export default App;
