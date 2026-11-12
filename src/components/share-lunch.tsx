import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Icon } from '@/ui';

// The link that opens Pick my lunch for one lunch (#/lunch/<id>); in the demo, plain #/pick.
export const lunchLink = (lunchId?: string | null) =>
  `${window.location.origin}${window.location.pathname}#/${lunchId ? `lunch/${lunchId}` : 'pick'}`;

const copyText = async (text: string, done: string, hint?: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done, hint ? { description: hint } : undefined);
    return true;
  } catch {
    toast.error("Couldn't copy", { description: 'Select the link and copy it by hand.' });
    return false;
  }
};

// Share today's lunch: a QR code for people in the room, WhatsApp and Slack for everyone else.
// WhatsApp takes the message in its link. Slack has no link that fills in a message, so the message is
// copied and Slack opens, ready to paste. On phones, "More" opens the phone's own share sheet.
export function ShareLunch({ link, cutoff, name, label = 'Share', variant = 'outline', className }: {
  link: string; cutoff?: string; name?: string; label?: string; variant?: 'outline' | 'default' | 'secondary'; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const qr = useRef<HTMLDivElement>(null);
  const message = `${name ? `${name}: lunch` : 'Lunch'} is on. Pick yours${cutoff ? ` before ${cutoff}` : ''}: ${link}`;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const slack = async () => {
    if (await copyText(message, 'Message copied for Slack', 'Paste it in your team channel.')) window.location.href = 'slack://open';
  };
  const more = () => navigator.share({ title: 'Pick your lunch', text: message.replace(`: ${link}`, '.'), url: link }).catch(() => undefined);
  // The QR as a PNG, to post in a channel or print for the pantry.
  const download = () => {
    const svg = qr.current?.querySelector('svg');
    if (!svg) return;
    const img = new Image(), size = 768, pad = 48;
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = c.height = size + pad * 2;
      const g = c.getContext('2d')!;
      g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, pad, pad, size, size);
      const a = document.createElement('a');
      a.download = 'lunch-qr.png'; a.href = c.toDataURL('image/png'); a.click();
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className={className}><Icon name="share" />{label}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Share {name ? `“${name}”` : "today's lunch"}</DialogTitle>
          <DialogDescription>Scan the code or send the link. It opens Pick my lunch{cutoff ? `, open until ${cutoff}` : ''}.</DialogDescription>
        </DialogHeader>
        <div className="grid justify-items-center gap-3">
          {/* Always dark on white, so it scans in dark mode too. */}
          <div ref={qr} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
            <QRCodeSVG value={link} size={200} level="M" fgColor="#171717" bgColor="#ffffff" title="QR code for the lunch link" />
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={download}><Icon name="download" />Download QR</Button>
        </div>
        <div className="flex gap-2">
          <Input readOnly spellCheck={false} value={link} aria-label="Lunch link" onFocus={(e) => e.currentTarget.select()} className="h-10 font-mono text-[13px]" />
          <Button variant="outline" className="h-10" onClick={() => void copyText(link, 'Link copied', 'Paste it in the team chat.')}><Icon name="copy" />Copy</Button>
        </div>
        <div className={canShare ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-2 gap-2'}>
          <Button asChild variant="outline" className="h-11">
            <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer"><Icon name="chat" />WhatsApp</a>
          </Button>
          <Button variant="outline" className="h-11" onClick={() => void slack()}><Icon name="hash" />Slack</Button>
          {canShare && <Button variant="outline" className="h-11" onClick={more}><Icon name="share" />More</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
