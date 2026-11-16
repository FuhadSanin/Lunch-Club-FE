import { AnimatePresence } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Dish, PickLine } from '@/model';
import { dishById, rememberDish, restaurantById, restaurantsWithin, useMenus } from '@/data/catalog';
import { useMenu, useRestaurants, type FoundDish } from '@/data/swiggy';
import { offeredRestaurants, useStore } from '@/store';
import { playSound } from '@/lib/sound';
import { cn } from '@/lib/cn';
import { Icon, rupees } from '@/ui';
import { Card, CardContent } from '@/components/ui/card';
import { PageTitle } from '@/components/PageTitle';
import { SHACKLE_SHUT } from '@/components/lock-scene';
import { originOf, useCelebrate } from '@/components/celebrate';
import { useFlyToCart } from '@/components/fly';
import { CartBar } from './pick/CartBar';
import { ConfirmPick } from './pick/ConfirmPick';
import { FoodSearch } from './pick/FoodSearch';
import { MenuNav } from './pick/MenuNav';
import { DoneOver, LockedOver, ORDER_CHECK } from './pick/Overlays';
import { RestaurantList } from './pick/RestaurantList';
import { RestaurantMenu } from './pick/RestaurantMenu';
import { YourPick } from './pick/YourPick';
import { readDraft, writeDraft } from './pick/draft';

