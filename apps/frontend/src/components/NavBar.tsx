import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '@/store/slices/authSlice';
import { RootState } from '@/store';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Radio, FolderOpen, Palette, LogOut, Home, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

export function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home, public: true },
    { path: '/stations', label: 'Stations', icon: Radio, public: false },
    { path: '/projects', label: 'Projects', icon: FolderOpen, public: false },
    { path: '/presets', label: 'Presets', icon: Palette, public: false },
  ];

  const visibleItems = navItems.filter(item => item.public || isAuthenticated);

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6" />
              <span className="font-bold text-lg">System Control</span>
            </Link>
            <div className="flex items-center gap-1">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={isActive ? 'default' : 'ghost'}
                      className={cn(
                        'flex items-center gap-2',
                        isActive && 'bg-primary text-primary-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            {isAuthenticated ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            ) : (
              <Link to="/login">
                <Button
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
