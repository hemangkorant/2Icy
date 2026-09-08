// Hand-written to mirror supabase/migrations/*.sql exactly. If you have the
// Supabase CLI linked to a project, prefer regenerating with:
//   supabase gen types typescript --linked > src/types/database.ts
// and re-apply any manual edits below.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type TripRole = 'owner' | 'editor'
export type MemberStatus = 'invited' | 'active'
export type StopStatus = string
export type FuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid' | null
export type ChecklistStage = 'before_pickup' | 'during_trip' | 'before_return'
export type ActivityReminderStatus = 'pending' | 'confirmed' | 'checked_in'
export type SafetyCheckType = 'weather' | 'road' | 'safetravel' | 'aurora' | 'alert'
export type SafetySeverity = 'low' | 'medium' | 'high'
export type ExpenseCategory = 'food' | 'activities' | 'fuel' | 'accommodation' | 'transport' | 'souvenirs' | 'groceries' | 'other'
export type CurrencyCode = 'ISK' | 'INR' | 'EUR' | 'GBP' | 'USD'
export type SplitMethod = 'equal' | 'custom' | 'none'
export type DocumentCategory =
  | 'passport'
  | 'travel_insurance'
  | 'flight_confirmation'
  | 'accommodation_confirmation'
  | 'car_rental_confirmation'
  | 'tour_voucher'
  | 'driving_licence'
  | 'other'
export type DocumentLinkedEntity = 'accommodation' | 'flight' | 'rental_car' | 'activity' | 'expense' | null
export type PackingGroup =
  | 'outerwear'
  | 'warm_layers'
  | 'footwear'
  | 'car_essentials'
  | 'electronics'
  | 'health_toiletries'
  | 'documents_money'
  | 'aurora_outdoor'
  | 'other'
export type PackingPriority = 'essential' | 'recommended' | 'optional'
export type TaskGroup =
  | 'documents_insurance'
  | 'esim_data'
  | 'currency_cards'
  | 'car_prep'
  | 'booking_confirmations'
  | 'home_prep'
  | 'health_medication'
  | 'safetravel'
  | 'offline_maps_emergency'
  | 'other'
export type ReminderPreference = 'none' | '1_day' | '3_days' | '1_week'
export type EmergencyCategory = 'emergency_services' | 'health' | 'embassy' | 'insurance' | 'roadside_assistance' | 'family' | 'other'
export type Gender = 'female' | 'male' | 'other' | 'prefer_not_to_say'
export type BathroomType = 'private' | 'shared'
export type CookingFacility = 'kitchen' | 'shared_kitchen' | 'pantry' | 'none'

interface AuditedInsert {
  created_at?: string
  updated_at?: string
  updated_by?: string | null
}

// TS's structural checks against Record<string, unknown> (used deep inside
// supabase-js's schema resolution) can fail for raw intersection types; this
// mapped type forces the intersection to simplify into a plain object type.
type Flatten<T> = { [K in keyof T]: T[K] }

// Each table's Insert shape is a standalone named type (never referencing
// the Database interface itself) so Update can just be Partial<Insert>
// without creating a self-referential type that breaks inference.

type ProfilesRow = {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  first_name: string | null
  last_name: string | null
  gender: Gender | null
  created_at: string
  updated_at: string
}
type ProfilesInsert = {
  id: string
  email: string
  full_name?: string | null
  avatar_url?: string | null
  first_name?: string | null
  last_name?: string | null
  gender?: Gender | null
}

type TripsRow = {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  timezone: string
  owner_id: string
  is_demo: boolean
  created_at: string
  updated_at: string
  updated_by: string | null
}
type TripsInsert = Flatten<
  AuditedInsert & {
    id?: string
    name: string
    start_date?: string | null
    end_date?: string | null
    timezone?: string
    owner_id: string
    is_demo?: boolean
  }
>

type TripMembersRow = {
  id: string
  trip_id: string
  user_id: string | null
  invited_email: string | null
  role: TripRole
  status: MemberStatus
  created_at: string
  updated_at: string
}
type TripMembersInsert = {
  id?: string
  trip_id: string
  user_id?: string | null
  invited_email?: string | null
  role?: TripRole
  status?: MemberStatus
}

