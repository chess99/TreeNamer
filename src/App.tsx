import { open } from "@tauri-apps/plugin-dialog";
import { useEffect } from "react";
import "./App.css";
import DirectoryTree from "./components/FileTree/DirectoryTree";
import { useDirectoryStore } from "./store/directoryStore";

function App() {
  const { 
    directoryPath, 
    originalTree, 
    isLoading, 
    error, 
    setDirectoryPath, 
    loadDirectory, 
    applyChanges,
    resetError
  } = useDirectoryStore();

  // Reset error when directoryPath changes
  useEffect(() => {
    resetError();
  }, [directoryPath, resetError]);

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
      <p>目录树重命名工具</p>

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
      </div>

      {error && <div className="error">{error}</div>}

      {originalTree && (
        <div className="tree-container">
          <DirectoryTree 
            originalTree={originalTree} 
            onApplyChanges={applyChanges} 
          />
        </div>
      )}
    </div>
  );
}

export default App;
