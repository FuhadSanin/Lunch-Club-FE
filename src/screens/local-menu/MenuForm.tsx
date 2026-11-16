import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { useSaveLocalMenu } from '@/api/queries';
import type { ApiLocalMenu, ApiLocalMenuInput } from '@/api/types';
import { DISH_PICTURE, RESTAURANT_PICTURE, smallPicture } from '@/lib/image';
import { usePending } from '@/lib/use-pending';
import { cn } from '@/lib/cn';
import { Icon } from '@/ui';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/IconButton';
import { StarInput } from '@/components/StarInput';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Row = { key: number; id?: string; name: string; price: string; image: string; veg: 'unknown' | 'veg' | 'non' };

let counter = 0;
const blankRow = (): Row => ({ key: ++counter, name: '', price: '', image: '', veg: 'unknown' });
const rowOf = (i: ApiLocalMenu['items'][number]): Row => ({
  key: ++counter, id: i.id, name: i.name, price: String(i.price_paise / 100), image: i.image, veg: i.veg === null ? 'unknown' : i.veg ? 'veg' : 'non',
});

// A picture the person chooses: shrunk and kept with the menu. The little cross on it takes it off again.
function PictureButton({ value, label, rule, onChange, size = 'size-12' }: { value: string; label: string; rule: { side: number; chars: number }; onChange: (v: string) => void; size?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const choose = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await smallPicture(file, rule.side, rule.chars));
    } catch (e) {
      toast.error("Couldn't use that picture", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };
  return (
    <span className="relative inline-block flex-none">
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" aria-label={label} tabIndex={-1} onChange={(e) => void choose(e.target.files?.[0])} />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        title={value ? 'Change the picture' : label}
        aria-label={value ? `Change: ${label}` : label}
        className={cn('grid place-items-center overflow-hidden rounded-xl border border-dashed border-input bg-muted/50 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60', size)}
      >
        {value ? <img src={value} alt="" className="size-full object-cover" /> : <Icon name="image" size={18} />}
      </button>
      {value && (
        <button type="button" aria-label={`Remove: ${label}`} title="Remove the picture" onClick={() => onChange('')} className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-ink text-on-ink shadow-sm">
          <Icon name="close" size={10} />
        </button>
      )}
    </span>
  );
}