type DocumentsRow = {
  id: string
  trip_id: string
  category: DocumentCategory
  linked_entity_type: DocumentLinkedEntity
  linked_entity_id: string | null
  storage_path: string
  encrypted_metadata: string
  metadata_iv: string
  file_iv: string
  size_bytes: number
  owner_id: string
  created_at: string
  updated_at: string
  updated_by: string | null
}
type DocumentsInsert = Flatten<
  AuditedInsert & {
    id?: string
    trip_id: string
    category: DocumentCategory
    linked_entity_type?: DocumentLinkedEntity
    linked_entity_id?: string | null
    storage_path: string
    encrypted_metadata: string
    metadata_iv: string
    file_iv: string
    size_bytes?: number
    owner_id: string
  }
>

type ItineraryDaysRow = {
  id: string
  trip_id: string
  date: string
  sort_order: number
  title: string | null
  overnight_location: string | null
  overnight_lat: number | null
  overnight_lng: number | null
  notes: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}
type ItineraryDaysInsert = Flatten<
  AuditedInsert & {
    id?: string
    trip_id: string
    date: string
    sort_order?: number
    title?: string | null
    overnight_location?: string | null
    overnight_lat?: number | null
    overnight_lng?: number | null
    notes?: string | null
  }
>

type ItineraryStopsRow = {
  id: string
  day_id: string
  position: number
  name: string
  address: string | null
  lat: number | null
  lng: number | null
  planned_arrival: string | null
  planned_departure: string | null
  activity_notes: string | null
  booking_link: string | null
  status: StopStatus
  created_at: string
  updated_at: string
  updated_by: string | null
}
type ItineraryStopsInsert = Flatten<
  AuditedInsert & {
    id?: string
    day_id: string
    position?: number
    name: string
    address?: string | null
    lat?: number | null
    lng?: number | null
    planned_arrival?: string | null
    planned_departure?: string | null
    activity_notes?: string | null
    booking_link?: string | null
    status?: StopStatus
  }
>

type DrivingSegmentsRow = {
  id: string
  day_id: string
  from_stop_id: string
  to_stop_id: string
  distance_km: number | null
  duration_minutes: number | null
  google_maps_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}
type DrivingSegmentsInsert = Flatten<
  AuditedInsert & {
    id?: string
    day_id: string
    from_stop_id: string
    to_stop_id: string
    distance_km?: number | null
    duration_minutes?: number | null
    google_maps_url?: string | null
    notes?: string | null
  }
>

type AccommodationsRow = {
  id: string
  trip_id: string
  name: string
  check_in_date: string | null
  check_out_date: string | null
  check_in_time: string | null
  check_out_time: string | null
  address: string | null
  lat: number | null
  lng: number | null
  confirmation_number: string | null
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  website: string | null
  booking_source: string | null
  parking_notes: string | null
  cancellation_policy: string | null
  notes: string | null
  itinerary_day_ids: string[]
  town: string | null
  room_type: string | null
  bathroom_type: BathroomType | null
  cooking_facility: CookingFacility | null
  has_parking: boolean | null
  breakfast_included: boolean | null
  cancellation_deadline: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}
type AccommodationsInsert = Flatten<
  AuditedInsert & {
    id?: string
    trip_id: string
    name: string
    check_in_date?: string | null
    check_out_date?: string | null
    check_in_time?: string | null
    check_out_time?: string | null
    address?: string | null
    lat?: number | null
    lng?: number | null
    confirmation_number?: string | null
    contact_name?: string | null
    contact_phone?: string | null
    contact_email?: string | null
    website?: string | null
    booking_source?: string | null
    parking_notes?: string | null
    cancellation_policy?: string | null
    notes?: string | null
    itinerary_day_ids?: string[]
    town?: string | null
    room_type?: string | null
    bathroom_type?: BathroomType | null
    cooking_facility?: CookingFacility | null
    has_parking?: boolean | null
    breakfast_included?: boolean | null
    cancellation_deadline?: string | null
  }
>

type FlightsRow = {
  id: string
  trip_id: string
  airline: string | null
  flight_number: string | null
  departure_airport: string | null
  arrival_airport: string | null
  departure_at: string | null
  arrival_at: string | null
  booking_reference: string | null
  seats: string | null
  baggage_allowance: string | null
  terminal: string | null
  gate: string | null
  status: 'scheduled' | 'delayed' | 'cancelled' | 'completed'
  notes: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}
