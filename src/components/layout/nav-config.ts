import {
  AlertCircle,
  Backpack,
  Banknote,
  Calendar,
  Car,
  CheckSquare,
  CloudSun,
  FileLock2,
  Hotel,
  LayoutDashboard,
  Map,
  Settings,
  Ticket,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/itinerary', label: 'Itinerary', icon: Calendar },
  { to: '/map', label: 'Map', icon: Map },
  { to: '/stays', label: 'Stays', icon: Hotel },
  { to: '/transport', label: 'Transport', icon: Car },
  { to: '/activities', label: 'Activities', icon: Ticket },
  { to: '/safety', label: 'Safety & Weather', icon: CloudSun },
  { to: '/expenses', label: 'Expenses', icon: Banknote },
  { to: '/documents', label: 'Documents', icon: FileLock2 },
  { to: '/packing', label: 'Packing', icon: Backpack },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/emergency', label: 'Emergency', icon: AlertCircle },
  { to: '/settings', label: 'Settings', icon: Settings },
]

/** The mobile bottom bar only has room for a handful of primary destinations; everything else lives behind "More". */
export const MOBILE_PRIMARY_PATHS = ['/', '/itinerary', '/safety', '/expenses']
