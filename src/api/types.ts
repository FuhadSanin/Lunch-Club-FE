// Response shapes of the Django API, as its serializers write them (snake_case, paise).

// What a person may do (GET /api/permissions describes each one).
export type ApiPermission =
  | 'session_create' | 'session_read' | 'session_update' | 'session_delete'
  | 'pick_create' | 'pick_update' | 'pick_delete'
  | 'review_create' | 'order_update' | 'restaurant_read'
  | 'member_create' | 'member_read' | 'member_update' | 'member_delete'
  | 'company_update';

// Making someone a host gives them every permission; a member gets what people get on joining.
export const ALL_PERMISSIONS: ApiPermission[] = [
  'session_create', 'session_read', 'session_update', 'session_delete',
  'pick_create', 'pick_update', 'pick_delete',
  'review_create', 'order_update', 'restaurant_read',
  'member_read', 'member_update',
];
export const MEMBER_PERMISSIONS: ApiPermission[] = ['session_read', 'pick_create', 'pick_update', 'pick_delete', 'restaurant_read', 'member_read'];
export const isHost = (p: { permissions: ApiPermission[] }) => p.permissions.includes('session_create');

// A company is shared by everyone with its email domain; a personal party belongs to one host (public
// email domains like gmail.com never share a company) and others join its lunches by link.
export type ApiOrg = { id: string; name: string; email_domain: string; kind?: 'company' | 'personal' };

export type ApiUser = { id: string; name: string; email: string; permissions: ApiPermission[] };

export type ApiMe = ApiUser & { org: ApiOrg | null; public_email?: boolean };

// GET /api/notifications: what you were told lately (the bell).
export type ApiNotification = { id: string; title: string; body: string; link: string; read: boolean; created_at: string };
export type ApiNotifications = { unread: number; items: ApiNotification[] };

// GET /api/places?q=: where a lunch can be delivered, as the person types.
export type ApiPlaceSuggestion = { place_id: string; description: string; main_text: string; secondary_text: string; lat?: number; lng?: number };
// GET /api/places/<place_id>: the chosen place with its coordinates.
export type ApiPlace = { place_id: string; address: string; lat: number; lng: number };

export type ApiAddress = { id: string; address: string };

// GET /api/company/settings: the company, its lunch defaults and office addresses.
export type ApiCompanySettings = ApiOrg & {
  team_name: string;
  auto_join: boolean;
  restaurant_mode: 'nearby' | 'manual';
  radius_km: number;
  office_lat: number | null;
  office_lng: number | null;
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
  delivery_address?: string;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  org_kind?: 'company' | 'personal';
  offered_restaurants?: ApiOffered[]; // the list the host offered, the same for everyone in the lunch
  closed_at?: string | null; // the host closed it after the food arrived: over for everyone
  joined?: boolean; // you are a guest in someone else's party
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
  swiggy_order_id: string;
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
  delivery_address: string;
  people?: (ApiPerson & { email: string })[]; // the host, then everyone who joined by link, picked or not
  items: ApiItem[];
  skipped: ApiPerson[];
  completed: ApiPerson[]; // completed their order or skipped: final until the host reopens them
  orders: ApiOrder[];
  total_paise: number;
};

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
