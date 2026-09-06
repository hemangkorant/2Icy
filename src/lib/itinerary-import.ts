import { extractPdfText } from '@/lib/booking-import'

export interface ImportedItineraryStop {
  name: string
  activity_notes: string
}

export interface ImportedItineraryDay {
  date: string
  title: string
  overnight_location: string
  notes: string
  stops: ImportedItineraryStop[]
}

const clean = (value: string) => value.replace(/^[-*•\s]+/, '').replace(/\s+/g, ' ').trim()

function parseDate(value: string, defaultYear: string) {
  const iso = value.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/)
  if (iso) return iso[0]
  const textual = value.match(/\b\d{1,2}(?:\s*[-–]\s*\d{1,2})?[\s,]+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:[\s,]+(20\d{2}))?\b/i)
  if (!textual) return ''
  const day = value.match(/\b(\d{1,2})/)?.[1]
  if (!day) return ''
  const month = new Date(`${textual[1]} 1, 2000`).getMonth() + 1
  return `${textual[2] ?? defaultYear}-${String(month).padStart(2, '0')}-${day.padStart(2, '0')}`
}

function isDateLine(line: string, year: string) {
  return Boolean(parseDate(line, year)) || /\bDay\s+\d+\b/i.test(line)
}

function parseDayBlock(lines: string[], date: string, index: number, year: string): ImportedItineraryDay | null {
  const meaningful = lines.map(clean).filter(Boolean)
  if (!date || meaningful.length === 0) return null
  const overnightMatch = meaningful.find((line) => /^(overnight|stay|sleep|base|location)\s*(?::|in|near)\s*/i.test(line))
  const overnightLocation = overnightMatch?.replace(/^(overnight|stay|sleep|base|location)\s*(?::|in|near)\s*/i, '').trim() ?? ''
  const title = `Day ${index + 1}`
  const notes = meaningful.filter((line) => /^(notes?|activities?)\s*:/i.test(line)).join(' ')
  const stopLines = meaningful
    .filter((line) => line !== overnightMatch)
    .filter((line) => !isDateLine(line, year))
    .filter((line) => !/^(day\s+\d+|stops?|activities?|notes?|overnight|stay|sleep|base|location)\s*[:-]?/i.test(line))
    .filter((line) => !/^\d+[.)]\s*$/.test(line))
  const stops = stopLines.slice(0, 30).map((line) => ({ name: line, activity_notes: '' }))
  return { date, title, overnight_location: overnightLocation, notes, stops }
}

export function parseItineraryText(text: string): ImportedItineraryDay[] {
  const year = text.match(/\b(20\d{2})\b/)?.[1] ?? new Date().getFullYear().toString()
  const lines = text.split(/\r?\n/)
  const blocks: Array<{ date: string; lines: string[] }> = []
  let current: { date: string; lines: string[] } | null = null

  for (const line of lines) {
    const date = parseDate(line, year)
    if (date || (/\bDay\s+\d+\b/i.test(line) && current)) {
      if (date) {
        if (current) blocks.push(current)
        current = { date, lines: [line] }
        continue
      }
    }
    if (current) current.lines.push(line)
  }
  if (current) blocks.push(current)

  const days = blocks.map((block, index) => parseDayBlock(block.lines, block.date, index, year)).filter((day): day is ImportedItineraryDay => Boolean(day))
  if (days.length === 0) throw new Error('No dated itinerary days were detected in this PDF.')
  return days
}

export async function parseItineraryPdf(file: File): Promise<ImportedItineraryDay[]> {
  return parseItineraryText(await extractPdfText(file))
}
