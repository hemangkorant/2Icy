import { IconCircle, IconCircleCheckFilled } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRealtimeTable } from '@/hooks/use-realtime-table'
import { todayIcelandIso } from '@/lib/dates'
import type { Tables } from '@/types/database'

export function DayReadiness({ day, stopsCount }: { day: Tables<'itinerary_days'>; stopsCount: number }) {
  const { data: checks } = useRealtimeTable('safety_checks', 'day_id', day.id)

  const today = todayIcelandIso()
  const checkedToday = (type: 'weather' | 'road') =>
    checks.some((c) => c.check_type === type && c.checked_at.slice(0, 10) === today)

  const items = [
    { label: 'Overnight location set', done: Boolean(day.overnight_location) },
    { label: 'At least one stop planned', done: stopsCount > 0 },
    { label: 'Weather checked today', done: checkedToday('weather'), link: '/safety' },
    { label: 'Road conditions checked today', done: checkedToday('road'), link: '/safety' },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Day readiness</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              {item.done ? (
                <IconCircleCheckFilled className="size-4 text-success" />
              ) : (
                <IconCircle className="size-4 text-muted-foreground" />
              )}
              {item.label}
            </span>
            {!item.done && item.link && (
              <Link to={item.link} className="text-xs text-link underline-offset-2 hover:underline">
                Review
              </Link>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
