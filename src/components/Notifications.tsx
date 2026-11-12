import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { refreshForNotification } from '@/lib/notification-sync';
import { useMarkRead, useNotifications } from '@/api/queries';
import { usePush } from '@/lib/push';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Icon } from '@/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/cn';

const DISMISSED_KEY = 'lunchboard-push-dismissed';
const dismissed = () => {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
};

// A one-time nudge on Today's lunch: hear when people join your party and finish picking.
export function NotificationsPrompt() {
  const push = usePush();
  const [hidden, setHidden] = useState(dismissed);
  if (!push.supported || push.enabled || push.permission !== 'default' || hidden) return null;
  return (
    <Card size="sm" role="region" aria-label="Notifications">
      <CardContent className="flex flex-wrap items-center gap-3">
        <span className="grid size-9 place-items-center rounded-full bg-muted"><Icon name="bell" size={18} /></span>
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-medium">Get a ping when people join your party, complete their orders, and when everyone has picked.</span>
          <span className="block text-[13px] text-muted-foreground">Works even when this tab is closed. You can turn it off any time.</span>
        </p>
        <Button size="sm" disabled={push.busy} onClick={() => void push.enable()}>{push.busy ? 'Turning on…' : 'Turn on'}</Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setHidden(true);
            try { window.localStorage.setItem(DISMISSED_KEY, '1'); } catch { /* shown again next visit */ }
          }}
        >
          Not now
        </Button>
      </CardContent>
    </Card>
  );
}

// The sidebar's switch: on or off for this device.
export function NotificationsToggle() {
  const push = usePush();
  if (!push.supported) return null;
  const blocked = push.permission === 'denied';
  return (
    <Button
      variant="ghost"
      size="sm"
      className="justify-start gap-2.5 px-3 text-mute"
      disabled={push.busy || blocked}
      title={blocked ? 'Blocked in your browser settings for this site' : undefined}
      aria-pressed={push.enabled}
      onClick={() => void (push.enabled ? push.disable() : push.enable())}
    >
      <Icon name="bell" />
      {blocked ? 'Notifications blocked' : push.enabled ? 'Notifications on' : 'Turn on notifications'}
    </Button>
  );
}

const ago = (iso: string) => {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)} h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

// A link in a notification points at the web app; only its #/route matters, wherever it was sent from.
const routeOf = (link: string) => {
  try {
    return new URL(link).hash;
  } catch {
    return link.startsWith('#') ? link : '';
  }
};

// What a notification is about, from its title: each kind has its own icon and the app's colour for it
// (gold for a new lunch, blue once ordered, green when it arrives, amber when the host is needed).
type Kind = { icon: string; tint: string; label: string };
const KINDS: [RegExp, Kind][] = [
  [/everyone has picked/i, { icon: 'lock', tint: 'bg-brand-soft text-brand', label: 'All picked · lock the picks' }],
  [/completed their order/i, { icon: 'check', tint: 'bg-ok-soft text-ok', label: 'Order complete' }],
  [/joined your party|joined/i, { icon: 'users', tint: 'bg-[#efe9fe] text-[#6d28d9] dark:bg-[#24183f] dark:text-[#a78bfa]', label: 'Joined your party' }],
  [/started a lunch|new lunch/i, { icon: 'megaphone', tint: 'bg-[#fff4d6] text-[#a16207] dark:bg-[#2c2208] dark:text-[#f5b301]', label: 'New lunch' }],
  [/arrived|delivered/i, { icon: 'bag', tint: 'bg-ok-soft text-ok', label: 'Arrived' }],
  [/ordered|placed|preparing|on its way/i, { icon: 'order', tint: 'bg-brand-soft text-brand', label: 'Ordered' }],
  [/locked|confirm|needs you/i, { icon: 'lock', tint: 'bg-warn-soft text-warn', label: 'Action needed' }],
  [/closes?|cutoff|reminder|soon/i, { icon: 'clock', tint: 'bg-warn-soft text-warn', label: 'Reminder' }],
  [/invite/i, { icon: 'users', tint: 'bg-[#efe9fe] text-[#6d28d9] dark:bg-[#24183f] dark:text-[#a78bfa]', label: 'People' }],
  [/called off|cancel/i, { icon: 'close', tint: 'bg-bad-soft text-bad', label: 'Called off' }],
];
const kindOf = (title: string): Kind => KINDS.find(([re]) => re.test(title))?.[1] ?? { icon: 'bell', tint: 'bg-muted text-muted-foreground', label: 'Update' };

// Watches the bell's list (polled, and fetched again when the tab comes back) and, for each notification
// that wasn't there before, fetches the data it is about: the dashboard on a join, the order when someone
// completes theirs. Mounted once, while signed in. A push received in the open tab does the same at once.
const seen = new Set<string>();
let primed = false;
export function NotificationSync() {
  const qc = useQueryClient();
  const list = useNotifications(true);
  useEffect(() => {
    const items = list.data?.items;
    if (!items) return;
    if (!primed) {
      items.forEach((n) => seen.add(n.id)); // what was already there on load is not news
      primed = true;
      return;
    }
    for (const n of items) {
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      if (!n.read) refreshForNotification(qc, n);
    }
  }, [list.data, qc]);
  return null;
}

