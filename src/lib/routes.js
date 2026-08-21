const CHAT_PREFIX = '/chat/'
const WORKSPACE_PREFIX = '/workspace/'
const WORKSPACES_PATH = '/workspaces'
const QUIZ_PREFIX = '/quiz'
const VOCABULARY_PATH = '/vocabulary'
const VOCABULARY_PREFIX = '/vocabulary/'
const EBOOK_PATH = '/ebook-maker'
const MIND_MAP_PATH = '/mind-map'

const decodeSegment = (value) => {
  try { return decodeURIComponent(value) } catch { return '' }
}

export function readRoute(pathname = window.location.pathname) {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  if (normalized === '/') return { page: 'home', chatId: null }
  if (normalized === WORKSPACES_PATH) return { page: 'workspaces' }
  if (normalized === QUIZ_PREFIX) return { page: 'quiz', quizView: 'categories' }
  if (normalized === VOCABULARY_PATH) return { page: 'vocabulary' }
  if (normalized === EBOOK_PATH) return { page: 'ebook' }
  if (normalized === MIND_MAP_PATH) return { page: 'mind-map' }
  if (normalized.startsWith(`${MIND_MAP_PATH}/`)) {
    const encodedId = normalized.slice(MIND_MAP_PATH.length + 1)
    if (encodedId && !encodedId.includes('/')) {
      const mindMapId = decodeSegment(encodedId)
      if (mindMapId) return { page: 'mind-map-detail', mindMapId }
    }
  }
  if (normalized.startsWith(VOCABULARY_PREFIX)) {
    const vocabularySegments = normalized.slice(VOCABULARY_PREFIX.length).split('/')
    const languageId = decodeSegment(vocabularySegments[0])
    if (languageId && vocabularySegments.length === 2 && vocabularySegments[1] === 'practice') return { page: 'vocabulary-practice', languageId }
    if (languageId && vocabularySegments.length === 1) return { page: 'vocabulary-language', languageId }
  }

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

  if (normalized.startsWith(WORKSPACE_PREFIX)) {
    const encodedId = normalized.slice(WORKSPACE_PREFIX.length)
    if (encodedId && !encodedId.includes('/')) {
      const workspaceId = decodeSegment(encodedId)
      if (workspaceId) return { page: 'workspace', workspaceId }
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

export function workspacePath(workspaceId) {
  return `${WORKSPACE_PREFIX}${encodeURIComponent(workspaceId)}`
}

export const workspacesPath = WORKSPACES_PATH
export const vocabularyPath = VOCABULARY_PATH
export const ebookPath = EBOOK_PATH
export const mindMapPath = MIND_MAP_PATH
export const mindMapDetailPath = (mindMapId) => `${MIND_MAP_PATH}/${encodeURIComponent(mindMapId)}`
export const vocabularyLanguagePath = (languageId) => `${VOCABULARY_PREFIX}${encodeURIComponent(languageId)}`
export const vocabularyPracticePath = (languageId) => `${vocabularyLanguagePath(languageId)}/practice`

export const quizPaths = {
  categories: QUIZ_PREFIX,
  category: (categoryId) => `${QUIZ_PREFIX}/category/${encodeURIComponent(categoryId)}`,
  create: (categoryId) => `${QUIZ_PREFIX}/category/${encodeURIComponent(categoryId)}/create`,
  detail: (quizId) => `${QUIZ_PREFIX}/view/${encodeURIComponent(quizId)}`,
  taking: (quizId) => `${QUIZ_PREFIX}/take/${encodeURIComponent(quizId)}`,
  result: (attemptId) => `${QUIZ_PREFIX}/result/${encodeURIComponent(attemptId)}`,
}
