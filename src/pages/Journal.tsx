import { useState } from 'react';
import { PlusCircle, Trash2, Edit2, X, Check } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { localToday, parseLocalDate } from '../utils';
import type { JournalEntry } from '../types';
import { format } from 'date-fns';

function randomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const moods = ['😔', '😕', '😐', '🙂', '😄'] as const;

const defaultForm = {
  date: localToday(),
  title: '',
  body: '',
  mood: 3 as 1 | 2 | 3 | 4 | 5,
};

export default function Journal() {
  const { journal, addJournalEntry, updateJournalEntry, deleteJournalEntry } = useData();
  const entries = [...journal].sort((a, b) => b.date.localeCompare(a.date));

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [selected, setSelected] = useState<JournalEntry | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      const existing = entries.find(x => x.id === editing)!;
      await updateJournalEntry({ ...existing, ...form });
      setEditing(null);
    } else {
      await addJournalEntry({ id: randomId(), ...form, createdAt: new Date().toISOString() });
    }
    setForm(defaultForm);
    setShowForm(false);
  }

  function startEdit(entry: JournalEntry) {
    setForm({ date: entry.date, title: entry.title, body: entry.body, mood: entry.mood });
    setEditing(entry.id);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    await deleteJournalEntry(id);
    if (selected?.id === id) setSelected(null);
  }

  const inputStyle = {
    background: '#13151f',
    border: '1px solid #1e2130',
    borderRadius: 6,
    color: '#e2e8f0',
    padding: '7px 10px',
    fontSize: 13,
    width: '100%',
    outline: 'none',
  } as React.CSSProperties;

  const labelStyle = { color: '#6b7280', fontSize: 12, marginBottom: 4, display: 'block' } as React.CSSProperties;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Entry list */}
      <div className="flex-1 overflow-y-auto p-6" style={{ background: '#0f1117' }}>
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs tracking-widest uppercase" style={{ color: '#4b5563' }}>Journal</p>
          <button
            onClick={() => { setForm(defaultForm); setEditing(null); setShowForm(v => !v); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-sm"
            style={{ background: '#4ade80', color: '#0f1117', fontWeight: 600, border: 'none', cursor: 'pointer' }}
          >
            <PlusCircle size={14} /> New Entry
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="rounded-lg p-5 mb-5"
            style={{ background: '#181c2a', border: '1px solid #1e2130' }}
          >
            <p className="text-sm font-medium mb-4" style={{ color: '#e2e8f0' }}>
              {editing ? 'Edit Entry' : 'New Journal Entry'}
            </p>
            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label style={labelStyle}>Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} required />
              </div>
              <div>
                <label style={labelStyle}>Mood</label>
                <div className="flex gap-2">
                  {([1, 2, 3, 4, 5] as (1|2|3|4|5)[]).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, mood: m }))}
                      className="text-xl rounded p-1"
                      style={{
                        background: form.mood === m ? '#1e2130' : 'transparent',
                        border: form.mood === m ? '1px solid #4ade80' : '1px solid transparent',
                        cursor: 'pointer',
                        opacity: form.mood === m ? 1 : 0.5,
                      }}
                    >
                      {moods[m - 1]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <label style={labelStyle}>Title</label>
              <input
                type="text"
                placeholder="Entry title..."
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                style={inputStyle}
                required
              />
            </div>
            <div className="mt-3">
              <label style={labelStyle}>Notes</label>
              <textarea
                rows={5}
                placeholder="What happened today? How did you feel? What did you learn?"
                value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                style={{ ...inputStyle, resize: 'vertical' }}
                required
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                className="px-4 py-2 rounded text-sm font-medium flex items-center gap-1.5"
                style={{ background: '#4ade80', color: '#0f1117', border: 'none', cursor: 'pointer' }}
              >
                <Check size={14} /> {editing ? 'Update' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => { setForm(defaultForm); setShowForm(false); setEditing(null); }}
                className="px-4 py-2 rounded text-sm flex items-center gap-1.5"
                style={{ background: 'transparent', color: '#6b7280', border: '1px solid #1e2130', cursor: 'pointer' }}
              >
                <X size={14} /> Cancel
              </button>
            </div>
          </form>
        )}

        {entries.length === 0 ? (
          <div className="text-center py-20" style={{ color: '#4b5563' }}>
            <p className="text-sm">No journal entries yet.</p>
            <p className="text-xs mt-1" style={{ color: '#2d3148' }}>Start writing to track your mindset.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map(e => (
              <div
                key={e.id}
                onClick={() => setSelected(e)}
                className="rounded-lg p-4 cursor-pointer"
                style={{
                  background: selected?.id === e.id ? '#1e2237' : '#181c2a',
                  border: `1px solid ${selected?.id === e.id ? '#3b4263' : '#1e2130'}`,
                  transition: 'all 0.15s',
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{moods[e.mood - 1]}</span>
                      <span className="text-sm font-medium truncate" style={{ color: '#e2e8f0' }}>{e.title}</span>
                    </div>
                    <p className="text-xs" style={{ color: '#4b5563' }}>
                      {format(parseLocalDate(e.date), 'EEEE, MMMM d, yyyy')}
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{
                        color: '#6b7280',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {e.body}
                    </p>
                  </div>
                  <div className="flex gap-1 ml-2 shrink-0">
                    <button
                      onClick={ev => { ev.stopPropagation(); startEdit(e); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: 4 }}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={ev => { ev.stopPropagation(); handleDelete(e.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: 4 }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      <div
        className="w-80 shrink-0 p-5 overflow-y-auto"
        style={{ background: '#13151f', borderLeft: '1px solid #1e2130' }}
      >
        {selected ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{moods[selected.mood - 1]}</span>
              <h2 className="text-base font-semibold" style={{ color: '#e2e8f0' }}>{selected.title}</h2>
            </div>
            <p className="text-xs mb-4" style={{ color: '#4b5563' }}>
              {format(parseLocalDate(selected.date), 'EEEE, MMMM d, yyyy')}
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#9ca3af' }}>{selected.body}</p>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <p className="text-sm" style={{ color: '#4b5563' }}>Select an entry</p>
            <p className="text-xs mt-1" style={{ color: '#2d3148' }}>to read the full journal</p>
          </div>
        )}
      </div>
    </div>
  );
}
