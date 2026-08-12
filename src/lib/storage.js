const KEY = 'chatty-state-v1'

export function loadState() {
  try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null }
}

export function saveState(value) {
  try { localStorage.setItem(KEY, JSON.stringify(value)); return true } catch { return false }
}

export function downloadJson(value, filename) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = filename; link.click()
  URL.revokeObjectURL(url)
}
