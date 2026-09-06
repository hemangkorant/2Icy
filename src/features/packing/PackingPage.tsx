import { Backpack, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { PageHeader } from '@/components/common/page-header'
import { EmptyState, ErrorState, LoadingState } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTrip } from '@/context/trip-context'
import { useRealtimeTable } from '@/hooks/use-realtime-table'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import type { PackingGroup, PackingPriority } from '@/types/database'

import { DEFAULT_PACKING_ITEMS, PACKING_GROUP_LABELS } from './packing-defaults'

const PRIORITY_VARIANT: Record<PackingPriority, 'destructive' | 'default' | 'secondary'> = {
  essential: 'destructive',
  recommended: 'default',
  optional: 'secondary',
}

export function PackingPage() {
  const { activeTripId, members } = useTrip()
  const items = useRealtimeTable('packing_items', 'trip_id', activeTripId, { orderBy: 'group_name' })
  const [newItem, setNewItem] = useState<Record<PackingGroup, string>>({} as Record<PackingGroup, string>)
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

  if (items.loading) return <LoadingState label="Loading packing list…" />
  if (items.error) return <ErrorState message={items.error} onRetry={items.refresh} />

  const packedCount = items.data.filter((i) => i.packed).length
  const progressPct = items.data.length ? Math.round((packedCount / items.data.length) * 100) : 0

  const seedDefaults = async () => {
    try {
      const existingNames = new Set(items.data.map((i) => i.name.toLowerCase()))
      const toAdd = DEFAULT_PACKING_ITEMS.filter((d) => !existingNames.has(d.name.toLowerCase()));
      await Promise.all(toAdd.map((d) => items.insert({ trip_id: activeTripId!, ...d })))
      toast({ title: `Added ${toAdd.length} suggested items` })
    } catch (e) {
      toast({ title: 'Could not add suggested items', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  const groups = Object.keys(PACKING_GROUP_LABELS) as PackingGroup[]

  return (
    <div>
      <PageHeader
        title="Packing"
        description="Shoulder-season Iceland packing list."
        action={
          <Button size="sm" variant="outline" onClick={seedDefaults}>
            <Sparkles className="size-4" /> Add suggested items
          </Button>
        }
      />

      {items.data.length > 0 && (
        <div className="mb-4 flex items-center gap-3">
          <Progress value={progressPct} className="flex-1" />
          <span className="text-xs text-muted-foreground">
            {packedCount}/{items.data.length} packed
          </span>
        </div>
      )}

      {items.data.length === 0 ? (
        <EmptyState icon={<Backpack className="size-8" />} title="Nothing on the list yet" description='Click "Add suggested items" to start from a shoulder-season Iceland checklist.' />
      ) : (
        <div className="space-y-5">
          {groups.map((group) => {
            const groupItems = items.data.filter((i) => i.group_name === group)
            return (
              <div key={group}>
                <h3 className="mb-2 text-sm font-semibold">{PACKING_GROUP_LABELS[group]}</h3>
                <div className="space-y-1.5">
                  {groupItems.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border px-2.5 py-2">
                      <Checkbox checked={item.packed} onCheckedChange={(v) => items.update(item.id, { packed: Boolean(v) })} />
                      <span className={item.packed ? 'text-sm text-muted-foreground line-through' : 'text-sm'}>
                        {item.name} {item.quantity > 1 && `×${item.quantity}`}
                      </span>
                      <Badge variant={PRIORITY_VARIANT[item.priority]} className="text-[10px]">
                        {item.priority}
                      </Badge>
                      {item.buy_before_trip && (
                        <Badge variant="outline" className="text-[10px]">
                          Buy before trip
                        </Badge>
                      )}
                      <Select value={item.owner_id ?? 'shared'} onValueChange={(v) => items.update(item.id, { owner_id: v === 'shared' ? null : v })}>
                        <SelectTrigger className="ml-auto h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="shared">Shared</SelectItem>
                          {members
                            .filter((m) => m.user_id)
                            .map((m) => (
                              <SelectItem key={m.user_id} value={m.user_id as string}>
                                {profiles[m.user_id as string] ?? 'Traveler'}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => items.remove(item.id)} aria-label="Remove">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 flex gap-2">
                  <Input
                    value={newItem[group] ?? ''}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, [group]: e.target.value }))}
                    placeholder="Add an item…"
                    className="h-8 text-sm"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && newItem[group]?.trim()) {
                        await items.insert({ trip_id: activeTripId!, group_name: group, name: newItem[group].trim() })
                        setNewItem((prev) => ({ ...prev, [group]: '' }))
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      if (!newItem[group]?.trim()) return
                      await items.insert({ trip_id: activeTripId!, group_name: group, name: newItem[group].trim() })
                      setNewItem((prev) => ({ ...prev, [group]: '' }))
                    }}
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