type FlightsInsert = Flatten<
  AuditedInsert & {
    id?: string
    trip_id: string
    airline?: string | null
    flight_number?: string | null
    departure_airport?: string | null
    arrival_airport?: string | null
    departure_at?: string | null
    arrival_at?: string | null
    booking_reference?: string | null
    seats?: string | null
    baggage_allowance?: string | null
    terminal?: string | null
    gate?: string | null
    status?: 'scheduled' | 'delayed' | 'cancelled' | 'completed'
    notes?: string | null
  }
>

type RentalCarsRow = {
  id: string
  trip_id: string
  rental_company: string | null
  car_model: string | null
  registration_number: string | null
  pickup_location: string | null
  pickup_address: string | null
  pickup_at: string | null
  dropoff_location: string | null
  dropoff_address: string | null
  dropoff_at: string | null
  confirmation_number: string | null
  fuel_type: FuelType
  insurance_level: string | null
  insurance_exclusions: string | null
  emergency_contact: string | null
  mileage_pickup: number | null
  mileage_return: number | null
  return_instructions: string | null
  notes: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}
type RentalCarsInsert = Flatten<
  AuditedInsert & {
    id?: string
    trip_id: string
    rental_company?: string | null
    car_model?: string | null
    registration_number?: string | null
    pickup_location?: string | null
    pickup_address?: string | null
    pickup_at?: string | null
    dropoff_location?: string | null
    dropoff_address?: string | null
    dropoff_at?: string | null
    confirmation_number?: string | null
    fuel_type?: FuelType
    insurance_level?: string | null
    insurance_exclusions?: string | null
    emergency_contact?: string | null
    mileage_pickup?: number | null
    mileage_return?: number | null
    return_instructions?: string | null
    notes?: string | null
  }
>

type VehicleChecklistsRow = {
  id: string
  rental_car_id: string
  stage: ChecklistStage
  label: string
  is_checked: boolean
  notes: string | null
  photo_document_id: string | null
  position: number
  created_at: string
  updated_at: string
  updated_by: string | null
}
type VehicleChecklistsInsert = Flatten<
  AuditedInsert & {
    id?: string
    rental_car_id: string
    stage: ChecklistStage
    label: string
    is_checked?: boolean
    notes?: string | null
    photo_document_id?: string | null
    position?: number
  }
>

type FuelEntriesRow = {
  id: string
  trip_id: string
  rental_car_id: string | null
  station_name: string | null
  lat: number | null
  lng: number | null
  filled_at: string
  price_per_liter: number | null
  amount_paid: number | null
  liters: number | null
  odometer: number | null
  receipt_document_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}
type FuelEntriesInsert = Flatten<
  AuditedInsert & {
    id?: string
    trip_id: string
    rental_car_id?: string | null
    station_name?: string | null
    lat?: number | null
    lng?: number | null
    filled_at?: string
    price_per_liter?: number | null
    amount_paid?: number | null
    liters?: number | null
    odometer?: number | null
    receipt_document_id?: string | null
    notes?: string | null
  }
>

type SuggestedFuelStopsRow = {
  id: string
  day_id: string
  name: string
  lat: number | null
  lng: number | null
  notes: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}
type SuggestedFuelStopsInsert = Flatten<
  AuditedInsert & {
    id?: string
    day_id: string
    name: string
    lat?: number | null
    lng?: number | null
    notes?: string | null
  }
>

type ActivitiesRow = {
  id: string
  trip_id: string
  day_id: string | null
  name: string
  provider: string | null
  activity_date: string | null
  start_time: string | null
  end_time: string | null
  duration_minutes: number | null
  meeting_point: string | null
  lat: number | null
  lng: number | null
  booking_reference: string | null
  price: number | null
  currency: string
  participants: string | null
  what_to_bring: string | null
  cancellation_policy: string | null
  contact_details: string | null
  booking_link: string | null
  reminder_status: ActivityReminderStatus
  notes: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}
type ActivitiesInsert = Flatten<
  AuditedInsert & {
    id?: string
    trip_id: string
    day_id?: string | null
    name: string
    provider?: string | null
    activity_date?: string | null
    start_time?: string | null
    end_time?: string | null
    duration_minutes?: number | null
    meeting_point?: string | null
    lat?: number | null
    lng?: number | null
    booking_reference?: string | null
    price?: number | null
    currency?: string
    participants?: string | null
    what_to_bring?: string | null
    cancellation_policy?: string | null
    contact_details?: string | null
    booking_link?: string | null
    reminder_status?: ActivityReminderStatus
    notes?: string | null
  }
