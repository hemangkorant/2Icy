import type { TranslateLang } from './translate'

const RECOGNITION_LOCALE: Record<TranslateLang, string> = {
  en: 'en-US',
  is: 'is-IS',
}
const SYNTHESIS_LOCALE: Record<TranslateLang, string> = {
  en: 'en-US',
  is: 'is-IS',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionCtor = new () => any

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/**
 * Listens for a single utterance and resolves with the transcript. Browser
 * support (and Icelandic recognition quality) varies — Chrome/Edge on
 * desktop are the most reliable; Safari and Firefox support is patchy.
 */
export function listenOnce(lang: TranslateLang): {
  stop: () => void
  result: Promise<string>
} {
  const Ctor = getSpeechRecognitionCtor()
  if (!Ctor) throw new Error('Voice input is not supported in this browser')
  const recognition = new Ctor()
  recognition.lang = RECOGNITION_LOCALE[lang]
  recognition.interimResults = false
  recognition.maxAlternatives = 1

  const result = new Promise<string>((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? ''
      resolve(transcript)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      reject(new Error(event.error === 'no-speech' ? 'No speech detected' : 'Voice input failed'))
    }
    recognition.onend = () => resolve('')
  })

  recognition.start()
  return { stop: () => recognition.stop(), result }
}

export function speak(text: string, lang: TranslateLang) {
  if (!isSpeechSynthesisSupported() || !text.trim()) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = SYNTHESIS_LOCALE[lang]
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang === SYNTHESIS_LOCALE[lang])
  if (voice) utterance.voice = voice
  window.speechSynthesis.speak(utterance)
}
