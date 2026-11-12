# Lunch Board — web app (demo build)

The React + TypeScript front end from the architecture doc: team members pick lunch from several
restaurants, the host confirms one Swiggy order, and everyone watches a live board. It runs in the
browser on the Django API (`../lunch-backend`) when it answers, and on sample data when it doesn't.

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

## The API connection

Data comes from the Django API through [TanStack Query](https://tanstack.com/query):

- `src/api/client.ts`: `api()`, the one fetch wrapper. Calls go to `/api` on the app's own origin
  (Vite proxies them to `API_URL`, default `http://127.0.0.1:8001`, the port lunch-backend's
  `docker compose` uses). It turns DRF errors into one readable message, and sends the Firebase
  ID token once sign-in calls `setIdToken`. Deployed on Vercel, `vercel.json` rewrites
  `/api/*` to the production API (`https://lunchclubbe.vercel.app`), so the browser stays on
  one origin and the API needs no CORS.
- `src/api/queries.ts`: query keys, queries (`useMe`, `useMembers`, `useLunches`, `useBoard`,
  restaurants, menus) and mutations (start, pick, skip, lock, confirm, order placed, delivered).
  A board that is still moving is polled every 5 seconds, since the Firestore live board is off
  locally; saving a pick shows on the board at once and rolls back if the API refuses it.
- `src/live.tsx`: `LiveStore` wraps the signed-in app. If `GET /api/me` answers with a company,
  the screens get today's lunch, the team and the picks from the API, and their actions become API
  calls. Otherwise (no API, or not signed in) they keep the demo data. The landing page always
  shows the demo.

With the backend's `docker compose up`, `DEV_AUTH_EMAIL` signs every request in, so no Firebase
is needed locally. That person's role decides what they see: a `member` can pick, while `host`
or `admin` can also start lunches and place orders. Change it with
`PUT /api/company/members/<id>/role` as an admin, or in the Django shell.

Not in the API yet, so kept in the browser per lunch (`lunchboard-live-v1`): which restaurants a
lunch offers (other browsers fall back to restaurants within the company's distance), and the
host's review marks. Reopening locked picks has no endpoint, so the live app hides it. Picks
are stored by restaurant and dish name, so a pick whose menu isn't loaded shows as a stand-in
dish with the price the API has.

One lunch runs at a time. A lunch is running from the moment it starts until its food arrives or it
is called off. While one is running, **Start a lunch** is locked until the host closes it:

- **Not ordered yet:** closing calls it off (`POST /api/lunches/<id>/cancel`).
- **Ordered:** closing marks every Swiggy order delivered, which ends the lunch. Any order still
  waiting for its Swiggy number has to get it in Review and order first.

Only the app enforces this rule. The API still accepts a second lunch, so a guard in
lunch-backend's `services.start` is needed to make it hold for every client.

## Screens

| Route | Who | What it does |
| --- | --- | --- |
| Sign in | Everyone | "Continue with Google" (demo: signs in as the sample host) |
| `#/` Today's lunch | Everyone | Greeting with today's status, four figures, live board with filters and search, your pick, who still has to pick, delivery details, order progress |
| `#/pick` Pick my lunch | Everyone | Restaurant tabs, menus with veg marks, quantities, a note, save or skip today |
| `#/order` Review and order | Host | The cart by restaurant or by person as cards to tick off, lock/reopen picks, confirm, the order bot's steps (on the API: each Swiggy order, its number and arrival) |
| `#/new` Start a lunch | Host | Restaurants **nearby** (every one within a distance of the office) or **chosen by hand**, with no limit on how many, cutoff time, delivery address, a share link |
| `#/settings` Settings | Host | Company and email domain, lunch defaults (nearby or by hand, default distance), invites, office addresses, Swiggy account, members, reset demo |

There are two roles: team members pick lunch; the host also starts lunches, places the order and
manages Settings. The "View the demo as" switch in the sidebar shows the app as either. Saved demos
from before that used an "admin" role open as the host.

## Sample data to replace

- `src/data/menus.ts`: restaurants and dishes copied from the proof of concept's saved Swiggy data.
  **Start a lunch** and **Pick my lunch** now load live Swiggy restaurants and menus from the Django API
  (`src/data/swiggy.ts`, see "The API connection"),
  searched from `org.office` in `src/data/demo.ts`. The API needs a signed-in user, so until Firebase
  sign-in calls `setIdToken`, these screens say so and show the samples instead. Distances from the office,
  areas, ratings and ETAs are sample values for every restaurant except Veg Meals By Lunchbox; the
  "nearby" choice uses `distanceKm`, so replace them with real distances from the office address.
- `src/data/demo.ts`: the 35-person team, their picks, the office addresses and the demo clock
  (11:48) are invented. The order number `#1842209731 (demo)` and the bot's steps are simulated.
- `src/store.tsx`: the demo's state lives in the browser (`localStorage`). On the API, `src/live.tsx`
  provides the same store from TanStack Query instead.

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
(`src/components/celebrate.tsx`), and locking the picks a dark one with a padlock.

Locking plays a padlock snapping shut, and placing the order a till's "ka-ching" with coins
(`src/lib/sound.ts`). They are synthesised with the Web Audio API, so there are no audio files. Each runs
through a small room reverb, a compressor and a soft limiter: loud, with peaks just under full scale.
`scheduleSound` also renders them into an `OfflineAudioContext`, for checking levels. **Settings → Sounds**
turns them off and plays each one.

## Fonts

Geist and Geist Mono by Vercel, self-hosted in `public/fonts` (SIL Open Font License, see
`public/fonts/GEIST-OFL.txt`).
