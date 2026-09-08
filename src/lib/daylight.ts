import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import * as SunCalc from 'suncalc'

import { TRIP_TIMEZONE } from '@/lib/dates'

export interface DaylightWindow {
  sunrise: Date
  sunset: Date
  dawn: Date // civil dawn
  dusk: Date // civil dusk
  daylightMinutes: number
  civilDaylightMinutes: number
}

/** Reykjavik as a fallback when a day has no overnight location pinned yet. */
export const DEFAULT_LAT = 64.1466
export const DEFAULT_LNG = -21.9426

/**
 * At high latitudes SunCalc can return `null` for dawn/dusk/sunrise/sunset
 * around midsummer or midwinter (the sun never crosses the relevant angle
 * that day). Reykjavik sits just south of the Arctic Circle so this mostly
 * matters outside the October trip window, but we fall back to sunrise/
 * sunset so every consumer always gets real Date values.
 */
export function getDaylightWindow(date: Date, lat = DEFAULT_LAT, lng = DEFAULT_LNG): DaylightWindow {
  const times = SunCalc.getTimes(date, lat, lng)
  const sunrise = times.sunrise ?? date
  const sunset = times.sunset ?? date
  const dawn = times.dawn ?? sunrise
  const dusk = times.dusk ?? sunset
  const daylightMinutes = Math.max(0, (sunset.getTime() - sunrise.getTime()) / 60_000)
  const civilDaylightMinutes = Math.max(0, (dusk.getTime() - dawn.getTime()) / 60_000)
  return { sunrise, sunset, dawn, dusk, daylightMinutes, civilDaylightMinutes }
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h <= 0) return `${m}m`
  return `${h}h ${m}m`
}

/**
 * Returns a warning message when a plan's latest activity/drive time extends
 * past civil dusk, or starts before civil dawn — the two points at which
 * driving in Iceland's October light gets meaningfully harder.
 */
export function getDaylightWarning(window: DaylightWindow, planStart?: Date | null, planEnd?: Date | null): string | null {
  if (planEnd && planEnd.getTime() > window.dusk.getTime()) {
    return `Plan extends past civil dusk (${formatTime(window.dusk)}) — expect low light or darkness for the last stretch.`
  }
  if (planStart && planStart.getTime() < window.dawn.getTime()) {
    return `Plan starts before civil dawn (${formatTime(window.dawn)}) — expect darkness at the start.`
  }
  return null
}

/**
 * Sunrise/sunset are computed as real UTC instants, but they must always be
 * shown in Iceland's own clock time — not the traveler's browser/device
 * timezone (e.g. IST) — since that's the time that matters for planning
 * daylight around driving and activities while actually in Iceland.
 */
export function formatTime(date: Date): string {
  return format(toZonedTime(date, TRIP_TIMEZONE), 'HH:mm')
}
