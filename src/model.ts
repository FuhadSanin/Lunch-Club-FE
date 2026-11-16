// The shapes every screen works with: people, restaurants and dishes, picks, the lunch, the company.
// The demo fills them from sample data (src/data/demo.ts, menus.ts); signed in, src/api/adapt.ts fills
// them from the API. Types only: nothing here runs.

// ---------- people ----------

// Two roles: team members pick lunch; the host starts lunches, places the order and manages the company.
export type Role = 'member' | 'host';

export type Person = {
  id: string;
  name: string;
  email: string;
  hue: number; // stable identity tint, not data
};

// ---------- restaurants and dishes ----------

export type Dish = {
  id: string;
  name: string;
  price: number; // rupees
  veg: boolean;
  desc?: string;
  inStock?: boolean;
  photo?: string; // URL of the dish photo; screens fall back to a placeholder until menus carry one
};

export type Category = { name: string; dishes: Dish[] };

export type Restaurant = {
  id: string; // Swiggy restaurant id
  name: string;
  area?: string;
  cuisines?: string[];
  rating?: number;
  eta?: string;
  distanceKm?: number;
  photo?: string; // URL of the restaurant's photo; placeholder until set
  open?: boolean; // live restaurants only: whether Swiggy shows it open now
  categories: Category[];
};

// ---------- picks, the lunch and the company ----------

export type PickLine = { dishId: string; qty: number };

export type Pick = {
  items: PickLine[];
  note: string;
  skipped: boolean;
  updatedAt: string; // HH:MM, demo clock
  // Completed the order or skipped: final until the host reopens it.
  done?: boolean;
};

export type BotStep = { at: string; text: string };

export type SessionStatus = 'open' | 'locked' | 'placing' | 'placed' | 'delivered';

export type Session = {
  id: string;
  title: string;
  date: string; // ISO date
  cutoff: string; // HH:MM
  address: string;
  restaurantIds: string[];
  hostId: string;
  status: SessionStatus;
  orderRef: string | null;
  bot: BotStep[];
  handedOut: Record<string, boolean>;
  // The host's review: "r:<restaurant id>" once its dishes are in the Swiggy cart, "p:<person id>" once that
  // person's order is checked. Done cards collapse.
  checked?: Record<string, boolean>;
  arrived?: Record<string, boolean>; // restaurant id → its food has been collected
  completed?: boolean; // the host closed the lunch after handing everything out
};

export type RestaurantMode = 'nearby' | 'manual';

export type Org = {
  name: string;
  team: string;
  emailDomain: string;
  autoJoin: boolean;
  addresses: string[];
  invites: string[];
  restaurantMode: RestaurantMode; // how a new lunch chooses its restaurants by default
  radiusKm: number; // "nearby": offer restaurants within this distance of the office
  office: { lat: number; lng: number }; // where Swiggy restaurants and menus are looked up from
  places?: Record<string, { lat: number; lng: number }>; // where each saved address is, when known (the API's)
};
