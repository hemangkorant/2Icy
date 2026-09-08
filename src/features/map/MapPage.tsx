import { format } from 'date-fns'
import { useEffect, useState } from 'react'

import { PageHeader } from '@/components/common/page-header'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { useTrip } from '@/context/trip-context'
import { supabase } from '@/lib/supabase'

import { LazyTripMap as TripMap, type MapRoute } from './LazyTripMap'

interface StopRow {
  id: string
  name: string
  lat: number | null
  lng: number | null
  day_id: string
  itinerary_days: { date: string } | null
}

// A distinct, high-contrast palette cycled across days so each day's route reads as its own colour on the map.
const DAY_COLORS = ['#f5694a', '#276987', '#2f8a5b', '#b8791a', '#7c5cbf', '#c8362a', '#1c8fa8', '#8a5a2f']

export function MapPage() {
  const { activeTripId } = useTrip()
  const [routes, setRoutes] = useState<MapRoute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!activeTripId) return
    setLoading(true)
    supabase
      .from('itinerary_stops')
      .select('id, name, lat, lng, day_id, itinerary_days!inner(date, trip_id)')
      .eq('itinerary_days.trip_id', activeTripId)
      .order('day_id')
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError(fetchError.message)
          setLoading(false)
          return
        }
        const rows = (data ?? []) as unknown as StopRow[]
        const byDay = new Map<string, StopRow[]>()
        for (const row of rows) {
          if (!byDay.has(row.day_id)) byDay.set(row.day_id, [])
          byDay.get(row.day_id)!.push(row)
        }
        const days = [...byDay.entries()].sort(([, a], [, b]) =>
          (a[0]?.itinerary_days?.date ?? '').localeCompare(b[0]?.itinerary_days?.date ?? ''),
        )
        setRoutes(
          days.map(([dayId, stopRows], i) => ({
            id: dayId,
            color: DAY_COLORS[i % DAY_COLORS.length],
            label: stopRows[0]?.itinerary_days?.date ? format(new Date(`${stopRows[0].itinerary_days.date}T00:00:00`), 'EEE d MMM') : 'Day',
            points: stopRows
              .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng))
              .map((r, idx) => ({
                id: r.id,
                lat: r.lat as number,
                lng: r.lng as number,
                label: r.name,
                order: idx + 1,
              })),
          })),
        )
        setLoading(false)
      })
  }, [activeTripId])

  const hasPoints = routes.some((r) => r.points.length > 0)

  return (
    <div>
      <PageHeader title="Map" description="Every planned stop across the whole trip, one colour per day." />
      {loading ? (
        <LoadingState label="Loading map…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : !hasPoints ? (
        <EmptyState title="No pinned stops yet" description='Add stops in the Itinerary and use "Find on map" to pin them here.' />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {routes
              .filter((r) => r.points.length > 0)
              .map((r) => (
                <span key={r.id} className="flex items-center gap-1.5 text-xs font-medium">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                  {r.label}
                </span>
              ))}
          </div>
          <TripMap routes={routes} height={560} />
        </>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Map data © OpenFreeMap, © OpenMapTiles, © OpenStreetMap contributors.</p>
    </div>
  )
}
