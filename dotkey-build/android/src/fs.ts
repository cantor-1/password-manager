import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'

const VAULT_DIR = 'DotKey'

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function readFile(path: string): Promise<Uint8Array> {
  if (path.includes('/')) {
    const result = await Filesystem.readFile({ path, directory: Directory.External })
    return base64ToUint8(result.data as string)
  }
  const result = await Filesystem.readFile({
    path: `${VAULT_DIR}/${path}`,
    directory: Directory.Documents
  })
  return base64ToUint8(result.data as string)
}

export async function writeFile(path: string, data: Uint8Array): Promise<void> {
  await Filesystem.writeFile({
    path: `${VAULT_DIR}/${path}`,
    data: uint8ToBase64(data),
    directory: Directory.Documents,
    recursive: true
  })
}

export async function pickFile(): Promise<string | null> {
  try {
    await Filesystem.mkdir({ path: VAULT_DIR, directory: Directory.Documents, recursive: true })
    const result = await Filesystem.readdir({ path: VAULT_DIR, directory: Directory.Documents })
    const vaults = result.files.filter(f => f.name.endsWith('.mm'))
    if (vaults.length > 0) return vaults[0].name
  } catch {}
  return null
}

export async function saveFile(data: Uint8Array): Promise<string | null> {
  const filename = `vault-${Date.now()}.mm`
  await Filesystem.writeFile({
    path: `${VAULT_DIR}/${filename}`,
    data: uint8ToBase64(data),
    directory: Directory.Documents,
    recursive: true
  })
  return filename
}
