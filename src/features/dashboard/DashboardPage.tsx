import { Backpack, Banknote, CheckSquare, CloudSun, Plane } from 'lucide-react'
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
  const days = useRealtimeTable('itinerary_days', 'trip_id', activeTripId, { orderBy: 'sort_order' })
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
          <CardContent className="flex items-center gap-3 p-4">
            <Plane className="size-8 text-primary" />
            <div>
              <p className="font-medium">
                {upcomingFlight.airline} {upcomingFlight.flight_number}: {upcomingFlight.departure_airport} → {upcomingFlight.arrival_airport}
              </p>
              <p className="text-sm text-muted-foreground">
                Departs {formatFriendlyDateTime(upcomingFlight.departure_at)} · {relativeToNow(upcomingFlight.departure_at)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/itinerary">
          <Card className="h-full transition-colors hover:border-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{todayDay ? "Today's plan" : 'Next day'}</CardTitle>
            </CardHeader>
            <CardContent>
              {todayDay || nextDay ? (
                <>
                  <p className="font-medium">{(todayDay ?? nextDay)?.title || (todayDay ?? nextDay)?.overnight_location || 'Untitled'}</p>
                  <p className="text-xs text-muted-foreground">{formatFriendlyDate((todayDay ?? nextDay)?.date)}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No itinerary days yet.</p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link to="/safety">
          <Card className="h-full transition-colors hover:border-primary">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <CloudSun className="size-4" /> Safety & weather
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Check today's weather & road status before driving.</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/tasks">
          <Card className="h-full transition-colors hover:border-primary">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <CheckSquare className="size-4" /> Pre-trip tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{openTasks.length} open</p>
              <Badge variant={openTasks.length === 0 ? 'success' : 'secondary'} className="mt-1">
                {tasks.data.length - openTasks.length}/{tasks.data.length} done
              </Badge>
            </CardContent>
          </Card>
        </Link>

        <Link to="/packing">
          <Card className="h-full transition-colors hover:border-primary">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Backpack className="size-4" /> Packing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={packingPct} />
              <p className="mt-1 text-xs text-muted-foreground">
                {packedCount}/{packing.data.length} packed
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Link to="/expenses">
        <Card className="transition-colors hover:border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Banknote className="size-4" /> Spend so far
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
