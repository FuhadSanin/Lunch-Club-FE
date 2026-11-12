// Runs the signed-in app on the Django API. When /api/me answers with a company, the screens get
// today's lunch, the team and their picks from the API through TanStack Query, and their actions
// become API calls. Without an answer (no API running, or not signed in) they keep the demo data.
// The landing page always uses the demo: it sits outside this provider.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useIsMutating } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useBoard, useConfirm, useLock, useReopen, useUnlock, useSkipPerson, useLunches, useMe, useMembers, useOrderDelivered, useSavePicks, useSkip, useStartLunch,
  useAddAddress, useCloseLunch, useCompanySettings, useInvitePeople, useInvites, useJoinLunch, useRemoveAddress, useUpdateCompany,
} from '@/api/queries';
import { ApiError } from '@/api/client';
import { isDemoPreview } from '@/auth';
import type { ApiBoard, ApiCompanySettings, ApiItem, ApiItemInput, ApiLunch, ApiMe, ApiOffered, ApiPermission, ApiPerson } from '@/api/types';
import type { Org } from '@/data/demo';

const HOST_PERMISSIONS: ApiPermission[] = ['session_create', 'session_update', 'session_delete', 'review_create', 'order_update'];
import { DEMO_SESSION, hueOf, rememberPeople, type Person, type Pick, type Session, type SessionStatus } from '@/data/demo';
import { allDishes, dishById, knownRestaurants, rememberStubs, restaurantById, slug, type Restaurant } from '@/data/menus';
import { StoreContext, useStore, type Action, type Store } from '@/store';
import { SetUpCompany } from '@/screens/SetUpCompany';
import { useHashRoute } from '@/ui';

