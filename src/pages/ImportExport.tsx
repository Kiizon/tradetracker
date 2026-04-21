import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Download, Upload, FileText, Trash2 } from 'lucide-react';
import type { Trade, JournalEntry } from '../types';

function randomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function prevBusinessDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() - 1);
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseOptionSymbol(raw: string): { display: string; side: 'call' | 'put' } {
  const trimmed = raw.trim();
  const underlying = trimmed.split(/\s+/)[0];
  const rest = trimmed.replace(/^[A-Z]+\s+/, '');
  const expiry = rest.slice(0, 6);
  const type = rest[6];
  const strikeRaw = rest.slice(7);
  const strike = parseInt(strikeRaw, 10) / 1000;
  const month = parseInt(expiry.slice(2, 4));
  const day = parseInt(expiry.slice(4, 6));
  const strikeFmt = strike % 1 === 0 ? strike.toString() : strike.toFixed(1);
  return {
    display: `${underlying} ${strikeFmt}${type} ${month}/${day}`,
    side: type === 'C' ? 'call' : 'put',
  };
}

function parseBrokerCsv(text: string): { trades: Trade[]; count: number } {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error('Empty file');

  const header = lines[0].split(',');
  const idx = (name: string) => header.findIndex(h => h.trim().toLowerCase() === name.toLowerCase());
  const iDate = idx('transaction_date');
  const iType = idx('activity_type');
  const iSub = idx('activity_sub_type');
  const iSym = idx('symbol');
  const iCur = idx('currency');
  const iQty = idx('quantity');
  const iPrice = idx('unit_price');
  const iNet = idx('net_cash_amount');

  if ([iDate, iType, iSub, iSym, iQty, iPrice, iNet].includes(-1))
    throw new Error('Unrecognised CSV format — expected broker activity export');

  type Row = { date: string; sub: string; sym: string; qty: number; price: number; net: number };
  const rows: Row[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols[iType]?.trim() !== 'Trade') continue;
    if (cols[iCur]?.trim() !== 'USD') continue;
    const sym = cols[iSym]?.trim();
    if (!sym) continue;
    rows.push({
      date: prevBusinessDay(cols[iDate]?.trim()),
      sub: cols[iSub]?.trim().toUpperCase(),
      sym,
      qty: Math.abs(parseFloat(cols[iQty]) || 0),
      price: parseFloat(cols[iPrice]) || 0,
      net: parseFloat(cols[iNet]) || 0,
    });
  }

  const grouped = new Map<string, Row[]>();
  for (const r of rows) {
    const arr = grouped.get(r.sym) ?? [];
    arr.push(r);
    grouped.set(r.sym, arr);
  }

  const trades: Trade[] = [];
  for (const [sym, symRows] of grouped) {
    const buys = symRows.filter(r => r.sub === 'BUY');
    const sells = symRows.filter(r => r.sub === 'SELL');
    if (sells.length === 0) continue;

    const dates = symRows.map(r => r.date).filter(Boolean).sort();
    const date = dates[dates.length - 1];

    const enteredContracts = buys.reduce((s, r) => s + r.qty, 0);
    const exitedContracts = sells.reduce((s, r) => s + r.qty, 0);

    const avgEntry = enteredContracts > 0
      ? buys.reduce((s, r) => s + (r.price / 100) * r.qty, 0) / enteredContracts
      : 0;
    const avgExit = exitedContracts > 0
      ? sells.reduce((s, r) => s + (r.price / 100) * r.qty, 0) / exitedContracts
      : 0;

    const pnl = Math.round((avgExit - avgEntry) * exitedContracts * 100 * 100) / 100;
    const { display, side } = parseOptionSymbol(sym);

    trades.push({
      id: randomId(),
      date,
      symbol: display,
      side,
      entries: buys.map(r => ({ contracts: r.qty, price: Math.round(r.price / 100 * 1000) / 1000 })),
      exits: sells.map(r => ({ contracts: r.qty, price: Math.round(r.price / 100 * 100) / 100 })),
      avgEntry: Math.round(avgEntry * 1000) / 1000,
      avgExit: Math.round(avgExit * 100) / 100,
      enteredContracts,
      exitedContracts,
      outcome: pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'breakeven',
      pnl,
      notes: '',
      createdAt: new Date().toISOString(),
    });
  }

  trades.sort((a, b) => a.date.localeCompare(b.date));
  return { trades, count: trades.length };
}