// Add or change a local menu by hand. The name, and each dish's name and price, are required (red); the rest is optional.
export function MenuForm({ menu, open, onOpenChange }: { menu: ApiLocalMenu | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const save = useSaveLocalMenu();
  const { run, pending } = usePending();
  const [name, setName] = useState(menu?.name ?? '');
  const [image, setImage] = useState(menu?.image ?? '');
  const [rating, setRating] = useState(menu?.rating != null ? String(menu.rating) : '');
  const [km, setKm] = useState(menu?.distance_km != null ? String(menu.distance_km) : '');
  const [rows, setRows] = useState<Row[]>(menu?.items.length ? menu.items.map(rowOf) : [blankRow(), blankRow()]);
  const [tried, setTried] = useState(false);
  const saving = pending('save');

  const set = (key: number, patch: Partial<Row>) => setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const price = (r: Row) => Number(r.price);
  const problems = {
    name: !name.trim(),
    km: km !== '' && !(Number(km) >= 0),
    dishes: !rows.some((r) => r.name.trim() && price(r) > 0),
  };
  const invalid = problems.name || problems.km || problems.dishes || rows.some((r) => (r.name.trim() || r.price !== '') && !(r.name.trim() && price(r) > 0));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (invalid) return;
    const input: ApiLocalMenuInput = {
      name: name.trim(),
      image,
      rating: rating === '' ? null : Number(rating),
      distance_km: km === '' ? null : Number(km),
      items: rows
        .filter((r) => r.name.trim() && price(r) > 0)
        .map((r) => ({ ...(r.id && { id: r.id }), name: r.name.trim(), price_paise: Math.round(price(r) * 100), image: r.image, veg: r.veg === 'unknown' ? null : r.veg === 'veg' })),
    };
    void run('save', () => save.mutateAsync({ id: menu?.id, menu: input }))
      .then(() => {
        toast.success(menu ? 'Menu saved' : 'Local menu added', { description: input.name });
        onOpenChange(false);
      })
      .catch((err: Error) => toast.error("Couldn't save the menu", { description: err.message }));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="flex max-h-[94dvh] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[720px]">
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="gap-1 px-6 pt-6 pr-14 pb-4">
            <DialogTitle className="text-xl tracking-[-0.03em]">{menu ? 'Change local menu' : 'Add a local menu'}</DialogTitle>
            <DialogDescription>A restaurant that isn't on Swiggy. Fields marked <span className="font-semibold text-destructive">*</span> are required.</DialogDescription>
          </DialogHeader>

          {/* The scroller is a plain div: a fieldset can refuse to scroll, and a long menu then ran over the buttons. */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-5">
          <fieldset disabled={saving} className="min-w-0">
            <div className="grid gap-6">
              <div className="grid grid-cols-[48px_minmax(0,1fr)] gap-x-3 gap-y-4 sm:grid-cols-[48px_minmax(0,1fr)_168px_96px]">
                <Field className="gap-1.5">
                  <FieldLabel>Photo</FieldLabel>
                  <PictureButton value={image} label="Restaurant picture" rule={RESTAURANT_PICTURE} onChange={setImage} />
                </Field>
                <Field className="gap-1.5" data-invalid={tried && problems.name ? true : undefined}>
                  <FieldLabel htmlFor="menu-name" required>Restaurant name</FieldLabel>
                  <Input id="menu-name" autoComplete="off" maxLength={120} aria-required="true" aria-invalid={tried && problems.name ? true : undefined} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name of the place" className="h-12" />
                </Field>
                <Field className="gap-1.5">
                  <FieldLabel htmlFor="menu-rating">Rating</FieldLabel>
                  <StarInput id="menu-rating" label="Rating, out of 5 stars" value={rating === '' ? null : Number(rating)} onChange={(v) => setRating(v === null ? '' : String(v))} />
                </Field>
                <Field className="gap-1.5" data-invalid={problems.km ? true : undefined}>
                  <FieldLabel htmlFor="menu-km">Km away</FieldLabel>
                  <Input id="menu-km" inputMode="decimal" value={km} onChange={(e) => setKm(e.target.value)} placeholder="1.4" aria-invalid={problems.km ? true : undefined} className="h-12" />
                </Field>
                {tried && problems.name && <FieldError className="col-span-full -mt-2">Give the restaurant a name.</FieldError>}
                {problems.km && <FieldError className="col-span-full -mt-2">Km away is a number like 1.4.</FieldError>}
              </div>

              <section aria-labelledby="menu-dishes-h" className="grid gap-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 border-t pt-5">
                  <h3 id="menu-dishes-h" className="text-[15px] font-semibold tracking-[-0.01em]">Menu <span aria-hidden="true" className="text-destructive">*</span></h3>
                  <span className="text-[13px] text-muted-foreground">Each dish needs a name and a price.</span>
                </div>
                <div aria-hidden="true" className="hidden grid-cols-[48px_minmax(0,1fr)_104px_132px_40px] gap-x-3 text-[13px] font-medium sm:grid">
                  <span>Photo</span><span>Dish name <span className="text-destructive">*</span></span><span>Price (₹) <span className="text-destructive">*</span></span><span>Veg or not</span><span />
                </div>
                <ul className="grid gap-3">
                  {rows.map((r, n) => {
                    const nameBad = tried && (r.name.trim() === '' && (r.price !== '' || (problems.dishes && n === 0)));
                    const priceBad = tried && (r.name.trim() !== '' || r.price !== '') && !(price(r) > 0);
                    return (
                      <li key={r.key} className="grid gap-1.5">
                        <div className="grid grid-cols-[48px_minmax(0,1fr)_40px] items-center gap-x-3 gap-y-3 sm:grid-cols-[48px_minmax(0,1fr)_104px_132px_40px]">
                          <PictureButton value={r.image} label={`Picture for dish ${n + 1}`} rule={DISH_PICTURE} onChange={(v) => set(r.key, { image: v })} />
                          <Input aria-label={`Dish ${n + 1} name`} autoComplete="off" maxLength={200} aria-required="true" aria-invalid={nameBad ? true : undefined} value={r.name} onChange={(e) => set(r.key, { name: e.target.value })} placeholder={n === 0 ? 'Meals' : 'Dish name'} className="h-12" />
                          <IconButton icon="trash" label={`Remove dish ${n + 1}`} disabled={rows.length === 1} onClick={() => setRows((all) => all.filter((x) => x.key !== r.key))} className="size-10 sm:order-last" />
                          <div className="col-span-3 grid grid-cols-2 gap-3 sm:contents">
                            <Input aria-label={`Dish ${n + 1} price in rupees`} inputMode="decimal" aria-required="true" aria-invalid={priceBad ? true : undefined} value={r.price} onChange={(e) => set(r.key, { price: e.target.value })} placeholder="90" className="h-12" />
                            <Select value={r.veg} onValueChange={(v) => set(r.key, { veg: v as Row['veg'] })}>
                              <SelectTrigger aria-label={`Veg or non-veg for dish ${n + 1}`} className="w-full data-[size=default]:h-12"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unknown">Not stated</SelectItem>
                                <SelectItem value="veg">Veg</SelectItem>
                                <SelectItem value="non">Non-veg</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {(nameBad || priceBad) && <p role="alert" className="text-[13px] font-medium text-destructive sm:pl-[60px]">{nameBad ? 'Give this dish a name.' : 'Add a price for this dish.'}</p>}
                      </li>
                    );
                  })}
                </ul>
                {tried && problems.dishes && <p role="alert" className="text-[13px] font-medium text-destructive">Add at least one dish with a name and a price.</p>}
              </section>
            </div>
          </fieldset>
          </div>

          <DialogFooter className="mx-0 mb-0 flex-row items-center justify-between gap-3 border-t bg-muted/30 px-6 py-4 max-sm:flex-wrap sm:justify-between">
            <Button type="button" variant="outline" disabled={saving} onClick={() => setRows((all) => [...all, blankRow()])}>
              <Icon name="new" size={14} /> Add a dish
            </Button>
            <div className="flex items-center gap-2 max-sm:w-full max-sm:[&>*]:flex-1">
              <Button type="button" variant="ghost" disabled={saving} onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : menu ? 'Save menu' : 'Add menu'}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
