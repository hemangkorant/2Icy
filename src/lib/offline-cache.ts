// Lightweight localStorage snapshot cache so read views (itinerary, safety
// links, contacts, packing list, task list, etc.) still render something
// useful when offline, clearly labeled with when it was last synced.
// Document blobs are intentionally excluded — they stay in Supabase Storage
// and are not cached client-side.

export interface Snapshot<T> {
  data: T
  savedAt: string
}

const PREFIX = 'iceland-trip-cache:'

export function saveSnapshot<T>(key: string, data: T): void {
  try {
    const snapshot: Snapshot<T> = { data, savedAt: new Date().toISOString() }
    window.localStorage.setItem(PREFIX + key, JSON.stringify(snapshot))
  } catch {
    // Storage full or unavailable (private browsing) — offline cache is a nicety, not required.
  }
}

export function loadSnapshot<T>(key: string): Snapshot<T> | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    if (!raw) return null
    return JSON.parse(raw) as Snapshot<T>
  } catch {
    return null
  }
}

export function clearSnapshot(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key)
  } catch {
    // ignore
  }
}
