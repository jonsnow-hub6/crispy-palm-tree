import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, User as UserIcon, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getAvatarColor(name: string): string {
  const h = hashString(name || 'user') % 360;
  return `hsl(${h}, 65%, 45%)`;
}

export interface UserAvatarProps {
  name: string;
  avatarUrl: string | null;
  permissions?: string[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function UserAvatar({
  name,
  avatarUrl,
  permissions = [],
  className,
  size = 'sm',
}: UserAvatarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const initial = (name || '?').charAt(0).toUpperCase();

  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
  };

  const color = getAvatarColor(name || '');

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          'group relative inline-flex items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 hover:scale-105 active:scale-95 cursor-pointer',
          sizeClasses[size],
          className,
        )}
        title={`Click to view ${name}'s avatar`}
        aria-label={`View ${name}'s avatar`}
        data-cy="user-avatar-button"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="h-full w-full rounded-full object-cover border-2 border-primary/30 group-hover:border-primary transition-colors shadow-sm"
          />
        ) : (
          <div
            className="h-full w-full rounded-full flex items-center justify-center font-semibold select-none text-white shadow-sm border-2 border-white/20 group-hover:border-white/50 transition-colors"
            style={{ backgroundColor: color }}
          >
            {initial}
          </div>
        )}
        <span className="sr-only">Open avatar preview</span>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="sm:max-w-md p-6 overflow-hidden bg-background/95 backdrop-blur-md border border-border/80 shadow-2xl rounded-2xl animate-in fade-in-0 zoom-in-95"
          data-cy="avatar-modal"
        >
          <DialogHeader className="items-center text-center pb-2">
            <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-primary" />
              {name}
            </DialogTitle>
            {permissions && permissions.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1 mr-1">
                  <Shield className="w-3.5 h-3.5 text-primary/70" />{' '}
                  Permissions:
                </span>
                {permissions.map((perm) => (
                  <Badge
                    key={perm}
                    variant="secondary"
                    className="capitalize text-[11px] px-2 py-0.5 font-medium"
                  >
                    {perm}
                  </Badge>
                ))}
              </div>
            )}
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-4 px-2">
            <div className="relative group">
              {avatarUrl ? (
                <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-4 ring-primary/20 border border-primary/30 max-w-[260px] max-h-[260px] sm:max-w-[300px] sm:max-h-[300px]">
                  <img
                    src={avatarUrl}
                    alt={name}
                    className="w-full h-full object-cover aspect-square transition-transform duration-300 hover:scale-105"
                    data-cy="avatar-modal-image"
                  />
                </div>
              ) : (
                <div
                  className="w-48 h-48 sm:w-56 sm:h-56 rounded-full flex items-center justify-center text-6xl font-bold text-white shadow-2xl ring-8 ring-primary/10 border-4 border-white/20 transition-transform duration-300 hover:scale-105 select-none"
                  style={{ backgroundColor: color }}
                  data-cy="avatar-modal-placeholder"
                >
                  {initial}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-4 border-t border-border/60">
            {avatarUrl ? (
              <a
                href={avatarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
                data-cy="open-avatar-url-link"
              >
                <Button variant="outline" size="sm" className="gap-2 text-xs">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Full Image
                </Button>
              </a>
            ) : (
              <span className="text-xs text-muted-foreground italic">
                Default avatar
              </span>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="px-4 text-xs ml-auto"
              data-cy="close-avatar-modal"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
