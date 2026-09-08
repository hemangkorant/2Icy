import {
  IconCar,
  IconCreditCard,
  IconDeviceMobile,
  IconFiles,
  IconHome,
  IconInfoCircle,
  IconMapPinCheck,
  IconPill,
  IconPlus,
  IconShieldCheck,
  IconSparkles,
  IconSquareCheck,
  IconTicket,
  IconTrash,
  type TablerIcon,
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'

import { PageHeader } from '@/components/common/page-header'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useTrip } from '@/context/trip-context'
import { useRealtimeTable } from '@/hooks/use-realtime-table'
import { toast } from '@/hooks/use-toast'
import { formatFriendlyDate } from '@/lib/dates'
import { supabase } from '@/lib/supabase'
import type { TaskGroup } from '@/types/database'

import { DEFAULT_TASKS } from './task-defaults'

const GROUP_LABELS: Record<TaskGroup, string> = {
  documents_insurance: 'Documents & insurance',
  esim_data: 'eSIM / data',
  currency_cards: 'Currency / cards',
  car_prep: 'Car preparation',
  booking_confirmations: 'Booking confirmations',
  home_prep: 'Home preparation',
  health_medication: 'Health / medication',
  safetravel: 'SafeTravel registration',
  offline_maps_emergency: 'Offline maps & emergency pack',
  other: 'Other',
}
const GROUP_ICONS: Record<TaskGroup, TablerIcon> = {
  documents_insurance: IconFiles,
  esim_data: IconDeviceMobile,
  currency_cards: IconCreditCard,
  car_prep: IconCar,
  booking_confirmations: IconTicket,
  home_prep: IconHome,
  health_medication: IconPill,
  safetravel: IconShieldCheck,
  offline_maps_emergency: IconMapPinCheck,
  other: IconInfoCircle,
}

export function TasksPage() {
  const { activeTripId, members } = useTrip()
  const tasks = useRealtimeTable('tasks', 'trip_id', activeTripId, {
    orderBy: 'due_date',
  })
  const [hideCompleted, setHideCompleted] = useState(false)
  const [newTitle, setNewTitle] = useState<Record<TaskGroup, string>>({} as Record<TaskGroup, string>)
  const [profiles, setProfiles] = useState<Record<string, string>>({})

  useEffect(() => {
    const ids = members.map((m) => m.user_id).filter((id): id is string => Boolean(id))
    if (ids.length === 0) return
    supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', ids)
      .then(({ data }) => {
        const map: Record<string, string> = {}
        for (const p of data ?? []) map[p.id] = p.full_name || p.email
        setProfiles(map)
      })
  }, [members])

  if (tasks.loading) return <LoadingState label="Loading tasks…" />
  if (tasks.error) return <ErrorState message={tasks.error} onRetry={tasks.refresh} />

  const seedDefaults = async () => {
    const existing = new Set(tasks.data.map((t) => t.title.toLowerCase()))
    const toAdd = DEFAULT_TASKS.filter((d) => !existing.has(d.title.toLowerCase()))
    await Promise.all(toAdd.map((d) => tasks.insert({ trip_id: activeTripId!, ...d })))
    toast({ title: `Added ${toAdd.length} default tasks` })
  }

  const groups = Object.keys(GROUP_LABELS) as TaskGroup[]
  const visibleTasks = hideCompleted ? tasks.data.filter((t) => !t.completed) : tasks.data

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Pre-trip checklist."
        action={
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={hideCompleted} onCheckedChange={setHideCompleted} /> Hide completed
            </label>
            <Button variant="outline" size="sm" onClick={seedDefaults}>
              <IconSparkles className="size-4" /> Add defaults
            </Button>
          </div>
        }
      />

      {tasks.data.length === 0 && (
        <EmptyState
          icon={<IconSquareCheck className="size-8" />}
          title="No tasks yet"
          description='Click "Add defaults" for a standard pre-trip checklist, or add your own below.'
        />
      )}

      <div className="space-y-5">
        {groups.map((group) => {
          const groupTasks = visibleTasks.filter((t) => t.group_name === group)
          if (groupTasks.length === 0 && hideCompleted) return null
          const GroupIcon = GROUP_ICONS[group]
          return (
            <div key={group}>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <span className="flex size-6 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <GroupIcon className="size-3.5" />
                </span>
                {GROUP_LABELS[group]}
              </h3>
              <div className="space-y-1.5">
                {groupTasks.map((task) => (
                  <div key={task.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border px-2.5 py-2">
                    <Checkbox checked={task.completed} onCheckedChange={(v) => tasks.update(task.id, { completed: Boolean(v) })} />
                    <span className={task.completed ? 'text-sm text-muted-foreground line-through' : 'text-sm'}>{task.title}</span>
                    {task.due_date && <span className="text-xs text-muted-foreground">Due {formatFriendlyDate(task.due_date)}</span>}
                    <Select
                      value={task.assignee_id ?? 'unassigned'}
                      onValueChange={(v) =>
                        tasks.update(task.id, {
                          assignee_id: v === 'unassigned' ? null : v,
                        })
                      }
                    >
                      <SelectTrigger className="ml-auto h-7 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {members
                          .filter((m) => m.user_id)
                          .map((m) => (
                            <SelectItem key={m.user_id} value={m.user_id as string}>
                              {profiles[m.user_id as string] ?? 'Traveler'}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => tasks.remove(task.id)} aria-label="Remove">
                      <IconTrash className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-1.5 flex gap-2">
                <Input
                  value={newTitle[group] ?? ''}
                  onChange={(e) =>
                    setNewTitle((prev) => ({
                      ...prev,
                      [group]: e.target.value,
                    }))
                  }
                  placeholder="Add a task…"
                  className="h-8 text-sm"
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && newTitle[group]?.trim()) {
                      await tasks.insert({
                        trip_id: activeTripId!,
                        group_name: group,
                        title: newTitle[group].trim(),
                      })
                      setNewTitle((prev) => ({ ...prev, [group]: '' }))
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (!newTitle[group]?.trim()) return
                    await tasks.insert({
                      trip_id: activeTripId!,
                      group_name: group,
                      title: newTitle[group].trim(),
                    })
                    setNewTitle((prev) => ({ ...prev, [group]: '' }))
                  }}
                >
                  <IconPlus className="size-3.5" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
