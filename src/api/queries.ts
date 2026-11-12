import { QueryClient, keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from './client';
import type { ApiPlace, ApiPlaceSuggestion, ApiAddress, ApiBoard, ApiBotStatus, ApiCompanySettings, ApiDish, ApiInvite, ApiItemInput, ApiLunch, ApiMe, ApiMenu, ApiOffered, ApiOrg, ApiPermission, ApiPerson, ApiRestaurant, ApiUser } from './types';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      // No refetch every time the tab or DevTools regains focus: changes come from the actions here
      // (which update the cache) and the slow polls below.
      refetchOnWindowFocus: false,
      // A 4xx will answer the same way again; only network and server trouble is worth a retry.
      retry: (count, error) => count < 2 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
    },
    mutations: { retry: false },
  },
});

type Place = { lat: number; lng: number };

export const keys = {
  me: ['me'] as const,
  settings: ['company', 'settings'] as const,
  invites: ['company', 'invites'] as const,
  members: ['company', 'members'] as const,
  lunches: ['lunches'] as const,
  board: (id: string) => ['lunches', id] as const,
  restaurants: (place: Place, q: string) => ['restaurants', place.lat, place.lng, q] as const,
  menu: (id: string, place: Place) => ['menu', id, place.lat, place.lng] as const,
  dishes: (place: Place, q: string) => ['dishes', place.lat, place.lng, q] as const,
};

// ---------- reads ----------
// Queries don't pass an abort signal: if they did, React's development double mount would cancel
// every first request (red rows in the Network tab). Without it, the remount reuses the request in flight.

// Is the order bot ready (Chrome listening, Playwright installed...)? Hosts only; checked every few
// seconds so it turns green as soon as Chrome is started.
export const useBotStatus = () =>
  useQuery({ queryKey: ['bot-status'], queryFn: () => api<ApiBotStatus>('bot/status'), retry: false, refetchInterval: 5000 });

// Who is signed in. Fails fast: without an answer the app runs on its demo data.
export const useMe = () =>
  useQuery({ queryKey: keys.me, queryFn: () => api<ApiMe>('me'), retry: false, staleTime: 5 * 60_000 });

export const useMembers = (enabled = true) =>
  useQuery({ queryKey: keys.members, queryFn: () => api<ApiUser[]>('company/members'), enabled, staleTime: 5 * 60_000 });

// Nothing pushes changes to the browser yet (the Firestore board is off locally), so a lunch that is
// still running is polled, slowly. The Firestore listener replaces this once it's on.
const MOVING = new Set(['open', 'locked', 'confirmed', 'placed']);

export const useLunches = (enabled = true) =>
  useQuery({
    queryKey: keys.lunches,
    queryFn: () => api<ApiLunch[]>('lunches'),
    enabled,
    // Only while no lunch is running, so a lunch someone else starts shows up without a reload. During a
    // lunch the list doesn't change except through the actions here, which refresh it themselves.
    refetchInterval: (q) => (q.state.data && !q.state.data.some((l) => MOVING.has(l.status)) ? 30_000 : false),
  });

export const useBoard = (id: string | undefined) =>
  useQuery({
    queryKey: keys.board(id ?? 'none'),
    queryFn: () => api<ApiBoard>(`lunches/${id}`),
    enabled: !!id,
    refetchInterval: (q) => (q.state.data && MOVING.has(q.state.data.status) ? 15_000 : false),
  });

export const useRestaurantsQuery = (place: Place, q: string, enabled: boolean) =>
  useQuery({
    queryKey: keys.restaurants(place, q),
    queryFn: () =>
      api<{ restaurants: ApiRestaurant[] }>('restaurants', { params: { lat: place.lat, lng: place.lng, q: q || undefined } }),
    enabled,
    staleTime: 5 * 60_000, // the API caches Swiggy for ten minutes too
    placeholderData: keepPreviousData,
  });

export const useMenuQuery = (id: string, place: Place, enabled: boolean) =>
  useQuery({
    queryKey: keys.menu(id, place),
    queryFn: () => api<ApiMenu>(`restaurants/${id}/menu`, { params: { lat: place.lat, lng: place.lng } }),
    enabled,
    staleTime: 5 * 60_000,
  });

// Dishes by name across Swiggy near a place, each with its restaurant (two letters or more).
export const useDishesQuery = (place: Place, q: string, enabled: boolean) =>
  useQuery({
    queryKey: keys.dishes(place, q),
    queryFn: () => api<{ dishes: ApiDish[] }>('dishes', { params: { lat: place.lat, lng: place.lng, q } }),
    enabled,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });

