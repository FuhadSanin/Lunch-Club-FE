# Tiffmate

**Group food ordering for teams, friends and families.** A host starts a food party and shares one link, everyone
picks their own dish, the host places the order, and everyone sees what they owe. Live at
<https://tiffmate.vercel.app>.

This repo is the web app (React + TypeScript). The API and the AI-assistant (MCP) server are in the sibling repo
`lunch-backend`.

## Why this app

Ordering food for a group is a mess: one phone goes round the table, orders are copied into a chat, someone changes
their mind after the order is placed, and nobody remembers who owes what. Swiggy's own group order covers one
restaurant, and everyone has to agree on it. Tiffmate fixes the coordination, not the food:

- **One link, many restaurants.** Everyone picks from any Swiggy restaurant near the delivery address, so a team
  of 20 does not have to agree on one place.
- **The host stays in control.** Picks lock at a cutoff, the host sees each restaurant's dishes and cooking
  notes, and places the order. Every bag has a name, and everyone sees what they owe.
- **Local menus.** A host can keep the menu of a place that is not on Swiggy, by hand or by sending a photo to
  an AI assistant, and offer it in the same food party.
- **Works with your AI chat.** ChatGPT, Claude and any assistant that supports MCP can start a food party from a
  photo of a menu, show who picked what, lock the picks and more. The person signs the assistant in and stays in
  charge.
- **Not only offices.** A personal food party works for a birthday dinner, a hostel night or a family Sunday.

## Where it stands (17 Nov 2026)

| Part | State |
| --- | --- |
| Food parties, picks, lock, review, collect, "who owes what", live board | Working |
| Sign-in (Google), roles (host and member), company and personal parties | Working |
| Local menus, history receipts, AI assistant (MCP) with 26 tools | Working |
| Privacy notice, terms, delete my account | Working (`/privacy`, `/terms`, Your account) |
| **Placing the Swiggy order** | **By hand today.** The app lists each restaurant's dishes and cooking note, the host adds them in Swiggy and marks the order placed. Automatic ordering is built but switched off (`src/lib/features.ts`) |
| Restaurant and menu data | Read from Swiggy's public web endpoints, which are unofficial. To be **replaced by Swiggy's official MCP** |
| Swiggy Builders Club | Not applied yet. See below |

## Swiggy Builders Club: what is left

Swiggy's programme is for apps that use its official Food MCP, so the unofficial Swiggy code has to go before
applying honestly. The full checklist, with what is done and what needs a person, is
`docs/swiggy-builders-club.md` in the `lunch-backend` repo. In short:

1. Send the questions in [docs/swiggy-builders-email.md](docs/swiggy-builders-email.md) to builders@swiggy.in
   (the Rs 1000 cart cap, staging access, a fixed IP, data location, the logo).
2. Get Swiggy's own logo files and replace `public/illustrations/swiggy.webp` (the one here came from a logo
   website, and Swiggy asks for its supplied artwork and "Powered by Swiggy").
3. Run a small real pilot with one team.
4. Apply, then build the official-MCP connection in staging (the host connects their own Swiggy account; the
   cart, the confirmation and the order go through Swiggy's tools).
5. Move the database to Singapore (`lunch-backend/docs/database-migration.md`) before live Swiggy data is stored.
6. Record the demo video once it all works: [docs/demo-video.md](docs/demo-video.md).

## Demo video

- **The product film** (2 min): <https://tiffmate.vercel.app/promo/story.mp4>. The AI-assistant film:
  <https://tiffmate.vercel.app/promo/mcp.mp4>. Both play on the landing page.
- **The walkthrough for Swiggy**: not recorded yet, on purpose. It has to show the official Swiggy flow, so it is
  recorded after step 4 above. The shot list is in [docs/demo-video.md](docs/demo-video.md). Put its link here
  when it exists.

## Docs

- [docs/swiggy-builders-email.md](docs/swiggy-builders-email.md): the email to Swiggy, drafted.
- [docs/demo-video.md](docs/demo-video.md): what the Swiggy demo video must show.
- [docs/connect-ai-assistant.md](docs/connect-ai-assistant.md): how a person connects ChatGPT, Claude or another assistant.
- [docs/credits.md](docs/credits.md): licences and credits.
- [docs/architecture-design.pdf](docs/architecture-design.pdf): the original architecture design.
- The marketing material (the films, Instagram reels, LinkedIn banner and the illustration scripts) lives outside
  this repo, in `~/Downloads/tiffmate-marketing/`.

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
(`background`, `primary`, `muted`...) are mapped onto the Tiffmate tokens in `index.css`, and the
button, badge and card files carry Tiffmate's pill shape and status colours. `segmented.tsx` adds the
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
  and the tiffin (`public/illustrations/tiffin.png`) were drawn in code. That code, the print-illustration skill,
  the promo films, the Instagram reels and the LinkedIn banner now live outside this repo, in
  `~/Downloads/tiffmate-marketing/` (see its README). To redraw a picture, run its script there and copy the
  PNG back into `public/illustrations/`. The bubbles follow today's picks; the positions in
  `src/landing/Tastes.tsx` match the scene in the script.
- **Search and sharing** (`index.html`, `vite.config.ts`, `public/`). The built page carries its own SEO in its HTML: a title and
  description, canonical and hreflang, Open Graph and Twitter tags with a 1200 x 630 image (`public/og.png`), JSON-LD
  (WebSite, Organization, WebApplication with its features, two VideoObjects, and the FAQ from `src/landing/faq-data.ts`), icons and
  a web manifest, a sitemap with the image and both films, and a **pre-rendered copy of the landing page** (`src/landing/prerendered.html`,
  injected at build time as `#prerender`, removed by the app the moment the real page is drawn, never shown to someone signed in).
  Run `npm run prerender` (needs Google Chrome) after the landing page's words or layout change, then commit the file it writes.
- **Local menu** (`src/screens/LocalMenus.tsx`, form in `src/screens/local-menu/`). A host keeps menus for restaurants that
  aren't on Swiggy. The chat way (an AI assistant saves a menu from a photo, through the `add_local_menu` tool) is on
  only when an assistant is connected; the manual form is always there, with the required fields (restaurant name,
  each dish's name and price) in red. Start party has a Local menu section to offer them; the menu travels with the
  party, so everyone sees the same dishes, and picking one shows a Local menu badge. Pictures are shrunk in the browser
  (`src/lib/image.ts`) and kept with the menu.
- **The films** on the landing page (`public/promo/story.mp4` and `mcp.mp4`, with posters) are made in
  `~/Downloads/tiffmate-marketing/promo/` (see its README); credits for the photos are in `docs/credits.md`.
- **Connect to an AI assistant** (a how-to-use guide for people is in `docs/connect-ai-assistant.md`; code in `src/screens/Connect.tsx`, parts in `src/screens/connect/`). There is one way to
  connect: the assistant signs in (it opens `#/authorize/<id>`, the person presses Allow), so there are no tokens
  to make or copy. The page shows the three steps, the assistants that are connected (Disconnect ends the access
  token and the refresh token behind it), four examples to say, and the 26 tools. The tools and examples are plain
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
