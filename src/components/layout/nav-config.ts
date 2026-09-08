import {
  IconAlertCircle,
  IconBackpack,
  IconBed,
  IconCalendar,
  IconCar,
  IconCashBanknote,
  IconCloudStorm,
  IconLanguage,
  IconLayoutDashboard,
  IconMap,
  IconSettings,
  IconSquareCheck,
  IconTicket,
  IconVault,
  type TablerIcon,
} from '@tabler/icons-react'

export interface NavItem {
  to: string
  label: string
  icon: TablerIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: IconLayoutDashboard },
  { to: '/itinerary', label: 'Itinerary', icon: IconCalendar },
  { to: '/map', label: 'Map', icon: IconMap },
  { to: '/stays', label: 'Stays', icon: IconBed },
  { to: '/transport', label: 'Transport', icon: IconCar },
  { to: '/activities', label: 'Activities', icon: IconTicket },
  { to: '/safety', label: 'Safety & Weather', icon: IconCloudStorm },
  { to: '/expenses', label: 'Expenses', icon: IconCashBanknote },
  { to: '/documents', label: 'Documents', icon: IconVault },
  { to: '/packing', label: 'Packing', icon: IconBackpack },
  { to: '/translator', label: 'Translator', icon: IconLanguage },
  { to: '/tasks', label: 'Tasks', icon: IconSquareCheck },
  { to: '/emergency', label: 'Emergency', icon: IconAlertCircle },
  { to: '/settings', label: 'Settings', icon: IconSettings },
]

/** The mobile bottom bar only has room for a handful of primary destinations; everything else lives behind "More". */
export const MOBILE_PRIMARY_PATHS = ['/', '/itinerary', '/safety', '/expenses']
