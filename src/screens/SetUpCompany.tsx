import { useState } from 'react';
import { useCreateCompany } from '@/api/queries';
import type { ApiMe } from '@/api/types';
import { useSignOut } from '@/auth';
import { Mark } from '@/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

// "acme.co.in" → "Acme": a starting point for the company's name.
const nameFrom = (domain: string) => domain.split('.')[0].replace(/^./, (c) => c.toUpperCase());

// Signed in, but nobody from this email domain has set up their company yet. The first person
// does it here; teammates with the same domain then join it as soon as they sign in.
export function SetUpCompany({ me }: { me: ApiMe }) {
  const domain = me.email.split('@')[1] ?? '';
  const [name, setName] = useState(nameFrom(domain));
  const create = useCreateCompany();
  const signOut = useSignOut();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) create.mutate(name.trim());
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-5 py-10">
      <Card className="w-full max-w-[440px]">
        <CardHeader>
          <Mark size={32} />
          <CardTitle className="mt-4 text-2xl tracking-[-0.03em]">Set up your company</CardTitle>
          <CardDescription>
            Nobody from <strong className="font-semibold text-foreground">@{domain}</strong> has set up Lunch Board yet. Name your
            company and you can start lunches; teammates who sign in with an @{domain} address join it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5" onSubmit={submit}>
            <Field>
              <FieldLabel htmlFor="company" required>Company name</FieldLabel>
              <Input
                id="company"
                aria-required="true"
                name="company"
                autoComplete="organization"
                maxLength={120}
                value={name}
                onChange={(e) => { setName(e.target.value); create.reset(); }}
                className="h-10"
              />
              <FieldDescription>Your team sees this on every lunch.</FieldDescription>
            </Field>
            <Button size="lg" type="submit" disabled={!name.trim() || create.isPending}>
              {create.isPending ? 'Setting up…' : `Set up ${name.trim() || 'the company'}`}
            </Button>
            <p role="alert" className="text-[13px] text-destructive empty:hidden">{create.error?.message}</p>
          </form>
          <p className="mt-6 text-[13px] text-muted-foreground">
            Signed in as {me.email}.{' '}
            <button type="button" onClick={() => void signOut()} className="font-medium text-foreground underline-offset-4 hover:underline">
              Use another account
            </button>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
