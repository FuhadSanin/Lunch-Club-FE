import { AnimatePresence, motion } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { ME_ID, PEOPLE, RADIUS_RANGE, type RestaurantMode } from '@/data/demo';
import { restaurantsWithin } from '@/data/menus';
import { useStore } from '@/store';
import { Avatar } from '@/ui';
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
import { spring } from '@/lib/cn';

function Section({ id, title, intro, children }: { id: string; title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-4 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)] md:gap-10">
      <div>
        <h2 id={id} className="text-base font-semibold tracking-[-0.01em]">{title}</h2>
        <div className="mt-1.5 grid gap-3 text-[13px] leading-5 text-muted-foreground">{intro}</div>
      </div>
      <Card>
        <CardContent className="grid content-start gap-5">{children}</CardContent>
      </Card>
    </section>
  );
}

const km = (n: number) => `${n.toLocaleString('en-IN', { maximumFractionDigits: 1 })} km`;

export default function Settings() {
  const { state, dispatch } = useStore();
  const { org } = state;
  const [name, setName] = useState(org.name);
  const [team, setTeam] = useState(org.team);
  const [domain, setDomain] = useState(org.emailDomain);
  const [emails, setEmails] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [newAddr, setNewAddr] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const nearby = restaurantsWithin(org.radiusKm);

  const saveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'updateOrg', org: { name: name.trim() || org.name, team: team.trim() || org.team, emailDomain: domain.trim().replace(/^@/, '') } });
    toast.success('Company saved');
  };

  const invite = (e: React.FormEvent) => {
    e.preventDefault();
    const list = emails.split(/[\s,;]+/).map((x) => x.trim()).filter((x) => /.+@.+\..+/.test(x));
    if (!list.length) {
      setInviteError('Add at least one email address, like priya@company.com.');
      return;
    }
    dispatch({ type: 'updateOrg', org: { invites: [...new Set([...org.invites, ...list])] } });
    setEmails('');
    setInviteError('');
    toast.success(`${list.length} ${list.length === 1 ? 'invite' : 'invites'} added`);
  };

  const addAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddr.trim()) return;
    dispatch({ type: 'updateOrg', org: { addresses: [...org.addresses, newAddr.trim()] } });
    setNewAddr('');
    toast.success('Address added');
  };

  const listItem = 'flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-2.5 text-sm';

  return (
    <div>
      <PageTitle title="Settings" sub={`${org.name}: ${PEOPLE.length} members, ${org.addresses.length} office addresses. The host manages everything here.`} />

      <div className="grid gap-8">
        <Section id="co-h" title="Company" intro="The name people see on every lunch, and who can join without an invite.">
          <form className="grid gap-5" onSubmit={saveCompany}>
            <Field>
              <FieldLabel htmlFor="co-name">Company name</FieldLabel>
              <Input id="co-name" name="organization" autoComplete="organization" className="h-10" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="co-team">Team name</FieldLabel>
              <Input id="co-team" name="team" autoComplete="off" className="h-10" value={team} onChange={(e) => setTeam(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="co-domain">Company email domain</FieldLabel>
              <Input id="co-domain" name="email-domain" autoComplete="off" spellCheck={false} inputMode="url" className="h-10" value={domain} onChange={(e) => setDomain(e.target.value)} />
              <FieldDescription>Anyone who signs in with a Google account at @{domain || 'yourcompany.com'} can join.</FieldDescription>
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="co-join">Let company emails join without an invite</FieldLabel>
                <FieldDescription>Turn off to allow invited people only.</FieldDescription>
              </FieldContent>
              <Switch id="co-join" checked={org.autoJoin} onCheckedChange={(v) => dispatch({ type: 'updateOrg', org: { autoJoin: v } })} />
            </Field>
            <Button type="submit" className="w-fit">Save company</Button>
          </form>
        </Section>

        <Separator />

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

        <Section
          id="inv-h"
          title="Invite people"
          intro={<>
            <p>Each person gets an email with a sign-in link. Emails go out once the Django back end is connected; this build keeps the list.</p>
            <p>Preview: “{org.team} uses Lunch Board for group lunch. Sign in with Google to pick your food.”</p>
          </>}
        >
          <form className="grid gap-5" onSubmit={invite}>
            <Field data-invalid={!!inviteError || undefined}>
              <FieldLabel htmlFor="inv">Email addresses</FieldLabel>
              <Textarea id="inv" name="emails" autoComplete="off" spellCheck={false} aria-invalid={!!inviteError} value={emails} onChange={(e) => { setEmails(e.target.value); setInviteError(''); }} placeholder="priya@company.com, arjun@company.com…" />
              {inviteError ? <FieldError>{inviteError}</FieldError> : <FieldDescription>Separate addresses with commas or new lines.</FieldDescription>}
            </Field>
            <Button type="submit" className="w-fit">Add invites</Button>
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

        <Section id="addr-h" title="Office addresses" intro="Hosts choose one when they start a lunch, and nearby restaurants are measured from it. It must match an address saved on the host's Swiggy account.">
          <ul className="grid gap-2">
            <AnimatePresence initial={false}>
              {org.addresses.map((a) => (
                <motion.li key={a} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={spring} className={listItem}>{a}</motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <form onSubmit={addAddress}>
            <Field>
              <FieldLabel htmlFor="new-addr">Add an address</FieldLabel>
              <div className="flex gap-2">
                <Input id="new-addr" name="address" autoComplete="street-address" className="h-10" value={newAddr} onChange={(e) => setNewAddr(e.target.value)} placeholder="Building, floor, area…" />
                <Button type="submit" variant="outline">Add</Button>
              </div>
            </Field>
          </form>
        </Section>

        <Separator />

        <Section id="sw-h" title="Your Swiggy account" intro="The order bot places lunch on the host's own Swiggy account. You log in once with your phone and OTP; the login is stored encrypted and never sent to the browser.">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
              Linked for {PEOPLE.find((p) => p.id === ME_ID)!.name}
              <Badge variant={state.swiggyLinked ? 'success' : 'secondary'}>{state.swiggyLinked ? 'Linked' : 'Not linked'}</Badge>
            </div>
            <FieldDescription className="mt-1">Orders are paid on delivery. Once Swiggy approves MCP access, linking moves to Swiggy's own login page.</FieldDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" disabled>Re-link with phone and OTP</Button>
            <FieldDescription>Available once the order bot service is running.</FieldDescription>
          </div>
        </Section>

        <Separator />

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
