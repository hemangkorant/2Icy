import { useEffect, useState } from 'react'

import { PageHeader } from '@/components/common/page-header'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { useTrip } from '@/context/trip-context'
import { supabase } from '@/lib/supabase'

import { LazyTripMap as TripMap, type MapPoint } from './LazyTripMap'

interface StopRow {
  id: string
  name: string
  lat: number | null
  lng: number | null
  day_id: string
  itinerary_days: { date: string } | null
}

export function MapPage() {
  const { activeTripId } = useTrip()
  const [points, setPoints] = useState<MapPoint[]>([])
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
        const sorted = [...rows].sort((a, b) => (a.itinerary_days?.date ?? '').localeCompare(b.itinerary_days?.date ?? ''))
        setPoints(
          sorted
            .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng))
            .map((r, i) => ({ id: r.id, lat: r.lat as number, lng: r.lng as number, label: r.name, order: i + 1 })),
        )
        setLoading(false)
      })
  }, [activeTripId])

  return (
    <div>
      <PageHeader title="Map" description="Every planned stop across the whole trip, in order." />
      {loading ? (
        <LoadingState label="Loading map…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : points.length === 0 ? (
        <EmptyState title="No pinned stops yet" description="Add latitude/longitude to stops in the Itinerary to see them here." />
      ) : (
        <TripMap points={points} height={560} />
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Map data © OpenFreeMap, © OpenMapTiles, © OpenStreetMap contributors.
      </p>
    </div>
  )
}
