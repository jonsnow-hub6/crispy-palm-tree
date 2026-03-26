import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainDashboard } from '@/pages/MainDashboard';
import { StationsPage } from '@/pages/StationsPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
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

export function App() {
  const { toasts, removeToast, history, unreadCount, markAllRead } =
    useRealtime();
  const dispatch = useDispatch<AppDispatch>();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
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
            <Routes>
              <Route path="/" element={<MainDashboard />} />
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/stations"
                element={
                  <ProtectedRoute>
                    <StationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects"
                element={
                  <ProtectedRoute>
                    <ProjectsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/presets"
                element={
                  <ProtectedRoute>
                    <PresetsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/decoder"
                element={
                  <ProtectedRoute>
                    <RaphaPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </BrowserRouter>
      </LeoProvider>
    </ThemeProvider>
  );
}

export default App;
