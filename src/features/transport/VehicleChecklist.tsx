import { IconPlus, IconTrash } from '@tabler/icons-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useRealtimeTable } from '@/hooks/use-realtime-table'
import type { ChecklistStage } from '@/types/database'

const STAGE_LABEL: Record<ChecklistStage, string> = {
  before_pickup: 'Before pickup',
  during_trip: 'During the trip',
  before_return: 'Before return',
}

export function VehicleChecklist({ rentalCarId, stage }: { rentalCarId: string; stage: ChecklistStage }) {
  const items = useRealtimeTable('vehicle_checklists', 'rental_car_id', rentalCarId, { orderBy: 'position' })
  const [newLabel, setNewLabel] = useState('')
  const stageItems = items.data.filter((i) => i.stage === stage)

  const addItem = async () => {
    if (!newLabel.trim()) return
    await items.insert({ rental_car_id: rentalCarId, stage, label: newLabel.trim(), position: stageItems.length })
    setNewLabel('')
  }

  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold">{STAGE_LABEL[stage]}</h4>
      <div className="space-y-1.5">
        {stageItems.map((item) => (
          <div key={item.id} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5">
            <Checkbox
              checked={item.is_checked}
              onCheckedChange={(checked) => items.update(item.id, { is_checked: Boolean(checked) })}
            />
            <span className={item.is_checked ? 'flex-1 text-sm text-muted-foreground line-through' : 'flex-1 text-sm'}>
              {item.label}
            </span>
            <Button variant="ghost" size="icon" className="size-7" onClick={() => items.remove(item.id)} aria-label="Remove">
              <IconTrash className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Add a check…"
          className="h-8 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && addItem()}
        />
        <Button size="sm" variant="outline" onClick={addItem}>
          <IconPlus className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
