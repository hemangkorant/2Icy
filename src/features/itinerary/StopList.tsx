import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { IconExternalLink, IconGripVertical, IconMapPin, IconPencil, IconTrash } from '@tabler/icons-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { googleMapsDirectionsUrl, googleMapsSearchUrl } from '@/lib/routing-adapter'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database'

interface StopListProps {
  stops: Tables<'itinerary_stops'>[]
  segments: Tables<'driving_segments'>[]
  onReorder: (orderedIds: string[]) => void
  onEdit: (stop: Tables<'itinerary_stops'>) => void
  onDelete: (stop: Tables<'itinerary_stops'>) => void
  onSaveSegment: (fromId: string, toId: string, existing: Tables<'driving_segments'> | undefined, distanceKm: number | null, durationMinutes: number | null) => void
}

export function StopList({ stops, segments, onReorder, onEdit, onDelete, onSaveSegment }: StopListProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = stops.findIndex((s) => s.id === active.id)
    const newIndex = stops.findIndex((s) => s.id === over.id)
    const reordered = [...stops]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)
    onReorder(reordered.map((s) => s.id))
  }

  if (stops.length === 0) return null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={stops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {stops.map((stop, index) => {
            const next = stops[index + 1]
            const segment = next
              ? segments.find(
                  (s) => (s.from_stop_id === stop.id && s.to_stop_id === next.id) || (s.from_stop_id === next.id && s.to_stop_id === stop.id),
                )
              : undefined
            return (
              <div key={stop.id}>
                <SortableStop stop={stop} index={index} onEdit={onEdit} onDelete={onDelete} />
                {next && (
                  <DrivingSegmentRow
                    from={stop}
                    to={next}
                    segment={segment}
                    onSave={(distanceKm, durationMinutes) => onSaveSegment(stop.id, next.id, segment, distanceKm, durationMinutes)}
                  />
                )}
              </div>
            )
          })}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortableStop({
  stop,
  index,
  onEdit,
  onDelete,
}: {
  stop: Tables<'itinerary_stops'>
  index: number
  onEdit: (stop: Tables<'itinerary_stops'>) => void
  onDelete: (stop: Tables<'itinerary_stops'>) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stop.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <Card ref={setNodeRef} style={style} className={cn('overflow-visible', isDragging && 'opacity-60 shadow-lg')}>
      <CardContent className="flex items-start gap-3 p-3">
        <button
          type="button"
          className="mt-1 shrink-0 touch-none text-muted-foreground"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <IconGripVertical className="size-4" />
        </button>
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium leading-tight">{stop.name}</p>
            <Badge variant="outline" className="text-[10px] capitalize">
              {stop.status}
            </Badge>
          </div>
          {(stop.planned_arrival || stop.planned_departure) && (
            <p className="text-xs text-muted-foreground">
              {stop.planned_arrival ?? '—'} → {stop.planned_departure ?? '—'}
            </p>
          )}
          {stop.address && <p className="text-xs text-muted-foreground">{stop.address}</p>}
          {stop.activity_notes && <p className="text-sm">{stop.activity_notes}</p>}
          <div className="flex flex-wrap gap-3 pt-1 text-xs">
            <a
              href={googleMapsSearchUrl(stop.address || stop.name)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-link hover:underline"
            >
              <IconMapPin className="size-3" /> Open in Maps
            </a>
            {stop.booking_link && (
              <a href={stop.booking_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-link hover:underline">
                <IconExternalLink className="size-3" /> Booking
              </a>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon" onClick={() => onEdit(stop)} aria-label="Edit stop">
            <IconPencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(stop)} aria-label="Delete stop">
            <IconTrash className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function DrivingSegmentRow({
  from,
  to,
  segment,
  onSave,
}: {
  from: Tables<'itinerary_stops'>
  to: Tables<'itinerary_stops'>
  segment?: Tables<'driving_segments'>
  onSave: (distanceKm: number | null, durationMinutes: number | null) => void
}) {
  const [distance, setDistance] = useState(segment?.distance_km?.toString() ?? '')
  const [duration, setDuration] = useState(segment?.duration_minutes?.toString() ?? '')

  const canRoute = Number.isFinite(from.lat) && Number.isFinite(from.lng) && Number.isFinite(to.lat) && Number.isFinite(to.lng)

  return (
    <div className="ml-8 flex flex-wrap items-center gap-2 border-l-2 border-dashed border-border py-2 pl-4 text-xs text-muted-foreground">
      <span>Drive to {to.name}:</span>
      <Input
        value={distance}
        onChange={(e) => setDistance(e.target.value)}
        onBlur={() => onSave(distance ? Number(distance) : null, duration ? Number(duration) : null)}
        placeholder="km"
        className="h-7 w-20 text-xs"
        inputMode="decimal"
      />
      <Input
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        onBlur={() => onSave(distance ? Number(distance) : null, duration ? Number(duration) : null)}
        placeholder="mins"
        className="h-7 w-20 text-xs"
        inputMode="numeric"
      />
      {canRoute && (
        <a
          href={googleMapsDirectionsUrl(
            { lat: from.lat as number, lng: from.lng as number },
            { lat: to.lat as number, lng: to.lng as number },
          )}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-link hover:underline"
        >
          <IconExternalLink className="size-3" /> Route in Google Maps
        </a>
      )}
    </div>
  )
}
