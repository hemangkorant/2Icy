import { LogOut, Wifi, WifiOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/context/auth-context'
import { useTrip } from '@/context/trip-context'
import { useOnlineStatus } from '@/hooks/use-online-status'

export function TopBar() {
  const { profile, signOut } = useAuth()
  const { activeTrip } = useTrip()
  const online = useOnlineStatus()

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-6">
      <div>
        <p className="text-sm font-semibold leading-tight">{activeTrip?.name ?? 'Iceland Trip'}</p>
        {activeTrip?.start_date && activeTrip?.end_date && (
          <p className="text-xs text-muted-foreground">
            {activeTrip.start_date} – {activeTrip.end_date} · {activeTrip.timezone}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span title={online ? 'Online' : 'Offline — showing cached data'} className="text-muted-foreground" aria-label={online ? 'Online' : 'Offline — showing cached data'}>
          {online ? <Wifi className="size-4" aria-hidden="true" /> : <WifiOff className="size-4 text-warning" aria-hidden="true" />}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2" aria-label="Open account menu">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {(profile?.full_name ?? profile?.email ?? '?').slice(0, 1).toUpperCase()}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{profile?.full_name ?? profile?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
