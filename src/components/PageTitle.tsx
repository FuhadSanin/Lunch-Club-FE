import type { ReactNode } from 'react';

export function PageTitle({ title, sub, actions, large }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; large?: boolean }) {
  return (
    <div className="mb-8 flex flex-col gap-5 sm:mb-10 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className={large ? 'text-[32px] font-semibold leading-[1.05] tracking-[-0.045em] sm:text-[40px]' : 'text-[28px] font-semibold leading-tight tracking-[-0.04em] sm:text-[32px]'}>
          {title}
        </h1>
        {sub && <p className="mt-2.5 max-w-2xl text-[15px] leading-6 text-body">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 max-sm:[&>*]:h-11 max-sm:[&>*]:flex-1">{actions}</div>}
    </div>
  );
}
