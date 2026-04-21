import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Trades from './pages/Trades';
import Calendar from './pages/Calendar';
import Journal from './pages/Journal';
import ImportExport from './pages/ImportExport';
import Settings from './pages/Settings';
import Login from './pages/Login';
import './index.css';

function AppShell() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#0f1117' }}>
        <div className="text-sm" style={{ color: '#4b5563' }}>Loading…</div>
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <DataProvider uid={user.uid}>
      <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/trades" element={<Trades />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/import-export" element={<ImportExport />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </DataProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}
