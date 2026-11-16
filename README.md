# Lunch Board — web app (demo build)

The React + TypeScript front end from the architecture doc: team members pick lunch from several
restaurants, the host confirms one Swiggy order, and everyone watches a live board. It runs in the
browser on the Django API (`../lunch-backend`) when it answers, and on sample data when it doesn't.

## Run it

```bash
cp .env.example .env   # then fill in the Firebase project's values (the build fails without them)
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
npm run lint       # ESLint: TypeScript and React hooks rules
npm test           # unit tests (Vitest) for the plain functions: api/adapt, lib/steps, the cart sums
```

Open `/?demo=signed-in` to skip the sign-in screen. Use **Settings → Reset the demo** to start over.

## How the code is organised

```
src/
  main.tsx            starts the app: providers, error boundary, toasts
  App.tsx             signed out → the landing page; signed in → the app. Each is its own download
  Shell.tsx           the signed-in app: sidebar, routes (#/…), the screen
  model.ts            the shapes every screen works with (Person, Restaurant, Dish, Pick, Session, Org)
  store.tsx           the one store every screen reads (useStore): state, dispatch, people, live
  live.tsx            LiveStore: fills that store from the API when signed in
  auth.ts             sign in and out (Google through Firebase)
  api/
    client.ts         api(): the one fetch wrapper (adds the sign-in token, readable errors)
    types.ts          the API's response shapes (snake_case, money in paise)
    queries.ts        every read and write, as TanStack Query hooks
    adapt.ts          API shapes → the screens' shapes, and back (plain functions)
  screens/            one file per page; steps/ are the host's six steps; pick/ are the parts of
                      Pick my lunch (the menu, a dish row, the cart, the confirm dialog, ...);
                      connect/ are the parts of Connect to an AI assistant (the three steps, who is
                      connected, the examples, the tools)
  components/         shared pieces; ui/ is shadcn/ui (added with `npx shadcn add`, not hand-written)
  landing/            the signed-out landing page: hero, the story film, how lunch runs, a board to try
  data/               demo.ts and menus.ts: sample data only (the invented team, picks and menus)
                      people.ts: everyone this browser knows, by id (personById)
                      catalog.ts: every restaurant and dish it knows, by id (restaurantById, dishById)
                      swiggy.ts: live restaurants, menus and dish search from the API
  lib/                steps.ts (the host's six steps), live-board.ts (Firestore signal),
                      use-pending.ts (a button is disabled until its request has answered),
                      lunch-extras.ts (what only this browser remembers), push.ts, sound.ts, firebase.ts
```

## How data flows

Every screen calls `useStore()` and gets the same thing: `state` (today's lunch, everyone's picks, the
company), `dispatch` (an action such as `savePick` or `lock`) and `live`.

- **Demo** (`/?demo=signed-in`, or no API to talk to): `store.tsx` holds sample data in the browser
  and its reducer applies each action. `live` is `null`.
