import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ALL_TOOLS, PROMPTS, TOOL_GROUPS } from './assistant-tools';

// Everything a connected assistant can do, in the order a lunch goes.
export function Tools() {
  return (
    <section aria-labelledby="tools-h" className="grid gap-4">
      <div>
        <h2 id="tools-h" className="text-xl font-semibold tracking-[-0.03em]">What the assistant can do</h2>
        <p className="mt-1 max-w-2xl text-[14px] leading-6 text-body">
          {ALL_TOOLS.length} tools. An assistant can do only what you can do in the app, so one connected to a member can't lock the picks. Anything that is hard to undo, it asks you about first.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {TOOL_GROUPS.map((g) => (
          <Card key={g.id} aria-labelledby={`tools-${g.id}`}>
            <CardHeader>
              <CardTitle id={`tools-${g.id}`}>{g.title}</CardTitle>
              <CardDescription>{g.blurb}</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3.5">
                {g.tools.map((t) => (
                  <div key={t.name} className="grid gap-0.5">
                    <dt className="flex flex-wrap items-center gap-1.5">
                      <code className="font-mono text-[12.5px] font-medium">{t.name}</code>
                      {t.host && <Badge variant="outline">Host</Badge>}
                      {t.asksFirst && <Badge variant="warning">Asks first</Badge>}
                    </dt>
                    <dd className="text-[13px] leading-5 text-muted-foreground">{t.does}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-[13px] leading-6 text-muted-foreground">
        <span className="font-medium text-foreground">Host</span> means it needs the host's permission, the same as the button in the app.
        Some assistants also offer two ready-made prompts next to the chat box:{' '}
        {PROMPTS.map((p, i) => (
          <span key={p.name}>{i > 0 && ' and '}<code className="font-mono text-[12.5px] text-foreground">{p.name}</code> ({p.does.charAt(0).toLowerCase() + p.does.slice(1, -1)})</span>
        ))}.
      </p>
    </section>
  );
}
