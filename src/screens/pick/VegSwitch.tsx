import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export function VegSwitch({ id, checked, onChange }: { id: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2.5">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="text-[13px] font-normal">Veg only</Label>
    </div>
  );
}
