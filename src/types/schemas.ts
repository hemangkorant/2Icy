import { z } from 'zod'

const optionalText = z.string().trim().optional().or(z.literal(''))
const optionalNumber = z.coerce.number().optional().nullable()

export const itineraryDaySchema = z.object({
  date: z.string().min(1, 'Date is required'),
  title: optionalText,
  overnight_location: optionalText,
  overnight_lat: optionalNumber,
  overnight_lng: optionalNumber,
  notes: optionalText,
})
export type ItineraryDayFormValues = z.infer<typeof itineraryDaySchema>
export type ItineraryDayFormInput = z.input<typeof itineraryDaySchema>

export const itineraryStopSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: optionalText,
  lat: optionalNumber,
  lng: optionalNumber,
  planned_arrival: optionalText,
  planned_departure: optionalText,
  activity_notes: optionalText,
  booking_link: optionalText,
  status: z.string().default('planned'),
})
export type ItineraryStopFormValues = z.infer<typeof itineraryStopSchema>
export type ItineraryStopFormInput = z.input<typeof itineraryStopSchema>

export const drivingSegmentSchema = z.object({
  distance_km: optionalNumber,
  duration_minutes: optionalNumber,
  notes: optionalText,
})
export type DrivingSegmentFormValues = z.infer<typeof drivingSegmentSchema>
export type DrivingSegmentFormInput = z.input<typeof drivingSegmentSchema>

export const accommodationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  check_in_date: optionalText,
  check_out_date: optionalText,
  check_in_time: optionalText,
  check_out_time: optionalText,
  address: optionalText,
  lat: optionalNumber,
  lng: optionalNumber,
  confirmation_number: optionalText,
  contact_name: optionalText,
  contact_phone: optionalText,
  contact_email: z.union([z.string().email(), z.literal('')]).optional(),
  website: optionalText,
  booking_source: optionalText,
  parking_notes: optionalText,
  cancellation_policy: optionalText,
  notes: optionalText,
})
export type AccommodationFormValues = z.infer<typeof accommodationSchema>
export type AccommodationFormInput = z.input<typeof accommodationSchema>

export const flightSchema = z.object({
  airline: optionalText,
  flight_number: optionalText,
  departure_airport: optionalText,
  arrival_airport: optionalText,
  departure_at: optionalText,
  arrival_at: optionalText,
  booking_reference: optionalText,
  seats: optionalText,
  baggage_allowance: optionalText,
  terminal: optionalText,
  gate: optionalText,
  status: z.enum(['scheduled', 'delayed', 'cancelled', 'completed']).default('scheduled'),
  notes: optionalText,
})
export type FlightFormValues = z.infer<typeof flightSchema>
export type FlightFormInput = z.input<typeof flightSchema>

export const rentalCarSchema = z.object({
  rental_company: optionalText,
  car_model: optionalText,
  registration_number: optionalText,
  pickup_location: optionalText,
  pickup_address: optionalText,
  pickup_at: optionalText,
  dropoff_location: optionalText,
  dropoff_address: optionalText,
  dropoff_at: optionalText,
  confirmation_number: optionalText,
  fuel_type: z.enum(['petrol', 'diesel', 'electric', 'hybrid']).optional(),
  insurance_level: optionalText,
  insurance_exclusions: optionalText,
  emergency_contact: optionalText,
  mileage_pickup: optionalNumber,
  mileage_return: optionalNumber,
  return_instructions: optionalText,
  notes: optionalText,
})
export type RentalCarFormValues = z.infer<typeof rentalCarSchema>
export type RentalCarFormInput = z.input<typeof rentalCarSchema>

export const fuelEntrySchema = z.object({
  station_name: optionalText,
  lat: optionalNumber,
  lng: optionalNumber,
  filled_at: z.string().min(1, 'Date/time is required'),
  price_per_liter: optionalNumber,
  amount_paid: optionalNumber,
  liters: optionalNumber,
  odometer: optionalNumber,
  notes: optionalText,
})
export type FuelEntryFormValues = z.infer<typeof fuelEntrySchema>
export type FuelEntryFormInput = z.input<typeof fuelEntrySchema>

