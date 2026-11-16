import { AnimatePresence, motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import type { RestaurantMode } from '@/model';
import { RADIUS_RANGE } from '@/data/demo';
import { restaurantsWithin } from '@/data/catalog';
import { useStore } from '@/store';
import { useMembers, useRoles, useSetRoles } from '@/api/queries';
import { HOST_ROLE, MEMBER_ROLE, isHost, type ApiPlace, type ApiUser } from '@/api/types';
import { hueOf, personById } from '@/data/people';
import { Avatar, Icon } from '@/ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Segmented } from '@/components/ui/segmented';
import { Separator } from '@/components/ui/separator';
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageTitle } from '@/components/PageTitle';
import { PlaceInput } from '@/components/PlaceInput';
import { cn, spring } from '@/lib/cn';
import { usePending } from '@/lib/use-pending';
import { playSound, setSoundOn, soundOn } from '@/lib/sound';

function Section({ id, title, intro, children }: { id: string; title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-4 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)] md:gap-10">
      <div>
        <h2 id={id} className="text-base font-semibold tracking-[-0.01em]">{title}</h2>
        <div className="mt-1.5 grid gap-3 text-[13px] leading-5 text-muted-foreground">{intro}</div>
      </div>
      <Card className="overflow-visible">
        <CardContent className="grid content-start gap-5">{children}</CardContent>
      </Card>
    </section>
  );
}

const listItem = 'flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-2.5 text-sm';

const km = (n: number) => `${n.toLocaleString('en-IN', { maximumFractionDigits: 1 })} km`;

