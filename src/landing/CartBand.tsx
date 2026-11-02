import { motion } from 'motion/react';
import { restaurantById } from '../data/menus';
import { useLunch } from '../store';
import { FoodPhoto, rupees } from '../ui';
import { AnimatedNumber } from '../components/ui/number';
import { easeOut } from '../lib/cn';
import { Reveal } from './motion';

// The dark band: every restaurant in today's cart, each one a card, all in one order.
export default function CartBand() {
  const lunch = useLunch();

  return (
    <section id="cart" aria-labelledby="cart-title" className="mt-36 bg-band py-28 text-white sm:mt-48 sm:py-40">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="grid gap-x-8 gap-y-6 lg:grid-cols-12 lg:items-end">
          <Reveal className="lg:col-span-7">
            <h2 id="cart-title" className="text-[clamp(36px,5.2vw,64px)] font-semibold leading-[1] tracking-[-0.045em]">
              Any restaurant. One&nbsp;cart.
            </h2>
          </Reveal>
          <Reveal delay={0.08} className="lg:col-span-5">
            <p className="text-lg leading-7 text-white/70">
              Pick from as many restaurants as the team likes. Lunch Board puts every pick into one Swiggy cart and keeps
              the total honest, down to the rupee.
            </p>
          </Reveal>
        </div>

        <ol data-ui className="mt-16 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label={`${lunch.cart.length} restaurants in the cart`}>
          {lunch.cart.map((g, i) => (
            <motion.li
              key={g.restaurantId}
              initial={{ opacity: 0, y: 40, scale: 0.94 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '0px 0px -10% 0px' }}
              transition={{ duration: 0.9, ease: easeOut, delay: i * 0.09 }}
              whileHover={{ y: -4 }}
              className="group flex flex-col overflow-hidden rounded-2xl bg-white/[0.07] transition-colors duration-300 hover:bg-white/[0.11]"
            >
              <span className="block aspect-[4/3] overflow-hidden">
                <FoodPhoto cover src={restaurantById(g.restaurantId)?.photo} className="size-full rounded-none transition-transform duration-700 ease-out-expo group-hover:scale-105" />
              </span>
              <span className="flex flex-1 flex-col p-5">
                <span className="text-[15px] font-semibold leading-5">{g.name}</span>
                <span className="mt-1 text-[13px] text-white/60">{g.dishes} dishes</span>
                <span className="mt-auto pt-4 text-xl font-semibold tracking-[-0.02em] num">{rupees(g.total)}</span>
              </span>
            </motion.li>
          ))}
        </ol>

        <ul className="mt-16 grid gap-10 sm:grid-cols-3">
          <li>
            <span className="block text-5xl font-semibold tracking-[-0.04em] sm:text-[64px]">
              <AnimatedNumber value={lunch.total} format={(n) => rupees(Math.abs(n - lunch.total) < 0.01 ? lunch.total : Math.round(n))} />
            </span>
            <span className="mt-2 block text-sm text-white/60">items total, before Swiggy's fees</span>
          </li>
          <li>
            <span className="block text-5xl font-semibold tracking-[-0.04em] sm:text-[64px]"><AnimatedNumber value={lunch.dishes} /></span>
            <span className="mt-2 block text-sm text-white/60">dishes in the cart</span>
          </li>
          <li>
            <span className="block text-5xl font-semibold tracking-[-0.04em] sm:text-[64px]"><AnimatedNumber value={lunch.cart.length} /></span>
            <span className="mt-2 block text-sm text-white/60">restaurants, one Swiggy order</span>
          </li>
        </ul>
      </div>
    </section>
  );
}
