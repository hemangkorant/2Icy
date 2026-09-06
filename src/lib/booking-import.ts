import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'

export type ImportedBookingKind = 'flight' | 'accommodation' | 'rental_car'

export interface ImportedFlight {
  kind: 'flight'
  airline: string
  flight_number: string
  departure_airport: string
  arrival_airport: string
  departure_at: string
  arrival_at: string
  booking_reference: string
  baggage_allowance: string
  terminal: string
  status: 'scheduled'
  notes: string
}

export interface ImportedAccommodation {
  kind: 'accommodation'
  name: string
  check_in_date: string
  check_out_date: string
  check_in_time: string
  check_out_time: string
  address: string
  confirmation_number: string
  contact_phone: string
  booking_source: string
  parking_notes: string
  cancellation_policy: string
  notes: string
}

export interface ImportedRentalCar {
  kind: 'rental_car'
  rental_company: string
  car_model: string
  pickup_location: string
  pickup_at: string
  dropoff_location: string
  dropoff_at: string
  confirmation_number: string
  insurance_level: string
  return_instructions: string
  notes: string
}

export type ImportedBooking = ImportedFlight | ImportedAccommodation | ImportedRentalCar

const clean = (value: string) => value.replace(/\s+/g, ' ').trim()
const firstMatch = (text: string, pattern: RegExp) => text.match(pattern)?.[1]?.trim() ?? ''

function toIsoLocal(date: string, time: string) {
  return `${date}T${time}:00`
}

function parseDate(value: string) {
  const match = value.match(/(\d{1,2})\s+(October|November|December|January|February|March|April|May|June|July|August|September)\s+(\d{4})/i)
  if (!match) return ''
  const month = new Date(`${match[2]} 1, 2000`).getMonth() + 1
  return `${match[3]}-${String(month).padStart(2, '0')}-${match[1].padStart(2, '0')}`
}

function parseTime(value: string) {
  const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
  if (!match) return ''
  let hour = Number(match[1])
  const meridiem = match[3]?.toUpperCase()
  if (meridiem === 'PM' && hour < 12) hour += 12
  if (meridiem === 'AM' && hour === 12) hour = 0
  return `${String(hour).padStart(2, '0')}:${match[2]}`
}

function parseFlightText(text: string): ImportedFlight[] {
  const reference = firstMatch(text, /Booking reference\s+([A-Z0-9]+)/i)
  const flights: ImportedFlight[] = []
  const pattern = /Flight\s+([A-Z]{2,3}\d+)\s+([A-Z]{3})\s+(?:→|->|\s)\s*([A-Z]{3})[\s\S]*?Departure date\s+(\d{1,2} \w+ \d{4})\s+Departure time\s+(\d{1,2}:\d{2})[\s\S]*?Arrival date\s+(\d{1,2} \w+ \d{4})\s+Arrival time\s+(\d{1,2}:\d{2})[\s\S]*?Travel class\s+([^\n]+)[\s\S]*?(?:Terminal\s+([^\n]+))?/gi
  for (const match of text.matchAll(pattern)) {
    const departureDate = parseDate(match[4])
    const arrivalDate = parseDate(match[6])
    const departureTime = parseTime(match[5])
    const arrivalTime = parseTime(match[7])
    if (!departureDate || !arrivalDate || !departureTime || !arrivalTime) continue
    const flightNumber = match[1]
    flights.push({
      kind: 'flight',
      airline: 'Lufthansa',
      flight_number: flightNumber,
      departure_airport: match[2],
      arrival_airport: match[3],
      departure_at: toIsoLocal(departureDate, departureTime),
      arrival_at: toIsoLocal(arrivalDate, arrivalTime),
      booking_reference: reference,
      baggage_allowance: '1 checked bag up to 23 kg; 1 carry-on up to 8 kg',
      terminal: clean(match[8] ?? ''),
      status: 'scheduled',
      notes: `Travel class: ${clean(match[9] ?? '')}`,
    })
  }
  return flights.filter((flight, index, all) => all.findIndex((candidate) => candidate.flight_number === flight.flight_number) === index)
}

