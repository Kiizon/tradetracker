import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { format } from 'date-fns';
import { computeStats, buildEquityCurve } from '../store';
import { parseLocalDate } from '../utils';
import type { Trade } from '../types';
import StatCard from '../components/StatCard';
import MiniCalendar from '../components/MiniCalendar';
import { useData } from '../contexts/DataContext';

type Range = '1D' | '1W' | '1M' | 'All';

function fmt(n: number) {
  const prefix = n >= 0 ? '+' : '';
  return prefix + n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
}

function filterByRange(points: { date: string; equity: number }[], range: Range) {
  if (range === 'All') return points;
  const now = new Date();
  const cutoff = new Date(now);
  if (range === '1D') cutoff.setDate(now.getDate() - 1);
  else if (range === '1W') cutoff.setDate(now.getDate() - 7);
  else if (range === '1M') cutoff.setMonth(now.getMonth() - 1);
  return points.filter(p => parseLocalDate(p.date) >= cutoff);
}

export default function Dashboard() {
  const { trades } = useData();
  const [range, setRange] = useState<Range>('All');
  const [selectedDay, setSelectedDay] = useState<{ date: string; trades: Trade[] } | null>(null);

  const stats = computeStats(trades);
  const allCurve = buildEquityCurve(trades);
  const curve = filterByRange(allCurve, range);

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6" style={{ background: '#0f1117' }}>
        <p className="text-xs tracking-widest uppercase mb-5" style={{ color: '#4b5563' }}>Dashboard</p>

        {/* Stats */}
        <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))' }}>
          <StatCard label="Today P&L" value={fmt(stats.todayPnl)} color={stats.todayPnl >= 0 ? '#4ade80' : '#f87171'} />
          <StatCard label="Week P&L" value={fmt(stats.weekPnl)} color={stats.weekPnl >= 0 ? '#4ade80' : '#f87171'} />
          <StatCard label="Month P&L" value={fmt(stats.monthPnl)} color={stats.monthPnl >= 0 ? '#4ade80' : '#f87171'} />
          <StatCard label="Total P&L" value={fmt(stats.totalPnl)} color={stats.totalPnl >= 0 ? '#4ade80' : '#f87171'} />
          <StatCard label="Profit Factor" value={isFinite(stats.profitFactor) ? `${stats.profitFactor.toFixed(2)}x` : '—'} />
          <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} />
          <StatCard label="Avg Trade" value={fmt(stats.avgTrade)} color={stats.avgTrade >= 0 ? '#4ade80' : '#f87171'} />
        </div>

        {/* Winning trades */}
        <div className="rounded-lg px-5 py-4 mb-4" style={{ background: '#181c2a', border: '1px solid #1e2130' }}>
          <p className="text-xs tracking-widest uppercase mb-1" style={{ color: '#4b5563' }}>Winning Trades</p>
          <p className="text-2xl font-semibold" style={{ color: '#e2e8f0' }}>
            {stats.wins} <span className="text-base font-normal" style={{ color: '#4b5563' }}>/ {stats.total}</span>
          </p>
        </div>

        {/* Equity Curve */}
        <div className="rounded-lg p-4 mb-4" style={{ background: '#181c2a', border: '1px solid #1e2130' }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium" style={{ color: '#e2e8f0' }}>Equity Curve</span>
            <div className="flex gap-1">
              {(['1D', '1W', '1M', 'All'] as Range[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className="px-2 py-0.5 rounded text-xs"
                  style={{
                    background: range === r ? '#4ade80' : 'transparent',
                    color: range === r ? '#0f1117' : '#6b7280',
                    border: range === r ? 'none' : '1px solid #1e2130',
                    cursor: 'pointer',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={curve} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4ade80" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#4b5563', fontSize: 11 }}
                tickFormatter={d => {
                  try { return format(new Date(d), 'MMM d'); } catch { return d; }
                }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#4b5563', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `+$${Math.abs(v)}`}
                width={50}
              />
              <Tooltip
                contentStyle={{ background: '#181c2a', border: '1px solid #1e2130', borderRadius: 6 }}
                labelStyle={{ color: '#9ca3af', fontSize: 12 }}
                itemStyle={{ color: '#4ade80', fontSize: 12 }}
                formatter={(v) => [fmt(Number(v)), 'Equity']}
                labelFormatter={d => {
                  try { return format(new Date(d), 'MMM d, yyyy'); } catch { return d; }
                }}
              />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="#4ade80"
                strokeWidth={2}
                fill="url(#greenGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Calendar */}
        <MiniCalendar
          trades={trades}
          onDayClick={(date, ts) => setSelectedDay({ date, trades: ts })}
        />
      </div>

      {/* Right panel */}
      <div
        className="w-64 shrink-0 p-4 overflow-y-auto"
        style={{ background: '#13151f', borderLeft: '1px solid #1e2130' }}
      >
        {selectedDay ? (
          <>
            <p className="text-xs tracking-widest uppercase mb-3" style={{ color: '#4b5563' }}>
              {format(parseLocalDate(selectedDay.date), 'MMMM d, yyyy')}
            </p>
            {selectedDay.trades.map(t => (
              <div key={t.id} className="rounded-lg p-3 mb-2" style={{ background: '#181c2a', border: '1px solid #1e2130' }}>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium" style={{ color: '#e2e8f0' }}>{t.symbol || 'Trade'}</span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: t.pnl >= 0 ? '#4ade80' : '#f87171' }}
                  >
                    {fmt(t.pnl)}
                  </span>
                </div>
                <div className="text-xs mt-1" style={{ color: '#4b5563' }}>
                  {t.side.toUpperCase()} · {t.exitedContracts}/{t.enteredContracts} ct · ${t.avgEntry.toFixed(3)} → ${t.avgExit.toFixed(2)}
                </div>
              </div>
            ))}
            <div className="text-xs mt-3 pt-3" style={{ borderTop: '1px solid #1e2130', color: '#6b7280' }}>
              Day P&L:{' '}
              <span style={{ color: selectedDay.trades.reduce((s, t) => s + t.pnl, 0) >= 0 ? '#4ade80' : '#f87171' }}>
                {fmt(selectedDay.trades.reduce((s, t) => s + t.pnl, 0))}
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <p className="text-sm" style={{ color: '#4b5563' }}>Select a trade or day</p>
            <p className="text-xs mt-1" style={{ color: '#2d3148' }}>to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
