import type { EmergencyCategory } from '@/types/database'

export const DEFAULT_EMERGENCY_CONTACTS: {
  category: EmergencyCategory
  country: string
  name: string
  phone?: string
  notes?: string
  needs_verification?: boolean
}[] = [
  { category: 'emergency_services', country: 'Iceland', name: 'Iceland Emergency (Police / Fire / Ambulance / SAR)', phone: '112', notes: 'The single emergency number in Iceland.' },
  { category: 'emergency_services', country: 'Iceland', name: 'Backup Iceland Emergency Number', phone: '+354 599 0112', notes: 'Alternate line if 112 is unreachable.' },
  { category: 'health', country: 'Iceland', name: 'Icelandic Health Information Line', phone: '+354 513 1700', notes: 'Non-emergency medical advice, 24/7.' },
  {
    category: 'embassy',
    country: 'India',
    name: 'Embassy / Consulate of India (nearest to Iceland)',
    notes: 'VERIFY BEFORE TRAVEL — confirm the current covering mission, phone, and address via mea.gov.in before departure. Do not rely on a number here without checking.',
    needs_verification: true,
  },
]
