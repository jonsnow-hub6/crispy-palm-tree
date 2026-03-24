import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  X,
  Info,
  AlertTriangle,
  XCircle,
  AlertOctagon,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const levelStyles: Record<
  string,
  {
    border: string;
    bg: string;
    text: string;
    badge: 'default' | 'secondary' | 'destructive';
    icon: React.ElementType;
    banner?: string;
    glow?: string;
  }
> = {
  info: {
    border: 'border-primary/20',
    bg: 'bg-primary/5',
    text: 'text-primary',
    badge: 'default',
    icon: Info,
  },
  warning: {
    border: 'border-yellow-400/20',
    bg: 'bg-yellow-400/5',
    text: 'text-yellow-600 dark:text-yellow-400',
    badge: 'secondary',
    icon: AlertTriangle,
  },
  error: {
    border: 'border-destructive/40',
    bg: 'bg-destructive/15',
    text: 'text-destructive',
    badge: 'destructive',
    icon: XCircle,
  },
  critical: {
    border: 'border-red-900/60',
    bg: 'bg-destructive',
    text: 'text-destructive-foreground',
    badge: 'default',
    icon: AlertOctagon,
    banner: 'shadow-xl border-b-4 border-red-900 animate-softPulse',
    glow: 'shadow-[0_0_25px_5px_rgba(220,38,38,0.45)]',
  },
};

type Toast = {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  type: 'counter' | 'connection';
  content: string;
  stationName?: string | null;
  timestamp?: number;
};

export function NotificationSidebar({
  open,
  onClose,
  notifications,
  markAllRead,
}: {
  open: boolean;
  onClose: () => void;
  notifications: Toast[];
  markAllRead: () => void;
}) {
  React.useEffect(() => {
    if (open) {
      markAllRead();
    }
  }, [open, markAllRead]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[50] bg-background/80 backdrop-blur-sm transition-all duration-100"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-[50] w-full max-w-sm border-l bg-background shadow-2xl sm:max-w-md transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Notifications</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
              <span className="sr-only">Close notifications</span>
            </Button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-3">
                <Bell className="h-10 w-10 opacity-20" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((toast) => {
                const style = levelStyles[toast.level] || levelStyles.info;
                const Icon = style.icon;

                return (
                  <div
                    key={toast.id}
                    className={cn(
                      'relative overflow-hidden w-full p-4 rounded-lg border shadow-sm bg-card transition-all hover:shadow-md',
                      style.border,
                      style.bg,
                      style.banner,
                      style.glow,
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={cn('mt-0.5', style.text)}>
                        <Icon className="h-5 w-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant={style.badge}>{toast.level}</Badge>
                          <div className="text-sm font-semibold">
                            {toast.type}
                          </div>
                          {toast.stationName && (
                            <div className="text-sm font-semibold">
                              {toast.stationName}
                            </div>
                          )}
                          {toast.timestamp && (
                            <div className="text-xs text-muted-foreground ml-auto bg-background/50 px-1 rounded">
                              {format(new Date(toast.timestamp), 'HH:mm:ss')}
                            </div>
                          )}
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {toast.content}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default NotificationSidebar;
