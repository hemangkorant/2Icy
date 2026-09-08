import type { Tables } from '@/types/database'

type ProfileLike = Pick<Tables<'profiles'>, 'first_name' | 'last_name' | 'full_name' | 'email'> | null | undefined

export function getDisplayName(profile: ProfileLike): string {
  if (!profile) return 'Traveler'
  const composed = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim()
  return composed || profile.full_name || profile.email || 'Traveler'
}

export function getInitials(profile: ProfileLike): string {
  if (!profile) return '?'
  if (profile.first_name || profile.last_name) {
    return (
      [profile.first_name, profile.last_name]
        .filter(Boolean)
        .map((part) => part!.trim().slice(0, 1).toUpperCase())
        .join('')
        .slice(0, 2) || '?'
    )
  }
  if (profile.full_name) {
    const parts = profile.full_name.trim().split(/\s+/)
    return parts
      .slice(0, 2)
      .map((p) => p.slice(0, 1).toUpperCase())
      .join('')
  }
  return (profile.email ?? '?').slice(0, 1).toUpperCase()
}
