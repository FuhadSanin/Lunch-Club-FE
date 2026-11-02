import { useSyncExternalStore } from 'react';

// Sample menus taken from the proof of concept's saved Swiggy data (menus/263840.json and
// the dishes people picked in order_state.json). Prices are in rupees as Swiggy listed them.
// Replace with live menus from the order bot (now) or the Swiggy MCP (later). Areas, ratings, ETAs
// and distances from the office (Infopark Phase 2, Kakkanad) are sample values except Lunchbox's.

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

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const d = (rid: string, name: string, price: number, veg: boolean, desc?: string): Dish => ({
  id: `${rid}:${slug(name)}`,
  name,
  price,
  veg,
  desc,
  inStock: true,
});

const L = '263840';
const lunchbox: Restaurant = {
  id: L,
  name: 'Veg Meals By Lunchbox',
  area: 'Chittethukara',
  cuisines: ['Biryani', 'North Indian'],
  rating: 4.3,
  eta: '30–35 min',
  distanceKm: 2.7,
  categories: [
    {
      name: 'Recommended',
      dishes: [
        d(L, 'Dal Makhani & Laccha Paratha Lunchbox', 240, true, 'Slow-cooked dal makhani and buttery laccha paratha.'),
        d(L, 'Palak Paneer & Laccha Paratha Lunchbox', 320, true, 'Creamy palak paneer with soft, buttery laccha paratha.'),
        d(L, 'Rajma & Laccha Paratha Lunchbox', 240, true, 'Homestyle rajma curry with warm, flaky laccha paratha.'),
        d(L, 'Tandoori Soya Chaap & Laccha Paratha Lunchbox', 280, true, 'Smoky tandoori soya chaap with flaky laccha paratha.'),
        d(L, 'Pindi Chole & Laccha Paratha Lunchbox', 240, true, 'Bold, spiced Pindi chole with warm laccha paratha.'),
        d(L, 'Paneer Tikka Masala & Laccha Paratha Lunchbox', 320, true, 'Charred paneer tikka in a rich masala gravy.'),
        d(L, 'Rajma & Rumali Roti Lunchbox', 260, true, 'Rajma masala with soft rumali rotis.'),
        d(L, 'Dal Makhani & Rumali Roti Lunchbox', 250, true, 'Rich, creamy dal makhani with rumali rotis.'),
      ],
    },
    {
      name: 'Executive lunchbox',
      dishes: [
        d(L, 'Paneer Tikka Masala Jumbo Lunchbox', 480, true, 'Paneer tikka gravy, parathas, dal makhani, rice and gulab jamun.'),
        d(L, 'Palak Paneer Jumbo Lunchbox', 410, true, 'Palak paneer, parathas, dal makhani, rice and gulab jamun.'),
        d(L, 'Tandoori Soya Chaap Jumbo Lunchbox', 405, true, 'Tandoori chaap, dal makhani, parathas and rice.'),
      ],
    },
    {
      name: 'Khichdi',
      dishes: [
        d(L, 'Palak Paneer Khichdi', 400, true, 'Moong dal khichdi with spinach and soft paneer.'),
        d(L, 'Masala Khichdi Bowl', 300, true, 'Dal khichdi with a spicy masala tadka.'),
        d(L, 'Dal Khichdi Bowl', 300, true, 'Rice and lentils with cumin and turmeric.'),
      ],
    },
    {
      name: 'Rice lunchbox',
      dishes: [
        d(L, 'Dal Makhani & Rice Lunchbox', 220, true, 'Creamy dal makhani with rice.'),
        d(L, 'Rajma Chawal Lunchbox', 230, true, 'Home-style rajma in a mildly spiced tomato gravy, with rice.'),
        d(L, 'Paneer Tikka Masala Rice Lunchbox', 310, true, 'Paneer tikka masala gravy with flavourful rice.'),
        d(L, 'Palak Paneer Rice Lunchbox', 310, true, 'Palak paneer with a side of rice.'),
      ],
    },
    {
      name: 'Upvas specials',
      dishes: [
        d(L, 'Sabudana Khichdi & Curd Meal', 260, true, 'No onion, no garlic. Sabudana khichdi with curd.'),
        d(L, 'Sabudana Vada (4 pcs) & Green Chutney', 150, true, 'Crispy sabudana vadas with green chutney.'),
        d(L, 'Vrat Aloo Pattice (4 pcs) & Green Chutney', 160, true, 'Crispy vrat aloo pattice with green chutney.'),
      ],
    },
  ],
};