export default function ImportExport() {
  const { trades, journal, bulkImportTrades, clearTrades, restoreBackup } = useData();
  const [msg, setMsg] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(''), 4000);
  }

  function exportData() {
    const data = { trades, journal, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade-journal-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash('Exported successfully!');
  }

  function importJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        await restoreBackup(data.trades ?? [], data.journal ?? [] as JournalEntry[]);
        flash('Restored successfully!');
      } catch {
        flash('Error: invalid JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function importBrokerCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const { trades: parsed, count } = parseBrokerCsv(ev.target?.result as string);
        const { added, skipped } = await bulkImportTrades(parsed);
        flash(`Imported ${count} trades (${added} new, ${skipped} skipped as duplicates).`);
      } catch (err) {
        flash(`Error: ${err instanceof Error ? err.message : 'Could not parse CSV.'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function handleClearTrades() {
    if (!confirmClear) { setConfirmClear(true); return; }
    await clearTrades();
    setConfirmClear(false);
    flash('All trades cleared.');
  }

  const isError = msg.toLowerCase().startsWith('error');

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: '#0f1117' }}>
      <p className="text-xs tracking-widest uppercase mb-5" style={{ color: '#4b5563' }}>Import / Export</p>

      <div className="max-w-md space-y-4">
        {/* Export */}
        <div className="rounded-lg p-5" style={{ background: '#181c2a', border: '1px solid #1e2130' }}>
          <h3 className="text-sm font-medium mb-2" style={{ color: '#e2e8f0' }}>Export Data</h3>
          <p className="text-xs mb-4" style={{ color: '#6b7280' }}>
            Download all trades and journal entries as a JSON backup.
          </p>
          <button
            onClick={exportData}
            className="flex items-center gap-2 px-4 py-2 rounded text-sm"
            style={{ background: '#4ade80', color: '#0f1117', fontWeight: 600, border: 'none', cursor: 'pointer' }}
          >
            <Download size={14} /> Export JSON
          </button>
        </div>

        {/* Import broker CSV */}
        <div className="rounded-lg p-5" style={{ background: '#181c2a', border: '1px solid #1e2130' }}>
          <h3 className="text-sm font-medium mb-1" style={{ color: '#e2e8f0' }}>Import Broker CSV</h3>
          <p className="text-xs mb-1" style={{ color: '#6b7280' }}>
            Import trades from your broker's activity export. Duplicates are skipped.
          </p>
          <p className="text-xs mb-4" style={{ color: '#4b5563' }}>Supported: Wealthsimple activity-export format</p>
          <label
            className="flex items-center gap-2 px-4 py-2 rounded text-sm cursor-pointer w-fit"
            style={{ background: '#13151f', border: '1px solid #4ade80', color: '#4ade80' }}
          >
            <FileText size={14} /> Import CSV
            <input type="file" accept=".csv" onChange={importBrokerCsv} className="hidden" />
          </label>
        </div>

        {/* Restore from backup */}
        <div className="rounded-lg p-5" style={{ background: '#181c2a', border: '1px solid #1e2130' }}>
          <h3 className="text-sm font-medium mb-2" style={{ color: '#e2e8f0' }}>Restore from Backup</h3>
          <p className="text-xs mb-4" style={{ color: '#6b7280' }}>
            Restore from a previously exported JSON file. Overwrites all existing data.
          </p>
          <label
            className="flex items-center gap-2 px-4 py-2 rounded text-sm cursor-pointer w-fit"
            style={{ background: '#13151f', border: '1px solid #1e2130', color: '#9ca3af' }}
          >
            <Upload size={14} /> Choose JSON
            <input type="file" accept=".json" onChange={importJson} className="hidden" />
          </label>
        </div>

        {/* Danger zone */}
        <div className="rounded-lg p-5" style={{ background: '#181c2a', border: '1px solid #3a1a1a' }}>
          <h3 className="text-sm font-medium mb-2" style={{ color: '#f87171' }}>Danger Zone</h3>
          <p className="text-xs mb-4" style={{ color: '#6b7280' }}>
            Permanently delete all trades. Use before re-importing a CSV to avoid duplicates.
          </p>
          <button
            onClick={handleClearTrades}
            onBlur={() => setConfirmClear(false)}
            className="flex items-center gap-2 px-4 py-2 rounded text-sm"
            style={{
              background: confirmClear ? '#7f1d1d' : '#13151f',
              border: `1px solid ${confirmClear ? '#f87171' : '#742a2a'}`,
              color: '#f87171',
              cursor: 'pointer',
              fontWeight: confirmClear ? 600 : 400,
            }}
          >
            <Trash2 size={14} /> {confirmClear ? 'Click again to confirm' : 'Clear All Trades'}
          </button>
        </div>

        {msg && (
          <div
            className="rounded-lg px-4 py-3 text-sm"
            style={{
              background: isError ? '#3a1a1a' : '#1a3a2a',
              border: `1px solid ${isError ? '#742a2a' : '#22543d'}`,
              color: isError ? '#f87171' : '#4ade80',
            }}
          >
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
