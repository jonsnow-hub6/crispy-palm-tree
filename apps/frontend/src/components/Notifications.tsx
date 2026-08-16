import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Info, AlertTriangle, XCircle, AlertOctagon } from 'lucide-react';

const AUTO_CLOSE = 6000;

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

function ToastItem({
  toast,
  onClose,
}: {
  toast: any;
  onClose: (id: string) => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);

  const style = levelStyles[toast.level] || levelStyles.info;

  const Icon = style.icon;
  const handleClose = () => {
    setLeaving(true);

    setTimeout(() => {
      onClose(toast.id);
    }, 300);
  };
  /* Auto close */
  useEffect(() => {
    if (paused) return;

    const timer = setTimeout(() => {
      handleClose();
    }, AUTO_CLOSE);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`
        relative overflow-hidden
        w-full p-4 rounded-lg border shadow-md bg-card
        ${style.border} ${style.bg}
        transition-all
        ${leaving ? 'animate-toastOut' : 'animate-toastIn'}
        hover:shadow-lg
        ${style.banner || ''}
        ${style.glow || ''}
      `}
      data-cy={`notification-${toast.type}-${toast.level}`}
    >
      {/* Progress Bar */}
      {!paused && !leaving && (
        <div
          className="absolute bottom-0 left-0 h-[3px] bg-primary/60 animate-toastProgress"
          style={{ animationDuration: `${AUTO_CLOSE}ms` }}
        />
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`mt-0.5 ${style.text}`}>
          <Icon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={style.badge}>{toast.level}</Badge>

            <div className="text-sm font-semibold">{toast.type}</div>

            {toast.stationName && (
              <div className="text-sm font-semibold">{toast.stationName}</div>
            )}
          </div>

          <div className="text-sm text-muted-foreground">{toast.content}</div>
        </div>

        {/* Close */}
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function Notifications({
  toasts,
  onClose,
}: {
  toasts: any[];
  onClose: (id: string) => void;
}) {
  return (
    <div className="fixed left-4 bottom-4 z-50 flex flex-col-reverse gap-3 max-w-sm w-full">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={onClose} />
      ))}
    </div>
  );
}

export default Notifications;