type Meta = Pick<Restaurant, 'area' | 'cuisines' | 'rating' | 'eta' | 'distanceKm' | 'photo'>;

const single = (id: string, name: string, meta: Meta, dishes: [string, number, boolean][]): Restaurant => ({
  id,
  name,
  ...meta,
  categories: [{ name: 'Popular with the team', dishes: dishes.map(([n, p, v]) => d(id, n, p, v)) }],
});

// Well-known chains, with sample menus and prices (typical, not copied from Swiggy). Their dishes
// show the restaurant's photo until the menus carry dish photos.
const chain = (id: string, name: string, meta: Meta & { photo: string }, dishes: [string, number, boolean, string?][]): Restaurant => ({
  id,
  name,
  ...meta,
  categories: [{ name: 'Popular', dishes: dishes.map(([n, p, v, desc]) => ({ ...d(id, n, p, v, desc), photo: meta.photo })) }],
});

const photo = (slug: string) => `/photos/restaurants/${slug}.jpg`;

export const RESTAURANTS: Restaurant[] = [
  lunchbox,
  single('629125', 'Taquitos Restaurant', { area: 'Kakkanad', cuisines: ['Mexican'], rating: 4.2, eta: '20–25 min', distanceKm: 1.4 }, [
    ['Crunchy Chicken Rice Bowl (regular)', 379, false],
    ['Classic Chicken Rice Bowl (regular)', 379, false],
    ['Grilled Barbeque Chicken Burrito (regular)', 379, false],
    ['Grilled Barbeque Paneer Burrito (regular)', 379, true],
    ['Barbeque Paneer Rice Bowl (regular)', 379, true],
    ['Classic Chicken Quesadilla', 289, false],
    ['Crunchy Chicken Salad (regular)', 386, false],
    ['Passionfruit Lemonade', 79, true],
    ['Lemon Ice Tea', 169, true],
  ]),
  single('52395', 'Thaal Kitchen', { area: 'Edachira', cuisines: ['Biryani', 'Kerala'], rating: 4.4, eta: '30–35 min', distanceKm: 3.1 }, [
    ['Chicken Tikka Biriyani', 340, false],
    ['Kizhi Biriyani Beef', 320, false],
    ['Grape Juice', 110, true],
  ]),
  single('729412', 'Bektash', { area: 'Infopark Phase 1', cuisines: ['Arabian', 'Bowls'], rating: 4.1, eta: '15–20 min', distanceKm: 0.9 }, [
    ['Chicken Shawarma Rice Bowl', 289, false],
    ['Chicken Tikka Rice Bowl', 279, false],
    ['Chicken Shawarma Hummus Bowl', 319, false],
    ['Chicken Shawarma Salad Bowl', 239, false],
    ['Arabic Alfahm', 259, false],
    ['Rumali Roti', 29, false],
    ['Fresh Lime', 59, true],
    ['Pineapple Lime', 89, true],
  ]),
  single('403513', 'The Burger Junction', { area: 'Kakkanad', cuisines: ['Burgers'], rating: 4.3, eta: '30–40 min', distanceKm: 4.2 }, [
    ['The Beast', 454, false],
    ['El Fuego Burger', 473, false],
    ['Haystack Burger', 479, false],
    ['The Italian Burger', 324, true],
    ['Iced Lemon Tea', 156, true],
    ['Thums Up (350 ml)', 100, true],
  ]),
  single('955763', 'Al Taza', { area: 'Chittethukara', cuisines: ['Shawarma', 'Juices'], rating: 4.0, eta: '25–30 min', distanceKm: 2.2 }, [
    ['Al Taza Plate Shawarma Max', 393, false],
    ['Full Meat Chicken Shawarma', 250, false],
    ['Soya Shawarma', 260, true],
    ['Orange Juice', 130, true],
    ['Avocado Shake', 280, true],
  ]),
  single('787757', 'Asia Seven', { area: 'Palarivattom', cuisines: ['Asian'], rating: 4.2, eta: '40–45 min', distanceKm: 5.8 }, [['Spicy Chicken Ramen', 418.8, false]]),
  single('289517', 'Dindigul Thalappakatti', { area: 'Vazhakkala', cuisines: ['Biryani'], rating: 4.3, eta: '40–50 min', distanceKm: 6.5 }, [
    ['Single Pasanga Donne Paneer Biryani', 269, true],
    ['Chocolate Milkshake', 235, true],
  ]),
  single('51795', 'Aryaas', { area: 'Kakkanad', cuisines: ['South Indian'], rating: 4.1, eta: '30–35 min', distanceKm: 3.6 }, [['Veg Biryani', 186, true]]),
  chain('kfc', 'KFC', { area: 'Infopark Phase 1', cuisines: ['Fried chicken', 'Burgers'], rating: 4.1, eta: '20–25 min', distanceKm: 1.1, photo: photo('kfc') }, [
    ['Zinger Burger', 219, false, 'Crispy chicken fillet, lettuce and creamy mayo.'],
    ['Hot & Crispy Chicken, 2 pc', 249, false, 'Bone-in chicken, fried crisp and spicy.'],
    ['Popcorn Chicken, medium', 189, false, 'Bite-size boneless chicken.'],
    ['Peri Peri Chicken Rice Bowl', 229, false, 'Peri peri chicken on flavoured rice with gravy.'],
    ['Veg Zinger Burger', 179, true, 'Crispy veg patty, lettuce and mayo.'],
    ['Large Fries', 129, true],
    ['Pepsi, 475 ml', 79, true],
  ]),
  chain('burger-king', 'Burger King', { area: 'Kakkanad', cuisines: ['Burgers'], rating: 4.2, eta: '25–30 min', distanceKm: 2.4, photo: photo('burger-king') }, [
    ['Whopper', 239, false, 'Flame-grilled chicken patty, tomato, lettuce, onion.'],
    ['Veg Whopper', 199, true, 'Flame-grilled veg patty with the Whopper toppings.'],
    ['Paneer King Melt', 219, true, 'Grilled paneer with cheese and makhani sauce.'],
    ['Crispy Chicken Burger', 159, false, 'Crispy chicken patty with mayo.'],
    ['King Fries, medium', 119, true],
    ['Chocolate Thick Shake', 159, true],
    ['Coke, 330 ml', 70, true],
  ]),
  chain('saravana-bhavan', 'Hotel Saravana Bhavan', { area: 'Edappally', cuisines: ['South Indian', 'Vegetarian'], rating: 4.4, eta: '35–40 min', distanceKm: 3.8, photo: photo('saravana-bhavan') }, [
    ['South Indian Mini Meals', 210, true, 'Rice, sambar, rasam, poriyal, curd and payasam.'],
    ['Ghee Roast Dosa', 170, true, 'Thin, crisp dosa roasted in ghee, with chutneys and sambar.'],
    ['Masala Dosa', 150, true, 'Crisp dosa with potato masala, chutneys and sambar.'],
    ['Idli Vada', 110, true, 'Two idlis and a medu vada with chutney and sambar.'],
    ['Rava Kesari', 90, true],
    ['Filter Coffee', 60, true],
  ]),
  chain('baskin-robbins', 'Baskin Robbins', { area: 'Infopark Phase 2', cuisines: ['Ice cream', 'Desserts'], rating: 4.5, eta: '15–20 min', distanceKm: 0.7, photo: photo('baskin-robbins') }, [
    ['Belgian Chocolate Sundae', 229, true, 'Two scoops, hot fudge, nuts and a wafer.'],
    ['Choco Almond Fudge Thick Shake', 249, true],
    ['Ice Cream Cake Slice', 179, true],
    ['Mississippi Mud, single scoop', 120, true],
    ['Cotton Candy, single scoop', 120, true],
  ]),
  chain('dominos', "Domino's Pizza", { area: 'Kakkanad', cuisines: ['Pizza'], rating: 4.0, eta: '25–30 min', distanceKm: 1.8, photo: photo('dominos') }, [
    ['Margherita Pizza, medium', 299, true],
    ['Farmhouse Pizza, medium', 459, true, 'Onion, capsicum, tomato and mushroom.'],
    ['Chicken Dominator Pizza, medium', 599, false],
    ['Garlic Breadsticks', 129, true],
    ['Choco Lava Cake', 109, true],
  ]),
  chain('mcdonalds', "McDonald's", { area: 'Kakkanad', cuisines: ['Burgers', 'Wraps'], rating: 4.1, eta: '25–30 min', distanceKm: 2.9, photo: photo('mcdonalds') }, [
    ['McSpicy Paneer Burger', 199, true],
    ['McChicken Burger', 169, false],
    ['Big Spicy Chicken Wrap', 219, false],
    ['McAloo Tikki Burger', 69, true],
    ['Fries, medium', 119, true],
    ['McFlurry Oreo', 129, true],
  ]),
];

