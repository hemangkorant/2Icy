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

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

export function TripMap({
  points,
  height = 320,
  drawLine = true,
  onMarkerClick,
}: {
  points: MapPoint[]
  height?: number
  drawLine?: boolean
  onMarkerClick?: (point: MapPoint) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE,
      center: [points[0]?.lng ?? DEFAULT_LNG, points[0]?.lat ?? DEFAULT_LAT],
      zoom: points.length ? 7 : 5,
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

    const applyMarkers = () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []

      const valid = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))

      valid.forEach((point, index) => {
        const el = document.createElement('div')
        el.className = 'flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow ring-2 ring-white cursor-pointer'
        el.textContent = String(point.order ?? index + 1)
        el.addEventListener('click', () => onMarkerClick?.(point))
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([point.lng, point.lat])
          .setPopup(new maplibregl.Popup({ offset: 16 }).setText(point.label))
          .addTo(map)
        markersRef.current.push(marker)
      })

      const lineSourceId = 'trip-line'
      if (map.getLayer(lineSourceId)) map.removeLayer(lineSourceId)
      if (map.getSource(lineSourceId)) map.removeSource(lineSourceId)

      if (drawLine && valid.length > 1) {
        map.addSource(lineSourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: valid.map((p) => [p.lng, p.lat]) },
          },
        })
        map.addLayer({
          id: lineSourceId,
          type: 'line',
          source: lineSourceId,
          paint: { 'line-color': '#42708a', 'line-width': 3, 'line-dasharray': [2, 1] },
        })
      }

      if (valid.length > 0) {
        const bounds = valid.reduce(
          (b, p) => b.extend([p.lng, p.lat]),
          new maplibregl.LngLatBounds([valid[0].lng, valid[0].lat], [valid[0].lng, valid[0].lat]),
        )
        map.fitBounds(bounds, { padding: 48, maxZoom: 12, duration: 300 })
      }
    }

    if (map.isStyleLoaded()) applyMarkers()
    else map.once('load', applyMarkers)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, drawLine])

  return <div ref={containerRef} style={{ height }} className="w-full overflow-hidden rounded-lg border border-border" />
}
