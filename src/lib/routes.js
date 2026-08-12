const CHAT_PREFIX = '/chat/'

export function readRoute(pathname = window.location.pathname) {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  if (normalized === '/') return { page: 'home', chatId: null }
  if (normalized === '/quiz') return { page: 'quiz', chatId: null }
  if (normalized.startsWith(CHAT_PREFIX)) {
    const encodedId = normalized.slice(CHAT_PREFIX.length)
    if (encodedId && !encodedId.includes('/')) {
      try { return { page: 'chat', chatId: decodeURIComponent(encodedId) } } catch { /* invalid URL encoding */ }
    }
  }
  return { page: 'home', chatId: null }
}

export function chatPath(chatId) {
  return `${CHAT_PREFIX}${encodeURIComponent(chatId)}`
}
