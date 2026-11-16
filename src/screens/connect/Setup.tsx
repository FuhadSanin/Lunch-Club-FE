import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { Icon } from '@/ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Where the Tiffmate MCP server lives: the address an AI assistant connects to.
const MCP_URL = (import.meta.env.VITE_MCP_URL as string | undefined) || 'https://tiffmate.vercel.app/mcp';
const CLAUDE_CODE_COMMAND = `claude mcp add --transport http tiffmate ${MCP_URL}`;

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    toast.error("Couldn't copy", { description: 'Select the text and copy it by hand.' });
  }
}

// A line of text to copy.
function Copyable({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex items-start gap-2 max-sm:flex-col">
      <pre tabIndex={0} aria-label={label} className="min-w-0 flex-1 self-stretch overflow-x-auto rounded-xl bg-muted/60 p-3 font-mono text-[12.5px] leading-5 whitespace-pre">{text}</pre>
      <Button type="button" size="sm" variant="outline" className="flex-none max-sm:w-full" onClick={() => void copy(text, label)}>
        <Icon name="copy" size={14} /> Copy
      </Button>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3.5 gap-y-2.5">
      <span aria-hidden="true" className="mt-px grid size-6 place-items-center rounded-full bg-ink text-xs font-semibold text-on-ink">{n}</span>
      <h3 className="text-[15px] leading-6 font-semibold tracking-[-0.01em]">{title}</h3>
      <div className="col-start-2 grid gap-2.5 text-[13.5px] leading-6 text-body">{children}</div>
    </li>
  );
}

const Em = ({ children }: { children: ReactNode }) => <strong className="font-medium text-foreground">{children}</strong>;

// The one way to connect: the assistant signs in. Nothing to copy, nothing to keep safe.
export function Setup() {
  return (
    <Card aria-labelledby="connect-h">
      <CardHeader>
        <CardTitle id="connect-h">Connect in three steps</CardTitle>
        <CardDescription>
          You sign in once. There is nothing to copy or keep safe: your assistant asks, you press Allow, and it is connected.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="grid gap-7">
          <Step n={1} title="Copy the server address">
            <Copyable label="Server address" text={MCP_URL} />
          </Step>

          <Step n={2} title="Add it to your assistant">
            <Tabs defaultValue="chatgpt" className="gap-3">
              <TabsList>
                <TabsTrigger value="chatgpt">ChatGPT</TabsTrigger>
                <TabsTrigger value="claude">Claude app</TabsTrigger>
                <TabsTrigger value="code">Claude Code</TabsTrigger>
                <TabsTrigger value="other">Others</TabsTrigger>
              </TabsList>
              <TabsContent value="chatgpt" className="grid gap-2.5">
                <ol className="list-decimal pl-5">
                  <li>Open <Em>Settings</Em>, then <Em>Connectors</Em>, then <Em>Advanced</Em>, and turn on <Em>Developer mode</Em>.</li>
                  <li>Choose <Em>Create</Em>. Name it Tiffmate and paste the address as the server URL.</li>
                  <li>Set authentication to <Em>OAuth</Em>, then press <Em>Create</Em>.</li>
                  <li>In a new chat, add Tiffmate from the <Em>+</Em> menu (under More) and press <Em>Connect</Em>.</li>
                </ol>
                <p className="text-[13px] text-muted-foreground">Custom connectors need a ChatGPT plan or workspace that allows them, and menu names can differ a little by plan.</p>
              </TabsContent>
              <TabsContent value="claude">
                <ol className="list-decimal pl-5">
                  <li>Open <Em>Settings</Em>, then <Em>Connectors</Em>.</li>
                  <li>Choose <Em>Add custom connector</Em>, name it Tiffmate and paste the address.</li>
                  <li>Press <Em>Add</Em>, then <Em>Connect</Em>.</li>
                </ol>
              </TabsContent>
              <TabsContent value="code" className="grid gap-2.5">
                <p>Run this in a terminal, then type <span className="font-mono text-[12.5px]">/mcp</span> in Claude Code and choose <Em>Authenticate</Em>.</p>
                <Copyable label="Claude Code command" text={CLAUDE_CODE_COMMAND} />
              </TabsContent>
              <TabsContent value="other">
                <p>Any assistant that can add a remote MCP server over HTTP works the same way: add a server or connector, paste the address, and connect. It will open Tiffmate to sign in.</p>
              </TabsContent>
            </Tabs>
            <div className="mt-1 flex flex-wrap items-center gap-3 rounded-xl border bg-muted/30 p-3">
              <img src="/brand/tiffmate-logo.png" alt="" width={48} height={48} className="size-12 flex-none rounded-xl border bg-white" />
              <p className="min-w-0 flex-1 basis-48 text-[13px] leading-5 text-muted-foreground">
                <span className="block text-sm font-medium text-foreground">Tiffmate logo</span>
                Use it as the icon when ChatGPT or Claude asks for one while you create the connector. The PNG is 256 × 256 and under 10 KB, which is what ChatGPT accepts.
              </p>
              <div className="flex flex-none items-center gap-2">
                <Button asChild size="sm"><a href="/brand/tiffmate-logo.png" download="tiffmate-logo.png"><Icon name="download" size={14} /> Download logo</a></Button>
                <Button asChild size="sm" variant="ghost"><a href="/brand/tiffmate-logo.svg" download="tiffmate-logo.svg">SVG</a></Button>
              </div>
            </div>
          </Step>

          <Step n={3} title="Press Allow">
            <p>Your assistant opens Tiffmate in your browser. Check the name, then press <Em>Allow</Em>. It shows up below, and you can disconnect it any time.</p>
          </Step>
        </ol>
      </CardContent>
    </Card>
  );
}
