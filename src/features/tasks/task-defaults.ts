import type { TaskGroup } from '@/types/database'

export const DEFAULT_TASKS: { group_name: TaskGroup; title: string }[] = [
  {
    group_name: 'documents_insurance',
    title: 'Check passport expiry (6+ months validity)',
  },
  { group_name: 'documents_insurance', title: 'Buy travel insurance' },
  {
    group_name: 'documents_insurance',
    title: 'Print/save digital copies of passports and insurance',
  },
  {
    group_name: 'esim_data',
    title: 'Buy an eSIM or roaming data plan for Iceland',
  },
  { group_name: 'esim_data', title: 'Download offline maps for the Ring Road' },
  {
    group_name: 'currency_cards',
    title: 'Notify bank/card issuer of travel dates',
  },
  {
    group_name: 'currency_cards',
    title: 'Order or check contactless card works abroad',
  },
  {
    group_name: 'currency_cards',
    title: 'Get a small amount of ISK cash as backup',
  },
  {
    group_name: 'car_prep',
    title: 'Confirm 4x4 rental booking and insurance level',
  },
  {
    group_name: 'car_prep',
    title: 'Check driving licence is valid for Iceland',
  },
  {
    group_name: 'car_prep',
    title: 'Review Iceland winter/gravel-road driving guidance',
  },
  {
    group_name: 'booking_confirmations',
    title: 'Confirm all accommodation bookings',
  },
  {
    group_name: 'booking_confirmations',
    title: 'Confirm all tour/activity bookings',
  },
  { group_name: 'home_prep', title: 'Arrange pet/plant care while away' },
  { group_name: 'home_prep', title: 'Set mail hold / notify neighbours' },
  {
    group_name: 'health_medication',
    title: 'Pack prescription medication + copies of prescriptions',
  },
  {
    group_name: 'health_medication',
    title: 'Check if any vaccinations are recommended',
  },
  {
    group_name: 'safetravel',
    title: 'Register the trip on SafeTravel.is before departure',
  },
  {
    group_name: 'offline_maps_emergency',
    title: 'Save Iceland emergency numbers offline',
  },
  {
    group_name: 'offline_maps_emergency',
    title: 'Share itinerary with someone back home',
  },
]
