import { describe, expect, it } from 'vitest'

import { decryptBytes, decryptJson, deriveVaultKey, encryptBytes, encryptJson, generateSaltBase64 } from '../crypto'

describe('vault crypto', () => {
  it('round-trips JSON through encryptJson/decryptJson with the correct passphrase', async () => {
    const salt = generateSaltBase64()
    const key = await deriveVaultKey('correct-horse-battery-staple', salt)
    const payload = { title: "Hemang's passport", originalFileName: 'passport.pdf' }
    const { ciphertextBase64, ivBase64 } = await encryptJson(key, payload)
    const decrypted = await decryptJson<typeof payload>(key, ciphertextBase64, ivBase64)
    expect(decrypted).toEqual(payload)
  })

  it('fails to decrypt with the wrong passphrase', async () => {
    const salt = generateSaltBase64()
    const key = await deriveVaultKey('correct-horse-battery-staple', salt)
    const wrongKey = await deriveVaultKey('a-different-passphrase', salt)
    const { ciphertextBase64, ivBase64 } = await encryptJson(key, { secret: true })
    await expect(decryptJson(wrongKey, ciphertextBase64, ivBase64)).rejects.toThrow()
  })

  it('round-trips arbitrary bytes through encryptBytes/decryptBytes', async () => {
    const salt = generateSaltBase64()
    const key = await deriveVaultKey('another-passphrase', salt)
    const original = new Uint8Array([1, 2, 3, 250, 251, 252])
    const { ciphertextBase64, ivBase64 } = await encryptBytes(key, original.buffer)
    const decrypted = new Uint8Array(await decryptBytes(key, ciphertextBase64, ivBase64))
    expect(Array.from(decrypted)).toEqual(Array.from(original))
  })
})
