import type { SafetyCheckType } from '@/types/database'

export const SAFETY_SOURCES: Record<
  Exclude<SafetyCheckType, 'alert'>,
  { label: string; url: string; description: string }
> = {
  weather: {
    label: 'Vedur (weather forecast)',
    url: 'https://en.vedur.is/',
    description: "Iceland's official weather forecast.",
  },
  road: {
    label: 'road.is (road conditions)',
    url: 'https://umferdin.is/en',
    description: 'Official road conditions and closures.',
  },
  safetravel: {
    label: 'SafeTravel trip plan',
    url: 'https://safetravel.is/',
    description: 'Register or update your travel plan with Icelandic search & rescue.',
  },
  aurora: {
    label: 'Aurora forecast',
    url: 'https://en.vedur.is/weather/forecasts/aurora/',
    description: 'Official aurora activity and cloud-cover forecast.',
  },
}
