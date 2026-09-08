import type { TranslateLang } from './translate'

const OCR_LANG: Record<TranslateLang, string> = { en: 'eng', is: 'isl' }

/**
 * Client-side OCR via Tesseract.js — free, no API key, but the first call
 * downloads a language data file (a few MB) so it's noticeably slower than a
 * cloud Vision API. Imported dynamically so the ~2MB tesseract runtime never
 * lands in the main bundle.
 */
export async function recognizeText(image: File | Blob, lang: TranslateLang): Promise<string> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker(OCR_LANG[lang])
  try {
    const {
      data: { text },
    } = await worker.recognize(image)
    return text.trim()
  } finally {
    await worker.terminate()
  }
}
