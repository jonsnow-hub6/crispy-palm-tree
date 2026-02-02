import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export function Notifications({ toasts, onClose }: { toasts: any[]; onClose: (id: string) => void }) {
  const fatal = toasts.find(t => t.level === 'fatal');
  return (
    <>
      {fatal && (
        <div className="fixed left-0 right-0 top-0 z-60">
          <div className="mx-auto max-w-7xl px-4 py-3 bg-destructive text-destructive-foreground flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <Badge variant="destructive">CRITICAL</Badge>
              <div className="font-medium">{fatal.type} — {fatal.content}</div>
            </div>
            <div>
              <Button variant="ghost" size="icon" onClick={() => onClose(fatal.id)} aria-label="Dismiss critical">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed right-4 top-4 z-50 space-y-3">
        {toasts.filter(t => t.level !== 'fatal').map((t) => (
          <div key={t.id} className="max-w-sm w-full p-3 rounded-md shadow-md border bg-card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={t.level === 'error' ? 'destructive' : t.level === 'warning' ? 'secondary' : 'default'}>{t.level}</Badge>
                  <div className="text-sm font-medium">{t.type}</div>
                </div>
                <div className="text-sm text-muted-foreground">{t.content}</div>
                {t.stationName && <div className="text-xs text-muted-foreground mt-2">Station: <span className="font-medium">{t.stationName}</span></div>}
              </div>
              <div>
                <Button variant="ghost" size="icon" onClick={() => onClose(t.id)} aria-label="Close notification">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default Notifications;
