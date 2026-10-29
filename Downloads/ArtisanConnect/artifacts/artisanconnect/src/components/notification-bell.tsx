import { useEffect, useRef, useState } from 'react';
import { Bell, BellRing, CheckCheck } from 'lucide-react';
import { useAuth } from '@clerk/react';
import { useLocation } from 'wouter';
import { toast } from '@/hooks/use-toast';
import { useMarkAllRead, useMarkRead, useNotifications } from '@/lib/extra-api';
import type { AppNotification } from '@/lib/extra-api';

function timeAgo(iso: string) {
  const seconds = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

function canUseBrowserAlerts() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

function showBrowserAlert(item: AppNotification) {
  if (!canUseBrowserAlerts() || Notification.permission !== 'granted') return;
  try {
    new Notification(item.title, { body: item.body, tag: item.id });
  } catch {
    // Some mobile browsers only allow alerts through a service worker; the in-app toast still shows.
  }
}

export function NotificationBell() {
  const { isSignedIn } = useAuth();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<string>(canUseBrowserAlerts() ? Notification.permission : 'unsupported');
  const wrapRef = useRef<HTMLDivElement>(null);
  const seen = useRef<Set<string> | null>(null);
  const query = useNotifications(Boolean(isSignedIn));
  const markAll = useMarkAllRead();
  const markOne = useMarkRead();
  const items = query.data?.items ?? [];
  const unread = query.data?.unreadCount ?? 0;

  // Pop up a toast (and a browser alert, if allowed) for every new unread notification.
  useEffect(() => {
    if (!query.data) return;
    if (seen.current === null) {
      seen.current = new Set(query.data.items.map((item) => `${item.id}:${item.createdAt}`));
      return;
    }
    for (const item of query.data.items) {
      const key = `${item.id}:${item.createdAt}`;
      if (seen.current.has(key)) continue;
      seen.current.add(key);
      if (!item.read) {
        toast({ title: item.title, description: item.body });
        showBrowserAlert(item);
      }
    }
  }, [query.data]);

  // Show the unread count in the browser tab title too.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, '');
    document.title = unread > 0 ? `(${unread}) ${base}` : base;
    return () => { document.title = base; };
  }, [unread]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!wrapRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!isSignedIn) return null;

  const openItem = (item: AppNotification) => {
    if (!item.read) markOne.mutate(item.id);
    setOpen(false);
    if (item.link) navigate(item.link);
  };

  const enableAlerts = async () => {
    if (!canUseBrowserAlerts()) return;
    setPermission(await Notification.requestPermission());
  };

  return <div className="relative" ref={wrapRef}>
    <button onClick={() => setOpen((value) => !value)} className="relative grid size-10 place-items-center rounded-full border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-primary/40" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} data-testid="button-notifications">
      {unread > 0 ? <BellRing size={18} className="text-primary" /> : <Bell size={18} />}
      {unread > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-5 text-primary-foreground" data-testid="badge-unread">{unread > 9 ? '9+' : unread}</span>}
    </button>
    {open && <div className="absolute right-0 top-12 z-50 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl" data-testid="panel-notifications">
      <div className="flex items-center justify-between border-b border-border px-4 py-3"><p className="font-display text-lg font-bold">Notifications</p>{unread > 0 && <button onClick={() => markAll.mutate()} className="flex items-center gap-1 text-xs font-bold text-primary" data-testid="button-mark-all-read"><CheckCheck size={14} /> Mark all read</button>}</div>
      <div className="max-h-[60vh] overflow-y-auto">
        {items.length === 0 ? <p className="px-4 py-10 text-center text-sm text-muted-foreground">Nothing yet. You will see proposals and messages here.</p> : items.map((item) => <button key={item.id} onClick={() => openItem(item)} className={`block w-full border-b border-border/60 px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted ${item.read ? '' : 'bg-accent/25'}`} data-testid={`notification-${item.id}`}>
          <div className="flex items-start gap-2">{!item.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}<div className="min-w-0"><p className="text-sm font-bold leading-snug">{item.title}</p>{item.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.body}</p>}<p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">{timeAgo(item.createdAt)}</p></div></div>
        </button>)}
      </div>
      {permission === 'default' && <button onClick={enableAlerts} className="w-full border-t border-border bg-muted/50 px-4 py-3 text-left text-xs font-semibold text-primary" data-testid="button-enable-alerts">Turn on pop-up alerts on this device</button>}
      {permission === 'denied' && <p className="border-t border-border bg-muted/50 px-4 py-3 text-xs text-muted-foreground">Pop-up alerts are blocked in your browser settings.</p>}
    </div>}
  </div>;
}