// The bell: what you were told lately, newest first, with a count of what you haven't read.
export function NotificationsBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [only, setOnly] = useState<'all' | 'unread'>('all');
  const list = useNotifications(true);
  const markRead = useMarkRead();
  const push = usePush();
  const unread = list.data?.unread ?? 0;
  const all = list.data?.items ?? [];
  const items = only === 'unread' ? all.filter((n) => !n.read) : all;
  const groups = [
    { label: 'Today', items: items.filter((n) => isToday(n.created_at)) },
    { label: 'Earlier', items: items.filter((n) => !isToday(n.created_at)) },
  ].filter((g) => g.items.length);

  const openOne = (id: string, link: string, read: boolean) => {
    if (!read) markRead.mutate([id]);
    const route = routeOf(link);
    if (route) window.location.hash = route;
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn('relative text-mute', open && 'bg-muted text-foreground', className)} aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}>
          <Icon name="bell" size={18} className={cn(unread > 0 && 'origin-top animate-[bell-ring_1.2s_ease-in-out_1]')} />
          {unread > 0 && (
            <span data-testid="bell-count" className="absolute -top-0.5 -right-0.5 grid min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[10px] leading-[18px] font-semibold text-white ring-2 ring-background num">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="w-[min(24rem,calc(100vw-1.5rem))] gap-0 overflow-hidden p-0">
        <div className="flex items-center gap-2 px-4 pt-3.5 pb-2.5">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Notifications</h2>
          {unread > 0 && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand num">{unread} new</span>}
          <Button variant="ghost" size="sm" className="ml-auto h-7 gap-1.5 px-2 text-[13px] text-muted-foreground" disabled={!unread || markRead.isPending} onClick={() => markRead.mutate(undefined)}>
            <Icon name="check" size={14} />
            Mark all read
          </Button>
        </div>
        <div className="flex gap-1 px-4 pb-2.5" role="tablist" aria-label="Show">
          {(['all', 'unread'] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={only === k}
              onClick={() => setOnly(k)}
              className={cn('h-7 rounded-full px-3 text-[13px] font-medium transition-colors', only === k ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted')}
            >
              {k === 'all' ? 'All' : `Unread${unread ? ` · ${unread}` : ''}`}
            </button>
          ))}
        </div>
        <div className="max-h-[min(26rem,60dvh)] overflow-auto border-t border-line" aria-label="Recent notifications">
          {groups.map((g) => (
            <section key={g.label} aria-label={g.label}>
              <h3 className="sticky top-0 z-10 bg-popover/95 px-4 pt-3 pb-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase backdrop-blur">{g.label}</h3>
              <ul className="px-1.5 pb-1.5">
                {g.items.map((n) => {
                  const k = kindOf(n.title);
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => openOne(n.id, n.link, n.read)}
                        className={cn('group flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-muted/70', !n.read && 'bg-brand-soft/40')}
                      >
                        <span className={cn('relative grid size-10 flex-none place-items-center rounded-full', k.tint)} aria-hidden="true">
                          <Icon name={k.icon} size={18} />
                          {!n.read && <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-brand ring-2 ring-popover" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-2">
                            <span className={cn('min-w-0 flex-1 truncate text-sm', n.read ? 'text-foreground/85' : 'font-semibold')}>{n.title}</span>
                            <span className="flex-none text-[11px] text-muted-foreground">{ago(n.created_at)}</span>
                          </span>
                          {n.body && <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-muted-foreground">{n.body}</span>}
                          <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                            {k.label}
                            {routeOf(n.link) && <><span aria-hidden="true">·</span><span className="text-brand group-hover:underline">Open</span></>}
                          </span>
                        </span>
                        {!n.read && <span className="sr-only">Unread</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {list.isPending && (
            <ul className="grid gap-1 p-2" aria-label="Loading notifications">
              {[0, 1, 2].map((i) => (
                <li key={i} className="flex animate-pulse items-start gap-3 rounded-xl px-2.5 py-2.5">
                  <span className="size-10 flex-none rounded-full bg-muted" />
                  <span className="grid flex-1 gap-2 pt-1"><span className="h-3 w-2/3 rounded bg-muted" /><span className="h-3 w-1/2 rounded bg-muted" /></span>
                </li>
              ))}
            </ul>
          )}
          {list.isError && (
            <div className="grid justify-items-center gap-2 px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">Couldn't load notifications.</p>
              <Button size="sm" variant="outline" onClick={() => void list.refetch()}>Try again</Button>
            </div>
          )}
          {list.isSuccess && !items.length && (
            <div className="grid justify-items-center gap-2 px-6 py-10 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground"><Icon name="bell" size={22} /></span>
              <p className="text-sm font-medium">{only === 'unread' && all.length ? "You're all caught up" : 'No notifications yet'}</p>
              <p className="max-w-[16rem] text-[13px] text-muted-foreground">
                {only === 'unread' && all.length ? 'Nothing new since you last looked.' : "You'll see here when people join your party, complete their orders, and when everyone has picked."}
              </p>
            </div>
          )}
        </div>
        {push.supported && (
          <div className="flex items-center gap-3 border-t border-line bg-muted/40 px-4 py-3">
            <span className="grid size-8 flex-none place-items-center rounded-full bg-background text-muted-foreground ring-1 ring-line"><Icon name="bell" size={15} /></span>
            <span className="min-w-0 flex-1 text-[13px] leading-tight">
              <span className="block font-medium">Push on this device</span>
              <span className="block text-muted-foreground">
                {push.permission === 'denied' ? 'Blocked in your browser settings' : push.enabled ? 'On, even when the tab is closed' : 'Off'}
              </span>
            </span>
            <Switch
              checked={push.enabled}
              disabled={push.busy || push.permission === 'denied'}
              onCheckedChange={(on) => void (on ? push.enable() : push.disable())}
              aria-label="Push notifications on this device"
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
