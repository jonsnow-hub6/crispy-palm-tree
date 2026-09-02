import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainDashboard } from '@/pages/MainDashboard';
import { StationsPage } from '@/pages/StationsPage';
import { PresetsPage } from '@/pages/PresetsPage';
import RaphaPage from '@/pages/RaphaPage';
import { LoginPage } from '@/pages/LoginPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { NavBar } from '@/components/NavBar';
import { ThemeProvider } from '@/contexts/ThemeContext';
import useRealtime from '@/hooks/useRealtime';
import { Notifications } from '@/components/Notifications';
import NotificationSidebar from '@/components/NotificationSidebar';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { LeoProvider } from '@/contexts/LeoContext';
import { fetchPresets } from '@/store/slices/presetsSlice';
import type { AppDispatch } from '@/store';
import { fetchStations } from '@/store/slices/stationsSlice';
import { APP_VERSION } from '@/config/version';

export function App() {
  const { toasts, removeToast, history, unreadCount, markAllRead } =
    useRealtime();
  const dispatch = useDispatch<AppDispatch>();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.title = `Splinter v${APP_VERSION}`;
    dispatch(fetchPresets()); // ✅ load on startup
    dispatch(fetchStations()); // ✅ load on startup
  }, [dispatch]);

  return (
    <ThemeProvider>
      <LeoProvider>
        <BrowserRouter>
          <div className="flex flex-col h-screen overflow-hidden bg-background">
            <NavBar
              unreadCount={unreadCount}
              onOpenSidebar={() => setSidebarOpen(true)}
            />
            <NotificationSidebar
              open={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              notifications={history}
              markAllRead={markAllRead}
            />
            <Notifications toasts={toasts} onClose={removeToast} />
            <main className="flex-1 min-h-0 overflow-y-auto flex flex-col">
              <Routes>
                <Route
                  path="/"
                  element={
                    <ProtectedRoute requiredPermission="dashboard">
                      <MainDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/stations"
                  element={
                    <ProtectedRoute requiredPermission="stations">
                      <StationsPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/presets"
                  element={
                    <ProtectedRoute requiredPermission="presets">
                      <PresetsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/decoder"
                  element={
                    <ProtectedRoute requiredPermission="decoder">
                      <RaphaPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <footer className="py-1.5 px-4 border-t bg-card/40 text-card-foreground text-xs flex items-center justify-between shrink-0 select-none z-40">
              <span className="text-muted-foreground font-medium">
                Splinter
              </span>
              <span
                className="font-mono text-muted-foreground"
                data-cy="footer-app-version"
              >
                v{APP_VERSION}
              </span>
            </footer>
          </div>
        </BrowserRouter>
      </LeoProvider>
    </ThemeProvider>
  );
}

export default App;
