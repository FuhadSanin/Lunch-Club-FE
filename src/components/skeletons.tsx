import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Grey shapes where the real thing is about to be, laid out like it, so the page doesn't jump when it
// arrives. Screen readers hear one "loading" message instead of the shapes.

// A page inside the app: its title and line of text, then a wide card of rows beside a narrow one
// (the layout of Today's lunch and Pick my lunch; the other pages stack the same pieces).
export function PageSkeleton({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label}>
      <div className="mb-8 sm:mb-10">
        <Skeleton className="h-9 w-56 max-w-full sm:h-10" />
        <Skeleton className="mt-3.5 h-4 w-full max-w-xl" />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardContent className="grid gap-5">
            <Skeleton className="h-11 w-full rounded-full" />
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-4">
                <Skeleton className="size-12 rounded-xl" />
                <div className="grid gap-2">
                  <Skeleton className="h-3.5 w-2/5" />
                  <Skeleton className="h-3 w-3/5" />
                </div>
                <Skeleton className="h-8 w-16 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="lg:col-span-4">
          <CardContent className="grid gap-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-10 w-full rounded-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// The whole signed-in app while it finds out who you are and what today's lunch is: the sidebar (the
// top bar on a phone) and a page, where they will be.
export function AppSkeleton({ label }: { label: string }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]" role="status" aria-busy="true" aria-label={label}>
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-canvas px-3 lg:hidden">
        <Skeleton className="size-9 rounded-lg" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="ml-auto size-7 rounded-lg" />
      </div>
      <div className="sticky top-0 hidden h-dvh flex-col gap-3 border-r border-line bg-soft p-4 lg:flex">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="mt-2 h-14 w-full rounded-xl" />
        <div className="mt-4 grid gap-2.5">
          {[0, 1].map((i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}
        </div>
        <Skeleton className="mt-5 h-3 w-24" />
        <div className="grid gap-2.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-2.5">
              <Skeleton className="size-5 rounded-full" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-2.5">
          <Skeleton className="size-9 rounded-full" />
          <div className="grid flex-1 gap-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>
      <div className="min-w-0 px-4 pt-6 pb-24 sm:px-6 lg:px-10 lg:pt-12">
        <div className="mx-auto max-w-[1100px]">
          {/* The outer element already says it is loading. */}
          <div aria-hidden="true"><PageSkeleton /></div>
        </div>
      </div>
    </div>
  );
}
