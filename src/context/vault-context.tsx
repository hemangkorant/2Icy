import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { decryptJson, deriveVaultKey, encryptJson, generateSaltBase64 } from '@/lib/crypto'
import { supabase } from '@/lib/supabase'

import { useTrip } from './trip-context'

const CANARY_VALUE = 'iceland-trip-vault-check'

interface VaultContextValue {
  isUnlocked: boolean
  isSetUp: boolean
  checking: boolean
  key: CryptoKey | null
  unlock: (passphrase: string) => Promise<{ error: string | null }>
  setUpVault: (passphrase: string) => Promise<{ error: string | null }>
  lock: () => void
}

const VaultContext = createContext<VaultContextValue | null>(null)

export function VaultProvider({ children }: { children: ReactNode }) {
  const { activeTripId } = useTrip()
  const [key, setKey] = useState<CryptoKey | null>(null)
  const [checking, setChecking] = useState(true)
  const [isSetUp, setIsSetUp] = useState(false)

  useEffect(() => {
    setKey(null)
    if (!activeTripId) {
      setIsSetUp(false)
      setChecking(false)
      return
    }
    setChecking(true)
    supabase
      .from('app_settings')
      .select('vault_salt')
      .eq('trip_id', activeTripId)
      .maybeSingle()
      .then(({ data }) => {
        setIsSetUp(Boolean(data?.vault_salt))
        setChecking(false)
      })
  }, [activeTripId])

  const unlock = async (passphrase: string): Promise<{ error: string | null }> => {
    if (!activeTripId) return { error: 'No active trip' }
    const { data: settings, error: fetchError } = await supabase
      .from('app_settings')
      .select('vault_salt, vault_check_ciphertext, vault_check_iv')
      .eq('trip_id', activeTripId)
      .maybeSingle()
    if (fetchError || !settings) return { error: 'Could not load vault settings' }

    if (!settings.vault_salt || !settings.vault_check_ciphertext || !settings.vault_check_iv) {
      return { error: 'Vault has not been set up yet for this trip.' }
    }

    try {
      const derived = await deriveVaultKey(passphrase, settings.vault_salt)
      const canary = await decryptJson<string>(derived, settings.vault_check_ciphertext, settings.vault_check_iv)
      if (canary !== CANARY_VALUE) return { error: 'Incorrect passphrase' }
      setKey(derived)
      return { error: null }
    } catch {
      return { error: 'Incorrect passphrase' }
    }
  }

  const setUpVault = async (passphrase: string): Promise<{ error: string | null }> => {
    if (!activeTripId) return { error: 'No active trip' }
    const salt = generateSaltBase64()
    const derived = await deriveVaultKey(passphrase, salt)
    const canary = await encryptJson(derived, CANARY_VALUE)
    const { error } = await supabase
      .from('app_settings')
      .update({
        vault_salt: salt,
        vault_check_ciphertext: canary.ciphertextBase64,
        vault_check_iv: canary.ivBase64,
      })
      .eq('trip_id', activeTripId)
    if (error) return { error: error.message }
    setKey(derived)
    setIsSetUp(true)
    return { error: null }
  }

  const lock = () => setKey(null)

  const value = useMemo<VaultContextValue>(
    () => ({ isUnlocked: key !== null, isSetUp, checking, key, unlock, setUpVault, lock }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, checking, isSetUp, activeTripId],
  )

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
}

export function useVault() {
  const ctx = useContext(VaultContext)
  if (!ctx) throw new Error('useVault must be used within VaultProvider')
  return ctx
}
