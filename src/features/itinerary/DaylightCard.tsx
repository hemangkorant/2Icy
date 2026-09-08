import { IconSunLow, IconSunrise, IconSunset } from '@tabler/icons-react'
import type { ReactNode } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DEFAULT_LAT, DEFAULT_LNG, formatDuration, formatTime, getDaylightWarning, getDaylightWindow } from '@/lib/daylight'

export function DaylightCard({
  date,
  lat,
  lng,
  planStart,
  planEnd,
}: {
  date: string
  lat?: number | null
  lng?: number | null
  planStart?: Date | null
  planEnd?: Date | null
}) {
  const window = getDaylightWindow(new Date(`${date}T12:00:00Z`), lat ?? DEFAULT_LAT, lng ?? DEFAULT_LNG)
  const warning = getDaylightWarning(window, planStart, planEnd)
  const dayStartPct = (window.dawn.getUTCHours() * 60 + window.dawn.getUTCMinutes()) / 14.4
  const dayWidthPct = window.civilDaylightMinutes / 14.4

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--color-warning-tint)] text-[var(--color-warning-ink)]">
            <IconSunrise className="size-4" />
          </span>
          Daylight window
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Civil dawn" value={formatTime(window.dawn)} />
          <Stat label="Sunrise" value={formatTime(window.sunrise)} icon={<IconSunrise className="size-3.5" />} />
          <Stat label="Sunset" value={formatTime(window.sunset)} icon={<IconSunset className="size-3.5" />} />
          <Stat label="Civil dusk" value={formatTime(window.dusk)} />
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDuration(window.daylightMinutes)} of daylight, {formatDuration(window.civilDaylightMinutes)} of usable civil light.
        </p>
        <div className="relative h-2 w-full rounded-full bg-muted">
          <div
            className="absolute h-2 rounded-full bg-[var(--color-warning)]"
            style={{ left: `${Math.max(0, dayStartPct)}%`, width: `${Math.min(100, dayWidthPct)}%` }}
          />
        </div>
        {warning && (
          <p className="flex items-start gap-1.5 rounded-md bg-warning/10 p-2 text-xs text-warning-foreground">
            <IconSunLow className="mt-0.5 size-3.5 shrink-0" /> {warning}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="font-medium">{value}</p>
    </div>
  )
}
