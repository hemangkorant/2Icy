import { IconLogout, IconWifi, IconWifiOff } from '@tabler/icons-react'

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
import { getDisplayName, getInitials } from '@/lib/profile'

export function TopBar() {
  const { profile, signOut } = useAuth()
  const { activeTrip } = useTrip()
  const online = useOnlineStatus()

  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3 sm:px-6">
      <div>
        <p className="text-lg font-extrabold leading-tight">{activeTrip?.name ?? 'Roamio'}</p>
        {activeTrip?.start_date && activeTrip?.end_date && (
          <p className="text-xs text-muted-foreground">
            {activeTrip.start_date} – {activeTrip.end_date} · {activeTrip.timezone}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span
          title={online ? 'Online' : 'Offline — showing cached data'}
          className="text-muted-foreground"
          aria-label={online ? 'Online' : 'Offline — showing cached data'}
        >
          {online ? <IconWifi className="size-4" aria-hidden="true" /> : <IconWifiOff className="size-4 text-warning" aria-hidden="true" />}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2" aria-label="Open account menu">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {getInitials(profile)}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{getDisplayName(profile)}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()}>
              <IconLogout className="size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
