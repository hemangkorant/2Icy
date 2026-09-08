import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'

import { DEFAULT_LAT, DEFAULT_LNG } from '@/lib/daylight'

export interface MapPoint {
  id: string
  lat: number
  lng: number
  label: string
  order?: number
}

export interface MapRoute {
  id: string
  color: string
  label: string
  points: MapPoint[]
}

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'
const DEFAULT_ROUTE_COLOR = '#f5694a'

export function TripMap({
  points,
  routes,
  height = 320,
  drawLine = true,
  onMarkerClick,
}: {
  points?: MapPoint[]
  /** When provided, each route is drawn+coloured independently (e.g. one colour per itinerary day) instead of `points`. */
  routes?: MapRoute[]
  height?: number
  drawLine?: boolean
  onMarkerClick?: (point: MapPoint) => void
}) {
  const allPoints = routes ? routes.flatMap((r) => r.points) : (points ?? [])
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE,
      center: [allPoints[0]?.lng ?? DEFAULT_LNG, allPoints[0]?.lat ?? DEFAULT_LAT],
      zoom: allPoints.length ? 7 : 5,
      attributionControl: { compact: true },
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const groups: MapRoute[] = routes ?? [
      {
        id: 'trip-line',
        color: DEFAULT_ROUTE_COLOR,
        label: '',
        points: points ?? [],
      },
    ]

    const applyMarkers = () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []

      for (const layer of map.getStyle()?.layers ?? []) {
        if (layer.id.startsWith('trip-route-')) map.removeLayer(layer.id)
      }
      for (const sourceId of Object.keys(map.getStyle()?.sources ?? {})) {
        if (sourceId.startsWith('trip-route-')) map.removeSource(sourceId)
      }

      const allValid: MapPoint[] = []

      groups.forEach((group) => {
        const valid = group.points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
        allValid.push(...valid)

        valid.forEach((point, index) => {
          const el = document.createElement('div')
          el.className =
            'flex size-6 items-center justify-center rounded-full text-[11px] font-bold text-white shadow ring-2 ring-white cursor-pointer'
          el.style.backgroundColor = group.color
          el.textContent = String(point.order ?? index + 1)
          el.addEventListener('click', () => onMarkerClick?.(point))
          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([point.lng, point.lat])
            .setPopup(new maplibregl.Popup({ offset: 16 }).setText(group.label ? `${group.label}: ${point.label}` : point.label))
            .addTo(map)
          markersRef.current.push(marker)
        })

        const sourceId = `trip-route-${group.id}`
        if (drawLine && valid.length > 1) {
          map.addSource(sourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: valid.map((p) => [p.lng, p.lat]),
              },
            },
          })
          map.addLayer({
            id: sourceId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': group.color,
              'line-width': 3,
              'line-dasharray': [2, 1],
            },
          })
        }
      })

      if (allValid.length > 0) {
        const bounds = allValid.reduce(
          (b, p) => b.extend([p.lng, p.lat]),
          new maplibregl.LngLatBounds([allValid[0].lng, allValid[0].lat], [allValid[0].lng, allValid[0].lat]),
        )
        map.fitBounds(bounds, { padding: 48, maxZoom: 12, duration: 300 })
      }
    }

    if (map.isStyleLoaded()) applyMarkers()
    else map.once('load', applyMarkers)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, routes, drawLine])

  return <div ref={containerRef} style={{ height }} className="w-full overflow-hidden rounded-lg border border-border" />
}
