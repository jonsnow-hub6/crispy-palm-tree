import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout, getUserAvatarUrl } from '@/store/slices/authSlice';
import { RootState } from '@/store';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Radio,
  FolderOpen,
  Palette,
  LogOut,
  Home,
  Moon,
  Sun,
  ChartLine,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Bell,
  LogIn,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { usePresetStatus } from '@/hooks/usePresetStatus';
import { useLeoContext } from '@/contexts/LeoContext';
import type { Permission } from '@/store/slices/authSlice';

const NAV_ITEMS: {
  path: string;
  label: string;
  icon: any;
  permission: Permission | null; // null = public (no login required)
}[] = [
  { path: '/', label: 'Dashboard', icon: Home, permission: 'dashboard' },
  { path: '/stations', label: 'Stations', icon: Radio, permission: 'stations' },
  { path: '/presets', label: 'Presets', icon: Palette, permission: 'presets' },
  {
    path: '/decoder',
    label: 'Decoder',
    icon: ChartLine,
    permission: 'decoder',
  },
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getAvatarColor(name: string): string {
  const h = hashString(name) % 360;
  return `hsl(${h}, 65%, 45%)`;
}

function UserAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  const initial = (name || '?').charAt(0).toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-8 w-8 rounded-full object-cover border-2 border-primary/20"
        title={name}
      />
    );
  }

  return (
    <div
      className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold select-none text-white"
      style={{ backgroundColor: getAvatarColor(name) }}
      title={name}
    >
      {initial}
    </div>
  );
}

export function NavBar({
  unreadCount = 0,
  onOpenSidebar,
}: {
  unreadCount?: number;
  onOpenSidebar?: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector(
    (state: RootState) => state.auth,
  );

  const { presets, activePresetId } = useSelector(
    (state: RootState) => state.presets,
  );
  const { theme, toggleTheme } = useTheme();

  const { records } = useLeoContext();
  const presetStatus = usePresetStatus(records);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  // Filter nav items: show only items the user has permission for
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!isAuthenticated || !user) return false;
    if (!item.permission) return true;
    return user.permission.includes(item.permission);
  });

  const activePreset = presets.find((p) => p.id === activePresetId);
  const avatarUrl = user ? getUserAvatarUrl(user) : null;

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="icon.png"
                alt="splinter logo"
                className="h-16 w-16 object-contain"
              />
              <span className="font-bold text-lg">Splinter</span>
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
                        isActive && 'bg-primary text-primary-foreground',
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

          {isAuthenticated && user && activePreset && (
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-md border shadow-sm transition-colors ${presetStatus.isMatched ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400'}`}
            >
              <div
                className="h-3 w-3 rounded-full animate-pulse"
                style={{ backgroundColor: activePreset.color }}
              />
              <span className="text-sm font-medium opacity-80">Preset:</span>
              <span className="text-sm font-semibold mr-2">
                {activePreset.name}
              </span>
              {presetStatus.isMatched ? (
                <div className="flex items-center gap-1.5 bg-green-500/20 px-2 py-0.5 rounded text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  VERIFIED
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-red-500/20 px-2 py-0.5 rounded text-xs font-bold">
                  <XCircle className="w-3.5 h-3.5" />
                  WAITING
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            {isAuthenticated && user && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenSidebar}
                className="relative h-9 w-9"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Button>
            )}
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
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <UserAvatar name={user.username} avatarUrl={avatarUrl} />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="h-9 w-9"
                  aria-label="Logout"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <LogIn className="h-4 w-4" />
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