const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// Today at HH:MM, as the API wants it. A time already past means tomorrow.
const cutoffAt = (time: string) => {
  const d = new Date();
  d.setHours(Number(time.slice(0, 2)), Number(time.slice(3, 5)), 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d.toISOString();
};

const STATUS: Record<ApiBoard['status'], SessionStatus> = {
  open: 'open',
  locked: 'locked',
  confirmed: 'placing',
  placed: 'placed',
  delivered: 'delivered',
  cancelled: 'delivered', // never shown: a called-off lunch is not today's lunch
};

// Today's lunch: the one still active (one at a time). It is active from the start until the host
// finishes its last step, Enjoy your meal, which closes it on the server, or calls it off.
const RUNNING = new Set<ApiLunch['status']>(['open', 'locked', 'confirmed', 'placed']);
const isActive = (l: ApiLunch, extras: Record<string, Extras>) =>
  RUNNING.has(l.status) || (l.status === 'delivered' && !l.closed_at && !extras[l.id]?.completed);
const currentLunch = (lunches: ApiLunch[] = [], extras: Record<string, Extras>) =>
  lunches.find((l) => RUNNING.has(l.status)) ?? lunches.find((l) => isActive(l, extras));

// A shared lunch link: #/lunch/<the lunch's id>. Opening it makes that lunch the one this browser shows.
const LINK = /^\/(?:lunch|pick)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const PIN_KEY = 'lunchboard-linked-lunch';
const readPin = () => {
  try {
    return window.localStorage.getItem(PIN_KEY);
  } catch {
    return null;
  }
};

const firstName = (name: string) => name.trim().split(/\s+/)[0] || 'My';

const safeUrl = (u: string) => {
  try {
    return encodeURI(decodeURI(u));
  } catch {
    return u.replace(/ /g, '%20');
  }
};
// The offered list travels with the lunch, so it is the same in every browser.
const toOffered = (r: Restaurant): ApiOffered => ({
  id: r.id, name: r.name,
  ...(r.area && { area: r.area }), ...(r.cuisines?.length && { cuisines: r.cuisines.slice(0, 20) }),
  ...(r.rating && { rating: r.rating }), ...(r.eta && { eta: r.eta }),
  ...(r.distanceKm !== undefined && { distance_km: Math.round(r.distanceKm * 100) / 100 }),
  // Swiggy image links can hold spaces ("... (1).jpg"); the server wants a proper URL.
  ...(r.photo?.startsWith('http') && { photo: safeUrl(r.photo) }),
});
const fromOffered = (r: ApiOffered): Restaurant => ({
  id: r.id, name: r.name, area: r.area, cuisines: r.cuisines, rating: r.rating, eta: r.eta, distanceKm: r.distance_km, photo: r.photo, categories: [],
});
const toPerson = (p: ApiPerson & { email?: string }): Person => ({ id: p.id, name: p.name, email: p.email ?? '', hue: hueOf(p.id) });

// Picks store a restaurant and dish by name. Find the dish in a loaded menu, or make a stand-in so the
// board can still show it.
function dishIdFor(item: ApiItem, stubs: Map<string, Restaurant>): string {
  const rname = item.restaurant_name.toLowerCase();
  const dname = item.dish_name.toLowerCase();
  for (const r of knownRestaurants()) {
    if (r.name.toLowerCase() !== rname) continue;
    const dish = allDishes(r).find((d) => d.name.toLowerCase() === dname);
    if (dish) return dish.id;
  }
  const rid = `api-${slug(item.restaurant_name)}`;
  const id = `${rid}:${slug(item.dish_name)}`;
  const stub = stubs.get(rid) ?? { id: rid, name: item.restaurant_name, categories: [{ name: 'Picked', dishes: [] }] };
  if (!allDishes(stub).some((d) => d.id === id))
    stub.categories[0].dishes.push({ id, name: item.dish_name, price: item.price_paise / 100, veg: false });
  stubs.set(rid, stub);
  return id;
}

function picksFrom(board: ApiBoard): Record<string, Pick> {
  const stubs = new Map<string, Restaurant>();
  const picks: Record<string, Pick> = {};
  for (const item of board.items) {
    const pick = (picks[item.user.id] ??= { items: [], note: '', skipped: false, updatedAt: '' });
    pick.items.push({ dishId: dishIdFor(item, stubs), qty: item.quantity });
    pick.note ||= item.note;
  }
  for (const p of board.skipped) picks[p.id] = { items: [], note: '', skipped: true, updatedAt: '' };
  for (const p of board.completed ?? []) if (picks[p.id]) picks[p.id].done = true;
  rememberStubs([...stubs.values()]);
  return picks;
}

// What the API doesn't keep yet, kept in this browser per lunch: the restaurants it offers and the host's
// review marks.
type Extras = {
  restaurantIds?: string[];
  checked?: Record<string, boolean>;
  handedOut?: Record<string, boolean>;
  arrived?: Record<string, boolean>; // restaurant id → collected
  completed?: boolean; // the host closed the lunch
};
const EXTRAS_KEY = 'lunchboard-live-v1';
function useExtras() {
  const [all, setAll] = useState<Record<string, Extras>>(() => {
    try {
      return JSON.parse(window.localStorage.getItem(EXTRAS_KEY) ?? '{}');
    } catch {
      return {};
    }
  });
  const update = (lunchId: string, change: (e: Extras) => Extras) =>
    setAll((cur) => {
      const next = { ...cur, [lunchId]: change(cur[lunchId] ?? {}) };
      try {
        window.localStorage.setItem(EXTRAS_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable: marks last until the page closes */
      }
      return next;
    });
  return [all, update] as const;
}

function useClock() {
  const [now, setNow] = useState(() => hhmm(new Date()));
  useEffect(() => {
    const timer = window.setInterval(() => setNow(hhmm(new Date())), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function isServerDown(error: unknown) {
  return error instanceof ApiError && (error.status === 0 || error.status >= 500);
}

function ServerDown({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div role="alert" className="grid min-h-dvh place-items-center bg-canvas p-6 text-sm">
      <div className="grid max-w-md gap-3 text-center">
        <h1 className="text-lg font-semibold">Can't reach the lunch server</h1>
        <p className="text-muted-foreground">{error.message}</p>
        <p className="text-muted-foreground">
          Start the API with <code className="font-mono">docker compose up -d api</code> (or <code className="font-mono">make bot-api</code> to
          use the order bot), then try again. Nothing here is demo data.
        </p>
        <button type="button" onClick={onRetry} className="mx-auto rounded-full bg-foreground px-4 py-2 text-background">
          Try again
        </button>
      </div>
    </div>
  );
}

function Connecting() {
  return (
    <div role="status" className="grid min-h-dvh place-items-center bg-canvas text-sm text-muted-foreground">
      <span className="flex items-center gap-3">
        <span className="size-4 animate-spin rounded-full border-2 border-input border-t-foreground" aria-hidden="true" />
        Loading today's lunch…
      </span>
    </div>
  );
}

export function LiveStore({ children }: { children: ReactNode }) {
  const me = useMe();
  if (me.isPending) return <Connecting />;
  // Not signed in (or not allowed yet) goes on to the sign-in screens. But when the API itself can't
  // answer, say so instead of quietly showing demo data that looks like the real thing.
  if (me.isError && isServerDown(me.error) && !isDemoPreview()) return <ServerDown error={me.error} onRetry={() => me.refetch()} />;
  if (me.isError) return <>{children}</>; // no API to talk to: the demo
  // Public email domains (gmail.com) never share a company: those people host their own party instead.
  if (!me.data.org && !me.data.public_email) return <SetUpCompany me={me.data} />;
  return <LiveBridge me={me.data}>{children}</LiveBridge>;
}

function LiveBridge({ me, children }: { me: ApiMe; children: ReactNode }) {
  const demo = useStore();
  // The whole team is loaded only where a page shows it: who has picked and who hasn't (Today's lunch,
  // Pick my lunch, Review and order) and the member list (Settings). Start a lunch doesn't need it.
  const [route] = useHashRoute();
  const hasOrg = !!me.org;
  const members = useMembers(route !== '/new' && hasOrg);
  const lunches = useLunches();
  const [extras, updateExtras] = useExtras();
  // The lunch from a shared link wins; one opened earlier stays while it is still running.
  const [pinned, setPinned] = useState(readPin);
  const pin = (id: string) => {
    setPinned(id);
    try {
      window.localStorage.setItem(PIN_KEY, id);
    } catch {
      /* storage unavailable: the link still works until the page closes */
    }
  };
  const linkedId = LINK.exec(route)?.[1].toLowerCase();
  useEffect(() => {
    if (linkedId) pin(linkedId);
  }, [linkedId]);
  // A link to a party you haven't joined yet: the app shows "Join the party" and joins only on that tap.
  // Once joined, My lunches opens with the party at the top of the active ones.
  const invited = linkedId && lunches.data && !lunches.data.some((l) => l.id === linkedId) ? linkedId : null;
  const [joinError, setJoinError] = useState<Record<string, string>>({});
  // Resolves with the joined lunch's board (the pop-up celebrates with it), or undefined if it failed.
  const joinInvited = () => {
    if (!invited) return Promise.resolve(undefined);
    setJoinError((x) => ({ ...x, [invited]: '' }));
    return join.mutateAsync(invited).catch((e: Error) => {
      setJoinError((x) => ({ ...x, [invited]: e.message }));
      return undefined;
    });
  };
  const lunch =
    lunches.data?.find((l) => l.id === (linkedId ?? pinned) && (linkedId || isActive(l, extras))) ??
    currentLunch(lunches.data, extras);
  const board = useBoard(lunch?.id);
  const now = useClock();
  const busy = useIsMutating() > 0;

  const person: ApiPerson = { id: me.id, name: me.name };
  const savePicks = useSavePicks(lunch?.id, person);
  const skip = useSkip(lunch?.id, person);
  const lock = useLock();
  const confirm = useConfirm();
  const delivered = useOrderDelivered();
  const closeLunch = useCloseLunch();
  const start = useStartLunch();
  const reopen = useReopen();
  const unlock = useUnlock();
  const skipPerson = useSkipPerson();
  const settings = useCompanySettings(hasOrg);
  const invites = useInvites(hasOrg && me.permissions.includes('member_read'));
  const join = useJoinLunch();
  const updateCompany = useUpdateCompany();
  const addAddress = useAddAddress();
  const removeAddress = useRemoveAddress();
  const invitePeople = useInvitePeople();

  const mine = lunch ? extras[lunch.id] : undefined;

  const people = useMemo(() => {
    const list = (members.data ?? [me]).map(toPerson);
    // Everyone in the lunch (with their emails), then anyone else the board mentions.
    for (const p of [...(board.data?.people ?? []), ...(board.data?.items.map((i) => i.user) ?? []), ...(board.data?.skipped ?? [])])
      if (!list.some((x) => x.id === p.id)) list.push(toPerson(p));
    rememberPeople(list);
    return list;
  }, [members.data, board.data, me]);

  const picks = useMemo(() => (board.data ? picksFrom(board.data) : {}), [board.data]);

  const session = useMemo<Session>(() => {
    const b = board.data;
    if (!b) return { ...DEMO_SESSION, id: 'none', restaurantIds: [], bot: [], handedOut: {}, checked: {} };
    const placed = b.orders.map((o) => o.swiggy_order_id).filter(Boolean);
    // The lunch carries the list the host offered; older lunches only had it in the host's browser.
    if (b.offered_restaurants?.length) rememberStubs(b.offered_restaurants.map(fromOffered)); // so every browser can show them
    const offered = b.offered_restaurants?.length ? b.offered_restaurants.map((r) => r.id) : (mine?.restaurantIds ?? []);
    return {
      id: b.id,
      title: 'Lunch',
      date: localDate(new Date(b.cutoff_at)),
      cutoff: hhmm(new Date(b.cutoff_at)),
      address: b.delivery_address,
      restaurantIds: offered,
      hostId: b.host.id,
      status: STATUS[b.status],
      orderRef: placed.length ? placed.map((id) => `#${id}`).join(', ') : null,
      bot: [],
      handedOut: mine?.handedOut ?? {},
      checked: mine?.checked ?? {},
      arrived: mine?.arrived ?? {},
      completed: !!mine?.completed,
    };
  }, [board.data, mine]);

  const fail = (what: string) => (e: Error) => toast.error(what, { description: e.message });

  const dispatch = (a: Action): void | Promise<unknown> => {
    const id = lunch?.id;
    switch (a.type) {
      case 'savePick':
      case 'completePick': {
        const items: ApiItemInput[] = a.items.flatMap((l) => {
          const found = dishById(l.dishId);
          if (!found) return [];
          return [{
            restaurant_name: found.restaurant.name,
            restaurant_id: /^\d+$/.test(found.restaurant.id) ? found.restaurant.id : '',
            dish_name: found.dish.name,
            quantity: l.qty,
            price_paise: Math.round(found.dish.price * 100),
            note: a.note.slice(0, 200),
          }];
        });
        if (a.type === 'savePick') return void savePicks.mutate({ items, complete: false }, { onError: fail("Couldn't save your pick") });
        // Completing: the cart goes on the board and becomes final in one request.
        if (!id) return;
        return savePicks
          .mutateAsync({ items, complete: true })
          .catch((e: Error) => {
            fail("Couldn't complete your order")(e);
            throw e;
          });
      }
      case 'reopenPick':
        if (!id) return;
        return reopen.mutateAsync({ lunchId: id, userId: a.userId }).catch((e: Error) => {
          fail("Couldn't reopen their order")(e);
          throw e;
        });
      case 'skip':
        // Your own skip, or the host marking someone else as skipping.
        return (a.userId === me.id ? skip.mutateAsync() : id ? skipPerson.mutateAsync({ lunchId: id, userId: a.userId }) : Promise.resolve()).catch(
          (e: Error) => {
            fail(a.userId === me.id ? "Couldn't skip this lunch" : "Couldn't mark them as skipping")(e);
            throw e;
          },
        );
      case 'lock':
        if (!id) return;
        return lock.mutateAsync(id).catch((e: Error) => {
          fail("Couldn't lock the picks")(e);
          throw e;
        });
      case 'reopen':
        if (!id) return;
        return unlock.mutateAsync(id).catch((e: Error) => {
          fail("Couldn't unlock the picks")(e);
          throw e;
        });
      case 'startPlacing':
        if (!id) return;
        return confirm.mutateAsync(id).catch((e: Error) => {
          fail("Couldn't confirm the cart")(e);
          throw e;
        });
      case 'delivered':
        for (const o of board.data?.orders.filter((o) => o.status === 'placed') ?? [])
          delivered.mutate(o.id, { onError: fail("Couldn't mark the food as arrived") });
        return;
      case 'newSession':
        return start
          .mutateAsync({
            cutoff_at: cutoffAt(a.cutoff),
            delivery_address: a.address,
            ...(a.name?.trim() && { name: a.name.trim() }),
            ...(a.lat !== undefined && a.lng !== undefined && { delivery_lat: a.lat, delivery_lng: a.lng }),
            offered_restaurants: a.restaurantIds.map((id) => restaurantById(id)).filter((r): r is Restaurant => !!r).map(toOffered),
          })
          .then((b) => {
            updateExtras(b.id, (e) => ({ ...e, restaurantIds: a.restaurantIds }));
            pin(b.id);
            return b.id; // the id is what the link to share is made from
          })
          .catch((e: Error) => {
            fail("Couldn't start the lunch")(e);
            throw e;
          });
      case 'check':
        return void (id && updateExtras(id, (e) => ({ ...e, checked: { ...e.checked, [a.key]: a.done } })));
      case 'handOut':
        return void (id && updateExtras(id, (e) => ({ ...e, handedOut: { ...e.handedOut, [a.userId]: a.done } })));
      case 'arrive': {
        if (!id) return;
        const arrived = { ...mine?.arrived, [a.restaurantId]: a.done };
        updateExtras(id, (e) => ({ ...e, arrived }));
        // A Swiggy order is delivered once every restaurant in it has arrived.
        const names = new Set(Object.entries(arrived).filter(([, v]) => v).map(([rid]) => restaurantById(rid)?.name));
        for (const o of board.data?.orders ?? [])
          if (o.status === 'placed' && o.restaurants.every((n) => names.has(n)))
            delivered.mutate(o.id, { onError: fail("Couldn't mark the order as arrived") });
        return;
      }
      case 'finishLunch':
        // Closed on the server, so it ends for everyone in it, not just in this browser.
        if (!id) return;
        updateExtras(id, (e) => ({ ...e, completed: true }));
        return closeLunch.mutateAsync(id).catch(fail("Couldn't close the lunch"));
      case 'setRole':
      case 'botStep':
      case 'placed':
        return; // the API decides these
      case 'updateOrg':
        return saveOrg(a.org);
      default:
        return demo.dispatch(a); // sign in and out, theme and the like
    }
  };

  // Settings change the company on the API: fields in one PATCH, addresses and invites by what was
  // added or removed. The email domain decides who can join, so it never changes from here.
  const failed = (error: unknown) =>
    toast.error("Couldn't save that", { description: error instanceof ApiError ? error.message : 'Try again.' });
  const saveOrg = (change: Partial<Org>) => {
    const s = settings.data;
    if (!s) return;
    const patch: Parameters<typeof updateCompany.mutate>[0] = {
      ...(change.name !== undefined && { name: change.name }),
      ...(change.team !== undefined && { team_name: change.team }),
      ...(change.autoJoin !== undefined && { auto_join: change.autoJoin }),
      ...(change.restaurantMode !== undefined && { restaurant_mode: change.restaurantMode }),
      ...(change.radiusKm !== undefined && { radius_km: change.radiusKm }),
      ...(change.office && { office_lat: change.office.lat, office_lng: change.office.lng }),
    };
    if (Object.keys(patch).length) updateCompany.mutate(patch, { onError: failed });
    if (change.addresses) {
      const now = new Set(change.addresses);
      for (const a of change.addresses.filter((x) => !s.addresses.some((y) => y.address === x))) addAddress.mutate(a, { onError: failed });
      for (const a of s.addresses.filter((y) => !now.has(y.address))) removeAddress.mutate(a.id, { onError: failed });
    }
    if (change.invites) {
      const invited = new Set(invites.data?.map((i) => i.email));
      const added = change.invites.filter((e) => !invited.has(e.toLowerCase()));
      if (added.length) invitePeople.mutate(added, { onError: failed });
    }
  };

  // isLoading, not isPending: a query switched off for this page is pending forever but never loading.
  if (members.isLoading || lunches.isPending || settings.isLoading || (lunch && board.isPending)) return <Connecting />;

  // The screens have two views: someone who runs lunches sees the host's, everyone else the member's.
  const can = (p: ApiPermission) => me.permissions.includes(p);
  // Someone with a public email and no party yet can start one (it is made when they start a lunch).
  const startsParties = !!me.public_email && !me.org;
  const runsLunches = HOST_PERMISSIONS.some(can) || startsParties;
  // In someone else's party you are a guest: you pick, you don't run it.
  const guest = !!lunch?.joined;

  const value: Store = {
    ...demo,
    state: {
      ...demo.state,
      role: runsLunches && !guest ? 'host' : 'member',
      session,
      picks,
      org: settings.data
        ? orgFrom(settings.data, invites.data?.filter((i) => !i.accepted).map((i) => i.email) ?? [], demo.state.org)
        : { ...demo.state.org, name: me.org?.name ?? `${firstName(me.name)}'s party`, team: me.org?.name ?? `${firstName(me.name)}'s party`, emailDomain: me.org?.email_domain ?? '' },
    },
    dispatch,
    people,
    meId: me.id,
    now,
    live: {
      lunchId: lunch?.id ?? null,
      canHost: can('session_create') || startsParties,
      personal: me.org?.kind === 'personal' || startsParties || !!me.public_email,
      lunchName: lunch?.name ?? '',
      hostName: lunch?.host.name ?? me.name,
      guest,
      place: lunch && lunch.delivery_lat != null && lunch.delivery_lng != null ? { lat: lunch.delivery_lat, lng: lunch.delivery_lng } : null,
      invite: invited ? { id: invited, joining: join.isPending, error: joinError[invited] ?? '', join: joinInvited } : null,
      canReopen: can('session_update'),
      canManageMembers: can('member_update'),
      orders: board.data?.orders ?? [],
      busy,
    },
  };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// The company as the screens know it, from GET /api/company/settings. Without an office location yet,
// restaurants are still looked up from the demo's.
function orgFrom(s: ApiCompanySettings, invites: string[], fallback: Org): Org {
  return {
    ...fallback,
    name: s.name,
    team: s.team_name || s.name,
    emailDomain: s.email_domain,
    autoJoin: s.auto_join,
    restaurantMode: s.restaurant_mode,
    radiusKm: s.radius_km,
    addresses: s.addresses.map((a) => a.address),
    invites,
    office: s.office_lat !== null && s.office_lng !== null ? { lat: s.office_lat, lng: s.office_lng } : fallback.office,
  };
}
