import { open } from "@tauri-apps/plugin-dialog";
import { useEffect, useState } from "react";
import "./App.css";
import DirectoryTree from "./components/FileTree/DirectoryTree";
import DirectorySettings from "./components/Settings/DirectorySettings";
import { useDirectoryStore } from "./store/directoryStore";

// Define the BackupInfo interface
interface BackupInfo {
  path: string;
  timestamp: number;
}

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showBackups, setShowBackups] = useState(false);
  
  const { 
    directoryPath, 
    originalTree, 
    isLoading, 
    error, 
    setDirectoryPath, 
    loadDirectory, 
    applyChanges,
    resetError,
    backups,
    loadBackups,
    restoreBackup
  } = useDirectoryStore();

  // Reset error when directoryPath changes
  useEffect(() => {
    resetError();
  }, [directoryPath, resetError]);

  // Load backups when directory path changes
  useEffect(() => {
    if (directoryPath) {
      loadBackups();
    }
  }, [directoryPath, loadBackups]);

  const handleOpenDirectory = async () => {
    try {
      // Open directory dialog
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Directory"
      });

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
        <button type="button" onClick={() => loadDirectory()} disabled={isLoading || !directoryPath}>
          {isLoading ? "Loading..." : "Load Directory"}
        </button>
        <button type="button" onClick={() => setShowSettings(true)} disabled={isLoading || !directoryPath}>
          Settings
        </button>
        {backups.length > 0 && (
          <button type="button" onClick={() => setShowBackups(true)} disabled={isLoading}>
            Backups ({backups.length})
          </button>
        )}
      </div>

      {showSettings && (
        <div className="modal-overlay">
          <div className="modal-content">
            <DirectorySettings onClose={() => setShowSettings(false)} />
          </div>
        </div>
      )}

      {showBackups && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="backup-manager">
              <h2>Backup Manager</h2>
              <p>Select a backup to restore:</p>
              <ul className="backup-list">
                {backups.map((backup: BackupInfo, index: number) => {
                  const date = new Date(backup.timestamp * 1000).toLocaleString();
                  return (
                    <li key={index}>
                      <span className="backup-date">{date}</span>
                      <button 
                        onClick={() => {
                          restoreBackup(backup.path);
                          setShowBackups(false);
                        }}
                        disabled={isLoading}
                      >
                        Restore
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="modal-actions">
                <button onClick={() => setShowBackups(false)}>Close</button>
              </div>
            </div>
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
