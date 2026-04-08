import { useEffect, useState } from 'react';

interface ElectronInfo {
  platform: string;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
}

export default function ElectronInfo() {
  const [electronInfo, setElectronInfo] = useState<ElectronInfo | null>(null);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      setIsElectron(true);
      setElectronInfo({
        platform: window.electronAPI.platform,
        versions: window.electronAPI.versions
      });
    }
  }, []);

  if (!isElectron) {
    return null;
  }

  return (
    <div className="glass-panel-subtle p-4 mb-4">
      <h3 className="text-lg font-semibold text-primary mb-2">
        🖥️ Desktop Application
      </h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted">Platform:</span>
          <span className="ml-2 font-mono text-secondary">
            {electronInfo?.platform || 'Unknown'}
          </span>
        </div>
        <div>
          <span className="text-muted">Electron:</span>
          <span className="ml-2 font-mono text-secondary">
            v{electronInfo?.versions.electron || 'Unknown'}
          </span>
        </div>
        <div>
          <span className="text-muted">Node.js:</span>
          <span className="ml-2 font-mono text-secondary">
            v{electronInfo?.versions.node || 'Unknown'}
          </span>
        </div>
        <div>
          <span className="text-muted">Chrome:</span>
          <span className="ml-2 font-mono text-secondary">
            v{electronInfo?.versions.chrome || 'Unknown'}
          </span>
        </div>
      </div>
    </div>
  );
}