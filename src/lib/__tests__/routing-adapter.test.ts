import { describe, expect, it } from 'vitest'

import { googleMapsDirectionsUrl, googleMapsSearchUrl, ManualRoutingAdapter } from '../routing-adapter'

describe('googleMapsDirectionsUrl', () => {
  it('builds a driving directions URL with origin and destination coordinates', () => {
    const url = googleMapsDirectionsUrl({ lat: 64.1466, lng: -21.9426 }, { lat: 63.4186, lng: -19.006 })
    expect(url).toContain('origin=64.1466%2C-21.9426')
    expect(url).toContain('destination=63.4186%2C-19.006')
    expect(url).toContain('travelmode=driving')
  })
})

describe('googleMapsSearchUrl', () => {
  it('encodes the query string', () => {
    const url = googleMapsSearchUrl('Seljalandsfoss, Iceland')
    expect(url).toBe('https://www.google.com/maps/search/?api=1&query=Seljalandsfoss%2C%20Iceland')
  })
})

describe('ManualRoutingAdapter', () => {
  it('returns null distance/duration, deferring entirely to manual entry', async () => {
    const adapter = new ManualRoutingAdapter()
    const estimate = await adapter.estimate()
    expect(estimate).toEqual({ distanceKm: null, durationMinutes: null, source: 'manual' })
  })
})