// Pick my lunch. This file holds the cart and what is open; the pieces it shows are in ./pick/:
//   FoodSearch      search any restaurant or dish
//   RestaurantList  today's restaurants as cards  →  RestaurantMenu (DishRow, MenuStatus)  one menu
//   YourPick        the cart, the note, Complete my order / Skip today  →  ConfirmPick  "are you sure?"
//   MenuNav         a long menu's sections (wide screens);  CartBar  the cart's total (phones)
//   Overlays        what covers the page once your order is final, or picks are locked
export default function PickScreen() {
  const { state, dispatch, meId: ME_ID, live } = useStore();
  const celebrate = useCelebrate();
  const { fly, layer } = useFlyToCart();
  const badgeRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLAnchorElement>(null);
  const { session } = state;
  useMenus(); // live menus arrive after the first render
  // A lunch that doesn't say which restaurants it offers (started in another browser) offers the ones
  // near the office within the company's distance. Fetched here only, never on other pages.
  const unknownOffer = !!live && !session.restaurantIds.length;
  // Everything is looked up around where the lunch delivers, the same for everyone in it.
  const place = live?.place ?? state.org.office;
  const where = (session.address || '').split(',')[0].trim();
  const nearby = useRestaurants(place, '', !unknownOffer);
  const restaurants = unknownOffer
    ? restaurantsWithin(state.org.radiusKm, nearby.restaurants)
    : offeredRestaurants(session).filter((r) => !!r);
  const existing = state.picks[ME_ID];
  // Completed or skipped: final until the host reopens it.
  const done = !!existing?.done;
  // The cart lives in this browser until it's completed, so a reload or a closed tab doesn't lose it.
  const draftKey = `lunchboard-cart-v1:${session.id}:${ME_ID}`;
  const [items, setItems] = useState<PickLine[]>(() => (!done && readDraft(draftKey)?.items) || existing?.items || []);
  const [note, setNote] = useState(() => (!done ? readDraft(draftKey)?.note : undefined) ?? existing?.note ?? '');
  const [confirm, setConfirm] = useState<'complete' | 'skip' | null>(null);
  const [sending, setSending] = useState(false);
  // null: the restaurant cards; otherwise that restaurant's menu.
  const [openId, setOpenId] = useState<string | null>(null);
  const current = openId ? restaurantById(openId) : undefined;
  const menu = useMenu(openId ?? '', place);
  const [menuQuery, setMenuQuery] = useState('');
  const openRestaurant = (id: string) => {
    setOpenId(id);
    setMenuQuery('');
    document.getElementById('pick-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const [vegOnly, setVegOnly] = useState(false);
  const open = session.status === 'open';
  // Picks locking while this page is open: the latch click as the lock card comes down.
  const was = useRef(session.status);
  useEffect(() => {
    // playSound adds 20 ms and the snap comes 45 ms into the sound, so it lands as the shackle shuts.
    if (was.current === 'open' && session.status === 'locked') playSound('lock', SHACKLE_SHUT - 0.065);
    // The order going out while this page is open: the till rings as the check draws.
    if ((was.current === 'open' || was.current === 'locked') && (session.status === 'placing' || session.status === 'placed'))
      playSound('money', ORDER_CHECK - 0.1);
    was.current = session.status;
  }, [session.status]);
  const savedTotal = existing?.items.reduce((n, l) => n + (dishById(l.dishId)?.dish.price ?? 0) * l.qty, 0) ?? 0;
  useEffect(() => {
    if (!open || done) return;
    writeDraft(draftKey, items.length || note.trim() ? { items, note } : null);
  }, [items, note, open, done, draftKey]);

  const qty = (id: string) => items.find((l) => l.dishId === id)?.qty ?? 0;
  const setQty = (dish: Dish, n: number) => {
    setItems((cur) => {
      const rest = cur.filter((l) => l.dishId !== dish.id);
      return n > 0 ? [...rest, { dishId: dish.id, qty: n }] : rest;
    });
  };
  // Add-to-cart: the dish's photo flies to the pick card on desktop, or the phone's cart bar.
  const addOne = (d: Dish, n: number, el: Element) => {
    setQty(d, n);
    fly(el, [badgeRef.current, barRef.current], d.photo);
  };
  // Adding from the search: the dish may come from a menu that isn't loaded yet, so keep it first.
  const addFromSearch = (f: FoundDish, el: Element | null) => {
    rememberDish(f.restaurant, f.dish);
    const before = qty(f.dish.id);
    setQty(f.dish, before + 1);
    if (el) fly(el, [badgeRef.current, barRef.current], f.dish.photo);
    toast.success(`Added ${f.dish.name}`, {
      description: `${f.restaurant.name} · ${rupees(f.dish.price)}`,
      action: { label: 'Undo', onClick: () => setQty(f.dish, before) },
    });
  };
  // The menu section in view, for the Menu panel; and jumping to one.
  const [activeCat, setActiveCat] = useState(0);
  const jumpTo = (n: number) => {
    setActiveCat(n);
    document.getElementById(`menu-cat-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const inPickAt = (restaurantId: string) =>
    items.reduce((n, l) => n + (dishById(l.dishId)?.restaurant.id === restaurantId ? l.qty : 0), 0);
  const categories = (current?.categories ?? [])
    .map((c) => ({ ...c, dishes: c.dishes.filter((d) => (!vegOnly || d.veg) && (!menuQuery.trim() || d.name.toLowerCase().includes(menuQuery.trim().toLowerCase()))) }))
    .filter((c) => c.dishes.length);

  const sectionKey = categories.map((c) => c.name).join('|');
  useEffect(() => {
    setActiveCat(0);
    let io: IntersectionObserver | undefined;
    let timer = 0;
    // The menu fades in after the cards fade out, so its sections may not exist yet.
    const watch = () => {
      const sections = [...document.querySelectorAll<HTMLElement>('[id^="menu-cat-"]')];
      if (!sections.length) {
        timer = window.setTimeout(watch, 150);
        return;
      }
      const seen = new Map<Element, boolean>();
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => seen.set(e.target, e.isIntersecting));
          const first = sections.findIndex((el) => seen.get(el));
          if (first >= 0) setActiveCat(first);
        },
        { rootMargin: '-15% 0px -70% 0px' },
      );
      sections.forEach((el) => io!.observe(el));
    };
    if (openId) watch();
    return () => {
      window.clearTimeout(timer);
      io?.disconnect();
    };
  }, [sectionKey, openId]);

  const total = items.reduce((n, l) => n + (dishById(l.dishId)?.dish.price ?? 0) * l.qty, 0);
  const count = items.reduce((n, l) => n + l.qty, 0);
  // Dishes Swiggy now shows as out of stock can't be ordered, so they hold the order back.
  const soldOut = items.filter((l) => dishById(l.dishId)?.dish.inStock === false);

  // Completing puts the cart on the board and makes it final; skipping is final too. Either way the
  // host can reopen it.
  const completeOrder = (e: React.MouseEvent<HTMLButtonElement>) => {
    const from = originOf(e);
    setConfirm(null);
    setSending(true);
    Promise.resolve(dispatch({ type: 'completePick', userId: ME_ID, items, note }))
      .then(() => {
        writeDraft(draftKey, null);
        celebrate({
          ...from,
          title: 'Order complete',
          sub: `${count} ${count === 1 ? 'dish' : 'dishes'}, ${rupees(total)}. It's on the live board for the ${session.cutoff} cutoff.`,
          sound: 'saved',
        });
      }, () => undefined) // the reason is already on screen as a toast
      .finally(() => setSending(false));
  };
  const skipToday = () => {
    setConfirm(null);
    setSending(true);
    Promise.resolve(dispatch({ type: 'skip', userId: ME_ID }))
      .then(() => {
        writeDraft(draftKey, null);
        setItems([]);
        setNote('');
        toast("You're skipping today", { description: 'Ask the host if you change your mind.' });
      }, () => undefined)
      .finally(() => setSending(false));
  };

  return (
    <>
      {where && (
        <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-[13px] text-muted-foreground">
          <Icon name="pin" size={14} />
          <span className="truncate">Restaurants near <span className="font-medium text-foreground">{where}</span></span>
        </div>
      )}
      <PageTitle
        title="Pick my food"
        sub={
          open
            ? <>Search any restaurant or dish on Swiggy, or open one of today's {restaurants.length} restaurants. Picks close at <strong className="font-semibold text-foreground">{session.cutoff}</strong>.</>
            : session.status === 'locked'
              ? 'Picks are closed for today. Ask the host if you need a change.'
              : session.status === 'delivered'
                ? "Today's the food has arrived."
                : "Today's order is placed on Swiggy."
        }
      />

      <div className="relative">
      <div
        id="pick-top"
        inert={!open || done}
        className={cn('grid scroll-mt-20 items-start gap-4 transition-[filter,opacity] duration-500 lg:grid-cols-12', (!open || done) && 'pointer-events-none opacity-70 blur-[3px] select-none')}
      >
        <Card className="lg:col-span-8" aria-label="Restaurants and menus">
          <CardContent>
            <FoodSearch
              restaurants={restaurants}
              place={place}
              vegOnly={vegOnly}
              disabled={!open}
              qty={qty}
              onOpenRestaurant={(r) => openRestaurant(r.id)}
              onAddDish={addFromSearch}
            />

            <AnimatePresence mode="wait" initial={false}>
              {current ? (
                <RestaurantMenu
                  key={current.id}
                  restaurant={current}
                  onTodaysList={restaurants.some((r) => r.id === current.id)}
                  categories={categories}
                  load={menu}
                  vegOnly={vegOnly}
                  onVegOnly={setVegOnly}
                  query={menuQuery}
                  onQuery={setMenuQuery}
                  open={open}
                  qty={qty}
                  onSet={setQty}
                  onAdd={addOne}
                  onBack={() => setOpenId(null)}
                  onJump={jumpTo}
                />
              ) : (
                <RestaurantList key="all" restaurants={restaurants} where={where} vegOnly={vegOnly} onVegOnly={setVegOnly} inPickAt={inPickAt} onOpen={openRestaurant} />
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:sticky lg:top-8 lg:col-span-4">
        <YourPick
          items={items}
          count={count}
          total={total}
          note={note}
          onNote={setNote}
          open={open}
          done={done}
          soldOut={soldOut}
          sending={sending}
          onComplete={() => setConfirm('complete')}
          onSkip={() => setConfirm('skip')}
          badgeRef={badgeRef}
        />

        <AnimatePresence>
          {current && categories.length > 1 && (
            <MenuNav key={current.id} restaurantName={current.name} categories={categories} active={activeCat} onJump={jumpTo} />
          )}
        </AnimatePresence>
        </div>
      </div>
      <AnimatePresence>
        {!open ? (
          <LockedOver key="locked" status={session.status} mine={existing} total={savedTotal} />
        ) : done ? (
          <DoneOver key="done" mine={existing!} total={savedTotal} />
        ) : null}
      </AnimatePresence>

      <ConfirmPick confirm={confirm} onClose={() => setConfirm(null)} items={items} total={total} note={note} cutoff={session.cutoff} onComplete={completeOrder} onSkip={skipToday} />
      </div>

      <AnimatePresence>
        {count > 0 && open && !done && (
          <CartBar ref={barRef} count={count} total={total} />
        )}
      </AnimatePresence>
      {layer}
    </>
  );
}
