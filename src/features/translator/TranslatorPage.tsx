import { IconArrowsLeftRight, IconLanguage, IconMicrophone, IconPhoto, IconVolume } from '@tabler/icons-react'
import { useRef, useState } from 'react'

import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { isSpeechRecognitionSupported, isSpeechSynthesisSupported, listenOnce, speak } from '@/lib/speech'
import { translateText, type TranslateLang } from '@/lib/translate'

const LANG_LABEL: Record<TranslateLang, string> = {
  en: 'English',
  is: 'Icelandic',
}

export function TranslatorPage() {
  const [from, setFrom] = useState<TranslateLang>('en')
  const [sourceText, setSourceText] = useState('')
  const [translated, setTranslated] = useState('')
  const [translating, setTranslating] = useState(false)
  const [listening, setListening] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const stopListenRef = useRef<(() => void) | null>(null)
  const to: TranslateLang = from === 'en' ? 'is' : 'en'

  const runTranslate = async (text: string) => {
    if (!text.trim()) {
      setTranslated('')
      return
    }
    setTranslating(true)
    try {
      setTranslated(await translateText(text, from, to))
    } catch (e) {
      toast({
        title: 'Translation failed',
        description: e instanceof Error ? e.message : 'Try again in a moment.',
        variant: 'destructive',
      })
    } finally {
      setTranslating(false)
    }
  }

  const handleSwap = () => {
    setFrom(to)
    setSourceText(translated)
    setTranslated(sourceText)
  }

  const handleMic = () => {
    if (listening) {
      stopListenRef.current?.()
      return
    }
    try {
      const { stop, result } = listenOnce(from)
      stopListenRef.current = stop
      setListening(true)
      result
        .then((transcript) => {
          if (transcript) {
            setSourceText(transcript)
            runTranslate(transcript)
          }
        })
        .catch((e) =>
          toast({
            title: 'Voice input failed',
            description: e instanceof Error ? e.message : undefined,
            variant: 'destructive',
          }),
        )
        .finally(() => setListening(false))
    } catch (e) {
      toast({
        title: 'Voice input not available',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    }
  }

  const handleImage = async (file: File) => {
    setOcrLoading(true)
    try {
      const { recognizeText } = await import('@/lib/ocr')
      const text = await recognizeText(file, from)
      if (!text) {
        toast({ title: 'No text found in that image' })
        return
      }
      setSourceText(text)
      await runTranslate(text)
    } catch (e) {
      toast({
        title: 'Could not read text from image',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setOcrLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Translator" description="English ↔ Icelandic, with voice and photo input." />

      <div className="flex items-center justify-center gap-3">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <IconLanguage className="size-4 text-[var(--color-secondary)]" /> {LANG_LABEL[from]}
        </span>
        <Button variant="outline" size="icon" onClick={handleSwap} aria-label="Swap languages">
          <IconArrowsLeftRight className="size-4" />
        </Button>
        <span className="text-sm font-semibold text-muted-foreground">{LANG_LABEL[to]}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-2 p-4">
            <Textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder={`Type ${LANG_LABEL[from]} text…`}
              rows={6}
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => runTranslate(sourceText)} disabled={translating}>
                {translating ? 'Translating…' : 'Translate'}
              </Button>
              {isSpeechRecognitionSupported() && (
                <Button size="sm" variant={listening ? 'default' : 'outline'} onClick={handleMic}>
                  <IconMicrophone className="size-4" /> {listening ? 'Listening…' : 'Speak'}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={ocrLoading}>
                <IconPhoto className="size-4" /> {ocrLoading ? 'Reading photo…' : 'Photo'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImage(file)
                  e.target.value = ''
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-4">
            <Textarea
              value={translated}
              readOnly
              rows={6}
              placeholder={`${LANG_LABEL[to]} translation appears here…`}
              className="bg-muted/40"
            />
            {isSpeechSynthesisSupported() && (
              <Button size="sm" variant="outline" onClick={() => speak(translated, to)} disabled={!translated}>
                <IconVolume className="size-4" /> Listen
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Text translation uses a free public engine and voice/photo input use your browser's built-in speech and on-device OCR — quality for
        Icelandic can vary, and voice features depend on your browser (Chrome/Edge work best) and installed language voices. Always
        double-check anything safety-critical.
      </p>
    </div>
  )
}
