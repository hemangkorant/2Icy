import { zodResolver } from '@hookform/resolvers/zod'
import { Mountain } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/auth-context'
import { type MagicLinkFormValues, magicLinkSchema } from '@/types/schemas'

export function LoginPage() {
  const { signInWithMagicLink } = useAuth()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MagicLinkFormValues>({ resolver: zodResolver(magicLinkSchema) })

  const onSubmit = async (values: MagicLinkFormValues) => {
    setError(null)
    const { error: signInError } = await signInWithMagicLink(values.email)
    if (signInError) {
      setError(signInError)
      return
    }
    setSentTo(values.email)
  }

  return (
    <div className="flex min-h-svh flex-1 items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mountain className="size-6" />
          </div>
          <CardTitle>Iceland Trip Tracker</CardTitle>
          <CardDescription>Sign in with a magic link — no password needed.</CardDescription>
        </CardHeader>
        <CardContent>
          {sentTo ? (
            <p className="text-sm text-muted-foreground">
              Check <span className="font-medium text-foreground">{sentTo}</span> for a sign-in link. You can close this tab.
            </p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" {...register('email')} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Sending link…' : 'Send magic link'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