>

type SafetyChecksRow = {
  id: string
  trip_id: string
  day_id: string | null
  check_type: SafetyCheckType
  checked_at: string
  checked_by: string | null
  source_url: string | null
  assessment: string | null
  severity: SafetySeverity
  created_at: string
  updated_at: string
  updated_by: string | null
}
type SafetyChecksInsert = Flatten<
  AuditedInsert & {
    id?: string
    trip_id: string
    day_id?: string | null
    check_type: SafetyCheckType
    checked_at?: string
    checked_by?: string | null
    source_url?: string | null
    assessment?: string | null
    severity?: SafetySeverity
  }
>

type ExpensesRow = {
  id: string
  trip_id: string
  day_id: string | null
  category: ExpenseCategory
  expense_date: string
  amount: number
  currency: CurrencyCode
  converted_amount: number | null
  converted_currency: CurrencyCode | null
  exchange_rate: number | null
  payer_id: string | null
  split_method: SplitMethod
  receipt_document_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}
type ExpensesInsert = Flatten<
  AuditedInsert & {
    id?: string
    trip_id: string
    day_id?: string | null
    category: ExpenseCategory
    expense_date?: string
    amount: number
    currency?: CurrencyCode
    converted_amount?: number | null
    converted_currency?: CurrencyCode | null
    exchange_rate?: number | null
    payer_id?: string | null
    split_method?: SplitMethod
    receipt_document_id?: string | null
    notes?: string | null
  }
>

type ExpenseSplitsRow = {
  id: string
  expense_id: string
  user_id: string
  share_percent: number | null
  share_amount: number | null
  created_at: string
}
type ExpenseSplitsInsert = {
  id?: string
  expense_id: string
  user_id: string
  share_percent?: number | null
  share_amount?: number | null
}

type PackingItemsRow = {
  id: string
  trip_id: string
  group_name: PackingGroup
  name: string
  quantity: number
  owner_id: string | null
  packed: boolean
  priority: PackingPriority
  notes: string | null
  buy_before_trip: boolean
  created_at: string
  updated_at: string
  updated_by: string | null
}
type PackingItemsInsert = Flatten<
  AuditedInsert & {
    id?: string
    trip_id: string
    group_name: PackingGroup
    name: string
    quantity?: number
    owner_id?: string | null
    packed?: boolean
    priority?: PackingPriority
    notes?: string | null
    buy_before_trip?: boolean
  }
>

type TasksRow = {
  id: string
  trip_id: string
  group_name: TaskGroup
  title: string
  due_date: string | null
  assignee_id: string | null
  completed: boolean
  reminder_preference: ReminderPreference
  notes: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}
type TasksInsert = Flatten<
  AuditedInsert & {
    id?: string
    trip_id: string
    group_name: TaskGroup
    title: string
    due_date?: string | null
    assignee_id?: string | null
    completed?: boolean
    reminder_preference?: ReminderPreference
    notes?: string | null
  }
>

type EmergencyContactsRow = {
  id: string
  trip_id: string
  category: EmergencyCategory
  country: string | null
  name: string
  phone: string | null
  whatsapp_phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  needs_verification: boolean
  created_at: string
  updated_at: string
  updated_by: string | null
}
type EmergencyContactsInsert = Flatten<
  AuditedInsert & {
    id?: string
    trip_id: string
    category: EmergencyCategory
    country?: string | null
    name: string
    phone?: string | null
    whatsapp_phone?: string | null
    email?: string | null
    address?: string | null
    notes?: string | null
    needs_verification?: boolean
  }
>

type AppSettingsRow = {
  id: string
  trip_id: string
  vault_salt: string | null
  vault_check_ciphertext: string | null
  vault_check_iv: string | null
  exchange_rates: Json
  exchange_rates_updated_at: string | null
  default_currency: CurrencyCode
  created_at: string
  updated_at: string
  updated_by: string | null
}
type AppSettingsInsert = Flatten<
  AuditedInsert & {
    id?: string
    trip_id: string
    vault_salt?: string | null
    vault_check_ciphertext?: string | null
    vault_check_iv?: string | null
    exchange_rates?: Json
    exchange_rates_updated_at?: string | null
    default_currency?: CurrencyCode
  }