export const activitySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  provider: optionalText,
  activity_date: optionalText,
  start_time: optionalText,
  end_time: optionalText,
  duration_minutes: optionalNumber,
  meeting_point: optionalText,
  lat: optionalNumber,
  lng: optionalNumber,
  booking_reference: optionalText,
  price: optionalNumber,
  currency: z.string().default('ISK'),
  participants: optionalText,
  what_to_bring: optionalText,
  cancellation_policy: optionalText,
  contact_details: optionalText,
  booking_link: optionalText,
  reminder_status: z.enum(['pending', 'confirmed', 'checked_in']).default('pending'),
  notes: optionalText,
})
export type ActivityFormValues = z.infer<typeof activitySchema>
export type ActivityFormInput = z.input<typeof activitySchema>

export const safetyCheckSchema = z.object({
  check_type: z.enum(['weather', 'road', 'safetravel', 'aurora', 'alert']),
  source_url: optionalText,
  assessment: optionalText,
  severity: z.enum(['low', 'medium', 'high']).default('low'),
})
export type SafetyCheckFormValues = z.infer<typeof safetyCheckSchema>
export type SafetyCheckFormInput = z.input<typeof safetyCheckSchema>

export const expenseSchema = z.object({
  category: z.enum(['food', 'activities', 'fuel', 'accommodation', 'transport', 'souvenirs', 'groceries', 'other']),
  expense_date: z.string().min(1, 'Date is required'),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
  currency: z.enum(['ISK', 'INR', 'EUR', 'GBP', 'USD']),
  payer_id: optionalText,
  split_method: z.enum(['equal', 'custom', 'none']).default('equal'),
  notes: optionalText,
})
export type ExpenseFormValues = z.infer<typeof expenseSchema>
export type ExpenseFormInput = z.input<typeof expenseSchema>

export const packingItemSchema = z.object({
  group_name: z.enum([
    'outerwear',
    'warm_layers',
    'footwear',
    'car_essentials',
    'electronics',
    'health_toiletries',
    'documents_money',
    'aurora_outdoor',
    'other',
  ]),
  name: z.string().min(1, 'Name is required'),
  quantity: z.coerce.number().min(0).default(1),
  owner_id: optionalText,
  priority: z.enum(['essential', 'recommended', 'optional']).default('recommended'),
  notes: optionalText,
  buy_before_trip: z.boolean().default(false),
})
export type PackingItemFormValues = z.infer<typeof packingItemSchema>
export type PackingItemFormInput = z.input<typeof packingItemSchema>

export const taskSchema = z.object({
  group_name: z.enum([
    'documents_insurance',
    'esim_data',
    'currency_cards',
    'car_prep',
    'booking_confirmations',
    'home_prep',
    'health_medication',
    'safetravel',
    'offline_maps_emergency',
    'other',
  ]),
  title: z.string().min(1, 'Title is required'),
  due_date: optionalText,
  assignee_id: optionalText,
  reminder_preference: z.enum(['none', '1_day', '3_days', '1_week']).default('none'),
  notes: optionalText,
})
export type TaskFormValues = z.infer<typeof taskSchema>
export type TaskFormInput = z.input<typeof taskSchema>

export const emergencyContactSchema = z.object({
  category: z.enum(['emergency_services', 'health', 'embassy', 'insurance', 'roadside_assistance', 'family', 'other']),
  country: optionalText,
  name: z.string().min(1, 'Name is required'),
  phone: optionalText,
  whatsapp_phone: optionalText,
  email: z.union([z.string().email(), z.literal('')]).optional(),
  address: optionalText,
  notes: optionalText,
  needs_verification: z.boolean().default(false),
})
export type EmergencyContactFormValues = z.infer<typeof emergencyContactSchema>
export type EmergencyContactFormInput = z.input<typeof emergencyContactSchema>

export const magicLinkSchema = z.object({
  email: z.string().email('Enter a valid email address'),
})
export type MagicLinkFormValues = z.infer<typeof magicLinkSchema>
export type MagicLinkFormInput = z.input<typeof magicLinkSchema>

export const tripSchema = z.object({
  name: z.string().min(1, 'Trip name is required'),
  startDate: optionalText,
  endDate: optionalText,
})
export type TripFormValues = z.infer<typeof tripSchema>
export type TripFormInput = z.input<typeof tripSchema>
