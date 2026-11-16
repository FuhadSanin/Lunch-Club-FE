// Response shapes of the Django API, as its serializers write them (snake_case, paise).

// What a person may do (GET /api/permissions describes each one).
export type ApiPermission =
  | 'session_create' | 'session_read' | 'session_update' | 'session_delete'
  | 'pick_create' | 'pick_update' | 'pick_delete'
  | 'review_create' | 'order_update' | 'restaurant_read'
  | 'member_create' | 'member_read' | 'member_update' | 'member_delete'
  | 'company_update';

// Permissions come from roles: Host (every permission) and Member (picking food) are in every company,
// and people who can manage roles make others (GET /api/company/roles).
export const HOST_ROLE = 'Host';
export const MEMBER_ROLE = 'Member';
export type ApiRole = { id: string; name: string; system: boolean; permissions: ApiPermission[]; members: number };
export const isHost = (p: { permissions: ApiPermission[] }) => p.permissions.includes('session_create');

// A company is shared by everyone with its email domain; a personal party belongs to one host (public
// email domains like gmail.com never share a company) and others join its lunches by link.
export type ApiOrg = { id: string; name: string; email_domain: string; kind?: 'company' | 'personal' };

export type ApiUser = { id: string; name: string; email: string; roles: { id: string; name: string }[]; permissions: ApiPermission[] };

export type ApiMe = ApiUser & { org: ApiOrg | null; public_email?: boolean };

// GET /api/notifications: what you were told lately (the bell).
export type ApiNotification = { id: string; title: string; body: string; read: boolean; created_at: string };
export type ApiNotifications = { unread: number; items: ApiNotification[] };

// GET /api/me/tokens: the AI assistants connected to your account (MCP). `name` is the assistant's own name. DELETE
// /api/me/tokens/<id> disconnects one, refresh token included. There is no way to make one by hand: assistants sign in.
export type ApiConnection = { id: string; name: string; prefix: string; created_at: string; last_used_at: string | null; expires_at: string | null };

// An AI assistant asking to connect by sign-in (OAuth): GET /api/oauth/requests/<id>.
export type ApiOAuthRequest = { client_name: string; redirect_host: string; expires_at: string };
// POST .../approve or .../deny: where to send the browser next (back to the assistant).
export type ApiOAuthDecision = { redirect_to: string };

// GET /api/places?q=: where a lunch can be delivered, as the person types.
export type ApiPlaceSuggestion = { place_id: string; description: string; main_text: string; secondary_text: string; lat?: number; lng?: number };
// GET /api/places/<place_id>: the chosen place with its coordinates.
export type ApiPlace = { place_id: string; address: string; lat: number; lng: number };

// Every address lives in one table: a lunch points at its address, and the company's saved ones are the list
// hosts choose from. `lat`/`lng` are there when it was picked from the place suggestions.
export type ApiAddress = { id: string; address: string; lat: number | null; lng: number | null };

// GET /api/company/settings: the company, its lunch defaults and saved addresses.
export type ApiCompanySettings = ApiOrg & {
  team_name: string;
  auto_join: boolean;
  addresses: ApiAddress[];
};

export type ApiInvite = { id: string; email: string; invited_by: string | null; accepted: boolean; created_at: string };

export type ApiPerson = { id: string; name: string };

export type ApiLunchStatus = 'open' | 'locked' | 'confirmed' | 'placed' | 'delivered' | 'cancelled';

export type ApiLunch = {
  id: string;
  host: ApiPerson;
  cutoff_at: string; // ISO
  status: ApiLunchStatus;
  created_at: string;
  name?: string; // what the host called this lunch
  address?: ApiAddress; // where the food is delivered
  org_kind?: 'company' | 'personal';
  offered_restaurants?: ApiOffered[]; // the list the host offered, the same for everyone in the lunch
  closed_at?: string | null; // the host closed it after the food arrived: over for everyone
  joined?: boolean; // you are a guest in someone else's party
  joining_open?: boolean; // the host lets new people join with the link (default true)
};

