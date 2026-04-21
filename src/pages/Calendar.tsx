import { useState } from 'react';
import { parseLocalDate } from '../utils';
import type { Trade } from '../types';
import MiniCalendar from '../components/MiniCalendar';
import { format } from 'date-fns';
import { useData } from '../contexts/DataContext';

function fmt(n: number) {
  const prefix = n >= 0 ? '+' : '';
  return prefix + n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

export default function Calendar() {
  const { trades } = useData();
  const [selected, setSelected] = useState<{ date: string; trades: Trade[] } | null>(null);

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6" style={{ background: '#0f1117' }}>
        <p className="text-xs tracking-widest uppercase mb-5" style={{ color: '#4b5563' }}>Calendar</p>
        <MiniCalendar trades={trades} onDayClick={(date, ts) => setSelected({ date, trades: ts })} />
      </div>

      {/* Day detail panel */}
      <div
        className="w-72 shrink-0 p-4 overflow-y-auto"
        style={{ background: '#13151f', borderLeft: '1px solid #1e2130' }}
      >
        {selected ? (
          <>
            <p className="text-xs tracking-widest uppercase mb-3" style={{ color: '#4b5563' }}>
              {format(parseLocalDate(selected.date), 'EEEE, MMMM d, yyyy')}
            </p>
            {selected.trades.map(t => (
              <div key={t.id} className="rounded-lg p-3 mb-2" style={{ background: '#181c2a', border: '1px solid #1e2130' }}>
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-medium" style={{ color: '#e2e8f0' }}>{t.symbol || 'Trade'}</span>
                  <span className="text-sm font-semibold" style={{ color: t.pnl >= 0 ? '#4ade80' : '#f87171' }}>
                    {fmt(t.pnl)}
                  </span>
                </div>
                <div className="flex gap-2 text-xs">
                  <span
                    className="px-1.5 py-0.5 rounded"
                    style={{ background: t.side === 'call' ? '#1a3a2a' : '#3a1a1a', color: t.side === 'call' ? '#4ade80' : '#f87171' }}
                  >
                    {t.side.toUpperCase()}
                  </span>
                  <span style={{ color: '#6b7280' }}>{t.exitedContracts}/{t.enteredContracts} ct</span>
                  <span style={{ color: '#6b7280' }}>avg ${t.avgEntry.toFixed(3)} → ${t.avgExit.toFixed(2)}</span>
                </div>
                {t.notes && <p className="text-xs mt-2" style={{ color: '#4b5563' }}>{t.notes}</p>}
              </div>
            ))}
            <div className="mt-3 pt-3 text-sm" style={{ borderTop: '1px solid #1e2130' }}>
              <div className="flex justify-between">
                <span style={{ color: '#6b7280' }}>Day P&L</span>
                <span style={{ color: selected.trades.reduce((s, t) => s + t.pnl, 0) >= 0 ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                  {fmt(selected.trades.reduce((s, t) => s + t.pnl, 0))}
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span style={{ color: '#6b7280' }}>Trades</span>
                <span style={{ color: '#9ca3af' }}>{selected.trades.length}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <p className="text-sm" style={{ color: '#4b5563' }}>Click a day</p>
            <p className="text-xs mt-1" style={{ color: '#2d3148' }}>to view trade details</p>
          </div>
        )}
      </div>
    </div>
  );
}
