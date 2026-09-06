export interface RoutePoint {
  lat: number
  lng: number
  name?: string
}

export interface RouteEstimate {
  distanceKm: number | null
  durationMinutes: number | null
  source: 'manual'
}

/**
 * A routing adapter turns two points into a distance/duration estimate.
 * The app ships only a ManualRoutingAdapter (no paid directions API). The
 * interface exists so a real adapter (e.g. a paid Directions API, or a
 * self-hosted OSRM instance) can be dropped in later without touching any
 * UI code — see itinerary feature components, which depend on this
 * interface, not on a concrete implementation.
 */
export interface RoutingAdapter {
  estimate(from: RoutePoint, to: RoutePoint): Promise<RouteEstimate>
}

/** Default adapter: distance/duration are whatever the traveler typed in manually. */
export class ManualRoutingAdapter implements RoutingAdapter {
  async estimate(): Promise<RouteEstimate> {
    return { distanceKm: null, durationMinutes: null, source: 'manual' }
  }
}

export function googleMapsDirectionsUrl(from: RoutePoint, to: RoutePoint): string {
  const origin = `${from.lat},${from.lng}`;
  const destination = `${to.lat},${to.lng}`;
  const params = new URLSearchParams({
    api: '1',
    origin,
    destination,
    travelmode: 'driving',
  })
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export function googleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export const defaultRoutingAdapter: RoutingAdapter = new ManualRoutingAdapter()