// A restaurant on a lunch's list, as Swiggy showed it to the host (no menu).
export type ApiOffered = { id: string; name: string; area?: string; cuisines?: string[]; rating?: number; eta?: string; distance_km?: number; photo?: string };

export type ApiItem = {
  id: string;
  user: ApiPerson;
  restaurant_name: string;
  restaurant_id: string; // Swiggy's id; empty when unknown
  dish_name: string;
  quantity: number;
  price_paise: number;
  note: string;
};

export type ApiItemInput = Omit<ApiItem, 'id' | 'user'>;

export type ApiOrderStatus = 'pending' | 'placing' | 'needs_host' | 'placed' | 'delivered';

// One checkpoint of the order bot: what it does, why, and how it went (or why it failed).
export type ApiBotStep = {
  key: string;
  label: string;
  why: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  detail: string;
};

export type ApiOrder = {
  id: string;
  status: ApiOrderStatus;
  platform_order_id: string; // the number the ordering platform (Swiggy) gave it
  restaurants: string[];
  carts: ApiCart[];
  restaurant_count: number;
  total_paise: number;
  placed_at: string | null;
  last_error: string;
  bot_steps: ApiBotStep[];
};

// What to add in the Swiggy app for one restaurant of a checkout.
export type ApiCart = {
  restaurant_name: string;
  restaurant_id: string;
  swiggy_url: string;
  dishes: { name: string; quantity: number; people: string[] }[];
  cooking_note: string; // one "Name - food" line per person
  total_paise: number;
};

// GET /api/lunches/<id>: the full board.
export type ApiBoard = ApiLunch & {
  address: ApiAddress;
  people?: (ApiPerson & { email: string })[]; // the host, then everyone who joined by link, picked or not
  items: ApiItem[];
  skipped: ApiPerson[];
  completed: ApiPerson[]; // completed their order or skipped: final until the host reopens them
  orders: ApiOrder[];
  total_paise: number;
  // The host's ticks while running the lunch, kept on the lunch so every device shows the same.
  // Restaurants by the name people picked from, people by their id.
  reviewed_restaurants?: string[];
  reviewed_people?: string[];
  arrived_restaurants?: string[];
  handed_out_people?: string[];
};

// PUT /api/lunches/<id>/ticks: what the host can tick, and the list on the board that keeps each.
export const TICK_LIST = {
  reviewed_restaurant: 'reviewed_restaurants',
  reviewed_person: 'reviewed_people',
  arrived: 'arrived_restaurants',
  handed_out: 'handed_out_people',
} as const;
export type TickKind = keyof typeof TICK_LIST;

export type ApiRestaurant = {
  id: string;
  name: string;
  area: string | null;
  cuisines: string[];
  rating: number | string | null;
  delivery_time: string | null;
  distance_km: number | null;
  open: boolean | null;
  image_url: string | null;
};

export type ApiMenuItem = {
  id: string;
  name: string;
  price_paise: number | null;
  veg: boolean;
  description: string | null;
  in_stock: boolean;
  image_url: string | null;
};

export type ApiMenu = { restaurant: ApiRestaurant; categories: { name: string; items: ApiMenuItem[] }[] };

// GET /api/dishes: a dish from a search, with the restaurant that serves it.
export type ApiDish = {
  id: string;
  name: string;
  price_paise: number | null;
  veg: boolean;
  in_stock: boolean;
  image_url: string | null;
  restaurant: ApiRestaurant;
};

// Is the order bot ready? Each prerequisite, with the command that fixes it if it isn't.
export type ApiBotCheck = { key: string; label: string; why: string; ok: boolean; detail: string; fix: string };
export type ApiBotCommand = { title: string; why: string; command: string; note?: string };
export type ApiBotStatus = { ready: boolean; checks: ApiBotCheck[]; commands: ApiBotCommand[] };