function parseAccommodationText(text: string): ImportedAccommodation | null {
  const name = firstMatch(text, /^(.*?)\nAddress:/im)
  const address = firstMatch(text, /Address:\s*([^\n]+)/i)
  const phone = firstMatch(text, /Phone:\s*([^\n]+)/i)
  const confirmation = firstMatch(text, /CONFIRMATION NUMBER:\s*([\d.]+)/i)
  const checkIn = text.match(/CHECK-IN\s+(\d{1,2})\s+([A-Z]+)\s+\w+\s+(?:from\s+)?([\d: -]+)/i)
  const checkOut = text.match(/CHECK-OUT\s+(\d{1,2})\s+([A-Z]+)\s+\w+\s+(?:until\s+)?([\d: -]+)/i)
  const year = firstMatch(text, /(?:OCTOBER|NOVEMBER|DECEMBER|JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER)[\s\S]{0,80}(20\d{2})/i) || new Date().getFullYear().toString()
  const checkInDate = checkIn ? parseDate(`${checkIn[1]} ${checkIn[2]} ${year}`) : ''
  const checkOutDate = checkOut ? parseDate(`${checkOut[1]} ${checkOut[2]} ${year}`) : ''
  if (!name || !address || !confirmation || !checkInDate || !checkOutDate) return null
  const cancellation = text.match(/(?:Cancellation cost|Cancellation policy):([\s\S]*?)(?:Booking confirmation|Refund schedule:)/i)?.[1]
  const parking = text.match(/Guest parking([\s\S]*?)(?:WiFi|Need help)/i)?.[1]
  return {
    kind: 'accommodation',
    name: clean(name),
    check_in_date: checkInDate,
    check_out_date: checkOutDate,
    check_in_time: parseTime(checkIn?.[3] ?? ''),
    check_out_time: parseTime(checkOut?.[3] ?? ''),
    address: clean(address),
    confirmation_number: confirmation,
    contact_phone: clean(phone),
    booking_source: /Booking\.com/i.test(text) ? 'Booking.com' : 'Imported PDF',
    parking_notes: clean(parking ?? ''),
    cancellation_policy: clean(cancellation ?? ''),
    notes: clean(text.match(/Meal Plan:\s*([^\n]+)/i)?.[1] ?? ''),
  }
}

function parseRentalText(text: string): ImportedRentalCar | null {
  const confirmation = firstMatch(text, /Booking #([A-Z0-9]+)/i)
  const model = firstMatch(text, /\n(Dacia [^\n]+|Toyota [^\n]+|Suzuki [^\n]+)\n/i)
  const pickupDate = firstMatch(text, /Check-In\s+(\w+, \w+ \d{1,2}, \d{4})/i)
  const pickupTime = firstMatch(text, /Check-In[\s\S]*?\n(\d{1,2}:\d{2})/i)
  const dropoffDate = firstMatch(text, /→\s*\n(\w+, \w+ \d{1,2}, \d{4})/i)
  const dropoffTime = firstMatch(text, /→[\s\S]*?\n(\d{1,2}:\d{2})/i)
  const parseRentalDate = (value: string) => {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
  }
  if (!confirmation || !model || !pickupDate || !dropoffDate) return null
  const pickup = parseRentalDate(pickupDate)
  const dropoff = parseRentalDate(dropoffDate)
  if (!pickup || !dropoff) return null
  return {
    kind: 'rental_car',
    rental_company: 'GO Car Rental',
    car_model: clean(model),
    pickup_location: firstMatch(text, /Keflavík Intl\. Airport \(KEF\)/i) || 'Keflavík Intl. Airport (KEF)',
    pickup_at: toIsoLocal(pickup, parseTime(pickupTime)),
    dropoff_location: 'Keflavík Intl. Airport (KEF)',
    dropoff_at: toIsoLocal(dropoff, parseTime(dropoffTime)),
    confirmation_number: confirmation,
    insurance_level: firstMatch(text, /Insurance\s+([^\n]+)\n/i),
    return_instructions: `Return to Keflavík Intl. Airport by ${dropoffTime}.`,
    notes: clean(text.match(/Total\s+([\d.]+ €)[\s\S]*?Amount Paid\s+([^\n]+)/i)?.[0] ?? ''),
  }
}

export async function extractPdfText(file: File) {
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await pdfjsLib.getDocument({ data }).promise
  const pages: string[] = []
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join('\n'))
  }
  return pages.join('\n')
}

export async function parseBookingPdf(file: File): Promise<ImportedBooking[]> {
  const text = await extractPdfText(file)
  if (/Booking reference[\s\S]*Flight\s+[A-Z]{2,3}\d+/i.test(text)) {
    return parseFlightText(text)
  }
  if (/Booking #[A-Z0-9]+[\s\S]*Rental Price/i.test(text)) {
    const rental = parseRentalText(text)
    return rental ? [rental] : []
  }
  const accommodation = parseAccommodationText(text)
  return accommodation ? [accommodation] : []
}
