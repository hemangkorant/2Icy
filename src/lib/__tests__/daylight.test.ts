import { describe, expect, it } from 'vitest'

import { getDaylightWarning, getDaylightWindow } from '../daylight'

describe('getDaylightWindow', () => {
  it('returns a shorter day in mid-October than in midsummer for Reykjavik', () => {
    const octoberWindow = getDaylightWindow(new Date('2026-10-15T12:00:00Z'), 64.1466, -21.9426)
    const juneWindow = getDaylightWindow(new Date('2026-06-15T12:00:00Z'), 64.1466, -21.9426)
    expect(octoberWindow.daylightMinutes).toBeLessThan(juneWindow.daylightMinutes)
    expect(octoberWindow.daylightMinutes).toBeGreaterThan(0)
  })

  it('civil daylight window is at least as long as the sunrise-to-sunset window', () => {
    const window = getDaylightWindow(new Date('2026-10-15T12:00:00Z'), 64.1466, -21.9426)
    expect(window.civilDaylightMinutes).toBeGreaterThanOrEqual(window.daylightMinutes)
  })
})

describe('getDaylightWarning', () => {
  it('warns when the plan extends past civil dusk', () => {
    const window = getDaylightWindow(new Date('2026-10-15T12:00:00Z'), 64.1466, -21.9426)
    const lateEnd = new Date(window.dusk.getTime() + 60 * 60 * 1000)
    const warning = getDaylightWarning(window, null, lateEnd)
    expect(warning).toMatch(/civil dusk/i)
  })

  it('returns null when the plan fits comfortably within daylight', () => {
    const window = getDaylightWindow(new Date('2026-10-15T12:00:00Z'), 64.1466, -21.9426)
    const midDay = new Date(window.sunrise.getTime() + 30 * 60 * 1000)
    const warning = getDaylightWarning(window, midDay, midDay)
    expect(warning).toBeNull()
  })
})
