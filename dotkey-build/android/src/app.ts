import { initCrypto, encryptVault, decryptVault, generatePassword, genId, Vault, Entry } from '@dotkey/core'
import { readFile, writeFile, pickFile, saveFile } from './fs'

let vault: Vault | null = null
let masterPassword = ''
let filePath: string | null = null
let isDark = true
let showPasswords = false
let searchQuery = ''

function $(sel: string) { return document.querySelector(sel) as HTMLElement | null }
function $$<T extends HTMLElement>(sel: string) { return Array.from(document.querySelectorAll(sel)) as T[] }

function showStatus(msg: string) {
  const el = $('#status')
  if (!el) return
  el.textContent = msg
  setTimeout(() => { if (el.textContent === msg) el.textContent = '' }, 2000)
}

function setTheme(dark: boolean) {
  isDark = dark
  document.documentElement.classList.toggle('dark', dark)
  const btn = $('#theme-btn')
  if (btn) btn.textContent = dark ? '[LIGHT]' : '[DARK]'
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function renderUnlock() {
  const root = $('#root')
  if (!root) return
  root.innerHTML = `
    <section class="unlock-view">
      <h1 class="title-doto">DOTKEY</h1>
      <p class="subtitle">PASSWORD VAULT</p>
      <div class="input-group">
        <label class="input-label">MASTER PASSWORD</label>
        <div class="password-row">
          <input type="password" id="master-pass" class="nothing-input" placeholder="ENTER PASSWORD" autocomplete="off" />
          <button class="technical-btn" id="show-pass-btn">[SHOW]</button>
        </div>
      </div>
      <button class="pill-btn" id="unlock-btn">UNLOCK VAULT</button>
      <button class="pill-btn" id="create-btn">CREATE NEW VAULT</button>
      <div class="file-row">
        <button class="technical-btn" id="open-file-btn">[OPEN FILE]</button>
        <span class="mono-secondary" id="file-name">${filePath ? filePath.split(/[\\/]/).pop() : 'NO FILE SELECTED'}</span>
      </div>
    </section>
  `
  const passInput = $('#master-pass') as HTMLInputElement
  const showBtn = $('#show-pass-btn')
  showBtn?.addEventListener('click', () => {
    if (passInput.type === 'password') { passInput.type = 'text'; showBtn.textContent = '[HIDE]' }
    else { passInput.type = 'password'; showBtn.textContent = '[SHOW]' }
  })
  $('#unlock-btn')?.addEventListener('click', unlockVault)
  $('#create-btn')?.addEventListener('click', createVault)
  $('#open-file-btn')?.addEventListener('click', async () => {
    const path = await pickFile()
    if (path) { filePath = path; const el = $('#file-name'); if (el) el.textContent = path.split(/[\\/]/).pop() || path; showStatus('[FILE SELECTED]') }
  })
  passInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') unlockVault() })
  passInput?.focus()
}

function renderVault() {
  const root = $('#root')
  if (!root || !vault) return
  const filtered = searchQuery ? vault.entries.filter(e =>
    e.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.url.toLowerCase().includes(searchQuery.toLowerCase())
  ) : vault.entries

  root.innerHTML = `
    <header class="app-header">
      <div class="header-left"><h1 class="title-small">DOTKEY</h1><span class="entry-count">${vault.entries.length} ENTRIES</span></div>
      <div class="header-right">
        <span class="status-mono" id="status"></span>
        <button class="technical-btn" id="theme-btn">${isDark ? '[LIGHT]' : '[DARK]'}</button>
        <button class="technical-btn" id="toggle-pass-btn">${showPasswords ? '[HIDE]' : '[SHOW]'}</button>
        <button class="technical-btn danger" id="lock-btn">[LOCK]</button>
      </div>
    </header>
    <div class="vault-toolbar">
      <button class="pill-btn" id="add-btn">ADD ENTRY</button>
      <button class="pill-btn" id="save-btn">SAVE</button>
      <button class="pill-btn" id="save-as-btn">SAVE AS</button>
      <div class="search-box"><input type="text" id="search-input" class="nothing-input search" placeholder="SEARCH..." value="${escapeHtml(searchQuery)}" /></div>
    </div>
    <div class="entries-list">
      ${filtered.length === 0 ? `<div class="empty-state"><p class="doto-large">${vault.entries.length === 0 ? 'NO ENTRIES' : 'NO MATCH'}</p><p class="mono-secondary">${vault.entries.length === 0 ? 'ADD A SERVICE TO BEGIN' : 'TRY DIFFERENT SEARCH'}</p></div>`
        : filtered.map((entry, displayIdx) => {
          const originalIdx = vault!.entries.indexOf(entry)
          return `<article class="entry-card" data-id="${entry.id}">
            <div class="entry-header"><span class="entry-number">${String(displayIdx + 1).padStart(2, '0')}</span><span class="entry-date">${entry.modified_at.slice(0, 10)}</span></div>
            <div class="entry-field"><label class="input-label">SERVICE</label><input type="text" class="nothing-input" data-field="service" data-idx="${originalIdx}" value="${escapeHtml(entry.service)}" /></div>
            <div class="entry-field"><label class="input-label">USERNAME</label><div class="copy-row"><input type="text" class="nothing-input" data-field="username" data-idx="${originalIdx}" value="${escapeHtml(entry.username)}" /><button class="technical-btn copy-btn" data-copy="${escapeHtml(entry.username)}">[COPY]</button></div></div>
            <div class="entry-field"><label class="input-label">PASSWORD</label><div class="copy-row"><input type="${showPasswords ? 'text' : 'password'}" class="nothing-input mono" data-field="password" data-idx="${originalIdx}" value="${escapeHtml(entry.password)}" /><button class="technical-btn copy-btn" data-copy="${escapeHtml(entry.password)}">[COPY]</button></div><button class="technical-btn gen-btn" data-idx="${originalIdx}">[GENERATE]</button></div>
            <div class="entry-field"><label class="input-label">URL</label><input type="text" class="nothing-input" data-field="url" data-idx="${originalIdx}" value="${escapeHtml(entry.url)}" /></div>
            <div class="entry-field"><label class="input-label">NOTES</label><textarea class="nothing-input notes" data-field="notes" data-idx="${originalIdx}" rows="2">${escapeHtml(entry.notes)}</textarea></div>
            <div class="entry-actions"><button class="technical-btn danger delete-btn" data-idx="${originalIdx}">[DELETE]</button><span class="mono-secondary">ID: ${entry.id.slice(0, 8)}</span></div>
          </article>`
        }).join('')}
    </div>
  `
  $('#add-btn')?.addEventListener('click', addEntry)
  $('#save-btn')?.addEventListener('click', saveVault)
  $('#save-as-btn')?.addEventListener('click', saveVaultAs)
  $('#lock-btn')?.addEventListener('click', lockVault)
  $('#theme-btn')?.addEventListener('click', () => setTheme(!isDark))
  $('#toggle-pass-btn')?.addEventListener('click', () => { showPasswords = !showPasswords; renderVault() })
  $('#search-input')?.addEventListener('input', (e) => { searchQuery = (e.target as HTMLInputElement).value; renderVault() })

  $$<HTMLInputElement>('input[data-field], textarea[data-field]').forEach(input => {
    input.addEventListener('input', (e) => {
      const t = e.target as HTMLInputElement
      const idx = parseInt(t.dataset.idx || '0')
      const field = t.dataset.field as keyof Entry
      if (vault && vault.entries[idx]) { (vault.entries[idx] as any)[field] = t.value; vault.entries[idx].modified_at = new Date().toISOString() }
    })
  })

  $$<HTMLButtonElement>('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.copy || '').then(() => {
        const orig = btn.textContent; btn.textContent = '[COPIED]'
        setTimeout(() => btn.textContent = orig, 1200)
      })
    })
  })

  $$<HTMLButtonElement>('.gen-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx || '0')
      if (vault) { vault.entries[idx].password = generatePassword(); vault.entries[idx].modified_at = new Date().toISOString() }
      renderVault(); showStatus('[PASSWORD GENERATED]')
    })
  })

  $$<HTMLButtonElement>('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx || '0')
      if (vault) { vault.entries.splice(idx, 1); renderVault(); showStatus('[DELETED]') }
    })
  })
}

