// Runs the signed-in app on the Django API. When /api/me answers with a company, the screens get
// today's lunch, the team and their picks from the API through TanStack Query, and their actions
// become API calls. Without an answer (no API running, or not signed in) they keep the demo data.
// The landing page always uses the demo: it sits outside this provider.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useIsMutating } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useBoard, useConfirm, useLock, useReopen, useUnlock, useSkipPerson, useLunches, useMe, useMembers, useOrderDelivered, useSavePicks, useSkip, useStartLunch, useTick,
  useAddAddress, useCloseLunch, useCompanySettings, useInvitePeople, useInvites, useJoinLunch, useRemoveAddress, useUpdateCompany,
} from '@/api/queries';
import { ApiError } from '@/api/client';
import { isDemoPreview } from '@/auth';
import { useLiveBoard } from '@/lib/live-board';
import {
  HOST_PERMISSIONS, STATUS, currentLunch, cutoffAt, firstName, fromOffered, hhmm, isActive, localDate, orgFrom, picksFrom, ticksFrom, toOffered, toPerson,
} from '@/api/adapt';
import type { ApiItemInput, ApiMe, ApiOrder, ApiPermission, ApiPerson, TickKind } from '@/api/types';
import type { Org, Restaurant, Role, Session } from '@/model';
import { rememberPeople } from '@/data/people';
import { DEMO_SESSION } from '@/data/demo';
import { dishById, rememberStubs, restaurantById } from '@/data/catalog';
import { LINK, readPin, useExtras, writePin } from '@/lib/lunch-extras';
import { StoreContext, useStore, type Action, type Live, type Store } from '@/store';
import { SetUpCompany } from '@/screens/SetUpCompany';
import { AppSkeleton } from '@/components/skeletons';
import { Button } from '@/components/ui/button';
import { useHashRoute } from '@/ui';

const NO_ORDERS: ApiOrder[] = [];

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
  // The server not answering at all, or answering that this can't be shown (a role that can't see lunches).
  const unreachable = isServerDown(error);
  return (
    <div role="alert" className="grid min-h-dvh place-items-center bg-canvas p-6 text-sm">
      <div className="grid max-w-md gap-3 text-center">
        <h1 className="text-lg font-semibold">{unreachable ? "We can't reach Lunch Board right now" : "Today's lunch didn't load"}</h1>
        <p className="text-muted-foreground">{error.message}</p>
        {unreachable && <p className="text-muted-foreground">Your picks are safe. Check your internet connection, then try again.</p>}
        {import.meta.env.DEV && unreachable && (
          <p className="text-muted-foreground">
            Developing? Start the API with <code className="font-mono">docker compose up -d db api</code>.
          </p>
        )}
        <Button className="mx-auto" onClick={onRetry}>Try again</Button>
      </div>
    </div>
  );
}

