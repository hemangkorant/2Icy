export interface GeocodeResult {
  label: string
  address: string
  lat: number
  lng: number
  town: string | null
}

/**
 * Free OSM Nominatim lookup — no API key. Nominatim's usage policy caps
 * this at ~1 request/second and asks that it not be called on every
 * keystroke, so every caller here is triggered by an explicit button click,
 * never by a debounced text-change handler.
 */
export async function geocodePlace(query: string): Promise<GeocodeResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []
  const params = new URLSearchParams({
    q: trimmed,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '5',
    countrycodes: 'is',
  })
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error('Location lookup failed')
  const results = (await response.json()) as Array<{
    display_name: string
    lat: string
    lon: string
    address?: {
      town?: string
      city?: string
      village?: string
      municipality?: string
    }
  }>
  return results.map((r) => ({
    label: r.display_name.split(',')[0],
    address: r.display_name,
    lat: Number(r.lat),
    lng: Number(r.lon),
    town: r.address?.town ?? r.address?.city ?? r.address?.village ?? r.address?.municipality ?? null,
  }))
}