>

// Every table entry below is a fully inline object literal (Row/Insert/Update/
// Relationships), matching exactly what `supabase gen types` itself emits.
// A shared generic `Table<Row, Insert>` alias was tried here instead, but a
// generic alias nested this deeply inside supabase-js's Omit-wrapped schema
// resolution silently collapses to `never` for every query — inlining avoids
// that entirely.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfilesRow
        Insert: ProfilesInsert
        Update: Partial<ProfilesInsert>
        Relationships: []
      }
      trips: {
        Row: TripsRow
        Insert: TripsInsert
        Update: Partial<TripsInsert>
        Relationships: []
      }
      trip_members: {
        Row: TripMembersRow
        Insert: TripMembersInsert
        Update: Partial<TripMembersInsert>
        Relationships: []
      }
      documents: {
        Row: DocumentsRow
        Insert: DocumentsInsert
        Update: Partial<DocumentsInsert>
        Relationships: []
      }
      itinerary_days: {
        Row: ItineraryDaysRow
        Insert: ItineraryDaysInsert
        Update: Partial<ItineraryDaysInsert>
        Relationships: []
      }
      itinerary_stops: {
        Row: ItineraryStopsRow
        Insert: ItineraryStopsInsert
        Update: Partial<ItineraryStopsInsert>
        Relationships: []
      }
      driving_segments: {
        Row: DrivingSegmentsRow
        Insert: DrivingSegmentsInsert
        Update: Partial<DrivingSegmentsInsert>
        Relationships: []
      }
      accommodations: {
        Row: AccommodationsRow
        Insert: AccommodationsInsert
        Update: Partial<AccommodationsInsert>
        Relationships: []
      }
      flights: {
        Row: FlightsRow
        Insert: FlightsInsert
        Update: Partial<FlightsInsert>
        Relationships: []
      }
      rental_cars: {
        Row: RentalCarsRow
        Insert: RentalCarsInsert
        Update: Partial<RentalCarsInsert>
        Relationships: []
      }
      vehicle_checklists: {
        Row: VehicleChecklistsRow
        Insert: VehicleChecklistsInsert
        Update: Partial<VehicleChecklistsInsert>
        Relationships: []
      }
      fuel_entries: {
        Row: FuelEntriesRow
        Insert: FuelEntriesInsert
        Update: Partial<FuelEntriesInsert>
        Relationships: []
      }
      suggested_fuel_stops: {
        Row: SuggestedFuelStopsRow
        Insert: SuggestedFuelStopsInsert
        Update: Partial<SuggestedFuelStopsInsert>
        Relationships: []
      }
      activities: {
        Row: ActivitiesRow
        Insert: ActivitiesInsert
        Update: Partial<ActivitiesInsert>
        Relationships: []
      }
      safety_checks: {
        Row: SafetyChecksRow
        Insert: SafetyChecksInsert
        Update: Partial<SafetyChecksInsert>
        Relationships: []
      }
      expenses: {
        Row: ExpensesRow
        Insert: ExpensesInsert
        Update: Partial<ExpensesInsert>
        Relationships: []
      }
      expense_splits: {
        Row: ExpenseSplitsRow
        Insert: ExpenseSplitsInsert
        Update: Partial<ExpenseSplitsInsert>
        Relationships: []
      }
      packing_items: {
        Row: PackingItemsRow
        Insert: PackingItemsInsert
        Update: Partial<PackingItemsInsert>
        Relationships: []
      }
      tasks: {
        Row: TasksRow
        Insert: TasksInsert
        Update: Partial<TasksInsert>
        Relationships: []
      }
      emergency_contacts: {
        Row: EmergencyContactsRow
        Insert: EmergencyContactsInsert
        Update: Partial<EmergencyContactsInsert>
        Relationships: []
      }
      app_settings: {
        Row: AppSettingsRow
        Insert: AppSettingsInsert
        Update: Partial<AppSettingsInsert>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_trip_member: { Args: { _trip_id: string }; Returns: boolean }
      is_trip_owner: { Args: { _trip_id: string }; Returns: boolean }
    }
    Enums: Record<string, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
