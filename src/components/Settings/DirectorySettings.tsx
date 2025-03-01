import { useState } from 'react';
import { useDirectoryStore } from '../../store/directoryStore';
import './DirectorySettings.css';

interface DirectorySettingsProps {
  onClose: () => void;
}

const DirectorySettings = ({ onClose }: DirectorySettingsProps) => {
  const { loadDirectory } = useDirectoryStore();
  
  const [maxDepth, setMaxDepth] = useState<number>(10);
  const [excludePattern, setExcludePattern] = useState<string>('node_modules|.git');
  const [followSymlinks, setFollowSymlinks] = useState<boolean>(false);
  const [showHidden, setShowHidden] = useState<boolean>(false);
  
  const handleApply = async () => {
    await loadDirectory({
      maxDepth,
      excludePattern,
      followSymlinks,
      showHidden
    });
    onClose();
  };
  
  return (
    <div className="directory-settings">
      <h3>Directory Parsing Settings</h3>
      
      <div className="settings-group">
        <label htmlFor="max-depth">Maximum Depth:</label>
        <input
          id="max-depth"
          type="number"
          min="1"
          max="100"
          value={maxDepth}
          onChange={(e) => setMaxDepth(parseInt(e.target.value, 10))}
        />
      </div>
      
      <div className="settings-group">
        <label htmlFor="exclude-pattern">Exclude Pattern (regex):</label>
        <input
          id="exclude-pattern"
          type="text"
          value={excludePattern}
          onChange={(e) => setExcludePattern(e.target.value)}
          placeholder="e.g. node_modules|.git"
        />
      </div>
      
      <div className="settings-group checkbox">
        <input
          id="follow-symlinks"
          type="checkbox"
          checked={followSymlinks}
          onChange={(e) => setFollowSymlinks(e.target.checked)}
        />
        <label htmlFor="follow-symlinks">Follow Symbolic Links</label>
      </div>
      
      <div className="settings-group checkbox">
        <input
          id="show-hidden"
          type="checkbox"
          checked={showHidden}
          onChange={(e) => setShowHidden(e.target.checked)}
        />
        <label htmlFor="show-hidden">Show Hidden Files</label>
      </div>
      
      <div className="settings-actions">
        <button onClick={onClose}>Cancel</button>
        <button onClick={handleApply} className="primary">Apply</button>
      </div>
    </div>
  );
};

export default DirectorySettings; 