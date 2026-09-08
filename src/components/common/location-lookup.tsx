import { IconMapPin, IconSearch } from '@tabler/icons-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { geocodePlace, type GeocodeResult } from '@/lib/geocoding'

/**
 * A single explicit "Find on map" button rather than a debounced live-search
 * — Nominatim's usage policy caps free lookups to ~1/sec and asks that it
 * not be hit on every keystroke, so this only ever fires on a click.
 */
export function LocationLookup({ query, onSelect }: { query: string; onSelect: (result: GeocodeResult) => void }) {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<GeocodeResult[]>([])

  const search = async () => {
    if (!query.trim()) {
      toast({ title: 'Type a place name first' })
      return
    }
    setLoading(true)
    try {
      const found = await geocodePlace(query)
      setResults(found)
      if (found.length === 0)
        toast({
          title: 'No matches found',
          description: 'Try a more specific name.',
        })
    } catch (e) {
      toast({
        title: 'Location lookup failed',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <Button type="button" variant="outline" size="sm" onClick={search} disabled={loading}>
        <IconSearch className="size-3.5" /> {loading ? 'Searching…' : 'Find on map'}
      </Button>
      {results.length > 0 && (
        <div className="space-y-0.5 rounded-md border border-border p-1.5">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onSelect(r)
                setResults([])
              }}
              className="flex w-full items-start gap-1.5 rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
            >
              <IconMapPin className="mt-0.5 size-3.5 shrink-0 text-[var(--color-secondary)]" />
              <span>{r.address}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
