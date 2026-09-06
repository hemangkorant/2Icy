import { FileUp } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { parseBookingPdf, type ImportedBooking, type ImportedBookingKind } from '@/lib/booking-import'
import { toast } from '@/hooks/use-toast'

export function BookingImportButton({ kind, onImport }: { kind: ImportedBookingKind; onImport: (bookings: ImportedBooking[]) => Promise<void> }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <FileUp className="size-4" /> Import PDF
      </Button>
      <BookingImportDialog kind={kind} open={open} onOpenChange={setOpen} onImport={onImport} />
    </>
  )
}

function BookingImportDialog({
  kind,
  open,
  onOpenChange,
  onImport,
}: {
  kind: ImportedBookingKind
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (bookings: ImportedBooking[]) => Promise<void>
}) {
  const [file, setFile] = useState<File | null>(null)
  const [bookings, setBookings] = useState<ImportedBooking[]>([])
  const [error, setError] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      setFile(null)
      setBookings([])
      setError(null)
    }
  }, [open])

  const selectFile = async (nextFile: File | null) => {
    setFile(nextFile)
    setBookings([])
    setError(null)
    if (!nextFile) return
    setParsing(true)
    try {
      const parsed = (await parseBookingPdf(nextFile)).filter((booking) => booking.kind === kind)
      if (parsed.length === 0) throw new Error(`No ${kind.replace('_', ' ')} booking was detected in this PDF.`)
      setBookings(parsed)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read this PDF.')
    } finally {
      setParsing(false)
    }
  }

  const label = kind === 'flight' ? 'flight ticket' : kind === 'accommodation' ? 'stay booking' : 'rental car booking'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import {label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">The PDF is read locally in your browser. Only the extracted booking fields are saved; the PDF is discarded after import.</p>
          <Input type="file" accept="application/pdf" onChange={(event) => void selectFile(event.target.files?.[0] ?? null)} />
          {parsing && <p className="text-sm text-muted-foreground">Reading PDF…</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {bookings.map((booking, index) => (
            <Card key={`${booking.kind}-${index}`}>
              <CardContent className="space-y-1 p-3 text-sm">
                <p className="font-medium capitalize">{booking.kind.replace('_', ' ')}</p>
                {booking.kind === 'flight' && <p>{booking.airline} {booking.flight_number} · {booking.departure_airport} → {booking.arrival_airport}</p>}
                {booking.kind === 'flight' && <p className="text-muted-foreground">{booking.departure_at} → {booking.arrival_at}</p>}
                {booking.kind === 'accommodation' && <p>{booking.name} · {booking.check_in_date} → {booking.check_out_date}</p>}
                {booking.kind === 'accommodation' && <p className="text-muted-foreground">{booking.address} · Confirmation {booking.confirmation_number}</p>}
                {booking.kind === 'rental_car' && <p>{booking.rental_company} · {booking.car_model}</p>}
                {booking.kind === 'rental_car' && <p className="text-muted-foreground">{booking.pickup_at} → {booking.dropoff_at} · Confirmation {booking.confirmation_number}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
        <DialogFooter>
          <Button disabled={!file || bookings.length === 0 || parsing || saving} onClick={async () => {
            setSaving(true)
            try {
              await onImport(bookings)
              onOpenChange(false)
              toast({ title: 'Booking imported', description: 'The extracted details were added to this page.' })
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not save imported booking.')
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
