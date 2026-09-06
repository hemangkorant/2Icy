import type { ChecklistStage } from '@/types/database'

export const DEFAULT_CHECKLIST_ITEMS: Record<ChecklistStage, string[]> = {
  before_pickup: [
    "Driving licence in hand",
    'Passport in hand',
    'Credit card for deposit',
    'Insurance coverage verified (CDW/gravel/sand/ash)',
    'Exterior damage photos taken (all sides)',
    'Tyres, wipers, and lighting checked',
    'Fuel level at pickup noted',
    'Emergency kit present (warning triangle, hi-vis)',
    'Checked road.is for any current F-road/route restrictions',
  ],
  during_trip: [
    'Fuel level checked before long/remote stretches',
    'Checked forecast for wind warnings before driving',
    'Tyre pressure and condition checked periodically',
    'Parked considerately, away from road shoulders',
    'Any new damage photographed immediately',
  ],
  before_return: [
    'Refuel per rental company policy',
    'Fuel receipt kept',
    'Interior cleaned of rubbish',
    'Final exterior/interior photos taken',
    'Odometer reading recorded',
    'All keys and documents returned',
    'Shuttle/return transport confirmed',
    'Deposit release follow-up noted',
  ],
}
