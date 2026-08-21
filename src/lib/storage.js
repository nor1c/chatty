const KEY = 'chatty-state-v1'

export function loadState() {
  try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null }
}

export function saveState(value) {
  try { localStorage.setItem(KEY, JSON.stringify(value)); return true } catch { return false }
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = filename; link.click()
  URL.revokeObjectURL(url)
}

export function downloadJson(value, filename) {
  downloadBlob(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }), filename)
}

export function downloadText(value, filename, type = 'text/plain') {
  downloadBlob(new Blob([value], { type: `${type};charset=utf-8` }), filename)
}

export function readFileText(accept) {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) { resolve(null); return }
      const reader = new FileReader()
      reader.onload = () => resolve({ name: file.name, text: String(reader.result || '') })
      reader.onerror = () => reject(new Error('That file could not be read.'))
      reader.readAsText(file)
    }
    input.click()
  })
}

export async function svgToPngBlob(svg, scale = 2) {
  const source = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(source)
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('The mind map image could not be rendered.'))
      element.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.width * scale))
    canvas.height = Math.max(1, Math.round(image.height * scale))
    const context = canvas.getContext('2d')
    context.scale(scale, scale)
    context.drawImage(image, 0, 0)
    return await new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('The mind map image could not be encoded.')), 'image/png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}
