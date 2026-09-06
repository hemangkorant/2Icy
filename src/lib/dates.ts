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
    return format(new Date(iso), "EEE d MMM, HH:mm")
  } catch {
    return iso
  }
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
