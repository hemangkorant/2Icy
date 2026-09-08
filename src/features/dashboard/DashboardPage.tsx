import { IconBackpack, IconCalendar, IconCashBanknote, IconCloudStorm, IconPlane, IconSquareCheck } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { LoadingState } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useTrip } from '@/context/trip-context'
import { useRealtimeTable } from '@/hooks/use-realtime-table'
import { formatFriendlyDate, formatFriendlyDateTime, relativeToNow, todayIcelandIso } from '@/lib/dates'

export function DashboardPage() {
  const { activeTrip, activeTripId } = useTrip()
  const days = useRealtimeTable('itinerary_days', 'trip_id', activeTripId, { orderBy: 'date' })
  const flights = useRealtimeTable('flights', 'trip_id', activeTripId, { orderBy: 'departure_at' })
  const tasks = useRealtimeTable('tasks', 'trip_id', activeTripId)
  const packing = useRealtimeTable('packing_items', 'trip_id', activeTripId)
  const expenses = useRealtimeTable('expenses', 'trip_id', activeTripId)

  if (days.loading || flights.loading) return <LoadingState label="Loading dashboard…" />

  const today = todayIcelandIso()
  const todayDay = days.data.find((d) => d.date === today)
  const nextDay = days.data.find((d) => d.date >= today) ?? days.data[0]
  const upcomingFlight = flights.data.find((f) => f.departure_at && new Date(f.departure_at) > new Date())

  const openTasks = tasks.data.filter((t) => !t.completed)
  const packedCount = packing.data.filter((p) => p.packed).length
  const packingPct = packing.data.length ? Math.round((packedCount / packing.data.length) * 100) : 0
  const totalIsk = expenses.data.filter((e) => e.currency === 'ISK').reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{activeTrip?.name}</h1>
        <p className="text-sm text-muted-foreground">
          {formatFriendlyDate(activeTrip?.start_date)} – {formatFriendlyDate(activeTrip?.end_date)}
        </p>
      </div>

      {upcomingFlight && (
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <IconPlane className="size-6" />
            </span>
            <div>
              <p className="font-medium">
                {upcomingFlight.airline} {upcomingFlight.flight_number}: {upcomingFlight.departure_airport} →{' '}
                {upcomingFlight.arrival_airport}
              </p>
              <p className="text-sm text-muted-foreground">
                Departs {formatFriendlyDateTime(upcomingFlight.departure_at)} · {relativeToNow(upcomingFlight.departure_at)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          to="/itinerary"
          icon={
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <IconCalendar className="size-4" />
            </span>
          }
          title={todayDay ? "Today's plan" : 'Next day'}
        >
          {todayDay || nextDay ? (
            <>
              <p className="font-medium">{(todayDay ?? nextDay)?.title || (todayDay ?? nextDay)?.overnight_location || 'Untitled'}</p>
              <p className="text-xs text-muted-foreground">{formatFriendlyDate((todayDay ?? nextDay)?.date)}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No itinerary days yet.</p>
          )}
        </StatCard>

        <StatCard
          to="/safety"
          icon={
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-secondary-tint)] text-[var(--color-secondary)]">
              <IconCloudStorm className="size-4" />
            </span>
          }
          title="Safety & weather"
        >
          <p className="text-sm text-muted-foreground">Check today's weather & road status before driving.</p>
        </StatCard>

        <StatCard
          to="/tasks"
          icon={
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <IconSquareCheck className="size-4" />
            </span>
          }
          title="Pre-trip tasks"
        >
          <p className="font-medium">{openTasks.length} open</p>
          <Badge variant={openTasks.length === 0 ? 'success' : 'secondary'} className="mt-1">
            {tasks.data.length - openTasks.length}/{tasks.data.length} done
          </Badge>
        </StatCard>

        <StatCard
          to="/packing"
          icon={
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-success-tint)] text-[var(--color-success)]">
              <IconBackpack className="size-4" />
            </span>
          }
          title="Packing"
        >
          <Progress value={packingPct} />
          <p className="mt-1 text-xs text-muted-foreground">
            {packedCount}/{packing.data.length} packed
          </p>
        </StatCard>
      </div>

      <Link to="/expenses">
        <Card className="transition-colors hover:border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <span className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <IconCashBanknote className="size-4" />
              </span>
              Spend so far
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{totalIsk.toLocaleString()} ISK</p>
            <p className="text-xs text-muted-foreground">{expenses.data.length} expenses logged</p>
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}

function StatCard({ to, icon, title, children }: { to: string; icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Link to={to}>
      <Card className="h-full transition-colors hover:border-primary">
        <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
          {icon}
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </Link>
  )
}
