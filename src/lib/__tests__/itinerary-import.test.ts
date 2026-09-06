import { describe, expect, it } from 'vitest'

import { parseItineraryText } from '@/lib/itinerary-import'

describe('parseItineraryText', () => {
  it('groups dated itinerary sections and extracts overnight locations and stops', () => {
    const days = parseItineraryText(`
      Day 1 - 2026-10-10
      Arrival and Golden Circle
      Overnight: Selfoss
      Þingvellir National Park
      Geysir

      2026-10-11
      South Coast
      Stay: Vik
      Seljalandsfoss
      Skógafoss
    `)

    expect(days).toHaveLength(2)
    expect(days[0]).toMatchObject({ date: '2026-10-10', overnight_location: 'Selfoss' })
    expect(days[0].stops.map((stop) => stop.name)).toEqual(['Þingvellir National Park', 'Geysir'])
    expect(days[1]).toMatchObject({ date: '2026-10-11', overnight_location: 'Vik' })
  })

  it('rejects text without dated sections', () => {
    expect(() => parseItineraryText('A list of places around Iceland')).toThrow('No dated itinerary days')
  })
})