import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainDashboard } from '@/pages/MainDashboard';
import { StationsPage } from '@/pages/StationsPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { PresetsPage } from '@/pages/PresetsPage';
import { LoginPage } from '@/pages/LoginPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { NavBar } from '@/components/NavBar';
import { ThemeProvider } from '@/contexts/ThemeContext';
import useRealtime from '@/hooks/useRealtime';
import { Notifications } from '@/components/Notifications';

export function App() {
  const { toasts, removeToast } = useRealtime();

  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <NavBar />
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
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
