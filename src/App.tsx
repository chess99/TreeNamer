import { open } from "@tauri-apps/plugin-dialog";
import { useEffect, useState } from "react";
import "./App.css";
import DirectoryTree from "./components/FileTree/DirectoryTree";
import DirectorySettings from "./components/Settings/DirectorySettings";
import { useDirectoryStore } from "./store/directoryStore";

function App() {
  const [showSettings, setShowSettings] = useState(false);
  
  const { 
    directoryPath, 
    originalTree, 
    isLoading, 
    error, 
    setDirectoryPath, 
    loadDirectory, 
    applyChanges,
    resetError,
    undoLastChange,
    lastBackupPath
  } = useDirectoryStore();

  // Reset error when directoryPath changes
  useEffect(() => {
    resetError();
  }, [directoryPath, resetError]);

  // Log state changes for debugging
  useEffect(() => {
    console.log("App state updated:", { 
      directoryPath, 
      hasTree: !!originalTree,
      isLoading,
      hasError: !!error,
      hasBackup: !!lastBackupPath
    });
  }, [directoryPath, originalTree, isLoading, error, lastBackupPath]);

  const handleOpenDirectory = async () => {
    try {
      console.log("Browse button clicked");
      
      // Open directory dialog
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Directory"
      });

      console.log("Selected directory:", selected);

      if (selected) {
        setDirectoryPath(selected as string);
        await loadDirectory();
      }
    } catch (e) {
      console.error("Failed to open directory:", e);
    }
  };

  return (
    <div className="container">
      <h1>TreeNamer</h1>
      <p>Directory Tree Rename Tool</p>

      <div className="row">
        <input
          id="directory-input"
          onChange={(e) => setDirectoryPath(e.currentTarget.value)}
          placeholder="Enter directory path..."
          value={directoryPath}
        />
        <button type="button" onClick={handleOpenDirectory} disabled={isLoading}>
          Browse
        </button>
        <button type="button" onClick={() => {
          console.log("Load Directory button clicked", directoryPath);
          loadDirectory();
        }} disabled={isLoading || !directoryPath}>
          {isLoading ? "Loading..." : "Load Directory"}
        </button>
        <button type="button" onClick={() => {
          console.log("Settings button clicked");
          setShowSettings(true);
        }} disabled={isLoading || !directoryPath}>
          Settings
        </button>
        <button 
          type="button" 
          onClick={() => {
            console.log("Undo button clicked");
            undoLastChange();
          }} 
          disabled={isLoading || !directoryPath || !lastBackupPath}
        >
          {isLoading ? "Processing..." : "Undo"}
        </button>
      </div>

      {showSettings && (
        <div className="modal-overlay">
          <div className="modal-content">
            <DirectorySettings onClose={() => setShowSettings(false)} />
          </div>
        </div>
      )}

      {originalTree && (
        <div className="tree-container">
          <DirectoryTree 
            originalTree={originalTree} 
            onApplyChanges={applyChanges}
            isLoading={isLoading}
            error={error}
          />
        </div>
      )}
    </div>
  );
}

export default App;
