import { decryptBytes, decryptJson, encryptBytes, encryptJson, generateOpaqueId } from '@/lib/crypto'
import { supabase } from '@/lib/supabase'
import type { DocumentCategory, DocumentLinkedEntity, Tables } from '@/types/database'

export interface DocumentMetadata {
  title: string
  originalFileName: string
  mimeType: string
}

export async function decryptDocumentTitle(
  vaultKey: CryptoKey,
  doc: Pick<Tables<'documents'>, 'encrypted_metadata' | 'metadata_iv'>,
): Promise<string> {
  const meta = await decryptJson<DocumentMetadata>(vaultKey, doc.encrypted_metadata, doc.metadata_iv)
  return meta.title
}

/** Decrypts a stored document and triggers a browser download of the original file. */
export async function downloadEncryptedDocument(vaultKey: CryptoKey, doc: Tables<'documents'>) {
  const meta = await decryptJson<DocumentMetadata>(vaultKey, doc.encrypted_metadata, doc.metadata_iv)
  const { data, error } = await supabase.storage.from('trip-documents').download(doc.storage_path)
  if (error || !data) throw new Error(error?.message ?? 'Download failed')
  const cipherBuffer = await data.arrayBuffer()
  const cipherBase64 = btoa(String.fromCharCode(...new Uint8Array(cipherBuffer)))
  const plainBuffer = await decryptBytes(vaultKey, cipherBase64, doc.file_iv)
  const blob = new Blob([plainBuffer], { type: meta.mimeType || 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = meta.originalFileName || 'document'
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Encrypts a file (AES-GCM) and its metadata client-side, uploads the
 * ciphertext to Storage under an opaque id, and records a documents row.
 * The plaintext filename/title never reaches the server.
 */
export async function uploadEncryptedDocument({
  tripId,
  ownerId,
  vaultKey,
  category,
  linkedEntityType,
  linkedEntityId,
  title,
  file,
}: {
  tripId: string
  ownerId: string
  vaultKey: CryptoKey
  category: DocumentCategory
  linkedEntityType?: DocumentLinkedEntity
  linkedEntityId?: string | null
  title: string
  file: File
}) {
  const opaqueId = generateOpaqueId()
  const storagePath = `${tripId}/${opaqueId}`

  const fileBuffer = await file.arrayBuffer()
  const { ciphertextBase64, ivBase64: fileIv } = await encryptBytes(vaultKey, fileBuffer)
  const cipherBytes = Uint8Array.from(atob(ciphertextBase64), (c) => c.charCodeAt(0))

  const { error: uploadError } = await supabase.storage.from('trip-documents').upload(storagePath, cipherBytes, {
    contentType: 'application/octet-stream',
    upsert: false,
  })
  if (uploadError) throw new Error(uploadError.message)

  const metadata: DocumentMetadata = { title, originalFileName: file.name, mimeType: file.type }
  const { ciphertextBase64: metaCipher, ivBase64: metaIv } = await encryptJson(vaultKey, metadata)

  const { data, error: insertError } = await supabase
    .from('documents')
    .insert({
      trip_id: tripId,
      category,
      linked_entity_type: linkedEntityType ?? null,
      linked_entity_id: linkedEntityId ?? null,
      storage_path: storagePath,
      encrypted_metadata: metaCipher,
      metadata_iv: metaIv,
      file_iv: fileIv,
      size_bytes: file.size,
      owner_id: ownerId,
    })
    .select()
    .single()

  if (insertError) {
    await supabase.storage.from('trip-documents').remove([storagePath])
    throw new Error(insertError.message)
  }

  return data
}
