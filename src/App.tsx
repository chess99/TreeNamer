import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useState } from 'react';
import './App.css';
import DirectoryTree from './components/FileTree/DirectoryTree';

function App() {
  const [directoryPath, setDirectoryPath] = useState<string>('');
  const [treeContent, setTreeContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
        await parseDirectory(selected);
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
      await parseDirectory(directoryPath);
    }
  };

  const handleLoad = async () => {
    if (directoryPath.trim()) {
      await parseDirectory(directoryPath);
    }
  };

  const parseDirectory = async (path: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Parsing directory:', path);
      console.log('Calling parse_directory with params:', { dirPath: path });
      
      try {
        const result = await invoke<string>('parse_directory', { dirPath: path });
        console.log('Parse directory successful, received data length:', result?.length || 0);
        setTreeContent(result);
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
      console.error('Error parsing directory:', err);
      setError(`解析目录时出错: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyChanges = async (modifiedTree: string) => {
    try {
      setError(null);
      console.log('Applying changes to directory:', directoryPath);
      
      await invoke('apply_operations', { 
        dirPath: directoryPath,
        originalTree: treeContent, 
        modifiedTree: modifiedTree 
      });
      
      // Re-parse the directory to show updated tree
      await parseDirectory(directoryPath);
    } catch (err) {
      console.error('Error applying changes:', err);
      setError(`应用修改时出错: ${err}`);
      throw err; // Rethrow to handle in the component
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

        {isLoading && !treeContent && (
          <div className="loading">
            <div className="spinner"></div>
            <p>加载中...</p>
          </div>
        )}

        {treeContent && (
          <DirectoryTree 
            originalTree={treeContent} 
            onApplyChanges={handleApplyChanges}
          />
        )}

        {!treeContent && !isLoading && (
          <div className="no-content">
            <p>请选择一个目录来开始</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
