import { IconDots } from '@tabler/icons-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

import { MOBILE_PRIMARY_PATHS, NAV_ITEMS } from './nav-config'

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const primary = NAV_ITEMS.filter((item) => MOBILE_PRIMARY_PATHS.includes(item.to))
  const overflow = NAV_ITEMS.filter((item) => !MOBILE_PRIMARY_PATHS.includes(item.to))

  return (
    <>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm md:hidden">
        <div className="grid grid-cols-5">
          {primary.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-muted-foreground transition-colors',
                  isActive && 'text-primary',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn('flex size-7 items-center justify-center rounded-full transition-colors', isActive && 'bg-accent')}>
                    <item.icon className="size-5" />
                  </span>
                  {item.label === 'Safety & Weather' ? 'Safety' : item.label}
                </>
              )}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-muted-foreground"
          >
            <span className="flex size-7 items-center justify-center rounded-full">
              <IconDots className="size-5" />
            </span>
            More
          </button>
        </div>
      </nav>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent className="bottom-0 top-auto max-w-full translate-y-0 rounded-b-none sm:bottom-1/2 sm:max-w-lg sm:translate-y-1/2 sm:rounded-xl">
          <DialogHeader>
            <DialogTitle>More</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 pb-2">
            {overflow.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1.5 rounded-lg border border-border p-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-foreground/25',
                    isActive && 'border-primary bg-accent text-accent-foreground',
                  )
                }
              >
                <item.icon className="size-5" />
                <span className="text-center leading-tight">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
