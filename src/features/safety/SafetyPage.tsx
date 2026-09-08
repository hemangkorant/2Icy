import { IconAlertTriangle, IconCircleCheck, IconExternalLink, IconPlus, IconShieldExclamation, IconTrash } from '@tabler/icons-react'
import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/common/page-header'
import { LoadingState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/context/auth-context'
import { useTrip } from '@/context/trip-context'
import { useRealtimeTable } from '@/hooks/use-realtime-table'
import { toast } from '@/hooks/use-toast'
import { relativeToNow } from '@/lib/dates'
import type { SafetyCheckType, SafetySeverity, Tables } from '@/types/database'

import { SAFETY_SOURCES } from './safety-links'

const NO_DAY = '__general__'

export function SafetyPage() {
  const { activeTripId } = useTrip()
  const { user } = useAuth()
  const days = useRealtimeTable('itinerary_days', 'trip_id', activeTripId, { orderBy: 'date' })
  const checks = useRealtimeTable('safety_checks', 'trip_id', activeTripId, { orderBy: 'checked_at', ascending: false })
  const [selectedDay, setSelectedDay] = useState<string>(NO_DAY)
  const [severity, setSeverity] = useState<SafetySeverity>('medium')
  const [alertText, setAlertText] = useState('')

  const activeAlerts = checks.data.filter((c) => c.check_type === 'alert' && c.severity !== 'low')

  const latestByType = useMemo(() => {
    const map = new Map<SafetyCheckType, Tables<'safety_checks'>>()
    for (const check of checks.data) {
      if (!map.has(check.check_type)) map.set(check.check_type, check)
    }
    return map
  }, [checks.data])

  if (days.loading || checks.loading) return <LoadingState label="Loading safety dashboard…" />

  const logCheck = async (type: SafetyCheckType, assessment: string, sourceUrl?: string, checkSeverity: SafetySeverity = 'low') => {
    try {
      await checks.insert({
        trip_id: activeTripId!,
        day_id: selectedDay === NO_DAY ? null : selectedDay,
        check_type: type,
        checked_by: user?.id ?? null,
        source_url: sourceUrl ?? null,
        assessment: assessment || null,
        severity: checkSeverity,
      })
      toast({ title: 'Logged', description: `${type} check recorded.` })
    } catch (e) {
      toast({ title: 'Could not log check', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Safety & Weather" description="Official sources, plus your own reviewed-at-a-glance log." />

      <div className="rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">This app is not an official safety service.</span> Always defer to official Icelandic
        sources (Vedur, road.is, SafeTravel) and local emergency guidance (112) over anything logged here.
      </div>

      {activeAlerts.length > 0 && (
        <div className="space-y-2">
          {activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className={
                alert.severity === 'high'
                  ? 'flex items-start gap-2 rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive'
                  : 'flex items-start gap-2 rounded-lg border border-warning bg-warning/10 p-3 text-sm text-warning-foreground'
              }
            >
              <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div className="flex-1">
                <p className="font-medium capitalize">{alert.severity} priority alert</p>
                <p>{alert.assessment}</p>
                <p className="text-xs opacity-70">{relativeToNow(alert.checked_at)}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => checks.remove(alert.id)} aria-label="Clear alert">
                <IconTrash className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Logging for</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedDay} onValueChange={setSelectedDay}>
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_DAY}>General / whole trip</SelectItem>
              {days.data.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.date} — {d.title || d.overnight_location || 'Untitled'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(SAFETY_SOURCES) as (keyof typeof SAFETY_SOURCES)[]).map((type) => (
          <SafetySourceCard
            key={type}
            type={type}
            latest={latestByType.get(type)}
            onLog={(assessment) => logCheck(type, assessment, SAFETY_SOURCES[type].url)}
          />
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <IconShieldExclamation className="size-4" /> Log a volcanic / weather alert
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea value={alertText} onChange={(e) => setAlertText(e.target.value)} placeholder="What's happening, and where?" rows={2} />
          <div className="flex items-center gap-2">
            <Select value={severity} onValueChange={(v) => setSeverity(v as SafetySeverity)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['low', 'medium', 'high'].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={async () => {
                if (!alertText.trim()) return
                await logCheck('alert', alertText.trim(), undefined, severity)
                setAlertText('')
              }}
            >
              <IconPlus className="size-4" /> Log alert
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SafetySourceCard({
  type,
  latest,
  onLog,
}: {
  type: keyof typeof SAFETY_SOURCES
  latest?: Tables<'safety_checks'>
  onLog: (assessment: string) => void
}) {
  const source = SAFETY_SOURCES[type]
  const [assessment, setAssessment] = useState('')
  const SourceIcon = source.icon

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-secondary-tint)] text-[var(--color-secondary)]">
            <SourceIcon className="size-4" />
          </span>
          {source.label}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{source.description}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="flex w-fit items-center gap-1 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground hover:opacity-80"
        >
          <IconExternalLink className="size-3" /> Open {source.label}
        </a>
        {latest ? (
          <p className="flex items-center gap-1.5 text-xs text-success">
            <IconCircleCheck className="size-3.5" /> Last checked {relativeToNow(latest.checked_at)}
            {latest.assessment && `: “${latest.assessment}”`}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Not checked yet.</p>
        )}
        <Textarea value={assessment} onChange={(e) => setAssessment(e.target.value)} placeholder="Your assessment (optional)…" rows={2} />
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            onLog(assessment.trim())
            setAssessment('')
          }}
        >
          Mark reviewed now
        </Button>
      </CardContent>
    </Card>
  )
}