export default function Settings() {
  const { state, dispatch, people: PEOPLE, meId: ME_ID, live } = useStore();
  const { org } = state;
  const [name, setName] = useState(org.name);
  const [team, setTeam] = useState(org.team);
  const [domain, setDomain] = useState(org.emailDomain);
  const [emails, setEmails] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [newAddr, setNewAddr] = useState('');
  // Where the address typed is, when it was picked from the suggestions: saved with it.
  const [newPlace, setNewPlace] = useState<ApiPlace | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [sounds, setSounds] = useState(soundOn);
  const nearby = restaurantsWithin(org.radiusKm);

  // Each save disables its button until the API has answered, and says "saved" only once it has.
  // (A failure is already on screen as a toast, so the rejections below are left alone.)
  const { pending, run } = usePending();
  const save = (key: string, change: Partial<typeof org>, then: () => void) =>
    void run(key, () => dispatch({ type: 'updateOrg', org: change })).then(then, () => undefined);

  const saveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    save('company', { name: name.trim() || org.name, team: team.trim() || org.team, emailDomain: domain.trim().replace(/^@/, '') }, () => toast.success('Company saved'));
  };

  const invite = (e: React.FormEvent) => {
    e.preventDefault();
    const list = emails.split(/[\s,;]+/).map((x) => x.trim()).filter((x) => /.+@.+\..+/.test(x));
    if (!list.length) {
      setInviteError('Add at least one email address, like priya@company.com.');
      return;
    }
    setInviteError('');
    save('invite', { invites: [...new Set([...org.invites, ...list])] }, () => {
      setEmails('');
      toast.success(`${list.length} ${list.length === 1 ? 'invite' : 'invites'} ${live ? 'sent' : 'added'}`);
    });
  };

  // Off the list hosts choose from. Lunches already delivered there keep the address.
  const removeAddress = (a: string) =>
    save(`address:${a}`, { addresses: org.addresses.filter((x) => x !== a) }, () =>
      toast('Address removed', {
        description: a,
        action: { label: 'Undo', onClick: () => save(`address:${a}`, { addresses: [...org.addresses.filter((x) => x !== a), a], places: org.places }, () => undefined) },
      }),
    );

  const addAddress = (e: React.FormEvent) => {
    e.preventDefault();
    const a = newAddr.trim();
    if (!a) return;
    if (org.addresses.some((x) => x.toLowerCase() === a.toLowerCase())) return void toast('That address is already saved', { description: a });
    save('address:new', { addresses: [...org.addresses, a], places: { ...org.places, ...(newPlace && newPlace.address === a && { [a]: { lat: newPlace.lat, lng: newPlace.lng } }) } }, () => {
      setNewAddr('');
      setNewPlace(null);
      toast.success('Address added', { description: a });
    });
  };


  return (
    <div>
      <PageTitle title="Settings" sub={`${org.name}: ${PEOPLE.length} members, ${org.addresses.length} addresses. The host manages everything here.`} />

      <div className="grid gap-8">
        <Section id="co-h" title="Company" intro="The name people see on every lunch, and who can join without an invite.">
          <form className="grid gap-5" onSubmit={saveCompany}>
            <Field>
              <FieldLabel htmlFor="co-name" required>Company name</FieldLabel>
              <Input aria-required="true" id="co-name" name="organization" autoComplete="organization" className="h-10" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="co-team" required>Team name</FieldLabel>
              <Input aria-required="true" id="co-team" name="team" autoComplete="off" className="h-10" value={team} onChange={(e) => setTeam(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="co-domain" required>Company email domain</FieldLabel>
              <Input aria-required="true" id="co-domain" name="email-domain" autoComplete="off" spellCheck={false} inputMode="url" className="h-10" value={domain} readOnly={!!live} onChange={(e) => setDomain(e.target.value)} />
              <FieldDescription>Anyone who signs in with a Google account at @{domain || 'yourcompany.com'} can join.</FieldDescription>
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="co-join">Let company emails join without an invite</FieldLabel>
                <FieldDescription>Turn off to allow invited people only.</FieldDescription>
              </FieldContent>
              <Switch id="co-join" checked={org.autoJoin} disabled={pending('join')} onCheckedChange={(v) => save('join', { autoJoin: v }, () => toast.success(v ? 'Anyone at the company can join' : 'Only invited people can join'))} />
            </Field>
            <Button type="submit" className="w-fit" disabled={pending('company')}>{pending('company') ? 'Saving…' : 'Save company'}</Button>
          </form>
        </Section>

        <Separator />

        {/* The API keeps no lunch defaults: a host chooses nearby or by hand, and how far, when starting a lunch. */}
        {!live && (
          <>
            <Section
              id="lunch-h"
              title="Lunch defaults"
              intro={<p>How a new lunch chooses its restaurants. Hosts can still change it when they start a lunch.</p>}
            >
              <Field>
                <FieldLabel>Restaurants for a new lunch</FieldLabel>
                <div>
                <Segmented<RestaurantMode>
                  className="w-fit"
                  label="Restaurants for a new lunch"
                  value={org.restaurantMode}
                  onChange={(restaurantMode) => dispatch({ type: 'updateOrg', org: { restaurantMode } })}
                  options={[
                    { value: 'nearby', label: 'Nearby' },
                    { value: 'manual', label: 'Choose myself' },
                  ]}
                />
                </div>
              </Field>
              <Field>
                <div className="flex items-baseline justify-between gap-3">
                  <FieldLabel htmlFor="def-radius">Nearby means within {km(org.radiusKm)}</FieldLabel>
                  <span className="text-[13px] text-muted-foreground num">{nearby.length} restaurants</span>
                </div>
                <Slider
                  id="def-radius"
                  min={RADIUS_RANGE.min}
                  max={RADIUS_RANGE.max}
                  step={RADIUS_RANGE.step}
                  value={[org.radiusKm]}
                  onValueChange={([radiusKm]) => dispatch({ type: 'updateOrg', org: { radiusKm } })}
                  aria-label="Default distance from the office"
                />
                <FieldDescription>
                  {nearby.length
                    ? `Nearest first: ${nearby.map((r) => r.name).join(', ')}.`
                    : 'No restaurants in range yet. Widen it.'}
                </FieldDescription>
              </Field>
            </Section>

            <Separator />

          </>
        )}

        <Section
          id="inv-h"
          title="Invite people"
          intro={<>
            <p>{live ? 'Each person gets an email with a sign-in link.' : 'Each person gets an email with a sign-in link. This is the demo, so no email is sent: it only keeps the list.'}</p>
            <p>Preview: “{org.team} uses Lunch Board for group lunch. Sign in with Google to pick your food.”</p>
          </>}
        >
          <form className="grid gap-5" onSubmit={invite}>
            <Field data-invalid={!!inviteError || undefined}>
              <FieldLabel htmlFor="inv" required>Email addresses</FieldLabel>
              <Textarea aria-required="true" id="inv" name="emails" autoComplete="off" spellCheck={false} aria-invalid={!!inviteError} value={emails} onChange={(e) => { setEmails(e.target.value); setInviteError(''); }} placeholder="priya@company.com, arjun@company.com…" />
              {inviteError ? <FieldError>{inviteError}</FieldError> : <FieldDescription>Separate addresses with commas or new lines.</FieldDescription>}
            </Field>
            <Button type="submit" className="w-fit" disabled={pending('invite')}>{pending('invite') ? 'Sending…' : live ? 'Send invites' : 'Add invites'}</Button>
            {org.invites.length > 0 && (
              <ul className="grid gap-2">
                <AnimatePresence initial={false}>
                  {org.invites.map((x) => (
                    <motion.li key={x} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={spring} className={listItem}>
                      <span className="flex-1 truncate">{x}</span><Badge variant="warning">Invited</Badge>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </form>
        </Section>

        <Separator />

        <Section id="addr-h" title="Addresses" intro="Hosts choose one when they start a lunch, and nearby restaurants are measured from it. It must match an address saved on the host's Swiggy account.">
          {org.addresses.length === 0 && <p className="rounded-xl border border-dashed border-input p-4 text-sm text-muted-foreground">No addresses yet. Add where lunch is delivered, so hosts can choose it.</p>}
          <ul className="grid gap-2">
            <AnimatePresence initial={false}>
              {org.addresses.map((a) => (
                <motion.li key={a} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={spring} className={cn(listItem, 'justify-between')}>
                  <span className="min-w-0 break-words">{a}</span>
                  <Button type="button" size="sm" variant="ghost" className="shrink-0 text-muted-foreground" aria-label={`Remove ${a}`} disabled={pending(`address:${a}`)} onClick={() => removeAddress(a)}>{pending(`address:${a}`) ? 'Removing…' : 'Remove'}</Button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <form onSubmit={addAddress}>
            <Field>
              <FieldLabel htmlFor="new-addr" required>Add an address</FieldLabel>
              <div className="flex items-start gap-2">
                {/* The same place search as Start lunch: suggestions while typing, or keep what you typed. */}
                <PlaceInput id="new-addr" className="flex-1" value={newAddr} near={org.office} onChange={(t) => { setNewAddr(t); setNewPlace(null); }} onPlace={(p) => { setNewAddr(p.address); setNewPlace(p); }} placeholder="Search a building, area or landmark…" />
                <Button type="submit" variant="outline" className="h-10" disabled={!newAddr.trim() || pending('address:new')}>{pending('address:new') ? 'Adding…' : 'Add'}</Button>
              </div>
              <FieldDescription>Choose a place from the suggestions, or type the exact address from your Swiggy account.</FieldDescription>
            </Field>
          </form>
        </Section>

        <Separator />

        <Section id="sw-h" title="Ordering on Swiggy" intro="How the order reaches Swiggy once the picks are locked.">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
              The host places each order in the Swiggy app
              <Badge variant="secondary">By hand for now</Badge>
            </div>
            <FieldDescription className="mt-1">
              Place order (step 3) lists every restaurant's dishes to add to your Swiggy cart, then you enter the order number. Automatic ordering is waiting for Swiggy's approval; nothing needs linking until then.
            </FieldDescription>
          </div>
        </Section>

        <Separator />

        {live ? (
          <Section
            id="mem-h"
            title="Members"
            intro="Everyone picks lunch. Hosts also start lunches, lock picks, confirm the cart, reopen people's orders and manage these settings. A lunch can have several hosts."
          >
            <LiveMembers />
          </Section>
        ) : (
          <Section id="mem-h" title="Members" intro={`${PEOPLE.length} people. Everyone picks lunch; the host also starts lunches, places the order and manages these settings.`}>
            <ul className="grid gap-2">
              {PEOPLE.slice(0, 5).map((p) => (
                <li key={p.id} className={listItem}>
                  <Avatar person={p} />
                  <div className="min-w-0 flex-1"><div className="truncate font-medium">{p.name}</div><div className="truncate text-[13px] text-muted-foreground">{p.email}</div></div>
                  <Badge variant={p.id === ME_ID ? 'info' : 'secondary'}>{p.id === ME_ID ? 'Host' : 'Member'}</Badge>
                </li>
              ))}
            </ul>
            <FieldDescription>Showing 5 of {PEOPLE.length}. The full list and changing the host arrive with the back end.</FieldDescription>
          </Section>
        )}

        <Separator />

        <Section id="snd-h" title="Sounds" intro="A soft ding when you save your pick, a padlock snapping shut when the host locks the picks, and a till ringing when the order goes out. Only this browser is affected.">
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor="snd-on">Play sounds</FieldLabel>
              <FieldDescription>Turn off to keep the moments silent.</FieldDescription>
            </FieldContent>
            <Switch
              id="snd-on"
              checked={sounds}
              onCheckedChange={(v) => {
                setSoundOn(v);
                setSounds(v);
              }}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => playSound('lock', 0, true)}>
              <Icon name="lock" size={14} /> Play the lock sound
            </Button>
            <Button variant="outline" onClick={() => playSound('saved', 0, true)}>
              <Icon name="check" size={14} /> Play the pick saved sound
            </Button>
            <Button variant="outline" onClick={() => playSound('money', 0, true)}>
              <Icon name="check" size={14} /> Play the order sound
            </Button>
          </div>
        </Section>

        <Separator />

        <Section id="reset-h" title="Demo data" intro="Puts back the sample lunch, picks and settings. Only this browser is affected.">
          <Button variant="destructive" className="w-fit" onClick={() => setConfirmReset(true)}>Reset the demo</Button>
        </Section>
      </div>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset the demo lunch?</DialogTitle>
            <DialogDescription>Today's sample lunch, its 35 people and their picks come back, and your changes in this browser are lost.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReset(false)}>Keep my changes</Button>
            <Button onClick={() => { dispatch({ type: 'reset' }); setConfirmReset(false); window.location.hash = '/'; toast.success('Demo reset'); }}>Reset the demo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// The company's members from the API: who is a host, and, for people allowed to manage members, a way
// to make someone a host or a member again.
function LiveMembers() {
  const { live, meId } = useStore();
  const members = useMembers();
  const roles = useRoles();
  const setRoles = useSetRoles();
  const roleId = (name: string) => roles.data?.find((r) => r.name === name)?.id;
  const [change, setChange] = useState<{ user: ApiUser; toHost: boolean } | null>(null);
  const list = [...(members.data ?? [])].sort((a, b) => Number(isHost(b)) - Number(isHost(a)) || a.name.localeCompare(b.name));
  const first = (u: ApiUser) => u.name.split(' ')[0] || u.email;

  if (members.isPending) return <div className="grid gap-2" role="status" aria-busy="true" aria-label="Loading the team">{[0, 1, 2].map((i) => <span key={i} className="h-14 animate-pulse rounded-xl bg-muted" />)}</div>;
  if (members.isError)
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-input p-3 text-[13px] text-muted-foreground">
        <span>Couldn't load the team. {members.error.message}</span>
        <Button type="button" size="sm" variant="outline" onClick={() => void members.refetch()}>Try again</Button>
      </div>
    );

  return (
    <>
      <ul className="grid gap-2">
        {list.map((u) => {
          const host = isHost(u);
          return (
            <li key={u.id} className={listItem}>
              <Avatar person={personById(u.id) ?? { id: u.id, name: u.name, email: u.email, hue: hueOf(u.id) }} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{u.name}{u.id === meId && <span className="font-normal text-muted-foreground"> (you)</span>}</div>
                <div className="truncate text-[13px] text-muted-foreground">{u.email}</div>
              </div>
              <Badge variant={host ? 'info' : 'secondary'}>{host ? 'Host' : 'Member'}</Badge>
              {live?.canManageMembers && u.id !== meId && (
                <Button size="sm" variant={host ? 'ghost' : 'outline'} className={host ? 'text-muted-foreground' : undefined} onClick={() => setChange({ user: u, toHost: !host })}>
                  {host ? 'Remove host' : 'Make host'}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      <FieldDescription>{list.length} {list.length === 1 ? 'person' : 'people'}, {list.filter(isHost).length} {list.filter(isHost).length === 1 ? 'host' : 'hosts'}.</FieldDescription>

      <Dialog open={!!change} onOpenChange={(o) => !o && setChange(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{change?.toHost ? `Make ${change && first(change.user)} a host?` : `Make ${change && first(change.user)} a member again?`}</DialogTitle>
            <DialogDescription>
              {change?.toHost
                ? 'Hosts start lunches, lock picks, confirm the cart and place the order, reopen people\'s orders, and manage members.'
                : 'They can still pick lunch, but can no longer start or run lunches or manage members.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChange(null)}>Cancel</Button>
            <Button
              disabled={setRoles.isPending || !roleId(HOST_ROLE) || !roleId(MEMBER_ROLE)}
              variant={change?.toHost ? 'default' : 'destructive'}
              onClick={() =>
                change &&
                setRoles.mutate(
                  { userId: change.user.id, roleIds: [roleId(change.toHost ? HOST_ROLE : MEMBER_ROLE) ?? ''] },
                  {
                    onSuccess: () => {
                      toast.success(change.toHost ? `${first(change.user)} is a host now` : `${first(change.user)} is a member again`);
                      setChange(null);
                    },
                    onError: (e) => toast.error("Couldn't change their role", { description: e.message }),
                  },
                )
              }
            >
              {setRoles.isPending ? 'Saving…' : change?.toHost ? 'Make host' : 'Remove host'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