- **Signed in:** `live.tsx` puts a second store over the first. It reads the lunch from the API
  (`api/queries.ts`), converts it to the same shapes (`api/adapt.ts`), and turns each action into an API
  call. `live` carries what only exists on the API (the lunch's id, orders, whether you can host).

So a screen is written once and doesn't know which of the two it is running on. To add something, add
the endpoint to `api/queries.ts`, its conversion to `api/adapt.ts` if the shape differs, and the action to
`live.tsx` (and to the reducer in `store.tsx` if the demo should do it too).

Calls go to `/api` on the app's own origin: Vite proxies them to `API_URL` (default
`http://127.0.0.1:8001`, lunch-backend's `docker compose` port), and on Vercel `vercel.json` rewrites
`/api/*` to the production API, so the API needs no CORS.

**Staying up to date.** With `VITE_LIVE_BOARD=true` the browser listens to the lunch's Firestore copy and
fetches the board from the API the moment it changes (`lib/live-board.ts`); it then also polls every 2
minutes as a fallback. Without it, a lunch is polled every 15 seconds until its host closes it. (The
Firestore document is only a signal: it holds the status and when it changed, never the picks.) The bell is
checked every 30 seconds and when the tab gets focus, and a push notification refreshes the lunch it is
about at once.

**Clicks.** Anything that saves is disabled until the API has answered (`lib/use-pending.ts`), so a
double click sends one request, and what follows (a celebration, a "saved" toast) comes after the answer,
not on the click. If the API refuses, the reason shows as a toast and nothing celebrates. Completing your
order is the strictest case: it is final, so the page does not even show it as complete (nothing is optimistic)
until the API has answered 200. The host's ticks work the same way: a tick shows once the API has
answered (one at a time, in click order), and until then the "Next" bar says "Saving…" and is not a link,
so the step's pop-up and the move to the next step both come after the answer. Finishing or cancelling a
lunch also fetches the lunch list again, so a finished party disappears from the sidebar and Start lunch
at once.

**Who sees what.** The API answers with each person's roles and permissions. Anyone who can run a lunch
(start, lock, confirm, order) sees the host's screens; everyone else the member's. Settings → Members →
Make host gives someone the Host role.

## Screens

| Route | Who | What it does |
| --- | --- | --- |
| Landing | Signed out | The story (a two-minute film), how lunch runs in six steps, a board to try, "Continue with Google" |
| `#/` Today's lunch | Everyone | Today's status, the live board, your pick, who still has to pick |
| `#/pick` Pick my lunch | Everyone | Restaurants and menus, search, quantities, a note, complete or skip. A shared link (`#/lunch/<id>`) opens it for that lunch |
| `#/new` Start lunch | Host | Step 1: the lunch's name, cutoff, delivery address, and restaurants nearby or chosen by hand |
| `#/review` Review & lock | Host | Step 2: the cart by restaurant or by person, reopen someone's order, lock or unlock picks |
| `#/order` Place order | Host | Step 3: each restaurant's order to place in the Swiggy app, and its order number |
| `#/collect` Collect | Host | Step 4: tick each restaurant when its food arrives |
| `#/distribute` Distribute | Host | Step 5: tick each person when they have their food |
| `#/finish` Enjoy your meal | Host | Step 6: close the lunch so the next one can start |
| `#/settings` Settings | Host | Company, invites, addresses, members and their role |
| `#/connect` Connect to an AI assistant | Signed in | How to connect an assistant (one way: it signs in and you press Allow), four things to say with pictures, the tools it has, and the assistants connected (with Disconnect) |

The six steps are defined once, in `src/lib/steps.ts`; a step opens only when the ones before it are done.

## What only this browser remembers

Very little (`src/lib/lunch-extras.ts`, in `localStorage`): which lunch a shared link opened, and the
cart you are still filling in (it goes to the API when you complete your order).

The host's ticks while running a lunch are on the API, so every device and a second host see the same:
restaurants reviewed (step 3), restaurants whose food arrived (step 4) and people who have their food
(step 5). A tick shows at once and is taken back if the API refuses it.

One lunch runs at a time, from when it starts until the host closes it. The API enforces this, for a
company and for a personal party.

Automatic ordering (the Swiggy order bot) is built but switched off in `src/lib/features.ts` until Swiggy
approves it. Until then the host places each order by hand.

## Demo data

- `src/data/demo.ts`: the 35-person team, their picks and the demo clock (11:48) are invented.
- `src/data/menus.ts`: sample restaurants and dishes. Their distances, ratings and ETAs are sample values.
  Signed in, restaurants and menus come live from the API (`src/data/swiggy.ts`).
- The landing page and `/?demo=signed-in` always use these. Settings → Reset the demo starts over.

## Design

Tailwind CSS v4 with the tokens in `src/index.css` (Vercel's Geist type, ink-on-white surfaces, hairline
rings) and Apple-style motion from the `motion` library (springs, scroll-linked tilt, reveals). Every
control is a shadcn/ui component (Radix underneath, `components.json`, added with `npx shadcn add`) in
`src/components/ui/`: Button, Card, Badge, Input, Textarea, Label, Field, Select, Switch, Checkbox,
Slider, Tabs, ToggleGroup, Dialog, Tooltip, Separator, Avatar and Sonner toasts. Their colours
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
- **Connect to an AI assistant** (a how-to-use guide for people is in `docs/connect-ai-assistant.md`; code in `src/screens/Connect.tsx`, parts in `src/screens/connect/`). There is one way to
  connect: the assistant signs in (it opens `#/authorize/<id>`, the person presses Allow), so there are no tokens
  to make or copy. The page shows the three steps, the assistants that are connected (Disconnect ends the access
  token and the refresh token behind it), four examples to say, and the 23 tools. The tools and examples are plain
  data (`assistant-tools.ts` mirrors `mcp_server/server.py` in lunch-backend; `what-to-say.ts` holds the examples and
  a test checks they only use tools that exist). The example pictures are real screens of the app in demo mode,
  light and dark, in `public/connect/`: redo them with `npm run dev` (no API) and `node scripts/connect-shots.mjs`
  (needs Google Chrome and `cwebp`) after a screen changes.

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