// ---------- writes ----------

// The lunch list follows a board the API sent back: its status, or a new lunch at the top. Patched in
// the cache rather than fetched again.
function patchLunches(qc: QueryClient, board: ApiBoard) {
  qc.setQueryData<ApiLunch[]>(keys.lunches, (list) => {
    if (!list) return list;
    const { id, host, cutoff_at, status, created_at, name, delivery_address, delivery_lat, delivery_lng, org_kind, joined } = board;
    const lunch = { id, host, cutoff_at, status, created_at, name, delivery_address, delivery_lat, delivery_lng, org_kind, joined };
    return list.some((l) => l.id === id) ? list.map((l) => (l.id === id ? lunch : l)) : [lunch, ...list];
  });
}

// Actions that answer with the whole board put it straight into the cache: no second request.
function useBoardAction<V>(request: (v: V) => Promise<ApiBoard>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: (board) => {
      qc.setQueryData(keys.board(board.id), board);
      patchLunches(qc, board);
    },
  });
}

export const useStartLunch = () =>
  useBoardAction((v: { cutoff_at: string; delivery_address: string; name?: string; delivery_lat?: number; delivery_lng?: number; offered_restaurants?: ApiOffered[] }) =>
    api<ApiBoard>('lunches', { method: 'POST', body: v }));

// Opening a lunch's shared link: join it as a guest (or just open it, if it is in your own company).
export const useJoinLunch = () => useBoardAction((id: string) => api<ApiBoard>(`lunches/${id}/join`, { method: 'POST' }));

// Leave a party joined by its link; its picks are dropped and it leaves your list.
export const useLeaveLunch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`lunches/${id}/join`, { method: 'DELETE' }),
    onSuccess: (_none, id) => {
      qc.setQueryData<ApiLunch[]>(keys.lunches, (list) => list?.filter((l) => l.id !== id));
      qc.removeQueries({ queryKey: keys.board(id), exact: true });
    },
  });
};

// Place suggestions as the host types a delivery address (two letters or more), nearest to `near` first.
export const usePlaceSuggestions = (text: string, near?: Place) =>
  useQuery({
    queryKey: ['places', text, near?.lat.toFixed(1), near?.lng.toFixed(1)],
    queryFn: () => api<ApiPlaceSuggestion[]>('places', { params: { q: text, lat: near?.lat, lng: near?.lng } }),
    enabled: text.length >= 2,
    staleTime: 10 * 60_000,
    retry: false,
    placeholderData: keepPreviousData,
  });

export const fetchPlace = (placeId: string) => api<ApiPlace>(`places/${encodeURIComponent(placeId)}`);

export const useLock = () => useBoardAction((id: string) => api<ApiBoard>(`lunches/${id}/lock`, { method: 'POST' }));

// Reopens locked picks before the order goes out; a cutoff that has passed moves 30 minutes ahead.
export const useUnlock = () => useBoardAction((id: string) => api<ApiBoard>(`lunches/${id}/unlock`, { method: 'POST' }));

// The host ends a lunch whose food has arrived; it then drops off everyone's Today's lunch.
export const useCloseLunch = () => useBoardAction((id: string) => api<ApiBoard>(`lunches/${id}/close`, { method: 'POST' }));

export const useCancel = () => useBoardAction((id: string) => api<ApiBoard>(`lunches/${id}/cancel`, { method: 'POST' }));

export const useConfirm = () => useBoardAction((id: string) => api<ApiBoard>(`lunches/${id}/confirm`, { method: 'POST' }));

export const useOrderPlaced = () =>
  useBoardAction((v: { orderId: string; swiggyOrderId: string }) =>
    api<ApiBoard>(`orders/${v.orderId}/placed`, { method: 'POST', body: { swiggy_order_id: v.swiggyOrderId } }),
  );

// The host marks someone as skipping today (final until reopened).
export const useSkipPerson = () =>
  useBoardAction((v: { lunchId: string; userId: string }) => api<ApiBoard>(`lunches/${v.lunchId}/skip/${v.userId}`, { method: 'PUT' }));

// The host lets someone who completed their order, or skipped, pick again.
export const useReopen = () =>
  useBoardAction((v: { lunchId: string; userId: string }) => api<ApiBoard>(`lunches/${v.lunchId}/complete/${v.userId}`, { method: 'DELETE' }));

// Make someone a host (every permission) or a member again.
export function useSetPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { userId: string; permissions: ApiPermission[] }) =>
      api<ApiUser>(`company/members/${v.userId}/permissions`, { method: 'PUT', body: { permissions: v.permissions } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.members });
      qc.invalidateQueries({ queryKey: keys.me });
    },
  });
}

