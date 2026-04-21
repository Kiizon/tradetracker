import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { AlertTriangle } from 'lucide-react';

export default function Settings() {
  const { trades, clearTrades, restoreBackup } = useData();
  const [confirm, setConfirm] = useState(false);

  async function clearAll() {
    await clearTrades();
    await restoreBackup([], []);
    setConfirm(false);
  }

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: '#0f1117' }}>
      <p className="text-xs tracking-widest uppercase mb-5" style={{ color: '#4b5563' }}>Settings</p>

      <div className="max-w-md space-y-4">
        <div className="rounded-lg p-5" style={{ background: '#181c2a', border: '1px solid #1e2130' }}>
          <h3 className="text-sm font-medium mb-1" style={{ color: '#e2e8f0' }}>About</h3>
          <p className="text-xs" style={{ color: '#6b7280' }}>
            Trade Tracker — cloud-synced trading journal backed by Firebase.
          </p>
          <p className="text-xs mt-2" style={{ color: '#4b5563' }}>
            {trades.length} trade{trades.length !== 1 ? 's' : ''} logged
          </p>
        </div>

        <div className="rounded-lg p-5" style={{ background: '#1e1a1a', border: '1px solid #3a1a1a' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} style={{ color: '#f87171' }} />
            <h3 className="text-sm font-medium" style={{ color: '#f87171' }}>Danger Zone</h3>
          </div>
          <p className="text-xs mb-4" style={{ color: '#6b7280' }}>
            Permanently delete all trades and journal entries. Cannot be undone.
          </p>
          {confirm ? (
            <div className="flex gap-2">
              <button
                onClick={clearAll}
                className="px-4 py-2 rounded text-sm"
                style={{ background: '#f87171', color: '#0f1117', fontWeight: 600, border: 'none', cursor: 'pointer' }}
              >
                Yes, delete everything
              </button>
              <button
                onClick={() => setConfirm(false)}
                className="px-4 py-2 rounded text-sm"
                style={{ background: 'transparent', color: '#6b7280', border: '1px solid #1e2130', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirm(true)}
              className="px-4 py-2 rounded text-sm"
              style={{ background: 'transparent', color: '#f87171', border: '1px solid #742a2a', cursor: 'pointer' }}
            >
              Clear All Data
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
