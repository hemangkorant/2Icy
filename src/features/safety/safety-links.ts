import { IconCloudRain, IconMoonStars, IconRoute, IconShieldCheck, type TablerIcon } from '@tabler/icons-react'

import type { SafetyCheckType } from '@/types/database'

export const SAFETY_SOURCES: Record<
  Exclude<SafetyCheckType, 'alert'>,
  { label: string; url: string; description: string; icon: TablerIcon }
> = {
  weather: {
    label: 'Vedur (weather forecast)',
    url: 'https://en.vedur.is/',
    description: "Iceland's official weather forecast.",
    icon: IconCloudRain,
  },
  road: {
    label: 'road.is (road conditions)',
    url: 'https://umferdin.is/en',
    description: 'Official road conditions and closures.',
    icon: IconRoute,
  },
  safetravel: {
    label: 'SafeTravel trip plan',
    url: 'https://safetravel.is/',
    description: 'Register or update your travel plan with Icelandic search & rescue.',
    icon: IconShieldCheck,
  },
  aurora: {
    label: 'Aurora forecast',
    url: 'https://en.vedur.is/weather/forecasts/aurora/',
    description: 'Official aurora activity and cloud-cover forecast.',
    icon: IconMoonStars,
  },
}