async function unlockVault() {
  const passInput = $('#master-pass') as HTMLInputElement
  masterPassword = passInput?.value || ''
  if (!masterPassword) { showStatus('[ENTER PASSWORD]'); return }
  if (!filePath) {
    const path = await pickFile()
    if (!path) { showStatus('[SELECT A FILE]'); return }
    filePath = path
  }
  try {
    const data = await readFile(filePath)
    const decrypted = await decryptVault(masterPassword, data)
    if (decrypted) {
      vault = decrypted; searchQuery = ''; showPasswords = false
      renderVault(); showStatus('[DECRYPTED]')
    } else { showStatus('[WRONG PASSWORD]') }
  } catch { showStatus('[ERROR]') }
}

function createVault() {
  const passInput = $('#master-pass') as HTMLInputElement
  masterPassword = passInput?.value || ''
  if (!masterPassword) { showStatus('[ENTER PASSWORD]'); return }
  vault = { version: 1, entries: [] }; filePath = null
  searchQuery = ''; showPasswords = false
  renderVault(); showStatus('[NEW VAULT]')
}

function addEntry() {
  if (!vault) return
  vault.entries.push({ id: genId(), service: 'New Service', username: '', password: generatePassword(), url: '', notes: '', tags: [], created_at: new Date().toISOString(), modified_at: new Date().toISOString() })
  renderVault(); showStatus('[ADDED]')
  setTimeout(() => { const list = $('.entries-list'); if (list) list.scrollTop = list.scrollHeight }, 50)
}

async function saveVault() {
  if (!vault || !masterPassword) return
  try {
    const encrypted = await encryptVault(masterPassword, vault)
    if (filePath) { await writeFile(filePath, encrypted); showStatus('[SAVED]') }
    else { await saveVaultAs() }
  } catch { showStatus('[SAVE FAILED]') }
}

async function saveVaultAs() {
  if (!vault || !masterPassword) return
  try {
    const encrypted = await encryptVault(masterPassword, vault)
    const path = await saveFile(encrypted)
    if (path) { filePath = path; showStatus('[SAVED]') }
  } catch { showStatus('[CANCELLED]') }
}

function lockVault() {
  vault = null; masterPassword = ''; filePath = null
  searchQuery = ''; showPasswords = false
  renderUnlock(); showStatus('[LOCKED]')
}

export async function initApp() {
  await initCrypto()
  const loading = $('#loading')
  if (loading) loading.remove()
  setTheme(true)
  renderUnlock()
}
