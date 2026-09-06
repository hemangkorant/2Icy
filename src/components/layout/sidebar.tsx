import { Mountain } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { cn } from '@/lib/utils'

import { NAV_ITEMS } from './nav-config'

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r-2 border-border bg-background md:flex">
      <div className="flex items-center gap-2 border-b-2 border-border px-5 py-5">
        <Mountain className="size-5 text-primary" aria-hidden="true" />
        <span className="font-extrabold tracking-tight">Iceland Trip</span>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-4">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 border-l-2 border-transparent px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-[#fff2ef] hover:text-primary',
                isActive && 'border-primary bg-[#fff2ef] text-primary',
              )
            }
          >
            <item.icon className="size-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
