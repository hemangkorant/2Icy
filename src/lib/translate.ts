export type TranslateLang = 'en' | 'is'

/**
 * Free MyMemory translation API — no API key, no billing. Anonymous usage is
 * rate-limited (~a few thousand words/day) and quality for Icelandic can be
 * rougher than a paid engine (see the Translator page note), which is the
 * tradeoff of the free/browser-native option over Google Cloud Translate.
 */
export async function translateText(text: string, from: TranslateLang, to: TranslateLang): Promise<string> {
  const trimmed = text.trim()
  if (!trimmed) return ''
  const params = new URLSearchParams({ q: trimmed, langpair: `${from}|${to}` })
  const response = await fetch(`https://api.mymemory.translated.net/get?${params.toString()}`)
  if (!response.ok) throw new Error('Translation service unavailable')
  const data = (await response.json()) as {
    responseData?: { translatedText?: string }
    responseStatus?: number
  }
  if (!data.responseData?.translatedText) throw new Error('Translation service returned no result')
  return data.responseData.translatedText
}
