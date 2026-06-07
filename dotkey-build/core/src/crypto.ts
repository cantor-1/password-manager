import _sodium from 'libsodium-wrappers'
let sodium: typeof _sodium | null = null

export async function initCrypto(): Promise<void> {
  await _sodium.ready
  sodium = _sodium
}

const MAGIC = new Uint8Array([0x44, 0x4B, 0x56, 0x54])
const VERSION = 1
const SALT_LEN = 16
const NONCE_LEN = 24

export interface Entry {
  id: string; service: string; username: string
  password: string; url: string; notes: string
  tags: string[]; created_at: string; modified_at: string
}

export interface Vault {
  version: number; entries: Entry[]
}

export async function encryptVault(password: string, vault: Vault): Promise<Uint8Array> {
  if (!sodium) throw new Error('Crypto not initialized')
  const plaintext = new TextEncoder().encode(JSON.stringify(vault))
  const salt = sodium.randombytes_buf(SALT_LEN)
  const nonce = sodium.randombytes_buf(NONCE_LEN)
  const key = sodium.crypto_pwhash(32, password, salt, 3, 65536, sodium.crypto_pwhash_ALG_ARGON2ID13)
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(plaintext, null, nonce, key)
  sodium.memzero(key)
  const result = new Uint8Array(4 + 1 + SALT_LEN + 8 + NONCE_LEN + ciphertext.length)
  let off = 0
  result.set(MAGIC, off); off += 4
  result[off++] = VERSION
  result.set(salt, off); off += SALT_LEN
  result.set(new Uint8Array(8), off); off += 8
  result.set(nonce, off); off += NONCE_LEN
  result.set(ciphertext, off)
  return result
}

export async function decryptVault(password: string, data: Uint8Array): Promise<Vault | null> {
  if (!sodium) throw new Error('Crypto not initialized')
  if (data.length < 4 + 1 + SALT_LEN + 8 + NONCE_LEN + 16) return null
  if (!data.slice(0, 4).every((b, i) => b === MAGIC[i])) return null
  const salt = data.slice(5, 5 + SALT_LEN)
  const nonce = data.slice(5 + SALT_LEN + 8, 5 + SALT_LEN + 8 + NONCE_LEN)
  const ciphertext = data.slice(5 + SALT_LEN + 8 + NONCE_LEN)
  const key = sodium.crypto_pwhash(32, password, salt, 3, 65536, sodium.crypto_pwhash_ALG_ARGON2ID13)
  try {
    const plaintext = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(null, ciphertext, nonce, key)
    sodium.memzero(key)
    return JSON.parse(new TextDecoder().decode(plaintext)) as Vault
  } catch {
    sodium.memzero(key)
    return null
  }
}

export function generatePassword(length = 20): string {
  if (!sodium) return ''
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*-_+=<>?'
  const bytes = sodium.randombytes_buf(length)
  let result = ''
  for (let i = 0; i < length; i++) result += chars[bytes[i] % chars.length]
  return result
}

export function genId(): string {
  return 'e-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6)
}
