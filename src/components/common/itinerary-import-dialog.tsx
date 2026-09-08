import { IconFileUpload } from '@tabler/icons-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { parseItineraryPdf, type ImportedItineraryDay } from '@/lib/itinerary-import'
import { toast } from '@/hooks/use-toast'

export function ItineraryImportButton({ onImport }: { onImport: (days: ImportedItineraryDay[]) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <IconFileUpload className="size-4" /> Import PDF
      </Button>
      <ItineraryImportDialog open={open} onOpenChange={setOpen} onImport={onImport} />
    </>
  )
}

function ItineraryImportDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (days: ImportedItineraryDay[]) => Promise<void>
}) {
  const [file, setFile] = useState<File | null>(null)
  const [days, setDays] = useState<ImportedItineraryDay[]>([])
  const [error, setError] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      setFile(null)
      setDays([])
      setError(null)
    }
  }, [open])

  const selectFile = async (nextFile: File | null) => {
    setFile(nextFile)
    setDays([])
    setError(null)
    if (!nextFile) return
    setParsing(true)
    try {
      setDays(await parseItineraryPdf(nextFile))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read this PDF.')
    } finally {
      setParsing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import itinerary PDF</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">The PDF is read locally in your browser. Review detected days and stops before they are added. The source PDF is discarded after import.</p>
          <Input type="file" accept="application/pdf" onChange={(event) => void selectFile(event.target.files?.[0] ?? null)} />
          {parsing && <p className="text-sm text-muted-foreground">Reading PDF…</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {days.map((day) => (
            <Card key={day.date}>
              <CardContent className="space-y-1 p-3 text-sm">
                <p className="font-medium">{day.date} · {day.title}</p>
                {day.overnight_location && <p className="text-muted-foreground">Overnight: {day.overnight_location}</p>}
                <p>{day.stops.length} stop{day.stops.length === 1 ? '' : 's'} detected{day.notes ? ` · ${day.notes}` : ''}</p>
                {day.stops.length > 0 && <p className="text-xs text-muted-foreground">{day.stops.slice(0, 5).map((stop) => stop.name).join(' · ')}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
        <DialogFooter>
          <Button disabled={!file || days.length === 0 || parsing || saving} onClick={async () => {
            setSaving(true)
            try {
              await onImport(days)
              onOpenChange(false)
              toast({ title: 'Itinerary imported', description: `${days.length} day${days.length === 1 ? '' : 's'} added.` })
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not save imported itinerary.')
            } finally {
              setSaving(false)
            }
          }}>
            {saving ? 'Importing…' : 'Confirm import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
