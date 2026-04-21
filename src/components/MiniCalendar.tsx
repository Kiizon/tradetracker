import { useState } from 'react';
import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  format, addMonths, subMonths, isSameMonth,
  startOfWeek, endOfWeek, addDays, isSameDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Trade } from '../types';

interface Props {
  trades: Trade[];
  onDayClick?: (date: string, trades: Trade[]) => void;
}

function getWeeklyPnl(weekStart: Date, byDate: Map<string, Trade[]>) {
  let pnl = 0;
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const d = format(addDays(weekStart, i), 'yyyy-MM-dd');
    const ts = byDate.get(d) ?? [];
    ts.forEach(t => { pnl += t.pnl; count += 1; });
  }
  return { pnl, count };
}

export default function MiniCalendar({ trades, onDayClick }: Props) {
  const [current, setCurrent] = useState(new Date());

  const byDate = new Map<string, Trade[]>();
  for (const t of trades) {
    const arr = byDate.get(t.date) ?? [];
    arr.push(t);
    byDate.set(t.date, arr);
  }

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  // Group days into weeks
  const weeks: Date[][] = [];
  let week: Date[] = [];
  for (const d of days) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }

  const monthTrades = trades.filter(t => t.date.startsWith(format(current, 'yyyy-MM')));
  const monthWins = monthTrades.filter(t => t.outcome === 'win').length;
  const monthLosses = monthTrades.filter(t => t.outcome === 'loss').length;

  function dayBg(pnl: number) {
    if (pnl > 0) return '#1a3a2a';
    if (pnl < 0) return '#3a1a1a';
    return '#1a1d2a';
  }
  function dayBorder(pnl: number) {
    if (pnl > 0) return '#22543d';
    if (pnl < 0) return '#742a2a';
    return '#1e2130';
  }
  function pnlColor(pnl: number) {
    if (pnl > 0) return '#4ade80';
    if (pnl < 0) return '#f87171';
    return '#6b7280';
  }

  return (
    <div className="rounded-lg p-4" style={{ background: '#181c2a', border: '1px solid #1e2130' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrent(subMonths(current, 1))}
            className="p-1 rounded hover:bg-white/5"
            style={{ color: '#6b7280' }}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium" style={{ color: '#e2e8f0' }}>
            {format(current, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrent(addMonths(current, 1))}
            className="p-1 rounded hover:bg-white/5"
            style={{ color: '#6b7280' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span style={{ color: '#4ade80' }}>● Win: {monthWins}</span>
          <span style={{ color: '#f87171' }}>● Loss: {monthLosses}</span>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(7, 1fr) 80px' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-xs py-1" style={{ color: '#4b5563' }}>{d}</div>
        ))}
        <div className="text-center text-xs py-1" style={{ color: '#4b5563' }}>Week</div>
      </div>

      {/* Weeks */}
      {weeks.map((wk) => {
        const weekKey = format(wk[0], 'yyyy-MM-dd');
        const { pnl: weekPnl, count: weekCount } = getWeeklyPnl(wk[0], byDate);
        return (
          <div key={weekKey} className="grid gap-1 mt-1" style={{ gridTemplateColumns: 'repeat(7, 1fr) 80px' }}>
            {wk.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayTrades = byDate.get(dateStr) ?? [];
              const pnl = dayTrades.reduce((s, t) => s + t.pnl, 0);
              const inMonth = isSameMonth(day, current);
              const isToday = isSameDay(day, new Date());
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;

              return (
                <div
                  key={dateStr}
                  onClick={() => dayTrades.length > 0 && onDayClick?.(dateStr, dayTrades)}
                  className="rounded flex flex-col p-1.5 min-h-[60px] relative"
                  style={{
                    background: isWeekend ? '#13151f' : dayTrades.length > 0 ? dayBg(pnl) : '#181c2a',
                    border: `1px solid ${dayTrades.length > 0 && !isWeekend ? dayBorder(pnl) : isToday ? '#3b4263' : '#1e2130'}`,
                    cursor: dayTrades.length > 0 ? 'pointer' : 'default',
                    opacity: inMonth ? (isWeekend ? 0.45 : 1) : 0.3,
                  }}
                >
                  <span
                    className="text-xs"
                    style={{
                      color: isToday ? '#4ade80' : inMonth ? '#9ca3af' : '#4b5563',
                      fontWeight: isToday ? 600 : 400,
                    }}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayTrades.length > 0 && (
                    <>
                      <span className="text-xs font-medium mt-auto" style={{ color: pnlColor(pnl) }}>
                        {pnl >= 0 ? '+' : ''}{pnl.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                      </span>
                      <span className="text-xs" style={{ color: '#4b5563' }}>
                        {dayTrades.length} trade{dayTrades.length !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
            {/* Week summary */}
            <div
              className="rounded flex flex-col items-center justify-center p-1.5 min-h-[60px]"
              style={{ background: '#13151f', border: '1px solid #1e2130' }}
            >
              {weekCount > 0 ? (
                <>
                  <span className="text-xs font-medium" style={{ color: pnlColor(weekPnl) }}>
                    {weekPnl >= 0 ? '+' : ''}{weekPnl.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                  </span>
                  <span className="text-xs" style={{ color: '#4b5563' }}>{weekCount} trades</span>
                </>
              ) : (
                <span className="text-xs" style={{ color: '#2d3148' }}>—</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
