import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

export const TRIP_TIMEZONE = 'Atlantic/Reykjavik'

export function todayInIceland(): Date {
  return toZonedTime(new Date(), TRIP_TIMEZONE)
}

export function todayIcelandIso(): string {
  return format(todayInIceland(), 'yyyy-MM-dd')
}

export function formatFriendlyDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return format(new Date(`${iso}T00:00:00`), 'EEE, d MMM yyyy')
  } catch {
    return iso
  }
}

export function formatFriendlyDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return format(new Date(iso), 'EEE d MMM, HH:mm')
  } catch {
    return iso
  }
}

/**
 * Cancellation deadlines are entered via a plain `datetime-local` input with
 * no timezone attached, on the assumption the traveler is thinking in IST.
 * This must NOT reinterpret the stored value as a real UTC instant and
 * convert it (that shifts the wall-clock numbers by Postgres's UTC offset,
 * showing e.g. 05:29 next day for a 23:59 entry) — it just echoes back
 * exactly the digits that were typed.
 */
export function formatIstDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!match) return iso
  const [, year, month, day, hour, minute] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  return `${format(date, 'EEE d MMM')}, ${hour}:${minute} IST`
}

export function relativeToNow(iso: string | null | undefined): string {
  if (!iso) return ''
  const target = new Date(iso).getTime()
  const diffMs = target - Date.now()
  const diffMinutes = Math.round(diffMs / 60000)
  const abs = Math.abs(diffMinutes)
  const isPast = diffMinutes < 0
  if (abs < 60) return `${abs}m ${isPast ? 'ago' : 'from now'}`
  const hours = Math.round(abs / 60)
  if (hours < 48) return `${hours}h ${isPast ? 'ago' : 'from now'}`
  const days = Math.round(hours / 24)
  return `${days}d ${isPast ? 'ago' : 'from now'}`
}
