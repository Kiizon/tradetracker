import { useState, useEffect, Fragment } from 'react';
import { PlusCircle, Trash2, Plus, X, Pencil } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import type { Trade, TradeLeg } from '../types';
import { format } from 'date-fns';
import { localToday, parseLocalDate } from '../utils';

function randomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function fmt(n: number) {
  const prefix = n >= 0 ? '+' : '';
  return prefix + n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

function weightedAvg(legs: TradeLeg[]): number {
  const total = legs.reduce((s, l) => s + l.contracts, 0);
  if (total === 0) return 0;
  return legs.reduce((s, l) => s + l.price * l.contracts, 0) / total;
}

function calcPnl(avgEntry: number, avgExit: number, exitedContracts: number) {
  return Math.round((avgExit - avgEntry) * exitedContracts * 100 * 100) / 100;
}

type LegWithId = TradeLeg & { id: string };
const emptyLeg = (): LegWithId => ({ id: randomId(), contracts: 1, price: 0 });

const defaultForm = () => ({
  date: localToday(),
  symbol: '',
  side: 'call' as 'call' | 'put',
  entries: [emptyLeg()],
  exits: [emptyLeg()],
  notes: '',
});

const inputStyle: React.CSSProperties = {
  background: '#13151f',
  border: '1px solid #1e2130',
  borderRadius: 6,
  color: '#e2e8f0',
  padding: '7px 10px',
  fontSize: 13,
  width: '100%',
  outline: 'none',
};

const inputErrorStyle: React.CSSProperties = {
  ...inputStyle,
  border: '1px solid #f87171',
};

const labelStyle: React.CSSProperties = {
  color: '#6b7280', fontSize: 12, marginBottom: 4, display: 'block',
};

function LegRow({
  leg, onChange, onRemove, canRemove, priceStep = '0.001', hasError,
}: {
  leg: LegWithId;
  onChange: (updated: LegWithId) => void;
  onRemove: () => void;
  canRemove: boolean;
  priceStep?: string;
  hasError?: boolean;
}) {
  return (
    <div className="flex gap-2 items-center">
      <div style={{ flex: '0 0 90px' }}>
        <input
          type="number"
          min="1"
          step="1"
          placeholder="Contracts"
          value={leg.contracts || ''}
          onChange={e => onChange({ ...leg, contracts: parseFloat(e.target.value) || 0 })}
          style={hasError && (!leg.contracts || leg.contracts <= 0) ? inputErrorStyle : inputStyle}
        />
      </div>
      <div style={{ flex: 1 }}>
        <input
          type="number"
          min="0"
          step={priceStep}
          placeholder="Price"
          value={leg.price || ''}
          onChange={e => onChange({ ...leg, price: parseFloat(e.target.value) || 0 })}
          style={hasError && (!leg.price || leg.price <= 0) ? inputErrorStyle : inputStyle}
        />
      </div>
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: 4, flexShrink: 0 }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function validate(form: ReturnType<typeof defaultForm>) {
  const errors: string[] = [];
  if (!form.symbol.trim()) errors.push('Ticker symbol is required.');
  const validEntries = form.entries.filter(l => l.contracts > 0 && l.price > 0);
  const validExits = form.exits.filter(l => l.contracts > 0 && l.price > 0);
  if (validEntries.length === 0) errors.push('At least one entry with contracts and price is required.');
  if (validExits.length === 0) errors.push('At least one exit with contracts and price is required.');
  const badEntry = form.entries.some(l => (l.contracts > 0 && l.price <= 0) || (l.contracts <= 0 && l.price > 0));
  const badExit = form.exits.some(l => (l.contracts > 0 && l.price <= 0) || (l.contracts <= 0 && l.price > 0));
  if (badEntry) errors.push('All entry rows must have both contracts and price filled in.');
  if (badExit) errors.push('All exit rows must have both contracts and price filled in.');
  return errors;
}

export default function Trades() {
  const { trades: allTrades, addTrade, deleteTrade, updateTrade } = useData();
  const trades = [...allTrades].sort((a, b) => b.date.localeCompare(a.date));
  const [form, setForm] = useState(defaultForm);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  // Live preview
  const validEntries = form.entries.filter(l => l.contracts > 0 && l.price > 0);
  const validExits = form.exits.filter(l => l.contracts > 0 && l.price > 0);
  const avgEntry = validEntries.length > 0 ? weightedAvg(validEntries) : null;
  const avgExit = validExits.length > 0 ? weightedAvg(validExits) : null;
  const enteredContracts = validEntries.reduce((s, l) => s + l.contracts, 0);
  const exitedContracts = validExits.reduce((s, l) => s + l.contracts, 0);
  const previewPnl = avgEntry !== null && avgExit !== null && exitedContracts > 0
    ? calcPnl(avgEntry, avgExit, exitedContracts)
    : null;

  // Re-validate on form change if already submitted
  useEffect(() => {
    if (submitted) setErrors(validate(form));
  }, [form, submitted]);

  function updateLeg(key: 'entries' | 'exits', id: string, updated: LegWithId) {
    setForm(f => ({ ...f, [key]: (f[key] as LegWithId[]).map(l => l.id === id ? updated : l) }));
  }

  function removeLeg(key: 'entries' | 'exits', id: string) {
    setForm(f => ({ ...f, [key]: (f[key] as LegWithId[]).filter(l => l.id !== id) }));
  }

  function addLeg(key: 'entries' | 'exits') {
    setForm(f => ({ ...f, [key]: [...(f[key] as LegWithId[]), emptyLeg()] }));
  }

  function openNew() {
    setForm(defaultForm);
    setEditingId(null);
    setErrors([]);
    setSubmitted(false);
    setShowForm(true);
  }

  function openEdit(trade: Trade) {
    setForm({
      date: trade.date,
      symbol: trade.symbol,
      side: trade.side,
      entries: trade.entries.map(l => ({ ...l, id: randomId() })),
      exits: trade.exits.map(l => ({ ...l, id: randomId() })),
      notes: trade.notes ?? '',
    });
    setEditingId(trade.id);
    setErrors([]);
    setSubmitted(false);
    setShowForm(true);
    setExpanded(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function closeForm() {
    setForm(defaultForm);
    setEditingId(null);
    setErrors([]);
    setSubmitted(false);
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const errs = validate(form);
    if (errs.length > 0) { setErrors(errs); return; }

    const ae = weightedAvg(validEntries);
    const ax = weightedAvg(validExits);
    const ec = validEntries.reduce((s, l) => s + l.contracts, 0);
    const xc = validExits.reduce((s, l) => s + l.contracts, 0);
    const pnl = calcPnl(ae, ax, xc);
    const outcome = pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'breakeven';

    const payload: Trade = {
      id: editingId ?? randomId(),
      date: form.date,
      symbol: form.symbol.toUpperCase(),
      side: form.side,
      entries: validEntries.map(({ contracts, price }) => ({ contracts, price })),
      exits: validExits.map(({ contracts, price }) => ({ contracts, price })),
      avgEntry: ae,
      avgExit: ax,
      enteredContracts: ec,
      exitedContracts: xc,
      outcome,
      pnl,
      notes: form.notes,
      createdAt: editingId
        ? (trades.find(t => t.id === editingId)?.createdAt ?? new Date().toISOString())
        : new Date().toISOString(),
    };

    if (editingId) {
      await updateTrade(payload);
    } else {
      await addTrade(payload);
    }
    closeForm();
  }

  async function handleDelete(id: string) {
    await deleteTrade(id);
  }

  const showLegErrors = submitted;

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: '#0f1117' }}>
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs tracking-widest uppercase" style={{ color: '#4b5563' }}>Trades</p>
        {!showForm && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-sm"
            style={{ background: '#4ade80', color: '#0f1117', fontWeight: 600, border: 'none', cursor: 'pointer' }}
          >
            <PlusCircle size={14} /> Add Trade
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg p-5 mb-5"
          style={{ background: '#181c2a', border: `1px solid ${errors.length > 0 ? '#742a2a' : '#1e2130'}` }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium" style={{ color: '#e2e8f0' }}>
              {editingId ? 'Edit Trade' : 'New Options Trade'}
            </p>
            <button type="button" onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563' }}>
              <X size={16} />
            </button>
          </div>

          {/* Validation errors */}
          {errors.length > 0 && (
            <div className="rounded mb-4 px-4 py-3" style={{ background: '#3a1a1a', border: '1px solid #742a2a' }}>
              {errors.map((err, i) => (
                <p key={i} className="text-xs" style={{ color: '#f87171' }}>{err}</p>
              ))}
            </div>
          )}

          {/* Top fields */}
          <div className="grid gap-4 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))' }}>
            <div>
              <label style={labelStyle}>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ ...labelStyle, color: submitted && !form.symbol.trim() ? '#f87171' : '#6b7280' }}>
                Symbol / Contract {submitted && !form.symbol.trim() && '— required'}
              </label>
              <input
                type="text"
                placeholder="e.g. SPY 500C 4/19"
                value={form.symbol}
                onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))}
                style={submitted && !form.symbol.trim() ? inputErrorStyle : inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <div className="flex gap-2">
                {(['call', 'put'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, side: s }))}
                    style={{
                      flex: 1,
                      padding: '7px 0',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: form.side === s
                        ? `1px solid ${s === 'call' ? '#4ade80' : '#f87171'}`
                        : '1px solid #1e2130',
                      background: form.side === s
                        ? s === 'call' ? '#1a3a2a' : '#3a1a1a'
                        : '#13151f',
                      color: form.side === s
                        ? s === 'call' ? '#4ade80' : '#f87171'
                        : '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Entries + Exits */}
          <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#4ade80' }}>Entries</span>
                <span className="text-xs" style={{ color: '#4b5563' }}>
                  {validEntries.length > 0 && `${enteredContracts} ct · avg $${avgEntry!.toFixed(3)}`}
                </span>
              </div>
              <div className="flex gap-1 mb-1.5">
                <span className="text-xs" style={{ color: '#4b5563', width: 90 }}>Contracts</span>
                <span className="text-xs" style={{ color: '#4b5563' }}>Fill price</span>
              </div>
              <div className="space-y-2">
                {(form.entries as LegWithId[]).map(leg => (
                  <LegRow
                    key={leg.id}
                    leg={leg}
                    onChange={u => updateLeg('entries', leg.id, u)}
                    onRemove={() => removeLeg('entries', leg.id)}
                    canRemove={form.entries.length > 1}
                    priceStep="0.001"
                    hasError={showLegErrors}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => addLeg('entries')}
                className="flex items-center gap-1 mt-2 text-xs"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4ade80', padding: 0 }}
              >
                <Plus size={12} /> Add entry
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#f87171' }}>Exits</span>
                <span className="text-xs" style={{ color: '#4b5563' }}>
                  {validExits.length > 0 && `${exitedContracts} ct · avg $${avgExit!.toFixed(2)}`}
                </span>
              </div>
              <div className="flex gap-1 mb-1.5">
                <span className="text-xs" style={{ color: '#4b5563', width: 90 }}>Contracts</span>
                <span className="text-xs" style={{ color: '#4b5563' }}>Exit price</span>
              </div>
              <div className="space-y-2">
                {(form.exits as LegWithId[]).map(leg => (
                  <LegRow
                    key={leg.id}
                    leg={leg}
                    onChange={u => updateLeg('exits', leg.id, u)}
                    onRemove={() => removeLeg('exits', leg.id)}
                    canRemove={form.exits.length > 1}
                    priceStep="0.01"
                    hasError={showLegErrors}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => addLeg('exits')}
                className="flex items-center gap-1 mt-2 text-xs"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 0 }}
              >
                <Plus size={12} /> Add exit
              </button>
            </div>
          </div>

          {/* P&L preview */}
          {previewPnl !== null && avgEntry !== null && avgExit !== null && (
            <div
              className="mt-4 px-4 py-3 rounded flex items-center justify-between"
              style={{
                background: previewPnl >= 0 ? '#1a3a2a' : '#3a1a1a',
                border: `1px solid ${previewPnl >= 0 ? '#22543d' : '#742a2a'}`,
              }}
            >
              <span className="text-xs" style={{ color: '#6b7280' }}>
                {exitedContracts} ct × ${Math.abs(avgExit - avgEntry).toFixed(3)} move × 100
              </span>
              <span className="text-sm font-semibold" style={{ color: previewPnl >= 0 ? '#4ade80' : '#f87171' }}>
                {fmt(previewPnl)}
              </span>
            </div>
          )}

          <div className="mt-4">
            <label style={labelStyle}>Notes (optional)</label>
            <textarea
              rows={2}
              placeholder="Trade notes..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              className="px-4 py-2 rounded text-sm font-medium"
              style={{ background: '#4ade80', color: '#0f1117', border: 'none', cursor: 'pointer' }}
            >
              {editingId ? 'Update Trade' : 'Save Trade'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="px-4 py-2 rounded text-sm"
              style={{ background: 'transparent', color: '#6b7280', border: '1px solid #1e2130', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1e2130' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#181c2a' }}>
              {['Date', 'Symbol', 'Type', 'Contracts', 'Avg Entry', 'Avg Exit', 'Outcome', 'P&L', 'Notes', ''].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs" style={{ color: '#4b5563', fontWeight: 500, borderBottom: '1px solid #1e2130' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-10 text-sm" style={{ color: '#4b5563' }}>
                  No trades yet. Add your first trade above.
                </td>
              </tr>
            ) : trades.map((t, i) => (
              <Fragment key={t.id}>
                <tr
                  onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                  style={{
                    background: editingId === t.id ? '#1e2237' : i % 2 === 0 ? '#13151f' : '#181c2a',
                    borderBottom: expanded === t.id ? 'none' : '1px solid #1e2130',
                    cursor: 'pointer',
                  }}
                >
                  <td className="px-3 py-2" style={{ color: '#9ca3af' }}>{format(parseLocalDate(t.date), 'MMM d, yyyy')}</td>
                  <td className="px-3 py-2 font-medium" style={{ color: '#e2e8f0' }}>{t.symbol || '—'}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded text-xs" style={{ background: t.side === 'call' ? '#1a3a2a' : '#3a1a1a', color: t.side === 'call' ? '#4ade80' : '#f87171' }}>
                      {t.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2" style={{ color: '#9ca3af' }}>{t.exitedContracts}/{t.enteredContracts}</td>
                  <td className="px-3 py-2" style={{ color: '#9ca3af' }}>${t.avgEntry.toFixed(3)}</td>
                  <td className="px-3 py-2" style={{ color: '#9ca3af' }}>${t.avgExit.toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded text-xs" style={{ background: t.outcome === 'win' ? '#1a3a2a' : t.outcome === 'loss' ? '#3a1a1a' : '#1a1d2a', color: t.outcome === 'win' ? '#4ade80' : t.outcome === 'loss' ? '#f87171' : '#6b7280' }}>
                      {t.outcome}
                    </span>
                  </td>
                  <td className="px-3 py-2" style={{ color: t.pnl >= 0 ? '#4ade80' : '#f87171' }}>
                    <span className="font-semibold">{fmt(t.pnl)}</span>
                    {t.avgEntry > 0 && (
                      <span className="text-xs ml-1.5" style={{ color: t.pnl >= 0 ? '#22c55e' : '#ef4444', opacity: 0.75 }}>
                        {t.pnl >= 0 ? '+' : ''}{((t.pnl / (t.avgEntry * t.enteredContracts * 100)) * 100).toFixed(1)}%
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2" style={{ color: '#6b7280', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.notes || '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        onClick={ev => { ev.stopPropagation(); openEdit(t); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: 0 }}
                        title="Edit trade"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={ev => { ev.stopPropagation(); handleDelete(t.id); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: 0 }}
                        title="Delete trade"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>

                {expanded === t.id && (
                  <tr style={{ background: i % 2 === 0 ? '#13151f' : '#181c2a', borderBottom: '1px solid #1e2130' }}>
                    <td colSpan={10} className="px-5 py-3">
                      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                        <div>
                          <p className="text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: '#4ade80' }}>Entries</p>
                          {t.entries.map((l, li) => (
                            <div key={li} className="flex gap-4 text-xs mb-1" style={{ color: '#6b7280' }}>
                              <span>{l.contracts} contract{l.contracts !== 1 ? 's' : ''}</span>
                              <span>@ ${l.price.toFixed(3)}</span>
                              <span style={{ color: '#4b5563' }}>(${(l.contracts * l.price * 100).toFixed(2)} cost)</span>
                            </div>
                          ))}
                        </div>
                        <div>
                          <p className="text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: '#f87171' }}>Exits</p>
                          {t.exits.map((l, li) => (
                            <div key={li} className="flex gap-4 text-xs mb-1" style={{ color: '#6b7280' }}>
                              <span>{l.contracts} contract{l.contracts !== 1 ? 's' : ''}</span>
                              <span>@ ${l.price.toFixed(2)}</span>
                              <span style={{ color: (l.price - t.avgEntry) >= 0 ? '#4ade80' : '#f87171' }}>
                                ({fmt((l.price - t.avgEntry) * l.contracts * 100)})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
