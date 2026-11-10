import * as React from "react"
import { ChevronDownIcon, ClockIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// A Vercel-style time field: a trigger that reads like an input, and a popover grid of times
// grouped by hour. Times are "HH:MM" (24-hour) strings; `now` greys out the ones already past.

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))

export const clock = (t: string) => {
  const [h, m] = t.split(":").map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`
}

const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? "am" : "pm"}`

const until = (mins: number) =>
  mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h${mins % 60 ? ` ${mins % 60} min` : ""}`

function TimePicker({
  id,
  value,
  onValueChange,
  options,
  now,
  className,
}: {
  id?: string
  value: string
  onValueChange: (value: string) => void
  options: string[]
  now?: string
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const grid = React.useRef<HTMLDivElement>(null)

  // Rows by hour, in the order given. A time earlier in the day than the one before it starts the
  // next day, so a list that runs past midnight reads "Today" then "Tomorrow".
  const hours = React.useMemo(() => {
    const out: { key: string; day: number; hour: number; times: string[] }[] = []
    let day = 0
    options.forEach((t, i) => {
      if (i > 0 && toMin(t) < toMin(options[i - 1])) day += 1
      const hour = Number(t.slice(0, 2))
      const last = out.at(-1)
      if (last && last.day === day && last.hour === hour) last.times.push(t)
      else out.push({ key: `${day}-${hour}`, day, hour, times: [t] })
    })
    return out
  }, [options])
  const hasDays = hours.some((h) => h.day > 0)
  const left = now ? (toMin(value) - toMin(now) + 1440) % 1440 : 0

  // Arrow keys move through the grid: left and right by one time, up and down by one hour row.
  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4 }[e.key]
    if (!step || !grid.current) return
    const cells = [...grid.current.querySelectorAll<HTMLButtonElement>("button")]
    const next = cells[cells.indexOf(document.activeElement as HTMLButtonElement) + step]
    e.preventDefault()
    if (next && !next.disabled) {
      next.focus()
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn(
            "group flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-left text-sm shadow-xs transition-[color,border-color,box-shadow] duration-150 outline-none hover:border-line-strong focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15 data-[state=open]:border-ring data-[state=open]:ring-4 data-[state=open]:ring-ring/15 dark:bg-input/30 dark:hover:bg-input/50",
            className
          )}
        >
          <ClockIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 tabular-nums">{clock(value)}</span>
          {now && left > 0 && <span className="text-[13px] text-muted-foreground">in {until(left)}</span>}
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-(--radix-popover-trigger-width) min-w-72 gap-0 rounded-xl p-1.5 shadow-float"
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          grid.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus()
        }}
      >
        <div ref={grid} role="group" aria-label="Times" onKeyDown={onKeyDown} className="no-scrollbar grid max-h-[min(50vh,320px)] gap-0.5 overflow-y-auto overscroll-contain">
          {hours.map(({ key, day, hour, times }, i) => (
            <React.Fragment key={key}>
              {hasDays && (i === 0 || hours[i - 1].day !== day) && (
                <span className="sticky top-0 z-10 bg-popover px-1.5 pt-1.5 pb-1 text-xs font-medium text-foreground">{day === 0 ? "Today" : "Tomorrow"}</span>
              )}
            <div className="grid grid-cols-[3.25rem_repeat(4,minmax(0,1fr))] items-center gap-0.5">
              <span className="pl-1.5 text-xs text-muted-foreground tabular-nums">{hourLabel(hour)}</span>
              {times.map((t) => {
                const on = t === value
                return (
                  <Button
                    key={t}
                    type="button"
                    size="sm"
                    variant={on ? "default" : "ghost"}
                    aria-pressed={on}
                    aria-label={`${clock(t)}${day ? " tomorrow" : ""}`}
                    style={{ gridColumnStart: Number(t.slice(3)) / 15 + 2 }}
                    onClick={() => {
                      onValueChange(t)
                      setOpen(false)
                    }}
                    className={cn("h-8 rounded-md px-0 tabular-nums disabled:bg-transparent disabled:text-muted-foreground disabled:opacity-40", !on && "font-normal")}
                  >
                    :{t.slice(3)}
                  </Button>
                )
              })}
            </div>
            </React.Fragment>
          ))}
        </div>
        {now && (
          <p className="mt-1.5 border-t px-1.5 pt-2 pb-0.5 text-xs text-muted-foreground">
            It's {clock(now)} now. Pick any time in the next day.
          </p>
        )}
      </PopoverContent>
    </Popover>
  )
}

export { TimePicker }
