import { useEffect, useLayoutEffect, type ReactNode } from 'react';
import { dropPrerender } from '@/lib/prerender';

// The frame of the plain-words pages at /privacy and /terms. The contact address comes from VITE_CONTACT_EMAIL;
// with none set, the contact line is left out rather than guessed.
export const CONTACT = (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim();

export function H({ children }: { children: ReactNode }) {
  return <h2 className="mt-10 text-xl font-semibold tracking-[-0.02em]">{children}</h2>;
}

export function Contact() {
  return CONTACT ? <> at <a className="font-medium text-brand underline-offset-4 hover:underline" href={`mailto:${CONTACT}`}>{CONTACT}</a></> : <> through the website</>;
}

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  useLayoutEffect(() => dropPrerender(), []);
  useEffect(() => {
    const before = document.title;
    document.title = `${title} | Tiffmate`;
    return () => {
      document.title = before;
    };
  }, [title]);
  return (
    <main className="mx-auto max-w-2xl px-5 py-12 text-[15px] leading-7 text-body sm:py-16">
      <a href="/" className="text-sm font-medium text-brand underline-offset-4 hover:underline">Back to Tiffmate</a>
      <h1 className="mt-6 text-[32px] leading-tight font-semibold tracking-[-0.04em] text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
      {children}
      <p className="mt-12 text-sm text-muted-foreground">
        <a className="underline-offset-4 hover:underline" href="/privacy">Privacy notice</a> · <a className="underline-offset-4 hover:underline" href="/terms">Terms of use</a>
      </p>
    </main>
  );
}
