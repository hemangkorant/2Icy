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
    expect(days[0].stops.map((stop) => stop.name)).toEqual(['Arrival and Golden Circle', 'Þingvellir National Park', 'Geysir'])
    expect(days[1]).toMatchObject({ date: '2026-10-11', overnight_location: 'Vik' })
  })

  it('rejects text without dated sections', () => {
    expect(() => parseItineraryText('A list of places around Iceland')).toThrow('No dated itinerary days')
  })

  it('parses itinerary dates without years and stay-in lines', () => {
    const days = parseItineraryText(`
      10 Oct, Saturday
      Land at Keflavik Airport
      Get the rental car
      Stay in Keflavik
      11 Oct, Sunday
      Reykjadalur Hot Spring Thermal River
      Stay in Skógafoss dairy farm stay
    `)

    expect(days.map((day) => day.date)).toEqual(['2026-10-10', '2026-10-11'])
    expect(days[0].stops.map((stop) => stop.name)).toEqual(['Land at Keflavik Airport', 'Get the rental car'])
    expect(days[0].overnight_location).toBe('Keflavik')
    expect(days[1].overnight_location).toBe('Skógafoss dairy farm stay')
  })
})