import type { ComponentProps } from 'react';
import { Icon } from '@/ui';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// A button that is only a picture, with the words kept for screen readers and for a hover tip.
export function IconButton({ icon, label, size = 16, ...props }: { icon: string; label: string; size?: number } & Omit<ComponentProps<typeof Button>, 'children' | 'aria-label' | 'size'>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={label} {...props}>
          <Icon name={icon} size={size} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
