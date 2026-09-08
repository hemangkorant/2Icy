import { zodResolver } from '@hookform/resolvers/zod'
import { IconMountain } from '@tabler/icons-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/auth-context'
import { type LoginFormValues, loginSchema } from '@/types/schemas'

export function LoginPage() {
  const { signInWithMagicLink, signInWithPassword, signUpWithPassword } = useAuth()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'password' | 'magic'>('password')
  const [registerMode, setRegisterMode] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (values: LoginFormValues) => {
    setError(null)
    const result = mode === 'magic'
      ? await signInWithMagicLink(values.email)
      : registerMode
        ? await signUpWithPassword(values.email, values.password ?? '')
        : await signInWithPassword(values.email, values.password ?? '')
    const signInError = result.error
    if (signInError) {
      setError(signInError)
      return
    }
    if (mode === 'magic') setSentTo(values.email)
    if (registerMode && 'needsConfirmation' in result && result.needsConfirmation) setSentTo(values.email)
  }

  return (
    <div className="flex min-h-svh flex-1 items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <IconMountain className="size-6" />
          </div>
          <CardTitle>Roamio</CardTitle>
          <CardDescription>{mode === 'password' ? 'Sign in with your email and password.' : 'Sign in with a one-time email link.'}</CardDescription>
        </CardHeader>
        <CardContent>
          {sentTo ? (
            <p className="text-sm text-muted-foreground">
              Check <span className="font-medium text-foreground">{sentTo}</span> for a confirmation email. You can close this tab.
            </p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" {...register('email')} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
              {mode === 'password' && (
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" minLength={8} autoComplete={registerMode ? 'new-password' : 'current-password'} {...register('password')} />
                </div>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Please wait…' : mode === 'magic' ? 'Send magic link' : registerMode ? 'Create account' : 'Sign in'}
              </Button>
              <div className="flex justify-between gap-2 text-xs">
                <button type="button" className="text-link hover:underline" onClick={() => { setMode(mode === 'password' ? 'magic' : 'password'); setError(null) }}>
                  {mode === 'password' ? 'Use magic link instead' : 'Use password instead'}
                </button>
                {mode === 'password' && <button type="button" className="text-link hover:underline" onClick={() => { setRegisterMode(!registerMode); setError(null) }}>
                  {registerMode ? 'I already have an account' : 'Create an account'}
                </button>}
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
