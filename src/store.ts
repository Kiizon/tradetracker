import type { Trade } from './types';
import { localToday, parseLocalDate } from './utils';

export function computeStats(trades: Trade[]) {
  const wins = trades.filter(t => t.outcome === 'win');
  const losses = trades.filter(t => t.outcome === 'loss');
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0)) / losses.length : 0;
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;
  const avgTrade = trades.length > 0 ? totalPnl / trades.length : 0;

  const now = new Date();
  const todayStr = localToday();
  const todayPnl = trades.filter(t => t.date === todayStr).reduce((s, t) => s + t.pnl, 0);

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekPnl = trades
    .filter(t => parseLocalDate(t.date) >= weekStart)
    .reduce((s, t) => s + t.pnl, 0);

  const monthPnl = trades
    .filter(t => t.date.startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`))
    .reduce((s, t) => s + t.pnl, 0);

  return { totalPnl, winRate, profitFactor, avgTrade, todayPnl, weekPnl, monthPnl, wins: wins.length, total: trades.length };
}

export function buildEquityCurve(trades: Trade[]) {
  const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
  let cumulative = 0;
  return sorted.map(t => {
    cumulative += t.pnl;
    return { date: t.date, equity: cumulative };
  });
}
