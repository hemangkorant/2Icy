// Client-side document encryption (AES-256-GCM via Web Crypto).
//
// The vault passphrase is chosen by the couple and shared between them out
// of band (never stored anywhere). A key is derived from it with PBKDF2
// using a random per-trip salt (the salt itself is not secret and is stored
// in app_settings.vault_salt so both devices derive the same key). The
// derived CryptoKey lives only in memory for the lifetime of the tab/session
// — it is intentionally never persisted to localStorage/IndexedDB, so a page
// reload always requires the passphrase again. Losing the passphrase means
// the ciphertext is unrecoverable; there is no server-side escape hatch.

const PBKDF2_ITERATIONS = 250_000

export function generateSaltBase64(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return bufferToBase64(bytes.buffer)
}

export async function deriveVaultKey(passphrase: string, saltBase64: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  const salt = base64ToBuffer(saltBase64)
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export interface EncryptedPayload {
  ciphertextBase64: string
  ivBase64: string
}

export async function encryptBytes(key: CryptoKey, data: ArrayBuffer): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  return { ciphertextBase64: bufferToBase64(ciphertext), ivBase64: bufferToBase64(iv.buffer) }
}

export async function decryptBytes(key: CryptoKey, ciphertextBase64: string, ivBase64: string): Promise<ArrayBuffer> {
  const iv = new Uint8Array(base64ToBuffer(ivBase64))
  const ciphertext = base64ToBuffer(ciphertextBase64)
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
}

export async function encryptJson(key: CryptoKey, value: unknown): Promise<EncryptedPayload> {
  const json = new TextEncoder().encode(JSON.stringify(value))
  return encryptBytes(key, json.buffer as ArrayBuffer)
}

export async function decryptJson<T>(key: CryptoKey, ciphertextBase64: string, ivBase64: string): Promise<T> {
  const buf = await decryptBytes(key, ciphertextBase64, ivBase64)
  return JSON.parse(new TextDecoder().decode(buf)) as T
}

export function generateOpaqueId(): string {
  return crypto.randomUUID()
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}