// While the app finds out who you are and what today's lunch is: its own shape, in grey.
function Connecting() {
  return <AppSkeleton label="Loading today's lunch" />;
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
    writePin(id);
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
  useLiveBoard(lunch?.id);
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
  const tick = useTick();
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

  const { picks, restaurantNames } = useMemo(() => (board.data ? picksFrom(board.data) : { picks: {}, restaurantNames: {} }), [board.data]);

  const session = useMemo<Session>(() => {
    const b = board.data;
    if (!b) return { ...DEMO_SESSION, id: 'none', restaurantIds: [], bot: [], handedOut: {}, checked: {} };
    const placed = b.orders.map((o) => o.platform_order_id).filter(Boolean);
    // The lunch carries the list the host offered; older lunches only had it in the host's browser.
    if (b.offered_restaurants?.length) rememberStubs(b.offered_restaurants.map(fromOffered)); // so every browser can show them
    const offered = b.offered_restaurants?.length ? b.offered_restaurants.map((r) => r.id) : (mine?.restaurantIds ?? []);
    return {
      id: b.id,
      title: 'Lunch',
      date: localDate(new Date(b.cutoff_at)),
      cutoff: hhmm(new Date(b.cutoff_at)),
      address: b.address?.address ?? '', // a board saved before addresses had their own table has none
      restaurantIds: offered,
      hostId: b.host.id,
      status: STATUS[b.status],
      orderRef: placed.length ? placed.map((id) => `#${id}`).join(', ') : null,
      bot: [],
      ...ticksFrom(b, restaurantNames),
      completed: !!mine?.completed,
    };
  }, [board.data, restaurantNames, mine]);

  const fail = (what: string) => (e: Error) => toast.error(what, { description: e.message });
  // Resolves once the API has saved the tick; rejects (after saying why) if it refused.
  const saveTick = (kind: TickKind, key: string | undefined, done: boolean): Promise<unknown> => {
    if (!lunch || !key) return Promise.resolve();
    return tick.mutateAsync({ lunchId: lunch.id, kind, key, done }).catch((e: Error) => {
      fail("Couldn't save that")(e);
      throw e;
    });
  };

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
        // Completing: the cart goes on the board and becomes final in one request. It resolves only when the
        // API has said yes, so nothing is celebrated (or shown as complete) before that.
        if (!id) {
          const none = new Error('There is no lunch to complete your order in. Refresh and try again.');
          fail("Couldn't complete your order")(none);
          return Promise.reject(none);
        }
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
            address: { address: a.address, ...(a.lat !== undefined && a.lng !== undefined && { lat: a.lat, lng: a.lng }) },
            ...(a.name?.trim() && { name: a.name.trim() }),
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
      // The host's ticks are kept on the lunch, so every device and a second host see them.
      case 'check': {
        // "r:<restaurant id>" or "p:<person id>"
        const [of, key] = [a.key.slice(0, 1), a.key.slice(2)];
        return of === 'p' ? saveTick('reviewed_person', key, a.done) : saveTick('reviewed_restaurant', restaurantNames[key], a.done);
      }
      case 'handOut':
        return saveTick('handed_out', a.userId, a.done);
      case 'arrive': {
        const name = restaurantNames[a.restaurantId];
        // An order is delivered once every restaurant in it has arrived.
        const arrived = new Set(board.data?.arrived_restaurants);
        if (a.done) arrived.add(name);
        else arrived.delete(name);
        const nowDelivered = (board.data?.orders ?? []).filter((o) => o.status === 'placed' && o.restaurants.every((n) => arrived.has(n)));
        return saveTick('arrived', name, a.done).then(() =>
          Promise.all(
            nowDelivered.map((o) =>
              delivered.mutateAsync(o.id).catch((e: Error) => {
                fail("Couldn't mark the order as arrived")(e);
                throw e;
              }),
            ),
          ),
        );
      }
      case 'finishLunch':
        // Closed on the server, so it ends for everyone in it, not just in this browser.
        if (!id) return;
        return closeLunch.mutateAsync(id).then(
          () => updateExtras(id, (e) => ({ ...e, completed: true })), // off Today's lunch at once, only once it really closed
          (e: Error) => {
            fail("Couldn't close the lunch")(e);
            throw e;
          },
        );
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
  // Resolves once everything is saved; rejects (after saying why) if any part was refused.
  const saveOrg = (change: Partial<Org>): Promise<unknown> => {
    const s = settings.data;
    if (!s) return Promise.resolve();
    const saving: Promise<unknown>[] = [];
    const patch: Parameters<typeof updateCompany.mutate>[0] = {
      ...(change.name !== undefined && { name: change.name }),
      ...(change.team !== undefined && { team_name: change.team }),
      ...(change.autoJoin !== undefined && { auto_join: change.autoJoin }),
    };
    if (Object.keys(patch).length) saving.push(updateCompany.mutateAsync(patch));
    if (change.addresses) {
      const now = new Set(change.addresses);
      for (const a of change.addresses.filter((x) => !s.addresses.some((y) => y.address === x))) saving.push(addAddress.mutateAsync({ address: a, ...change.places?.[a] }));
      for (const a of s.addresses.filter((y) => !now.has(y.address))) saving.push(removeAddress.mutateAsync(a.id));
    }
    if (change.invites) {
      const invited = new Set(invites.data?.map((i) => i.email));
      const added = change.invites.filter((e) => !invited.has(e.toLowerCase()));
      if (added.length) saving.push(invitePeople.mutateAsync(added));
    }
    return Promise.all(saving).catch((e: unknown) => {
      failed(e);
      throw e;
    });
  };

  // The screens have two views: someone who runs lunches sees the host's, everyone else the member's.
  const can = (p: ApiPermission) => me.permissions.includes(p);
  // Someone with a public email and no party yet can start one (it is made when they start a lunch).
  const startsParties = !!me.public_email && !me.org;
  const runsLunches = HOST_PERMISSIONS.some(can) || startsParties;
  // In someone else's party you are a guest: you pick, you don't run it.
  const guest = !!lunch?.joined;
  const role: Role = runsLunches && !guest ? 'host' : 'member';

  // Every screen that calls useStore() draws again when the store's value changes. So each part below is
  // kept as it is until something in it really changes, and the two functions are the same ones for the
  // whole life of the page (they call whatever the latest render made).
  const latest = useRef({ dispatch, joinInvited });
  useEffect(() => {
    latest.current = { dispatch, joinInvited };
  });
  const stableDispatch = useCallback((a: Action) => latest.current.dispatch(a), []);
  const stableJoin = useCallback(() => latest.current.joinInvited(), []);

  const pendingInvites = invites.data;
  const org = useMemo<Org>(() => {
    const party = me.org?.name ?? `${firstName(me.name)}'s party`;
    return settings.data
      ? orgFrom(settings.data, pendingInvites?.filter((i) => !i.accepted).map((i) => i.email) ?? [], demo.state.org)
      : { ...demo.state.org, name: party, team: party, emailDomain: me.org?.email_domain ?? '' };
  }, [settings.data, pendingInvites, demo.state.org, me.org, me.name]);
  const state = useMemo(() => ({ ...demo.state, role, session, picks, org }), [demo.state, role, session, picks, org]);

  const lat = lunch?.address?.lat ?? null;
  const lng = lunch?.address?.lng ?? null;
  const joinProblem = invited ? (joinError[invited] ?? '') : '';
  const orders = board.data?.orders ?? NO_ORDERS;
  const live = useMemo<Live>(
    () => ({
      lunchId: lunch?.id ?? null,
      canHost: me.permissions.includes('session_create') || startsParties,
      personal: me.org?.kind === 'personal' || startsParties || !!me.public_email,
      lunchName: lunch?.name ?? '',
      hostName: lunch?.host.name ?? me.name,
      guest,
      place: lat !== null && lng !== null ? { lat, lng } : null,
      invite: invited ? { id: invited, joining: join.isPending, error: joinProblem, join: stableJoin } : null,
      canReopen: me.permissions.includes('session_update'),
      canManageMembers: me.permissions.includes('member_update'),
      orders,
      busy,
    }),
    [lunch?.id, lunch?.name, lunch?.host.name, me, startsParties, guest, lat, lng, invited, join.isPending, joinProblem, stableJoin, orders, busy],
  );
  const value = useMemo<Store>(
    () => ({ ...demo, state, dispatch: stableDispatch, people, meId: me.id, now, live }),
    [demo, state, stableDispatch, people, me.id, now, live],
  );

  // The list of lunches, or today's lunch, didn't load: say so, instead of showing "no lunch today".
  const unloaded = lunches.isError ? lunches : lunch && board.isError && !board.data ? board : null;
  if (unloaded?.error) return <ServerDown error={unloaded.error} onRetry={() => void unloaded.refetch()} />;
  // isLoading, not isPending: a query switched off for this page is pending forever but never loading.
  if (members.isLoading || lunches.isPending || settings.isLoading || (lunch && board.isPending)) return <Connecting />;
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
