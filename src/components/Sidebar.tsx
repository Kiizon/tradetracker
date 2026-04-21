import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, CalendarDays,
  BookOpen, ArrowLeftRight, Settings, LogOut,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/trades', label: 'Trades', icon: TrendingUp },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/journal', label: 'Journal', icon: BookOpen },
  { to: '/import-export', label: 'Import / Export', icon: ArrowLeftRight },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { user, signOut } = useAuth();

  return (
    <aside
      style={{ background: '#13151f', borderRight: '1px solid #1e2130', width: 200, minHeight: '100vh' }}
      className="flex flex-col shrink-0"
    >
      <div className="px-5 py-5" style={{ borderBottom: '1px solid #1e2130' }}>
        <span className="font-semibold text-sm tracking-wide" style={{ color: '#e2e8f0' }}>
          Trading Journal
        </span>
      </div>

      <nav className="flex-1 py-3">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: isActive ? 500 : 400,
              color: isActive ? '#e2e8f0' : '#6b7280',
              background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
              borderLeft: isActive ? '2px solid #4ade80' : '2px solid transparent',
              textDecoration: 'none',
              transition: 'all 0.15s',
            })}
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 flex items-center gap-2" style={{ borderTop: '1px solid #1e2130' }}>
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            referrerPolicy="no-referrer"
            className="rounded-full shrink-0"
            style={{ width: 28, height: 28 }}
          />
        ) : (
          <div
            className="rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ width: 28, height: 28, background: '#2563eb', color: '#fff' }}
          >
            {user?.displayName?.[0] ?? '?'}
          </div>
        )}
        <span className="text-xs truncate flex-1" style={{ color: '#6b7280' }}>
          {user?.displayName ?? user?.email ?? 'Trader'}
        </span>
        <button
          onClick={signOut}
          title="Sign out"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: 2, flexShrink: 0 }}
        >
          <LogOut size={13} />
        </button>
      </div>
    </aside>
  );
}
