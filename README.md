# Lunch Board — web app (demo build)

The React + TypeScript front end from the architecture doc: team members pick lunch from several
restaurants, the host confirms one Swiggy order, and everyone watches a live board. It runs in the
browser on sample data until the Django API, Firebase sign-in and the order bot are connected.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

Open `/?demo=signed-in` to skip the sign-in screen. Use **Settings → Reset the demo** to start over.

### Without npm access

`dist/` was built with esbuild because npm was blocked where this was made:

```bash
NODE_PATH=/path/to/node_modules node scripts/build-offline.mjs   # needs react, react-dom, esbuild
cd dist && python3 -m http.server 4173
```

## Screens

| Route | Who | What it does |
| --- | --- | --- |
| Sign in | Everyone | "Continue with Google" (demo: signs in as the sample host) |
| `#/` Today's lunch | Everyone | Greeting with today's status, four figures, live board with filters and search, your pick, who still has to pick, delivery details, order progress |
| `#/pick` Pick my lunch | Everyone | Restaurant tabs, menus with veg marks, quantities, a note, save or skip today |
| `#/order` Review and order | Host | The cart by restaurant with who ordered what, lock/reopen picks, confirm, the order bot's steps, hand-out checklist |
| `#/new` Start a lunch | Host | Restaurants **nearby** (every one within a distance of the office) or **chosen by hand**, with no limit on how many, cutoff time, delivery address, a share link |
| `#/settings` Settings | Host | Company and email domain, lunch defaults (nearby or by hand, default distance), invites, office addresses, Swiggy account, members, reset demo |

There are two roles: team members pick lunch; the host also starts lunches, places the order and
manages Settings. The "View the demo as" switch in the sidebar shows the app as either. Saved demos
from before that used an "admin" role open as the host.

## Sample data to replace

- `src/data/menus.ts`: restaurants and dishes copied from the proof of concept's saved Swiggy data.
  Live menus will come from the order bot (now) or the Swiggy MCP (later). Distances from the office,
  areas, ratings and ETAs are sample values for every restaurant except Veg Meals By Lunchbox; the
  "nearby" choice uses `distanceKm`, so replace them with real distances from the office address.
- `src/data/demo.ts`: the 35-person team, their picks, the office addresses and the demo clock
  (11:48) are invented. The order number `#1842209731 (demo)` and the bot's steps are simulated.
- `src/store.tsx`: state lives in the browser (`localStorage`). Swap the reducer actions for calls
  to the Django API (and Firestore listeners or polling for the live board).

## Design

Tailwind CSS v4 with the tokens in `src/index.css` (Vercel's Geist type, ink-on-white surfaces, hairline
rings) and Apple-style motion from the `motion` library (springs, scroll-linked tilt, reveals). Every
control is a shadcn/ui component (Radix underneath, `components.json`, added with `npx shadcn add`) in
`src/components/ui/`: Button, Card, Badge, Input, Textarea, Label, Field, Select, Switch, Checkbox,
Slider, Tabs, ToggleGroup, Dialog, Table, Tooltip, Separator, Avatar and Sonner toasts. Their colours
(`background`, `primary`, `muted`...) are mapped onto the Lunch Board tokens in `index.css`, and the
button, badge and card files carry Lunch Board's pill shape and status colours. `segmented.tsx` adds the
sliding pill to shadcn's ToggleGroup and Tabs. Signed out, the app opens on the landing page in
`src/landing/`; "Continue with Google" or "Put it on the board" signs in to the demo.

## Photos and illustrations

- Every dish and restaurant shows one placeholder image (`public/photos/dish.jpg`) until menus carry real
  ones. Set `photo` on a `Dish` or `Restaurant` in `src/data/menus.ts` (or from the API) and `FoodPhoto`
  uses it instead.
- `public/photos/dish.jpg` is an illustration of a clay pot and vegetables supplied for this build; confirm its licence
  before launch.
- Restaurant photos (`public/photos/restaurants/`), cropped from Wikimedia Commons and credited in the landing
  page footer; the originals and their records are in `assets/`. No brand logos are used as artwork.
  - KFC: “Looking down into KFC bucket of fried chicken (34956588243)” by Willis Lam, CC BY-SA 2.0, https://commons.wikimedia.org/wiki/File:Looking_down_into_KFC_bucket_of_fried_chicken_(34956588243).jpg
  - Burger King: “WHOPPER with Cheese, at Burger King (2014.05.04)” by Lombroso, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:WHOPPER_with_Cheese,_at_Burger_King_(2014.05.04).jpg
  - Hotel Saravana Bhavan: “Saravana Bhavan” by User:Marcus334, CC BY-SA 2.0, https://commons.wikimedia.org/wiki/File:Saravana_Bhavan.jpg
  - Baskin Robbins: “Ice cream flavors at a Baskin-Robbins ice cream parlor in Ooltewah, Tennessee” by Harrison Keely, CC BY 4.0, https://commons.wikimedia.org/wiki/File:Ice_cream_flavors_at_a_Baskin-Robbins_ice_cream_parlor_in_Ooltewah,_Tennessee.jpg
  - Domino's: “Domino's Pizza in India” by Gannu03, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Domino%27s_Pizza_in_India.jpg
  - McDonald's: “McDonald's India (32331353336)” by Martin Lewison from Forest Hills, NY, U.S.A., CC BY-SA 2.0, https://commons.wikimedia.org/wiki/File:McDonald%27s_India_(32331353336).jpg
- KFC, Burger King, Hotel Saravana Bhavan, Baskin Robbins, Domino's and McDonald's have sample menus and prices
  (typical, not copied from Swiggy) in `src/data/menus.ts`; today's demo lunch offers four of them with Veg Meals
  By Lunchbox.
- The lunch line (`public/illustrations/lunch-line.png`), its thought bubbles (`public/illustrations/thoughts/`)
  and the tiffin (`public/illustrations/tiffin.png`) are drawn in code in `scripts/art/`, with the shared
  print style in `scripts/art/style.mjs`. Edit a drawing there and run `npm run art` (needs Google Chrome)
  to redraw the PNGs. The bubbles follow today's picks; the positions in `src/landing/Tastes.tsx` match
  the scene in the script. The project skill `.claude/skills/print-illustration` describes the style
  and how to draw new illustrations in it.

## Theme and motion

Light and dark themes come from CSS variables in `src/index.css` (`.dark` on `<html>`). The theme follows the
system until someone uses the toggle, and `index.html` applies it before first paint. Adding a dish flies its photo
into the cart (`src/components/fly.tsx`); saving a pick or placing the order plays a green success moment
(`src/components/celebrate.tsx`).

## Fonts

Geist and Geist Mono by Vercel, self-hosted in `public/fonts` (SIL Open Font License, see
`public/fonts/GEIST-OFL.txt`).