// Live restaurants and menus from the API (src/data/swiggy.ts) sit on top of the samples, and are
// kept in the browser so picks made from them still show after a reload. The samples stay as the
// fallback while the API can't be reached.
const LIVE_KEY = 'lunchboard-live-menus-v1';

function loadLive(): Map<string, Restaurant> {
  try {
    return new Map(Object.entries(JSON.parse(window.localStorage.getItem(LIVE_KEY) ?? '{}')));
  } catch {
    return new Map();
  }
}

const live = loadLive();
let version = 0;
const listeners = new Set<() => void>();

// Add or refresh live restaurants. A listing has no dishes, so it keeps any menu already loaded.
export function remember(restaurants: Restaurant[]) {
  for (const r of restaurants) {
    const old = live.get(r.id);
    live.set(r.id, { ...old, ...r, categories: r.categories.length ? r.categories : old?.categories ?? [] });
  }
  version += 1;
  try {
    window.localStorage.setItem(LIVE_KEY, JSON.stringify(Object.fromEntries(live)));
  } catch {
    /* storage full or unavailable: live menus last until the page closes */
  }
  listeners.forEach((l) => l());
}

// Re-render when live restaurants or menus arrive.
export const useMenus = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version,
  );

const known = () => [...live.values(), ...RESTAURANTS.filter((r) => !live.has(r.id))];

export const restaurantById = (id: string) => live.get(id) ?? RESTAURANTS.find((r) => r.id === id);

export const allDishes = (r: Restaurant) => r.categories.flatMap((c) => c.dishes);

// Searches samples too: a live menu replaces a sample one, but older picks still name its dishes.
export const dishById = (id: string): { dish: Dish; restaurant: Restaurant } | undefined => {
  for (const r of [...live.values(), ...RESTAURANTS]) {
    const dish = allDishes(r).find((x) => x.id === id);
    if (dish) return { dish, restaurant: r };
  }
  return undefined;
};

// Restaurants within `km` of the office, nearest first, for a "nearby" lunch.
export const restaurantsWithin = (km: number, from: Restaurant[] = known()) =>
  from.filter((r) => (r.distanceKm ?? Infinity) <= km).sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

export const byDistance = (from: Restaurant[] = known()) =>
  [...from].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