// Asks the order bot to try an order again, e.g. after logging in to Swiggy again.
export const useOrderRetry = () =>
  useBoardAction((orderId: string) => api<ApiBoard>(`orders/${orderId}/retry`, { method: 'POST' }));

export const useOrderDelivered = () =>
  useBoardAction((orderId: string) => api<ApiBoard>(`orders/${orderId}/delivered`, { method: 'POST' }));

// Shows a change on the board at once and rolls it back if the API says no.
function optimistic(qc: QueryClient, lunchId: string, change: (board: ApiBoard) => ApiBoard) {
  return async () => {
    await qc.cancelQueries({ queryKey: keys.board(lunchId) });
    const before = qc.getQueryData<ApiBoard>(keys.board(lunchId));
    if (before) qc.setQueryData(keys.board(lunchId), change(before));
    return { before };
  };
}

// Saves my whole cart, and completes it if asked, in one request (PUT /api/lunches/<id>/picks). The
// board shows it at once; the API's answer replaces that, and a refusal rolls it back.
export function useSavePicks(lunchId: string | undefined, me: ApiPerson | undefined) {
  const qc = useQueryClient();
  const id = lunchId ?? 'none';
  return useMutation({
    mutationFn: (v: { items: ApiItemInput[]; complete: boolean }) => api<ApiBoard>(`lunches/${id}/picks`, { method: 'PUT', body: v }),
    onMutate: (v) =>
      optimistic(qc, id, (b) => ({
        ...b,
        items: [...b.items.filter((i) => i.user.id !== me?.id), ...v.items.map((i, n) => ({ ...i, id: `pending-${n}`, user: me! }))],
        skipped: b.skipped.filter((p) => p.id !== me?.id),
        completed: v.complete ? [...(b.completed ?? []).filter((p) => p.id !== me?.id), me!] : b.completed,
      }))(),
    onSuccess: (board) => qc.setQueryData(keys.board(id), board),
    onError: (_e, _v, ctx) => ctx?.before && qc.setQueryData(keys.board(id), ctx.before),
  });
}

// Skips today. The API answers with the board, which goes straight into the cache.
export function useSkip(lunchId: string | undefined, me: ApiPerson | undefined) {
  const qc = useQueryClient();
  const id = lunchId ?? 'none';
  return useMutation({
    mutationFn: () => api<ApiBoard>(`lunches/${id}/skip`, { method: 'PUT' }),
    onMutate: optimistic(qc, id, (b) => ({
      ...b,
      items: b.items.filter((i) => i.user.id !== me?.id),
      skipped: [...b.skipped.filter((p) => p.id !== me?.id), me!],
      completed: [...(b.completed ?? []).filter((p) => p.id !== me?.id), me!], // skipping is final
    })),
    onSuccess: (board) => qc.setQueryData(keys.board(id), board),
    onError: (_e, _v, ctx) => ctx?.before && qc.setQueryData(keys.board(id), ctx.before),
  });
}

// The first person from a work email domain sets up its company; they get every permission and
// teammates from the same domain join it when they sign in.
export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api<ApiOrg>('company', { method: 'POST', body: { name } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.me }),
  });
}

// Settings: the company, its lunch defaults, office addresses and invites.
export const useCompanySettings = (enabled = true) =>
  useQuery({ queryKey: keys.settings, queryFn: () => api<ApiCompanySettings>('company/settings'), enabled, staleTime: 5 * 60_000 });

export const useInvites = (enabled: boolean) =>
  useQuery({ queryKey: keys.invites, queryFn: () => api<ApiInvite[]>('company/invites'), enabled, staleTime: 5 * 60_000 });

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (change: Partial<Omit<ApiCompanySettings, 'id' | 'email_domain' | 'addresses'>>) =>
      api<ApiCompanySettings>('company/settings', { method: 'PATCH', body: change }),
    onSuccess: (settings) => {
      qc.setQueryData(keys.settings, settings);
      qc.invalidateQueries({ queryKey: keys.me }); // the company's name shows there too
    },
  });
}

export function useAddAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (address: string) => api<ApiAddress>('company/addresses', { method: 'POST', body: { address } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.settings }),
  });
}

export function useRemoveAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`company/addresses/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.settings }),
  });
}

export function useInvitePeople() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (emails: string[]) => api<ApiInvite[]>('company/invites', { method: 'POST', body: { emails } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.invites }),
  });
}
