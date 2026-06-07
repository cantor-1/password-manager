import { readBinaryFile, writeBinaryFile } from '@tauri-apps/api/fs'
import { open, save } from '@tauri-apps/api/dialog'

export async function readFile(path: string): Promise<Uint8Array> {
  return await readBinaryFile(path)
}

export async function writeFile(path: string, data: Uint8Array): Promise<void> {
  await writeBinaryFile(path, data)
}

export async function pickFile(): Promise<string | null> {
  return await open({
    filters: [{ name: 'DOTKEY Vault', extensions: ['mm'] }],
    multiple: false
  }) as string | null
}

export async function saveFile(data: Uint8Array): Promise<string | null> {
  const path = await save({
    filters: [{ name: 'DOTKEY Vault', extensions: ['mm'] }],
    defaultPath: 'vault.mm'
  })
  if (path) {
    await writeBinaryFile(path, data)
    return path
  }
  return null
}
