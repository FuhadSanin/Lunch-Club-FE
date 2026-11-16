import { Connections } from './connect/Connections';
import { Icon } from '@/ui';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Examples } from './connect/Examples';
import { Setup } from './connect/Setup';
import { Tools } from './connect/Tools';

// Ask an AI assistant to run lunch for you. There is one way in: the assistant signs in (it opens #/authorize/<id>,
// where you press Allow) and then acts as you, with your own permissions. This page shows how to use it (with examples), how to connect, what
// it can do, and who is connected.
export default function Connect() {
  return (
    <>
      <header className="mb-8 sm:mb-10">
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.04em] sm:text-[32px]">Connect to an AI assistant</h1>
        <Dialog>
          <div className="mt-1.5">
            <DialogTrigger asChild>
              <button type="button" className="inline-flex items-center gap-1.5 rounded-sm text-[14px] font-medium text-brand underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50">
                <Icon name="doc" size={15} /> How to use
              </button>
            </DialogTrigger>
          </div>
          <DialogContent className="flex max-h-[90dvh] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(94vw,860px)]">
            <DialogTitle className="sr-only">How to use</DialogTitle>
            <DialogDescription className="sr-only">Four things to say to a connected assistant, and what changes in the app.</DialogDescription>
            <div className="min-h-0 flex-1 overflow-y-auto p-5 pt-12 sm:p-7 sm:pt-12">
              <Examples />
            </div>
          </DialogContent>
        </Dialog>
        <p className="mt-3 max-w-2xl text-[15px] leading-6 text-body">
          Run lunch by talking: start it, share the link, pick dishes and keep track, from Claude or another assistant. You sign in once and press Allow; after that it acts as you, with your own permissions.
        </p>
      </header>
      <div className="grid max-w-[900px] gap-10">
        <div className="grid gap-4">
          <Setup />
          <Connections />
        </div>
        <Tools />
      </div>
    </>
  );
}
