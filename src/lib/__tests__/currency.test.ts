import { describe, expect, it } from 'vitest'

import { convert, DEFAULT_RATES, formatMoney } from '../currency'

describe('convert', () => {
  it('returns the same amount when currencies match', () => {
    expect(convert(100, 'ISK', 'ISK', DEFAULT_RATES)).toBe(100)
  })

  it('converts from ISK to another currency using the given rate', () => {
    const rates = { ...DEFAULT_RATES, INR: 0.5 }
    expect(convert(100, 'ISK', 'INR', rates)).toBe(50)
  })

  it('converts from a non-ISK currency back to ISK', () => {
    const rates = { ...DEFAULT_RATES, INR: 0.5 }
    expect(convert(50, 'INR', 'ISK', rates)).toBe(100)
  })

  it('converts between two non-ISK currencies via ISK', () => {
    const rates = { ...DEFAULT_RATES, INR: 0.5, USD: 0.01 }
    // 50 INR -> 100 ISK -> 1 USD
    expect(convert(50, 'INR', 'USD', rates)).toBe(1)
  })
})

describe('formatMoney', () => {
  it('formats ISK with no decimals and the kr symbol', () => {
    expect(formatMoney(1500, 'ISK')).toBe('1,500 kr')
  })

  it('formats other currencies with two decimals and a prefix symbol', () => {
    expect(formatMoney(12.5, 'USD')).toBe('$12.50')
  })
})
