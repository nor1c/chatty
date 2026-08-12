const CHAT_PREFIX = '/chat/'
const QUIZ_PREFIX = '/quiz'

const decodeSegment = (value) => {
  try { return decodeURIComponent(value) } catch { return '' }
}

export function readRoute(pathname = window.location.pathname) {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  if (normalized === '/') return { page: 'home', chatId: null }
  if (normalized === QUIZ_PREFIX) return { page: 'quiz', quizView: 'categories' }

  const segments = normalized.split('/').filter(Boolean)
  if (segments[0] === 'quiz') {
    if (segments.length === 3 && segments[1] === 'category') {
      const categoryId = decodeSegment(segments[2])
      if (categoryId) return { page: 'quiz', quizView: 'category', categoryId }
    }
    if (segments.length === 4 && segments[1] === 'category' && segments[3] === 'create') {
      const categoryId = decodeSegment(segments[2])
      if (categoryId) return { page: 'quiz', quizView: 'create', categoryId }
    }
    if (segments.length === 3 && segments[1] === 'view') {
      const quizId = decodeSegment(segments[2])
      if (quizId) return { page: 'quiz', quizView: 'detail', quizId }
    }
    if (segments.length === 3 && segments[1] === 'take') {
      const quizId = decodeSegment(segments[2])
      if (quizId) return { page: 'quiz', quizView: 'taking', quizId }
    }
    if (segments.length === 3 && segments[1] === 'result') {
      const attemptId = decodeSegment(segments[2])
      if (attemptId) return { page: 'quiz', quizView: 'result', attemptId }
    }
  }

  if (normalized.startsWith(CHAT_PREFIX)) {
    const encodedId = normalized.slice(CHAT_PREFIX.length)
    if (encodedId && !encodedId.includes('/')) {
      const chatId = decodeSegment(encodedId)
      if (chatId) return { page: 'chat', chatId }
    }
  }
  return { page: 'home', chatId: null }
}

export function chatPath(chatId) {
  return `${CHAT_PREFIX}${encodeURIComponent(chatId)}`
}

export const quizPaths = {
  categories: QUIZ_PREFIX,
  category: (categoryId) => `${QUIZ_PREFIX}/category/${encodeURIComponent(categoryId)}`,
  create: (categoryId) => `${QUIZ_PREFIX}/category/${encodeURIComponent(categoryId)}/create`,
  detail: (quizId) => `${QUIZ_PREFIX}/view/${encodeURIComponent(quizId)}`,
  taking: (quizId) => `${QUIZ_PREFIX}/take/${encodeURIComponent(quizId)}`,
  result: (attemptId) => `${QUIZ_PREFIX}/result/${encodeURIComponent(attemptId)}`,
}
