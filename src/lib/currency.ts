import type { CurrencyCode } from '@/types/database'

export const CURRENCIES: CurrencyCode[] = ['ISK', 'INR', 'EUR', 'GBP', 'USD']

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  ISK: 'kr',
  INR: '₹',
  EUR: '€',
  GBP: '£',
  USD: '$',
}

/** Rates are expressed as "1 ISK = rate[code] units of code" (ISK is the base, since Iceland spend is the base of this trip). */
export type ExchangeRates = Record<CurrencyCode, number>

export const DEFAULT_RATES: ExchangeRates = {
  ISK: 1,
  INR: 0.53,
  EUR: 0.0067,
  GBP: 0.0058,
  USD: 0.0072,
}

export function convert(amount: number, from: CurrencyCode, to: CurrencyCode, rates: ExchangeRates): number {
  if (from === to) return amount
  const amountInIsk = from === 'ISK' ? amount : amount / rates[from]
  const converted = to === 'ISK' ? amountInIsk : amountInIsk * rates[to]
  return Math.round(converted * 100) / 100
}

export function formatMoney(amount: number, currency: CurrencyCode): string {
  const symbol = CURRENCY_SYMBOLS[currency]
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: currency === 'ISK' ? 0 : 2,
    maximumFractionDigits: currency === 'ISK' ? 0 : 2,
  }).format(amount)
  return currency === 'ISK' ? `${formatted} ${symbol}` : `${symbol}${formatted}`
}
