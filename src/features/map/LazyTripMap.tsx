import { lazy, Suspense } from 'react'

import type { MapPoint } from './TripMap'

export type { MapPoint }

// maplibre-gl is a large dependency (~500KB) only needed on the two screens
// that render a map. Splitting it into its own chunk keeps it out of the
// initial bundle everyone downloads, which matters on the patchy mobile
// connectivity this app is built for.
const RealTripMap = lazy(() => import('./TripMap').then((m) => ({ default: m.TripMap })))

export function LazyTripMap(props: { points: MapPoint[]; height?: number; drawLine?: boolean; onMarkerClick?: (point: MapPoint) => void }) {
  return (
    <Suspense
      fallback={
        <div
          style={{ height: props.height ?? 320 }}
          className="flex w-full items-center justify-center rounded-lg border border-border bg-muted text-sm text-muted-foreground"
        >
          Loading map…
        </div>
      }
    >
      <RealTripMap {...props} />
    </Suspense>
  )
}
