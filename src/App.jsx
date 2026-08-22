import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowsInLineHorizontal, ArrowsOutLineHorizontal, ArrowRight, ArrowSquareOut, BookOpen, Books, CaretLeft, CaretRight, ChatCircle, CheckCircle, DownloadSimple, Exam, GearSix, House, PaperPlaneRight, Plus, Sparkle, Stop, Trash, TreeStructure, X } from '@phosphor-icons/react'
import Message from './components/Message'
import SettingsPanel from './components/SettingsPanel'
import Listbox from './components/Listbox'
import ContextMeter from './components/ContextMeter'
import ConfirmDialog from './components/ConfirmDialog'
import SelectionToolbar from './components/SelectionToolbar'
import QuickAskPopup from './components/QuickAskPopup'
import WorkspaceDialog from './components/WorkspaceDialog'
import QuizPage from './components/QuizPage'
import HomePortal from './components/HomePortal'
import VocabularyPage from './components/VocabularyPage'
import EbookPage from './components/EbookPage'
import MindMapPage from './components/MindMapPage'
import { AvatarTrio, CursorGlow, DoodleField, RobotMascot } from './components/CreativeVisuals'
import { fetchModels, streamCompletion } from './lib/provider'
import { downloadJson, loadState, saveState } from './lib/storage'
import { chatPath, ebookPath, mindMapDetailPath, mindMapPath, quizPaths, readRoute, vocabularyLanguagePath, vocabularyPath, vocabularyPracticePath, workspacePath, workspacesPath } from './lib/routes'
import { normalizeGrade, normalizeQuiz, parseModelJson } from './lib/quiz'
import { speakWord } from './lib/pronunciation'
import { normalizeVocabularyClassifications } from './lib/vocabulary'
import { normalizeRainPairs } from './lib/wordRain'
import { normalizeEbookEnding, normalizeEbookMetadata, normalizeEbookOutlineChapter, normalizeEbookSection, normalizeEbookSectionPlan } from './lib/ebook'
import { buildChatContext } from './lib/chat'
import { normalizeMindMap } from './lib/mindmap'

const id = () => crypto.randomUUID()
const blankProvider = { name: 'Custom Provider', baseUrl: '', apiKey: '', model: '', contextWindow: 128000, instructions: '', headersText: '' }
const OUTPUT_RESERVE = 4096
const estimateTokens = (items, draft = '') => Math.ceil((items.reduce((total, item) => total + item.content.length + (item.quote?.length || 0), 0) + draft.length) / 4) + (items.length + (draft ? 1 : 0)) * 4
const contextWidthClass = (percent) => {
  if (percent >= 100) return 'w-full'
  if (percent >= 90) return 'w-11/12'
  if (percent >= 80) return 'w-4/5'
  if (percent >= 70) return 'w-3/4'
  if (percent >= 60) return 'w-3/5'
  if (percent >= 50) return 'w-1/2'
  if (percent >= 40) return 'w-2/5'
  if (percent >= 30) return 'w-1/3'
  if (percent >= 20) return 'w-1/5'
  if (percent >= 10) return 'w-1/12'
  return 'w-0'
}
const createWelcome = () => ({ id: id(), role: 'assistant', content: 'Hello. Connect a provider, select a model, and start chatting.' })
const migrateInterfaceText = (items) => items.map((conversation) => ({
  ...conversation,
  title: conversation.title === 'Percakapan baru' ? 'New conversation' : conversation.title,
  messages: conversation.messages.map((message) => ({
    ...message,
    content: message.content === 'Halo. Hubungkan provider, pilih model, lalu mulai chat.'
      ? 'Hello. Connect a provider, select a model, and start chatting.'
      : message.content,
  })),
}))
const NATURAL_STYLE_PROMPT = `Respond naturally and directly in the user's language. Avoid unnecessary introductions, praise, repeating the question, redundant conclusions, excessive headings or lists, overusing bold text, clichéd AI-assistant phrases, and em or en dashes. Use simple sentences and punctuation. This assistant is primarily for general, non-coding conversation. For non-coding topics, do not use fenced code blocks, inline code, or backticks merely to emphasize terms, names, vocabulary, formulas written in ordinary prose, or other regular text; use plain text, bold, or italics only when emphasis is genuinely useful. Use code formatting only when the user is discussing programming, markup, terminal commands, configuration, structured data, literal technical syntax, or explicitly requests code or a specific format. For coding topics, format code normally and prioritize technical and format accuracy.`
const QUIZ_SCHEMA = `Return only one valid JSON object with this shape: {"title":"string","description":"string","instructions":"string","questions":[{"id":"unique string","prompt":"string","responseMode":"single_choice|multiple_choice|short_text|long_text|boolean|number","options":["string"],"helperText":"string","points":1}]}. Match the requested format instead of forcing a fixed test type. Use options only for choice questions. Never include answers, solutions, hints that reveal answers, Markdown fences, or text outside JSON.`
const GRADE_SCHEMA = `Return only one valid JSON object with this shape: {"score":1,"grade":"A+|A|A-|B+|B|B-|C+|C|C-|D+|D|D-|F","summary":"concise final assessment","review":"overall review of strengths and weaknesses","advice":"specific next study steps","feedback":[{"questionId":"matching id","correct":true,"note":"concise feedback"}]}. Include one feedback item for every question. Score must be an integer from 1 through 100. Evaluate the submitted answers against the quiz subject using your own knowledge. Do not ask follow-up questions and do not include text outside JSON.`
const GRAMMAR_ASSIST_PROMPT = `If the user's latest message is written in English and contains clear grammatical errors, begin the response with exactly this short Markdown info section:
> **Grammar note**
> **Correction:** [a natural, grammatically correct version of the user's sentence]

Then continue with the answer. Only show this section when a correction is genuinely needed. Do not flag valid informal English, intentional slang, quoted text, code, fragments used as labels or search queries, or minor stylistic preferences. Correct grammar without changing the user's intended meaning.`
const workspaceBackgrounds = {
  white: 'bg-white dark:bg-slate-950',
  purple: 'bg-purple-50 dark:bg-[#170f25]',
  blue: 'bg-blue-50 dark:bg-[#0b1729]',
  teal: 'bg-teal-50 dark:bg-[#071f22]',
}
const sidebarWidths = {
  240: 'w-[240px]', 256: 'w-64', 272: 'w-[272px]', 288: 'w-72',
  304: 'w-[304px]', 320: 'w-80', 336: 'w-[336px]', 352: 'w-[352px]',
}
const sidebarTogglePositions = {
  240: 'md:left-[240px]', 256: 'md:left-64', 272: 'md:left-[272px]', 288: 'md:left-72',
  304: 'md:left-[304px]', 320: 'md:left-80', 336: 'md:left-[336px]', 352: 'md:left-[352px]',
}
const clampSidebarWidth = (value) => Math.min(352, Math.max(240, Math.round(value / 16) * 16))
const button = 'flex h-9 items-center justify-center rounded-lg text-slate-600 transition-colors duration-300 ease-out hover:bg-slate-100 hover:text-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-purple-400'

function normalizeProvider(provider) {
  let headers = {}
  try { headers = provider.headersText ? JSON.parse(provider.headersText) : {} } catch { /* validated when saving */ }
  return { ...provider, headers }
}

export default function App() {
  const stored = useMemo(() => loadState(), [])
  const [theme, setTheme] = useState(stored?.theme || 'light')
  const [providers, setProviders] = useState(stored?.providers?.length ? stored.providers : [blankProvider])
  const [activeProvider, setActiveProvider] = useState(stored?.activeProvider || 0)
  const [models, setModels] = useState(stored?.models || [])
  const [quizCategories, setQuizCategories] = useState(() => (stored?.quizCategories || []).filter((category) => category.id !== 'general-quiz' || stored?.savedQuizzes?.some((quiz) => quiz.categoryId === category.id)))
  const [savedQuizzes, setSavedQuizzes] = useState(stored?.savedQuizzes || [])
  const [quizAttempts, setQuizAttempts] = useState(stored?.quizAttempts || [])
  const [vocabularyLanguages, setVocabularyLanguages] = useState(stored?.vocabularyLanguages || [])
  const [ebooks, setEbooks] = useState(stored?.ebooks || [])
  const [mindMaps, setMindMaps] = useState(() => (stored?.mindMaps || []).map((map) => normalizeMindMap(map, map?.title)))
  const [workspaces, setWorkspaces] = useState(stored?.workspaces?.length ? stored.workspaces : [{ id: 'default', name: 'General', color: 'white', instructions: '' }])
  const initialWorkspaceId = stored?.workspaces?.[0]?.id || 'default'
  const [conversations, setConversations] = useState(() => {
    const saved = stored?.conversations?.length ? migrateInterfaceText(stored.conversations) : [{ id: id(), title: 'New conversation', messages: [createWelcome()], createdAt: Date.now() }]
    return saved.map((chat) => ({ ...chat, workspaceId: chat.workspaceId || initialWorkspaceId }))
  })
  const initialRoute = useMemo(() => readRoute(), [])
  const initialRouteChat = conversations.find((chat) => chat.id === initialRoute.chatId)
  const initialRouteWorkspace = workspaces.find((workspace) => workspace.id === initialRoute.workspaceId)
  const initialActiveId = initialRouteChat?.id || stored?.activeId || conversations[0].id
  const initialRouteLanguage = vocabularyLanguages.find((language) => language.id === initialRoute.languageId)
  const [route, setRoute] = useState(initialRoute.page === 'quiz' || initialRoute.page === 'workspaces' || initialRoute.page === 'vocabulary' || initialRoute.page === 'ebook' || initialRoute.page === 'mind-map' || initialRoute.page === 'mind-map-detail' || initialRouteLanguage || initialRouteChat || initialRouteWorkspace ? initialRoute : { page: 'home', chatId: null })
  const [activeId, setActiveId] = useState(initialActiveId)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(() => conversations.find((chat) => chat.id === initialActiveId)?.workspaceId || initialWorkspaceId)
  const [workspaceDialog, setWorkspaceDialog] = useState({ open: false, workspace: null })
  const [confirmation, setConfirmation] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarTab, setSidebarTab] = useState(initialRoute.page === 'quiz' ? 'quiz' : 'chat')
  const [sidebarVisible, setSidebarVisible] = useState(stored?.sidebarVisible ?? true)
  const [sidebarWidth, setSidebarWidth] = useState(clampSidebarWidth(stored?.sidebarWidth || 272))
  const [input, setInput] = useState('')
  const [followUpQuote, setFollowUpQuote] = useState('')
  const [status, setStatus] = useState({ loading: false, ok: false, message: '' })
  const [storageError, setStorageError] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState(null)
  const [responseReadyId, setResponseReadyId] = useState(null)
  const [temperature, setTemperature] = useState(stored?.temperature ?? 0.7)
  const [wideChat, setWideChat] = useState(stored?.wideChat ?? false)
  const [selectionAction, setSelectionAction] = useState(null)
  const [pronunciationLanguage, setPronunciationLanguage] = useState(stored?.pronunciationLanguage || 'en-us')
  const [pronunciationVoice, setPronunciationVoice] = useState(stored?.pronunciationVoice || '')
  const [pronunciationRate, setPronunciationRate] = useState(stored?.pronunciationRate ?? 1)
  const [quickAskSelection, setQuickAskSelection] = useState('')
  const [quickAskContext, setQuickAskContext] = useState('')
  const [activeMessageIndex, setActiveMessageIndex] = useState(0)
  const abortRef = useRef(null)
  const scrollRef = useRef(null)
  const textareaRef = useRef(null)
  const activeConversation = conversations.find((item) => item.id === activeId) || conversations[0]
  const activeWorkspace = workspaces.find((item) => item.id === route.workspaceId) || workspaces.find((item) => item.id === activeConversation?.workspaceId) || workspaces.find((item) => item.id === activeWorkspaceId) || workspaces[0]
  const messages = activeConversation?.messages || []
  const indexedMessages = messages.map((message, index) => ({ message, index }))
  const assistantMessages = indexedMessages.filter(({ message }) => message.role === 'assistant')
  const userMessages = indexedMessages.filter(({ message }) => message.role === 'user')
  const provider = providers[activeProvider] || blankProvider
  const contextWindow = Number(provider.contextWindow) || 128000
  const contextMessages = messages.filter((item, index) => !(index === 0 && item.role === 'assistant' && item.content.startsWith('Halo! Saya **Chatty**')))
  const contextTokens = estimateTokens(contextMessages, `${followUpQuote}\n${input}`)
  const contextWithReserve = contextTokens + OUTPUT_RESERVE
  const contextPercent = Math.min(100, Math.round((contextWithReserve / contextWindow) * 100))
  const contextRemaining = Math.max(0, contextWindow - contextWithReserve)
  const contextLabel = contextPercent >= 100 ? 'Full' : contextPercent >= 80 ? 'Almost full' : contextPercent >= 60 ? 'Filling up' : 'Available'

  const virtualizer = useVirtualizer({ count: messages.length, getScrollElement: () => scrollRef.current, estimateSize: () => 120, overscan: 5, getItemKey: (index) => messages[index]?.id || index })

  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); document.documentElement.style.colorScheme = theme }, [theme])
  useEffect(() => { document.body.style.overflow = settingsOpen || quickAskSelection ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [settingsOpen, quickAskSelection])
  useEffect(() => { const timer = setTimeout(() => setStorageError(!saveState({ theme, providers, activeProvider, models, quizCategories, savedQuizzes, quizAttempts, vocabularyLanguages, ebooks, mindMaps, workspaces, conversations, activeId, activeWorkspaceId, temperature, wideChat, sidebarWidth, sidebarVisible, pronunciationLanguage, pronunciationVoice, pronunciationRate })), 300); return () => clearTimeout(timer) }, [theme, providers, activeProvider, models, quizCategories, savedQuizzes, quizAttempts, vocabularyLanguages, ebooks, mindMaps, workspaces, conversations, activeId, activeWorkspaceId, temperature, wideChat, sidebarWidth, sidebarVisible, pronunciationLanguage, pronunciationVoice, pronunciationRate])
  useEffect(() => {
    let frame
    let timer
    const showPronunciationAction = (event) => {
      if (event?.target instanceof Element && event.target.closest('[data-selection-toolbar]')) return
      if (event?.target instanceof Element && event.target.closest('[data-no-selection-toolbar]')) return
      clearTimeout(timer)
      cancelAnimationFrame(frame)
      timer = setTimeout(() => {
        frame = requestAnimationFrame(() => {
          const selection = window.getSelection()
          const text = selection?.toString().trim()
          if (!text || !selection.rangeCount) return
          if (selectionAction?.source === 'ebook') return
          const anchorElement = selection.anchorNode?.nodeType === Node.ELEMENT_NODE ? selection.anchorNode : selection.anchorNode?.parentElement
          if (anchorElement?.closest('input, textarea, [contenteditable="true"], [data-selection-toolbar], [data-no-selection-toolbar]')) return
          const range = selection.getRangeAt(0)
          const rect = range.getBoundingClientRect()
          if (!rect.width && !rect.height) return
          const halfToolbar = Math.min(180, window.innerWidth / 2 - 8)
          setSelectionAction({ text, range: range.cloneRange(), chatActions: Boolean(anchorElement?.closest('[data-message-role="assistant"]')), x: Math.min(window.innerWidth - halfToolbar, Math.max(halfToolbar, rect.left + rect.width / 2)), y: Math.max(8, rect.top - 48) })
        })
      }, 0)
    }
    document.addEventListener('mouseup', showPronunciationAction)
    document.addEventListener('touchend', showPronunciationAction)
    document.addEventListener('keyup', showPronunciationAction)
    return () => { clearTimeout(timer); cancelAnimationFrame(frame); document.removeEventListener('mouseup', showPronunciationAction); document.removeEventListener('touchend', showPronunciationAction); document.removeEventListener('keyup', showPronunciationAction); window.speechSynthesis?.cancel() }
  }, [selectionAction?.source])
  useEffect(() => { virtualizer.measure() }, [wideChat, virtualizer])
  useEffect(() => {
    if ((initialRoute.page === 'chat' && !initialRouteChat) || (initialRoute.page === 'workspace' && !initialRouteWorkspace) || (initialRoute.page === 'mind-map-detail' && !mindMaps.some((map) => map.id === initialRoute.mindMapId)) || ((initialRoute.page === 'vocabulary-language' || initialRoute.page === 'vocabulary-practice') && !initialRouteLanguage)) window.history.replaceState({}, '', '/')
  }, [initialRoute.page, initialRoute.mindMapId, initialRouteChat, initialRouteWorkspace, initialRouteLanguage, mindMaps])
  useEffect(() => {
    const onPopState = () => {
      const nextRoute = readRoute()
      const nextChat = conversations.find((chat) => chat.id === nextRoute.chatId)
      if (nextRoute.page === 'chat' && nextChat) {
        setRoute(nextRoute)
        setActiveId(nextChat.id)
        setActiveWorkspaceId(nextChat.workspaceId)
      } else if (nextRoute.page === 'quiz') {
        setRoute(nextRoute)
      } else if (nextRoute.page === 'workspace' && workspaces.some((workspace) => workspace.id === nextRoute.workspaceId)) {
        setRoute(nextRoute)
        setActiveWorkspaceId(nextRoute.workspaceId)
      } else if (nextRoute.page === 'mind-map-detail' && mindMaps.some((map) => map.id === nextRoute.mindMapId)) {
        setRoute(nextRoute)
      } else if (nextRoute.page === 'workspaces' || nextRoute.page === 'vocabulary' || nextRoute.page === 'ebook' || nextRoute.page === 'mind-map') {
        setRoute(nextRoute)
      } else if ((nextRoute.page === 'vocabulary-language' || nextRoute.page === 'vocabulary-practice') && vocabularyLanguages.some((language) => language.id === nextRoute.languageId)) {
        setRoute(nextRoute)
      } else {
        setRoute({ page: 'home', chatId: null })
      }
      setSidebarOpen(false)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [conversations, workspaces, vocabularyLanguages, mindMaps])
  useEffect(() => { const vocabularyLanguage = vocabularyLanguages.find((language) => language.id === route.languageId); document.title = route.page === 'chat' ? `${activeConversation?.title || 'Chat'} · ShinkuChat` : route.page === 'workspace' ? `${activeWorkspace?.name || 'Workspace'} · ShinkuChat` : route.page === 'quiz' ? 'Quiz · ShinkuChat' : route.page === 'ebook' ? 'Ebook/PDF Maker · ShinkuChat' : route.page === 'mind-map' || route.page === 'mind-map-detail' ? 'Mind Map · ShinkuChat' : route.page === 'vocabulary-practice' ? `${vocabularyLanguage?.name || 'Vocabulary'} Practice · ShinkuChat` : route.page === 'vocabulary-language' ? `${vocabularyLanguage?.name || 'Vocabulary'} · ShinkuChat` : route.page === 'vocabulary' ? 'My Vocabulary · ShinkuChat' : 'ShinkuChat · Home' }, [route.page, route.languageId, activeConversation?.title, activeWorkspace?.name, vocabularyLanguages])

  const startSidebarResize = (event) => {
    if (window.matchMedia('(max-width: 767px)').matches) return
    event.preventDefault()
    const startX = event.clientX
    const startWidth = sidebarWidth
    const onMove = (moveEvent) => setSidebarWidth(clampSidebarWidth(startWidth + moveEvent.clientX - startX))
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.body.classList.remove('cursor-col-resize', 'select-none')
    }
    document.body.classList.add('cursor-col-resize', 'select-none')
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }
  const resizeSidebarWithKeyboard = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    if (event.key === 'Home') setSidebarWidth(240)
    else if (event.key === 'End') setSidebarWidth(352)
    else setSidebarWidth((current) => clampSidebarWidth(current + (event.key === 'ArrowRight' ? 16 : -16)))
  }

  const updateConversation = useCallback((updater) => setConversations((all) => all.map((conversation) => conversation.id === activeId ? updater(conversation) : conversation)), [activeId])
  const confirmAction = useCallback((title, description, action, confirmLabel = 'Delete') => setConfirmation({ title, description, action, confirmLabel }), [])
  const runConfirmedAction = () => { const action = confirmation?.action; setConfirmation(null); action?.() }
  const navigateHome = () => { window.history.pushState({}, '', '/'); setRoute({ page: 'home', chatId: null }); setSidebarOpen(false) }
  const navigateQuizRoute = (nextRoute, path, replace = false) => { window.history[replace ? 'replaceState' : 'pushState']({}, '', path); setRoute(nextRoute); setSidebarOpen(false) }
  const navigateQuiz = () => navigateQuizRoute({ page: 'quiz', quizView: 'categories' }, quizPaths.categories)
  const navigateWorkspaces = () => { window.history.pushState({}, '', workspacesPath); setRoute({ page: 'workspaces' }); setSidebarOpen(false) }
  const navigateVocabulary = (replace = false) => { window.history[replace ? 'replaceState' : 'pushState']({}, '', vocabularyPath); setRoute({ page: 'vocabulary' }); setSidebarOpen(false) }
  const navigateEbook = () => { window.history.pushState({}, '', ebookPath); setRoute({ page: 'ebook' }); setSidebarOpen(false) }
  const navigateMindMap = (replace = false) => { window.history[replace ? 'replaceState' : 'pushState']({}, '', mindMapPath); setRoute({ page: 'mind-map' }); setSidebarOpen(false) }
  const openMindMap = (map) => { window.history.pushState({}, '', mindMapDetailPath(map.id)); setRoute({ page: 'mind-map-detail', mindMapId: map.id }); setSidebarOpen(false) }
  const openVocabularyLanguage = (language) => { window.history.pushState({}, '', vocabularyLanguagePath(language.id)); setRoute({ page: 'vocabulary-language', languageId: language.id }); setSidebarOpen(false) }
  const openVocabularyPractice = (language) => { window.history.pushState({}, '', vocabularyPracticePath(language.id)); setRoute({ page: 'vocabulary-practice', languageId: language.id }); setSidebarOpen(false) }
  const addVocabularyLanguage = (language) => { const next = { ...language, id: id(), addedAt: Date.now(), words: [] }; setVocabularyLanguages((all) => all.some((item) => item.code === language.code) ? all : [...all, next]) }
  const addVocabularyWord = (languageId, word) => setVocabularyLanguages((all) => all.map((language) => language.id === languageId ? { ...language, words: [word, ...(language.words || [])] } : language))
  const deleteVocabularyWord = (languageId, wordId) => { const language = vocabularyLanguages.find((item) => item.id === languageId); const word = language?.words?.find((item) => item.id === wordId); confirmAction(`Delete “${word?.word || 'word'}”?`, 'This saved vocabulary word and its generated details will be permanently removed.', () => setVocabularyLanguages((all) => all.map((item) => item.id === languageId ? { ...item, words: (item.words || []).filter((entry) => entry.id !== wordId) } : item))) }
  const deleteVocabularyLanguage = (languageId) => { const language = vocabularyLanguages.find((item) => item.id === languageId); confirmAction(`Delete ${language?.name || 'this language'} vocabulary?`, 'All saved words, pronunciation settings, and practice data for this language will be permanently removed.', () => { setVocabularyLanguages((all) => all.filter((item) => item.id !== languageId)); navigateVocabulary(true) }) }
  const updateVocabularyUserLanguage = (languageId, userLanguage) => setVocabularyLanguages((all) => all.map((language) => language.id === languageId ? { ...language, userLanguage, words: (language.words || []).map(({ translation: _translation, meaning: _meaning, explanation: _explanation, example: _example, ...word }) => word) } : language))
  const updateVocabularyPronunciation = (languageId, pronunciation) => setVocabularyLanguages((all) => all.map((language) => language.id === languageId ? { ...language, pronunciation: { ...(language.pronunciation || {}), ...pronunciation } } : language))
  const classifyVocabularyWords = async (language, wordsToClassify) => {
    if (!wordsToClassify.length) return []
    const classifications = []
    const batchSize = 60
    for (let start = 0; start < wordsToClassify.length; start += batchSize) {
      const batch = wordsToClassify.slice(start, start + batchSize)
      const words = batch.map(({ id: wordId, word }) => ({ wordId, word }))
      const result = await completeJson([
        { role: 'system', content: `Return only valid JSON with this shape: {"classifications":[{"wordId":"exact supplied wordId","level":"beginner|elementary|intermediate|advanced"}]}. Classify every supplied ${language.name} vocabulary item by the knowledge normally required to understand and use it in ${language.name}. Consider frequency, concreteness, grammatical complexity, register, idiomatic meaning, and language-specific learning difficulty. Use beginner for A1, elementary for A2, intermediate for B1-B2, and advanced for C1-C2. Classify the word in the context of ${language.name}, not by its spelling or similarity to another language. Return exactly one classification for every supplied wordId and no extra text.` },
        { role: 'user', content: JSON.stringify({ language: language.name, languageCode: language.code, words }) },
      ], Math.min(4000, Math.max(800, words.length * 45)))
      classifications.push(...normalizeVocabularyClassifications(result, batch))
    }
    const levels = new Map(classifications.map((item) => [item.wordId, item.level]))
    setVocabularyLanguages((all) => all.map((item) => item.id === language.id ? { ...item, words: (item.words || []).map((word) => levels.has(word.id) ? { ...word, level: levels.get(word.id) } : word) } : item))
    return classifications
  }
  const explainVocabularyWord = async (language, word) => {
    const userLanguage = language.userLanguage?.name || 'English'
    const details = await completeJson([
      { role: 'system', content: `Return only valid JSON with this shape: {"translation":"string","meaning":"string","explanation":"string","example":"string","pronunciation":"string"}. Explain the ${language.name} word entirely in ${userLanguage}. Every field is required and must be non-empty. Keep each field concise. The example must be in ${language.name} and contain the exact target word. Pronunciation must be an easy-to-read phonetic respelling for a reader of ${userLanguage} using only ordinary Latin letters, spaces, and hyphens. Never use IPA or phonetic symbols such as ə, ɛ, ʃ, ʒ, θ, ð, ŋ, ˈ, or ː.` },
      { role: 'user', content: `Target word: ${word.word}` },
    ], 1200)
    const fields = ['translation', 'meaning', 'explanation', 'example', 'pronunciation']
    if (fields.some((field) => !String(details[field] || '').trim())) throw new Error('The provider returned incomplete vocabulary details. Click the word to try again.')
    const updated = { ...word, ...Object.fromEntries(fields.map((field) => [field, String(details[field] || '').trim()])) }
    setVocabularyLanguages((all) => all.map((item) => item.id === language.id ? { ...item, words: (item.words || []).map((entry) => entry.id === word.id ? updated : entry) } : item))
    return updated
  }
  const generateVocabularyRainPairs = async (language) => {
    const words = (language.words || []).map(({ id: wordId, word }) => ({ wordId, word }))
    if (!words.length) throw new Error('Add at least one vocabulary word first.')
    const userLanguage = language.userLanguage?.name || 'English'
    const generated = await completeJson([
      { role: 'system', content: `Return only valid JSON with this shape: {"pairs":[{"wordId":"an exact supplied wordId","translation":"string"}]}. Translate every supplied ${language.name} word into ${userLanguage}. Return exactly one entry for every supplied wordId and never invent new ids. Each translation must be short: one or two words, no sentences, no articles, no explanations, no punctuation. When several translations are equally common, join at most three of them with " / ".` },
      { role: 'user', content: JSON.stringify({ words }) },
    ], 2000)
    return normalizeRainPairs(generated, words)
  }
  const generateVocabularyPractice = async (language, mode, requestedCount) => {
    const words = (language.words || []).map(({ id: wordId, word }) => ({ wordId, word }))
    if (!words.length) throw new Error('Add at least one vocabulary word first.')
    const count = Math.max(1, Math.min(Number(requestedCount) || words.length, mode === 'mixed' ? words.length * 5 : words.length))
    const userLanguage = language.userLanguage?.name || 'English'
    const generated = await completeJson([
      { role: 'system', content: `Return only valid JSON with this shape: {"questions":[{"id":"unique string","type":"target-to-user|user-to-target|missing|sentence|listen","wordId":"an exact supplied wordId","prompt":"string","prompts":["string"],"expected":["string"]}]}. Create exactly ${count} vocabulary practice questions using only the supplied saved words. Target language is ${language.name}; the user's language is ${userLanguage}. Requested mode is ${mode}; when it is not mixed every question must use that exact type. Strict mode contracts: target-to-user uses one prompt, no prompts array, and expected contains one or more accepted translations for ONE answer field. user-to-target uses one prompt, no prompts array, and expected is exactly the saved target word. missing uses prompts containing _____ and expected has exactly one saved word per prompt in matching order. sentence uses one prompt, no prompts array, and expected is exactly the required saved word. listen uses one prompt that never reveals the word, no prompts array, and expected is exactly the saved word. Keep prompts concise. Never mix contracts and never use words outside the supplied list as tested answers.` },
      { role: 'user', content: JSON.stringify({ mode, count, words }) },
    ], 3000)
    const supplied = new Map(words.map((word) => [word.wordId, word.word]))
    const savedWords = new Set(words.map((word) => word.word.toLocaleLowerCase()))
    const allowedTypes = new Set(['target-to-user', 'user-to-target', 'missing', 'sentence', 'listen'])
    const questions = Array.isArray(generated.questions) ? generated.questions.slice(0, count).map((question, index) => {
      const wordId = String(question.wordId || '')
      const savedWord = supplied.get(wordId)
      const type = String(question.type || '')
      const prompt = String(question.prompt || '').trim()
      const rawExpected = Array.isArray(question.expected) ? question.expected.map((value) => String(value).trim()).filter(Boolean) : []
      const prompts = Array.isArray(question.prompts) ? question.prompts.map((value) => String(value).trim()).filter(Boolean) : []
      if (!savedWord || !allowedTypes.has(type) || (mode !== 'mixed' && type !== mode)) return null
      let expected
      let normalizedPrompts
      if (type === 'missing') {
        if (!prompts.length || prompts.length !== rawExpected.length || prompts.some((value) => !value.includes('_____')) || rawExpected.some((value) => !savedWords.has(value.toLocaleLowerCase()))) return null
        expected = rawExpected
        normalizedPrompts = prompts
      } else if (type === 'target-to-user') {
        if (!prompt || !rawExpected.length) return null
        expected = [rawExpected.join(' / ')]
      } else {
        if (!prompt) return null
        expected = [savedWord]
      }
      return { id: `${String(question.id || `${type}-${wordId}`)}-${index}`, type, word: { id: wordId, word: savedWord }, prompt, prompts: normalizedPrompts, expected }
    }).filter(Boolean) : []
    if (questions.length !== count) throw new Error(`The provider returned ${questions.length} valid question${questions.length === 1 ? '' : 's'} instead of ${count}. Try generating again.`)
    return questions
  }
  const openWorkspace = (workspace) => { window.history.pushState({}, '', workspacePath(workspace.id)); setRoute({ page: 'workspace', workspaceId: workspace.id }); setActiveWorkspaceId(workspace.id); setSidebarOpen(false) }
  const openChat = (chat, replace = false) => {
    window.history[replace ? 'replaceState' : 'pushState']({}, '', chatPath(chat.id))
    setRoute({ page: 'chat', chatId: chat.id })
    setActiveId(chat.id)
    setActiveWorkspaceId(chat.workspaceId)
    setResponseReadyId(null)
    setSidebarOpen(false)
  }
  const newChat = (workspaceId = activeWorkspace?.id || workspaces[0].id) => { const next = { id: id(), workspaceId, title: 'New conversation', messages: [createWelcome()], createdAt: Date.now() }; setConversations((all) => [next, ...all]); openChat(next); setFollowUpQuote('') }
  const selectChat = (chat) => openChat(chat)
  const saveWorkspace = (values) => {
    if (workspaceDialog.workspace) {
      setWorkspaces((all) => all.map((item) => item.id === workspaceDialog.workspace.id ? { ...item, ...values } : item))
    } else {
      const workspace = { id: id(), ...values }
      setWorkspaces((all) => [...all, workspace])
    }
    setWorkspaceDialog({ open: false, workspace: null })
  }
  const deleteQuizCategory = (categoryId) => {
    const category = quizCategories.find((item) => item.id === categoryId)
    confirmAction(`Delete “${category?.name || 'category'}”?`, 'All quizzes and completed attempts in this category will be permanently removed.', () => {
      setQuizCategories((all) => all.filter((item) => item.id !== categoryId))
      setSavedQuizzes((all) => all.filter((quiz) => quiz.categoryId !== categoryId))
      setQuizAttempts((all) => all.filter((attempt) => attempt.categoryId !== categoryId))
      navigateQuizRoute({ page: 'quiz', quizView: 'categories' }, quizPaths.categories, true)
    })
  }
  const performDeleteWorkspace = (workspaceId) => {
    if (workspaces.length <= 1) return
    const remainingWorkspaces = workspaces.filter((workspace) => workspace.id !== workspaceId)
    const remainingConversations = conversations.filter((conversation) => conversation.workspaceId !== workspaceId)
    let nextConversations = remainingConversations
    if (!nextConversations.length) {
      nextConversations = [{ id: id(), workspaceId: remainingWorkspaces[0].id, title: 'New conversation', messages: [createWelcome()], createdAt: Date.now() }]
    }
    const nextActiveConversation = nextConversations.find((conversation) => conversation.id === activeId) || nextConversations[0]
    if (streaming && activeConversation?.workspaceId === workspaceId) abortRef.current?.abort()
    setWorkspaces(remainingWorkspaces)
    setConversations(nextConversations)
    setActiveId(nextActiveConversation.id)
    setActiveWorkspaceId(nextActiveConversation.workspaceId)
    setWorkspaceDialog({ open: false, workspace: null })
    if (route.workspaceId === workspaceId || (route.page === 'chat' && activeConversation?.workspaceId === workspaceId)) navigateWorkspaces()
  }
  const deleteWorkspace = (workspaceId) => { const workspace = workspaces.find((item) => item.id === workspaceId); confirmAction(`Delete “${workspace?.name || 'workspace'}”?`, 'This workspace and all conversations inside it will be permanently removed.', () => performDeleteWorkspace(workspaceId)) }
  const performDeleteChat = (chatId) => { if (chatId === activeId && streaming) abortRef.current?.abort(); const removed = conversations.find((item) => item.id === chatId); const remaining = conversations.filter((item) => item.id !== chatId); if (!remaining.length) { const workspaceId = removed?.workspaceId || workspaces[0].id; const next = { id: id(), workspaceId, title: 'New conversation', messages: [createWelcome()], createdAt: Date.now() }; setConversations([next]); if (route.page === 'chat' && chatId === activeId) openChat(next, true); return } setConversations(remaining); if (chatId === activeId) { const next = remaining.find((item) => item.workspaceId === removed?.workspaceId) || remaining[0]; if (route.page === 'chat') openChat(next, true); else { setActiveId(next.id); setActiveWorkspaceId(next.workspaceId) } } }
  const deleteChat = (chatId) => { const chat = conversations.find((item) => item.id === chatId); confirmAction(`Delete “${chat?.title || 'conversation'}”?`, 'This conversation and all of its messages will be permanently removed.', () => performDeleteChat(chatId)) }
  const deleteMessage = (messageId) => {
    const chatId = activeConversation?.id
    const message = messages.find((item) => item.id === messageId)
    if (!chatId || !message) return
    const roleLabel = message.role === 'assistant' ? 'AI response' : 'message'
    confirmAction(`Delete this ${roleLabel}?`, 'It will be permanently removed and excluded from the context of future AI responses.', () => {
      const cancelActiveResponse = Boolean(streamingMessageId && messageId !== streamingMessageId)
      if (messageId === streamingMessageId || cancelActiveResponse) abortRef.current?.abort()
      setConversations((all) => all.map((chat) => chat.id === chatId ? { ...chat, messages: chat.messages.filter((item) => item.id !== messageId && (!cancelActiveResponse || item.id !== streamingMessageId)) } : chat))
      setFollowUpQuote('')
      setSelectionAction(null)
      window.getSelection()?.removeAllRanges()
    })
  }
  const updateProvider = (key, value) => setProviders((all) => all.map((item, index) => index === activeProvider ? { ...item, [key]: value } : item))

  const loadModels = async () => {
    setStatus({ loading: true, ok: false, message: 'Connecting to provider…' })
    try { const parsed = normalizeProvider(provider); if (provider.headersText) JSON.parse(provider.headersText); const list = await fetchModels(parsed); setModels(list); if (!provider.model && list[0]) updateProvider('model', list[0]); setStatus({ loading: false, ok: true, message: `Connected. ${list.length} models found.` }) }
    catch (error) { setStatus({ loading: false, ok: false, message: error.message }) }
  }

  const requestChatCompletion = async (assistantId, history) => {
    setStreaming(true); setStreamingMessageId(assistantId); setResponseReadyId(null)
    const controller = new AbortController()
    let completed = false
    abortRef.current = controller
    let queued = ''; let frame = null
    const flush = () => { if (!queued) return; const chunk = queued; queued = ''; updateConversation((chat) => ({ ...chat, messages: chat.messages.map((item) => item.id === assistantId ? { ...item, content: item.content + chunk } : item) })); frame = null }
    try {
      await streamCompletion({ provider: normalizeProvider(provider), model: provider.model, messages: [{ role: 'system', content: [NATURAL_STYLE_PROMPT, provider.instructions?.trim(), activeWorkspace?.instructions?.trim(), GRAMMAR_ASSIST_PROMPT].filter(Boolean).join('\n\n') }, ...buildChatContext(history)], settings: { temperature, maxTokens: OUTPUT_RESERVE }, signal: controller.signal, onToken: (token) => { queued += token; if (!frame) frame = requestAnimationFrame(flush) } })
      flush()
      completed = true
    } catch (error) {
      if (error.name !== 'AbortError') updateConversation((chat) => ({ ...chat, messages: chat.messages.map((item) => item.id === assistantId ? { ...item, error: error.message } : item) }))
    } finally {
      if (frame) cancelAnimationFrame(frame)
      flush()
      if (abortRef.current === controller) { setStreaming(false); setStreamingMessageId(null); if (completed) setResponseReadyId(assistantId); abortRef.current = null }
    }
  }

  const send = async (contentOverride) => {
    const content = (typeof contentOverride === 'string' ? contentOverride : input).trim()
    if (!content || streaming) return
    if (!provider.baseUrl || !provider.model) { setSettingsOpen(true); setStatus({ loading: false, ok: false, message: 'Enter a Base URL, test the connection, then select a model.' }); return }
    const quote = typeof contentOverride === 'string' ? '' : followUpQuote.trim()
    const user = { id: id(), role: 'user', content, ...(quote ? { quote } : {}) }
    const assistant = { id: id(), role: 'assistant', content: '' }
    const history = [...messages, user]
    updateConversation((chat) => ({ ...chat, title: chat.title === 'New conversation' ? content.slice(0, 42) : chat.title, messages: [...chat.messages, user, assistant] }))
    setInput(''); setFollowUpQuote('')
    await requestChatCompletion(assistant.id, history)
  }

  const retryChat = async (assistantId) => {
    if (streaming) return
    if (!provider.baseUrl || !provider.model) { setSettingsOpen(true); return }
    const assistantIndex = messages.findIndex((item) => item.id === assistantId && item.role === 'assistant')
    if (assistantIndex < 1) return
    const history = messages.slice(0, assistantIndex)
    updateConversation((chat) => ({ ...chat, messages: chat.messages.map((item) => item.id === assistantId ? { ...item, content: '', error: undefined } : item) }))
    await requestChatCompletion(assistantId, history)
  }

  const onScroll = () => {
    const el = scrollRef.current
    if (el) {
      const viewportTop = el.scrollTop + 8
      const visibleRows = virtualizer.getVirtualItems()
      const rowAtTop = visibleRows.find((row) => row.start <= viewportTop && row.end > viewportTop)
      const nearestToTop = visibleRows.reduce((best, row) => Math.abs(row.start - viewportTop) < Math.abs(best.start - viewportTop) ? row : best, visibleRows[0])
      const activeRow = rowAtTop || nearestToTop
      if (activeRow) setActiveMessageIndex(activeRow.index)
    }
    setSelectionAction(null)
  }
  const jumpToMessage = (index) => {
    setActiveMessageIndex(index)
    virtualizer.scrollToIndex(index, { align: 'start', behavior: 'smooth' })
  }
  const applySelection = (text, ask) => {
    setSelectionAction(null)
    window.getSelection()?.removeAllRanges()
    if (ask) { setQuickAskContext(''); setQuickAskSelection(text); return }
    setFollowUpQuote(text)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }
  const quickAsk = async (question, onToken, signal, previousTurns = []) => {
    if (!provider.baseUrl || !provider.model) throw new Error('Connect a provider and select a model first.')
    await streamCompletion({
      provider: normalizeProvider(provider),
      model: provider.model,
      messages: [
        { role: 'system', content: [NATURAL_STYLE_PROMPT, 'Answer only this temporary quick question about the selected text. Do not assume it belongs to the saved chat history.', quickAskContext ? `Selection source context: ${quickAskContext}` : '', provider.instructions?.trim(), activeWorkspace?.instructions?.trim(), GRAMMAR_ASSIST_PROMPT].filter(Boolean).join('\n\n') },
        { role: 'user', content: `Selected text:\n${quickAskSelection}` },
        ...previousTurns.flatMap((turn) => [
          { role: 'user', content: turn.question },
          ...(turn.answer ? [{ role: 'assistant', content: turn.answer }] : []),
        ]),
        { role: 'user', content: question },
      ],
      settings: { temperature, maxTokens: OUTPUT_RESERVE },
      signal,
      onToken,
    })
  }
  const completeJson = async (messages, maxTokens = OUTPUT_RESERVE) => {
    if (!provider.baseUrl || !provider.model) throw new Error('Connect a provider and select a model first.')
    const structuredTokenBudget = Math.max(OUTPUT_RESERVE, maxTokens)
    let lastError
    let receivedCharacters = 0
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let output = ''
      const requestMessages = attempt === 0 ? messages : [...messages, { role: 'user', content: 'Retry from scratch. Output exactly one short, complete JSON object beginning with { and ending with }. No explanation, Markdown, or reasoning.' }]
      await streamCompletion({ provider: normalizeProvider(provider), model: provider.model, messages: requestMessages, settings: { temperature: attempt ? 0 : 0.1, maxTokens: structuredTokenBudget }, onToken: (token) => { output += token } })
      receivedCharacters = Math.max(receivedCharacters, output.length)
      try { return parseModelJson(output) } catch (error) { lastError = error }
    }
    const detail = receivedCharacters ? `The largest response contained ${receivedCharacters} characters.` : 'The provider returned no visible content. This can happen when a reasoning model exhausts its output budget internally.'
    throw new Error(`${lastError?.message || 'The model returned invalid JSON.'} ${detail} This generation batch failed after two fresh attempts.`)
  }
  const generateQuiz = async ({ description, instructions }) => normalizeQuiz(await completeJson([
    { role: 'system', content: QUIZ_SCHEMA },
    { role: 'user', content: `Create this quiz.\n\nDescription:\n${description}\n\nUser instructions:\n${instructions || 'Choose an appropriate interactive format.'}` },
  ]), description)
  const gradeQuiz = async (quiz, answers) => normalizeGrade(await completeJson([
    { role: 'system', content: GRADE_SCHEMA },
    { role: 'user', content: `Grade this completed quiz once and make the result final.\n\nQuiz:\n${JSON.stringify(quiz)}\n\nSubmitted answers:\n${JSON.stringify(answers)}` },
  ]))
  const generateEbook = async ({ description, author, chapterCount, includeIllustrations, onProgress }) => {
    onProgress?.('Batch 1 · Creating book metadata…')
    const metadata = normalizeEbookMetadata(await completeJson([
      { role: 'system', content: 'Return only compact valid JSON: {"title":"string","subtitle":"string","author":"string","language":"string","coverPrompt":"under 40 words","endingTitle":"string","endingSummary":"under 30 words"}. Infer the requested language. No other fields.' },
      { role: 'user', content: `Book request: ${description}\nPreferred author: ${author || 'ShinkuChat AI'}` },
    ], 700))
    const outline = []
    for (let index = 0; index < chapterCount; index += 1) {
      onProgress?.(`Outline batch ${index + 1} of ${chapterCount}…`)
      const previousTitles = outline.map((chapter) => chapter.title).join(' | ') || 'none'
      const rawChapter = await completeJson([
        { role: 'system', content: `Plan only chapter ${index + 1} of ${chapterCount} in ${metadata.language}. Return compact JSON: {"id":"chapter-${index + 1}","title":"string","summary":"under 45 words","illustrationNeeded":true,"illustrationPrompt":"under 45 words or empty"}. ${includeIllustrations ? 'Use an illustration only when useful.' : 'Set illustrationNeeded false and illustrationPrompt empty.'}` },
        { role: 'user', content: `Book: ${metadata.title}. Request: ${description}. Previous chapter titles: ${previousTitles}. Make this chapter distinct and coherent with the sequence.` },
      ], 600)
      outline.push(normalizeEbookOutlineChapter(rawChapter, index))
    }
    const chapters = []
    const compactOutline = outline.map(({ title, summary }) => `${title}: ${summary}`).join(' | ')
    for (let index = 0; index < outline.length; index += 1) {
      const chapter = outline[index]
      onProgress?.(`Chapter ${index + 1}/${outline.length} · Planning sections…`)
      const sectionPlan = normalizeEbookSectionPlan(await completeJson([
        { role: 'system', content: `Plan one ebook chapter in ${metadata.language}. Return compact JSON only: {"openingQuote":"under 18 words","takeaway":"under 30 words","sections":[{"heading":"string","brief":"under 30 words"}]}. Return exactly 3 sections. Do not write paragraphs yet.` },
        { role: 'user', content: `Book: ${metadata.title}. Full outline: ${compactOutline}. Current chapter ${index + 1}: ${chapter.title}. Goal: ${chapter.summary}` },
      ], 750))
      const sections = []
      for (let sectionIndex = 0; sectionIndex < sectionPlan.sections.length; sectionIndex += 1) {
        const section = sectionPlan.sections[sectionIndex]
        onProgress?.(`Chapter ${index + 1}/${outline.length} · Content batch ${sectionIndex + 1}/3…`)
        const rawSection = await completeJson([
          { role: 'system', content: `Write one ebook section in ${metadata.language}. Return JSON only: {"heading":"string","paragraphs":["paragraph 1","paragraph 2"]}. Exactly 2 paragraphs, each 45-70 words. Stay within this section only. No Markdown or extra fields.` },
          { role: 'user', content: `Book: ${metadata.title}. Chapter: ${chapter.title}. Chapter goal: ${chapter.summary}. Section: ${section.heading}. Section brief: ${section.brief}. Already completed section headings: ${sections.map((item) => item.heading).join(' | ') || 'none'}. Avoid repeating them.` },
        ], 650)
        sections.push(normalizeEbookSection(rawSection, section.heading))
      }
      chapters.push({ ...chapter, openingQuote: sectionPlan.openingQuote, takeaway: sectionPlan.takeaway, sections })
    }
    const endingParagraphs = []
    for (let index = 0; index < 3; index += 1) {
      onProgress?.(`Closing batch ${index + 1}/3…`)
      const result = await completeJson([
        { role: 'system', content: `Write only paragraph ${index + 1} of 3 for an ebook closing in ${metadata.language}. Return compact JSON: {"paragraph":"60-90 words"}. ${index === 0 ? 'Synthesize the core journey.' : index === 1 ? 'Turn the lessons into a practical next step.' : 'End memorably and encouragingly.'}` },
        { role: 'user', content: `Book: ${metadata.title}. Closing goal: ${metadata.endingSummary}. Chapter summaries: ${compactOutline}` },
      ], 400)
      const paragraph = String(result.paragraph || '').trim()
      if (!paragraph) throw new Error(`The provider returned an empty closing batch ${index + 1}.`)
      endingParagraphs.push(paragraph)
    }
    onProgress?.('Final batch · Writing final note…')
    const final = await completeJson([
      { role: 'system', content: `Return compact JSON only: {"finalNote":"one memorable sentence under 35 words"}. Write in ${metadata.language}.` },
      { role: 'user', content: `Book: ${metadata.title}. Closing goal: ${metadata.endingSummary}` },
    ], 250)
    const ending = normalizeEbookEnding({ title: metadata.endingTitle, paragraphs: endingParagraphs, finalNote: final.finalNote }, metadata.endingTitle)
    const ebook = { ...metadata, id: id(), description, author: author || metadata.author, chapters, ending, createdAt: Date.now() }
    setEbooks((all) => [ebook, ...all])
    return ebook
  }
  const deleteEbook = (ebookId) => { const ebook = ebooks.find((item) => item.id === ebookId); confirmAction(`Delete “${ebook?.title || 'ebook'}”?`, 'The generated cover, chapters, and ending will be permanently removed.', () => setEbooks((all) => all.filter((item) => item.id !== ebookId))) }
  const saveMindMap = (map) => setMindMaps((all) => { const index = all.findIndex((item) => item.id === map.id); if (index < 0) return [map, ...all]; const next = [...all]; next[index] = map; return next })
  const deleteMindMap = (mapId) => { const map = mindMaps.find((item) => item.id === mapId); confirmAction(`Delete “${map?.title || 'this mind map'}”?`, 'All nodes, notes, and their branches will be permanently removed.', () => setMindMaps((all) => all.filter((item) => item.id !== mapId))) }
  const generateMindMap = async ({ topic, instructions, depth = 'standard', layout = 'balanced', theme = 'aurora' }) => {
    const shape = depth === 'compact' ? { branches: '4-5', children: '2-3', max: 26 } : depth === 'deep' ? { branches: '7-8', children: '4-5', max: 70 } : { branches: '5-7', children: '3-4', max: 45 }
    const result = normalizeMindMap(await completeJson([
      { role: 'system', content: `Return only compact valid JSON: {"title":"string","nodes":[{"id":"unique-short-id","label":"concise label under 8 words","parentId":"parent id or null","note":"one short clarifying sentence or empty string"}]}. Build a useful hierarchical mind map with exactly one root node whose parentId is null, ${shape.branches} major branches, and ${shape.children} concise child nodes per major branch. Add a third level only where it genuinely adds value. Maximum ${shape.max} nodes and 4 levels. Every parentId must exactly match the id of another node in the list. Labels must be short noun phrases, never sentences or numbering. Write in the same language as the topic. No Markdown or extra text.` },
      { role: 'user', content: `Topic: ${topic}\nAdditional direction: ${instructions || 'Map the topic comprehensively and practically.'}` },
    ], 4000), topic)
    const map = { ...result, id: id(), layout, theme, createdAt: Date.now(), updatedAt: Date.now() }
    saveMindMap(map)
    return map
  }
  const expandMindMapNode = async ({ map, node, path }) => {
    const existing = map.nodes.filter((item) => item.parentId === node.id).map((item) => item.label)
    const result = await completeJson([
      { role: 'system', content: 'Return only compact valid JSON: {"ideas":["concise label under 8 words"]}. Suggest 3 to 5 new child ideas that meaningfully expand the requested node. Labels must be short noun phrases in the same language as the node, never sentences, numbering, or duplicates of existing children. No Markdown or extra text.' },
      { role: 'user', content: `Mind map: ${map.title}\nPath to node: ${path.join(' > ')}\nNode to expand: ${node.label}${node.note ? `\nNode note: ${node.note}` : ''}\nExisting children: ${existing.join(', ') || 'none'}` },
    ], 900)
    const ideas = Array.isArray(result.ideas) ? result.ideas.map((idea) => String(idea || '').trim()).filter(Boolean) : []
    const taken = new Set(existing.map((label) => label.toLowerCase()))
    return ideas.filter((idea) => !taken.has(idea.toLowerCase())).slice(0, 5)
  }
  const providerOptions = providers.map((item, index) => `${item.name} · ${index + 1}`)
  const changeProvider = (option) => { const index = providerOptions.indexOf(option); if (index >= 0) { setActiveProvider(index); setModels([]); setStatus({ loading: false, ok: false, message: '' }) } }

  return <div className="relative flex h-dvh overflow-hidden bg-white font-sans text-sm text-slate-800 [&_*]:!font-sans [&_a]:cursor-pointer [&_button:not(:disabled)]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_code]:!font-mono [&_input:not(:disabled)]:cursor-text [&_input:disabled]:cursor-not-allowed [&_input[type=button]:not(:disabled)]:cursor-pointer [&_input[type=checkbox]:not(:disabled)]:cursor-pointer [&_input[type=color]:not(:disabled)]:cursor-pointer [&_input[type=file]:not(:disabled)]:cursor-pointer [&_input[type=radio]:not(:disabled)]:cursor-pointer [&_input[type=range]:not(:disabled)]:cursor-pointer [&_input[type=reset]:not(:disabled)]:cursor-pointer [&_input[type=submit]:not(:disabled)]:cursor-pointer [&_label]:cursor-pointer [&_option]:cursor-pointer [&_pre]:!font-mono [&_pre_*]:!font-mono [&_select:not(:disabled)]:cursor-pointer [&_select:disabled]:cursor-not-allowed [&_summary]:cursor-pointer [&_textarea:not(:disabled)]:cursor-text [&_textarea:disabled]:cursor-not-allowed [&_[contenteditable=true]]:cursor-text [&_[draggable=true]]:cursor-grab [&_[role=button]]:cursor-pointer [&_[role=checkbox]]:cursor-pointer [&_[role=combobox]]:cursor-pointer [&_[role=link]]:cursor-pointer [&_[role=listbox]]:cursor-default [&_[role=menuitem]]:cursor-pointer [&_[role=option]]:cursor-pointer [&_[role=radio]]:cursor-pointer [&_[role=slider]]:cursor-pointer [&_[role=switch]]:cursor-pointer [&_[role=tab]]:cursor-pointer transition-[background-color,color] duration-500 dark:bg-slate-950 dark:text-slate-100">
    <CursorGlow />
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 opacity-[0.035] [background-image:radial-gradient(theme(colors.purple.700)_1px,transparent_1px)] [background-size:24px_24px] dark:opacity-[0.06]" />
    {sidebarOpen && <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-20 cursor-pointer bg-slate-950/45 backdrop-blur-sm md:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-30 ${route.page === 'mind-map-detail' ? 'hidden' : ''} flex max-w-[calc(100vw-24px)] ${sidebarWidths[sidebarWidth]} flex-col overflow-hidden border-r border-purple-100/70 bg-white/80 p-3 shadow-[16px_0_40px_rgba(76,29,149,0.08)] backdrop-blur-xl transition-transform duration-500 ease-out dark:border-white/5 dark:bg-slate-950/80 dark:shadow-[16px_0_45px_rgba(126,34,206,0.08)] ${sidebarVisible ? 'md:static md:translate-x-0' : 'md:fixed md:-translate-x-full'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <button type="button" aria-label={`Resize sidebar, current width ${sidebarWidth} pixels`} aria-valuemin="240" aria-valuemax="352" aria-valuenow={sidebarWidth} role="separator" title="Drag to resize · Double-click to reset" onPointerDown={startSidebarResize} onDoubleClick={() => setSidebarWidth(272)} onKeyDown={resizeSidebarWithKeyboard} className="absolute inset-y-0 right-0 z-20 hidden w-2 cursor-col-resize touch-none items-center justify-center focus:outline-none focus-visible:bg-purple-500/10 md:flex"><span className="h-10 w-0.5 rounded-full bg-slate-300 opacity-0 transition-opacity duration-300 ease-out hover:opacity-100 focus:opacity-100 dark:bg-slate-600" /></button>
      <div aria-hidden="true" className="absolute -left-20 top-16 h-44 w-44 animate-pulse rounded-full bg-purple-300/20 blur-3xl motion-reduce:animate-none dark:bg-purple-600/10" />
      <div className="relative flex h-10 items-center gap-2 px-1"><div className="group flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-700 to-purple-500 text-white shadow-[0_8px_20px_rgba(126,34,206,0.25)] transition-transform duration-500 motion-reduce:transform-none"><Sparkle size={17} weight="fill" /></div><span className="text-base leading-6 font-semibold tracking-tight">ShinkuChat</span><span className="ml-auto rounded-full bg-purple-100 px-2 py-0.5 text-sm font-medium text-purple-700 dark:bg-purple-500/15 dark:text-purple-300">AI</span></div>
      <div className="mt-3 space-y-1"><button onClick={navigateHome} aria-current={route.page === 'home' ? 'page' : undefined} className={`${button} w-full justify-start gap-2 px-2 ${route.page === 'home' ? 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-200' : ''}`}><House size={17} weight={route.page === 'home' ? 'fill' : 'regular'} />Home</button><button onClick={navigateWorkspaces} aria-current={route.page === 'workspaces' || route.page === 'workspace' || route.page === 'chat' ? 'page' : undefined} className={`${button} w-full justify-start gap-2 px-2 ${route.page === 'workspaces' || route.page === 'workspace' || route.page === 'chat' ? 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-200' : ''}`}><ChatCircle size={17} weight={route.page === 'workspaces' || route.page === 'workspace' || route.page === 'chat' ? 'fill' : 'regular'} />Chat</button><button onClick={navigateVocabulary} aria-current={route.page === 'vocabulary' || route.page === 'vocabulary-language' || route.page === 'vocabulary-practice' ? 'page' : undefined} className={`${button} w-full justify-start gap-2 px-2 ${route.page === 'vocabulary' || route.page === 'vocabulary-language' || route.page === 'vocabulary-practice' ? 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-200' : ''}`}><BookOpen size={17} weight={route.page === 'vocabulary' || route.page === 'vocabulary-language' || route.page === 'vocabulary-practice' ? 'fill' : 'regular'} />My Vocabulary</button><button onClick={navigateEbook} aria-current={route.page === 'ebook' ? 'page' : undefined} className={`${button} w-full justify-start gap-2 px-2 ${route.page === 'ebook' ? 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-200' : ''}`}><Books size={17} weight={route.page === 'ebook' ? 'fill' : 'regular'} />Ebook/PDF Maker</button><button onClick={navigateMindMap} aria-current={route.page === 'mind-map' ? 'page' : undefined} className={`${button} w-full justify-start gap-2 px-2 ${route.page === 'mind-map' ? 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-200' : ''}`}><TreeStructure size={17} weight={route.page === 'mind-map' ? 'fill' : 'regular'} />Mind Map</button><button onClick={navigateQuiz} aria-current={route.page === 'quiz' ? 'page' : undefined} className={`${button} w-full justify-start gap-2 px-2 ${route.page === 'quiz' ? 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-200' : ''}`}><Exam size={17} weight={route.page === 'quiz' ? 'fill' : 'regular'} />Quiz</button></div>
      <div className="relative mt-4 grid grid-cols-2 rounded-lg bg-slate-100 p-1 dark:bg-white/5" role="tablist" aria-label="Sidebar content"><button type="button" role="tab" aria-selected={sidebarTab === 'chat'} onClick={() => setSidebarTab('chat')} className={`flex h-8 items-center justify-center gap-1.5 rounded-md text-[13px] font-medium transition-[background-color,color,box-shadow] duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-purple-500/10 ${sidebarTab === 'chat' ? 'bg-white text-purple-700 shadow-[0_4px_12px_rgba(76,29,149,0.12)] dark:bg-slate-800 dark:text-purple-300' : 'text-slate-500 hover:text-purple-700 dark:hover:text-purple-300'}`}><ChatCircle size={16} />Chat</button><button type="button" role="tab" aria-selected={sidebarTab === 'quiz'} onClick={() => setSidebarTab('quiz')} className={`flex h-8 items-center justify-center gap-1.5 rounded-md text-[13px] font-medium transition-[background-color,color,box-shadow] duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-purple-500/10 ${sidebarTab === 'quiz' ? 'bg-white text-purple-700 shadow-[0_4px_12px_rgba(76,29,149,0.12)] dark:bg-slate-800 dark:text-purple-300' : 'text-slate-500 hover:text-purple-700 dark:hover:text-purple-300'}`}><Exam size={16} />Quiz</button></div>
      {sidebarTab === 'quiz' ? <nav aria-label="Quiz categories" className="mt-2 flex-1 space-y-1 overflow-y-auto">{quizCategories.map((category) => { const categoryQuizzes = savedQuizzes.filter((quiz) => quiz.categoryId === category.id); return <section key={category.id} aria-label={category.name}><button onClick={() => navigateQuizRoute({ page: 'quiz', quizView: 'category', categoryId: category.id }, quizPaths.category(category.id))} className={`flex h-9 w-full items-center gap-2 rounded-lg px-2 text-left transition-colors duration-300 ease-out hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:hover:bg-white/5 ${route.categoryId === category.id ? 'bg-purple-100 text-purple-900 dark:bg-purple-500/15 dark:text-purple-100' : ''}`}><Exam size={16} className="shrink-0 text-purple-600 dark:text-purple-300" /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{category.name}</span><span className="text-xs tabular-nums text-slate-400">{categoryQuizzes.length}</span></button><div className="mt-0.5 space-y-0.5">{categoryQuizzes.map((quiz) => <button key={quiz.id} onClick={() => navigateQuizRoute({ page: 'quiz', quizView: 'detail', quizId: quiz.id }, quizPaths.detail(quiz.id))} className={`flex w-full items-center gap-2 rounded-lg py-1.5 pl-5 pr-2 text-left transition-colors duration-300 ease-out hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:hover:bg-white/5 ${route.quizId === quiz.id ? 'bg-purple-100 text-purple-900 dark:bg-purple-500/15 dark:text-purple-100' : ''}`}><Exam size={15} className="shrink-0" /><span className="truncate text-sm">{quiz.title}</span></button>)}</div></section> })}</nav> : <nav aria-label="Chat workspaces" className="mt-2 flex-1 space-y-3 overflow-y-auto">{workspaces.map((workspace) => {
        const workspaceChats = conversations.filter((chat) => chat.workspaceId === workspace.id)
        return <section key={workspace.id} aria-label={workspace.name}>
          <div className={`flex h-9 items-center gap-1 rounded-lg px-1.5 ${workspace.id === activeWorkspace?.id ? 'bg-slate-100 dark:bg-white/5' : ''}`}><span className={`h-3 w-3 shrink-0 rounded-md border border-slate-200 ${workspace.color === 'purple' ? 'bg-purple-200 dark:border-purple-700 dark:bg-purple-800' : workspace.color === 'blue' ? 'bg-blue-200 dark:border-blue-700 dark:bg-blue-800' : workspace.color === 'teal' ? 'bg-teal-200 dark:border-teal-700 dark:bg-teal-800' : 'bg-white dark:border-slate-600 dark:bg-slate-800'}`} /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{workspace.name}</span><button onClick={() => newChat(workspace.id)} aria-label={`Add chat to ${workspace.name}`} title="New chat" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors duration-300 ease-out hover:bg-purple-100 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:hover:bg-purple-500/15 dark:hover:text-purple-300"><Plus size={15} /></button><button onClick={() => openWorkspace(workspace)} aria-label={`View ${workspace.name} details`} title="Workspace details" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors duration-300 ease-out hover:bg-purple-100 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:hover:bg-purple-500/15 dark:hover:text-purple-300"><ArrowSquareOut size={15} /></button><button onClick={() => setWorkspaceDialog({ open: true, workspace })} aria-label={`Edit ${workspace.name}`} title="Workspace settings" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors duration-300 ease-out hover:bg-purple-100 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:hover:bg-purple-500/15 dark:hover:text-purple-300"><GearSix size={15} /></button></div>
          <div className="mt-1 space-y-0.5">{workspaceChats.map((chat) => <div key={chat.id} className={`group flex items-center rounded-lg transition-colors duration-300 ease-out ${route.page === 'chat' && chat.id === activeId ? 'bg-purple-100 text-purple-900 dark:bg-purple-500/15 dark:text-purple-100' : 'hover:bg-purple-50 dark:hover:bg-white/5'}`}><button onClick={() => selectChat(chat)} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-4 pr-2 text-left"><ChatCircle size={16} className="shrink-0" /><span className="truncate text-sm">{chat.title}</span></button><button aria-label={`Delete ${chat.title}`} onClick={() => deleteChat(chat.id)} className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md opacity-0 transition-colors duration-300 ease-out hover:bg-slate-200 group-hover:opacity-100 focus:opacity-100 dark:hover:bg-slate-700"><Trash size={15} /></button></div>)}{!workspaceChats.length && <p className="ml-4 px-2 py-2 text-xs text-slate-400">No conversations</p>}</div>
        </section>
      })}</nav>}
      <div className="relative mb-2 flex items-end justify-center gap-1"><RobotMascot compact className="animate-[bounce_5s_ease-in-out_infinite] motion-reduce:animate-none" /><AvatarTrio /></div>
      <div className="relative space-y-1 border-t border-purple-100 pt-2 dark:border-white/5"><button onClick={() => downloadJson({ workspaces, conversations, quizCategories, savedQuizzes, quizAttempts, vocabularyLanguages, ebooks, mindMaps }, 'shinkuchat-export.json')} className={`${button} w-full justify-start gap-2 px-2`}><DownloadSimple size={17} />Export data</button><button onClick={() => setSettingsOpen(true)} className={`${button} w-full justify-start gap-2 px-2`}><GearSix size={17} />Provider & model</button></div>
    </aside>

    <main className={`relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden transition-colors duration-500 ${workspaceBackgrounds[activeWorkspace?.color] || workspaceBackgrounds.white}`}>
      {storageError && <div role="alert" className="relative z-30 bg-purple-100 px-3 py-2 text-center text-xs font-medium text-purple-900 dark:bg-purple-500/20 dark:text-purple-100">Browser storage is unavailable or full. Recent changes may not persist after reload.</div>}
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-20 h-72 w-72 animate-pulse rounded-full bg-purple-300/20 blur-3xl motion-reduce:animate-none dark:bg-purple-700/10" />
      <button type="button" hidden={route.page === 'mind-map-detail'} onClick={() => { if (window.matchMedia('(min-width: 768px)').matches) setSidebarVisible((value) => !value); else setSidebarOpen((value) => !value) }} aria-label={sidebarOpen || sidebarVisible ? 'Hide sidebar' : 'Show sidebar'} title={sidebarOpen || sidebarVisible ? 'Hide sidebar' : 'Show sidebar'} className={`fixed top-1/2 z-40 flex h-16 w-9 -translate-y-1/2 items-center justify-center rounded-r-xl bg-gradient-to-b from-purple-600 to-purple-800 text-white shadow-[0_10px_28px_rgba(126,34,206,0.34)] transition-[left,background-color,color,transform,box-shadow] duration-500 ease-out hover:scale-105 hover:shadow-[0_14px_32px_rgba(126,34,206,0.42)] focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10 active:scale-95 motion-reduce:transform-none dark:from-purple-400 dark:to-purple-600 dark:text-slate-950 dark:shadow-[0_10px_28px_rgba(168,85,247,0.28)] ${sidebarOpen ? 'left-[calc(100vw-24px)]' : 'left-0'} ${sidebarVisible ? sidebarTogglePositions[sidebarWidth] : 'md:left-0'}`}>{sidebarOpen || sidebarVisible ? <CaretLeft size={18} weight="bold" /> : <CaretRight size={18} weight="bold" />}</button>

      {route.page === 'ebook' ? <EbookPage ebooks={ebooks} providerReady={Boolean(provider.baseUrl && provider.model)} onGenerate={generateEbook} onDelete={deleteEbook} onOpenSettings={() => setSettingsOpen(true)} onBack={navigateHome} onReaderSelection={(selection) => setSelectionAction({ ...selection, source: 'ebook' })} /> : route.page === 'mind-map' || route.page === 'mind-map-detail' ? <MindMapPage route={route} maps={mindMaps} dark={theme === 'dark'} providerReady={Boolean(provider.baseUrl && provider.model)} onGenerate={generateMindMap} onExpandNode={expandMindMapNode} onSave={saveMindMap} onDelete={deleteMindMap} onOpenSettings={() => setSettingsOpen(true)} onBack={navigateHome} onOpenMap={openMindMap} onCloseMap={() => navigateMindMap(true)} /> : route.page === 'vocabulary' || route.page === 'vocabulary-language' || route.page === 'vocabulary-practice' ? <VocabularyPage route={route} languages={vocabularyLanguages} onAddLanguage={addVocabularyLanguage} onDeleteLanguage={deleteVocabularyLanguage} onOpenLanguage={openVocabularyLanguage} onOpenPractice={openVocabularyPractice} onBack={() => navigateVocabulary(true)} onAddWord={addVocabularyWord} onDeleteWord={deleteVocabularyWord} onUpdateUserLanguage={updateVocabularyUserLanguage} onUpdatePronunciation={updateVocabularyPronunciation} providerReady={Boolean(provider.baseUrl && provider.model)} onExplainWord={explainVocabularyWord} onClassifyWords={classifyVocabularyWords} onGeneratePractice={generateVocabularyPractice} onGenerateRainPairs={generateVocabularyRainPairs} /> : route.page === 'quiz' ? <QuizPage route={route} onNavigate={navigateQuizRoute} providerReady={Boolean(provider.baseUrl && provider.model)} categories={quizCategories} quizzes={savedQuizzes} attempts={quizAttempts} onAddCategory={(category) => setQuizCategories((all) => [...all, category])} onDeleteCategory={deleteQuizCategory} onSaveQuiz={(quiz) => setSavedQuizzes((all) => [quiz, ...all])} onSaveAttempt={(attempt) => setQuizAttempts((all) => [attempt, ...all])} onOpenSettings={() => setSettingsOpen(true)} onGenerate={generateQuiz} onGrade={gradeQuiz} /> : route.page === 'home' || route.page === 'workspaces' || route.page === 'workspace' ? <HomePortal key={route.page === 'workspace' ? route.workspaceId : route.page} workspaces={workspaces} conversations={conversations} onOpenChat={selectChat} onNewChat={newChat} onAddWorkspace={() => setWorkspaceDialog({ open: true, workspace: null })} onDeleteWorkspace={deleteWorkspace} onOpenQuiz={navigateQuiz} onOpenVocabulary={navigateVocabulary} onOpenEbook={navigateEbook} onOpenMindMap={navigateMindMap} initialView={route.page === 'workspaces' ? 'chat' : 'root'} initialWorkspaceId={route.page === 'workspace' ? route.workspaceId : null} onLeaveWorkspace={navigateWorkspaces} /> : <>
      {assistantMessages.length > 1 && <><span aria-hidden="true" className="pointer-events-none absolute left-1 top-1/2 z-10 h-14 w-1 -translate-y-1/2 rounded-full bg-purple-400/70 shadow-[0_0_12px_rgba(168,85,247,0.35)] sm:left-2 dark:bg-purple-400/60" /><nav aria-label="AI response navigator" className="absolute left-1 top-1/2 z-20 flex max-h-[min(64vh,420px)] w-8 -translate-y-1/2 flex-col overflow-x-hidden overflow-y-auto rounded-xl bg-white/90 p-1.5 opacity-0 shadow-[0_10px_28px_rgba(76,29,149,0.16)] backdrop-blur-md transition-opacity duration-300 ease-out hover:w-32 hover:opacity-100 focus-within:w-32 focus-within:opacity-100 dark:bg-slate-900/90 dark:shadow-[0_12px_32px_rgba(0,0,0,0.35)] sm:left-2 sm:hover:w-44 sm:focus-within:w-44">
        <span aria-hidden="true" className="absolute bottom-4 left-[17px] top-4 w-px bg-gradient-to-b from-purple-200 via-purple-400 to-purple-200 dark:from-purple-500/20 dark:via-purple-400 dark:to-purple-500/20" />
        {assistantMessages.map(({ message, index }, responseIndex) => {
          const nearestAssistant = assistantMessages.reduce((best, item) => Math.abs(item.index - activeMessageIndex) < Math.abs(best.index - activeMessageIndex) ? item : best)
          const active = index === nearestAssistant.index
          const label = message.content.trim().replace(/[#>*_`~[\]]/g, '').replace(/\s+/g, ' ').slice(0, 72) || 'Generating response…'
          return <button key={message.id} type="button" onClick={() => jumpToMessage(index)} title={label} aria-label={`Jump to AI response ${responseIndex + 1}: ${label}`} aria-current={active ? 'true' : undefined} className={`group relative z-10 flex min-h-11 w-full shrink-0 cursor-pointer items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2 text-left transition-colors duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 dark:focus-visible:ring-purple-300 ${active ? 'bg-purple-100 text-purple-950 dark:bg-purple-500/20 dark:text-purple-100' : 'text-slate-500 hover:bg-purple-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100'}`}><span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-md shadow-[0_0_0_3px_rgba(255,255,255,0.96)] transition-[width,height,background-color,transform] duration-300 ease-out group-hover:scale-110 group-active:scale-90 motion-reduce:transform-none dark:shadow-[0_0_0_3px_rgba(15,23,42,0.96)] ${active ? 'bg-purple-600 dark:bg-purple-300' : 'bg-purple-300 dark:bg-purple-500'}`} /><span className="line-clamp-2 min-w-0 text-xs leading-4 font-medium">{label}</span></button>
        })}
      </nav></>}
      {userMessages.length > 1 && <><span aria-hidden="true" className="pointer-events-none absolute right-1 top-1/2 z-10 h-14 w-1 -translate-y-1/2 rounded-full bg-purple-400/70 shadow-[0_0_12px_rgba(168,85,247,0.35)] sm:right-2 dark:bg-purple-400/60" /><nav aria-label="User message navigator" className="absolute right-1 top-1/2 z-20 flex max-h-[min(64vh,420px)] w-8 -translate-y-1/2 flex-col overflow-x-hidden overflow-y-auto rounded-xl bg-white/90 p-1.5 opacity-0 shadow-[0_10px_28px_rgba(76,29,149,0.16)] backdrop-blur-md transition-opacity duration-300 ease-out hover:w-32 hover:opacity-100 focus-within:w-32 focus-within:opacity-100 dark:bg-slate-900/90 dark:shadow-[0_12px_32px_rgba(0,0,0,0.35)] sm:right-2 sm:hover:w-44 sm:focus-within:w-44">
        <span aria-hidden="true" className="absolute bottom-4 right-[17px] top-4 w-px bg-gradient-to-b from-purple-200 via-purple-400 to-purple-200 dark:from-purple-500/20 dark:via-purple-400 dark:to-purple-500/20" />
        {userMessages.map(({ message, index }, messageIndex) => {
          const nearestUser = userMessages.reduce((best, item) => Math.abs(item.index - activeMessageIndex) < Math.abs(best.index - activeMessageIndex) ? item : best)
          const active = index === nearestUser.index
          const label = message.content.trim().replace(/[#>*_`~[\]]/g, '').replace(/\s+/g, ' ').slice(0, 72) || 'Empty message'
          return <button key={message.id} type="button" onClick={() => jumpToMessage(index)} title={label} aria-label={`Jump to your message ${messageIndex + 1}: ${label}`} aria-current={active ? 'true' : undefined} className={`group relative z-10 flex min-h-11 w-full shrink-0 cursor-pointer flex-row-reverse items-center gap-2 rounded-lg py-1.5 pl-2 pr-1.5 text-right transition-colors duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 dark:focus-visible:ring-purple-300 ${active ? 'bg-purple-100 text-purple-950 dark:bg-purple-500/20 dark:text-purple-100' : 'text-slate-500 hover:bg-purple-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100'}`}><span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-md shadow-[0_0_0_3px_rgba(255,255,255,0.96)] transition-[background-color,transform] duration-300 ease-out group-hover:scale-110 group-active:scale-90 motion-reduce:transform-none dark:shadow-[0_0_0_3px_rgba(15,23,42,0.96)] ${active ? 'bg-purple-600 dark:bg-purple-300' : 'bg-purple-300 dark:bg-purple-500'}`} /><span className="line-clamp-2 min-w-0 text-xs leading-4 font-medium">{label}</span></button>
        })}
      </nav></>}
      <div ref={scrollRef} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain [overflow-anchor:none] [scrollbar-gutter:stable]">{messages.length === 1 && !streaming ? null : <><DoodleField /><div className="relative mx-auto w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>{virtualizer.getVirtualItems().map((row) => <div key={row.key} data-index={row.index} ref={virtualizer.measureElement} className="absolute left-0 top-0 w-full" style={{ transform: `translateY(${row.start}px)` }}><Message message={messages[row.index]} wide={wideChat} streaming={streamingMessageId === messages[row.index].id} onRetry={messages[row.index].error ? retryChat : undefined} onDelete={deleteMessage} onSelectionAction={messages[row.index].role === 'assistant' ? setSelectionAction : undefined} /></div>)}</div></>}</div>
      {responseReadyId && <button onClick={() => setResponseReadyId(null)} aria-label="Dismiss response-ready notification" className="absolute bottom-24 left-1/2 z-30 flex h-9 -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-slate-950 to-purple-900 px-3 text-sm font-medium text-white shadow-[0_10px_28px_rgba(76,29,149,0.25)] transition-[transform,box-shadow] duration-300 ease-out active:scale-[0.97] motion-reduce:transform-none dark:from-white dark:to-purple-100 dark:text-slate-900" role="status"><CheckCircle size={16} weight="fill" />AI response ready</button>}

      <footer className="relative z-20 shrink-0 px-3 pb-3 sm:px-4"><div className={`mx-auto w-full ${wideChat ? 'max-w-5xl' : 'max-w-3xl'} rounded-xl border border-white/40 bg-white/75 p-2 shadow-[0_14px_42px_rgba(76,29,149,0.16)] backdrop-blur-xl transition-[transform,box-shadow,border-color] duration-500 ease-out focus-within:border-purple-300 focus-within:shadow-[0_20px_50px_rgba(76,29,149,0.22)] motion-reduce:transform-none dark:border-white/10 dark:bg-slate-900/75`}>{followUpQuote && <div className="mx-2 mb-1 flex items-start gap-2 rounded-lg bg-purple-50 p-2 text-slate-600 dark:bg-purple-500/10 dark:text-slate-300"><span className="mt-0.5 h-full min-h-8 w-0.5 shrink-0 rounded-full bg-purple-400" /><p className="line-clamp-3 min-w-0 flex-1 whitespace-pre-wrap">{followUpQuote}</p><button onClick={() => setFollowUpQuote('')} aria-label="Remove quote" className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-colors duration-300 hover:bg-purple-100 dark:hover:bg-purple-500/15"><X size={15} /></button></div>}<textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} rows="1" placeholder="Write an idea, question, or challenge…" className="max-h-40 min-h-10 w-full resize-none rounded-lg bg-transparent px-3 py-2 text-sm leading-5 text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100" /><div className="flex items-end justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><div className="w-44"><Listbox value={provider.model} options={models} onChange={(value) => updateProvider('model', value)} disabled={!models.length} placeholder="Select model" compact placement="top" searchable searchPlaceholder="Search models…" /></div><ContextMeter tokens={contextTokens} windowSize={contextWindow} reserve={OUTPUT_RESERVE} percent={contextPercent} remaining={contextRemaining} label={contextLabel} widthClass={contextWidthClass(contextPercent)} /><label className="group relative hidden items-center gap-2 rounded-lg bg-slate-100/70 px-2 py-1.5 text-sm text-slate-500 sm:flex dark:bg-white/5"><span>Creativity</span><input aria-label="Model creativity" aria-describedby="creativity-help" type="range" min="0" max="2" step="0.1" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} className="h-1.5 w-16 cursor-pointer appearance-none rounded-full bg-slate-200 accent-purple-600 dark:bg-slate-700" /><span className="w-5 tabular-nums">{temperature.toFixed(1)}</span><span id="creativity-help" role="tooltip" className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-50 w-56 -translate-x-1/2 rounded-lg bg-slate-950 px-3 py-2 text-xs leading-4 text-white opacity-0 shadow-[0_14px_35px_rgba(15,23,42,0.22)] transition-opacity duration-300 ease-out group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-white dark:text-slate-900">Controls response variety. Lower values are more focused and consistent; higher values are more varied and exploratory.</span></label><button type="button" onClick={() => setWideChat((current) => !current)} aria-pressed={wideChat} aria-label={wideChat ? 'Use compact chat width' : 'Use wide chat width'} title={wideChat ? 'Compact chat width' : 'Wide chat width'} className="hidden h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-slate-100/70 text-slate-500 transition-[transform,background-color,color] duration-300 ease-out hover:bg-purple-100 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 active:scale-[0.96] motion-reduce:transform-none sm:flex dark:bg-white/5 dark:text-slate-300 dark:hover:bg-purple-500/15 dark:hover:text-purple-300">{wideChat ? <ArrowsInLineHorizontal size={16} /> : <ArrowsOutLineHorizontal size={16} />}</button></div>{streaming ? <button onClick={() => abortRef.current?.abort()} className="flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-medium text-white transition-[transform,background-color] duration-300 ease-out hover:bg-slate-800 active:scale-[0.97] motion-reduce:transform-none dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"><Stop size={16} weight="fill" />Stop</button> : <button onClick={send} disabled={!input.trim()} aria-label="Send message" title="Send" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-gradient-to-r from-purple-700 to-purple-500 text-white shadow-[0_8px_22px_rgba(126,34,206,0.24)] transition-opacity duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-40"><PaperPlaneRight size={17} weight="bold" /></button>}</div></div></footer>
      </>}
    </main>
    <WorkspaceDialog open={workspaceDialog.open} workspace={workspaceDialog.workspace} onClose={() => setWorkspaceDialog({ open: false, workspace: null })} onSave={saveWorkspace} onDelete={(workspaceId) => { setWorkspaceDialog({ open: false, workspace: null }); deleteWorkspace(workspaceId) }} canDelete={workspaces.length > 1} />
    <ConfirmDialog confirmation={confirmation} onCancel={() => setConfirmation(null)} onConfirm={runConfirmedAction} />
    <SelectionToolbar selection={selectionAction} chatActions={selectionAction?.chatActions} askActions={selectionAction?.askActions} languageCode={pronunciationLanguage} voiceURI={pronunciationVoice} pronunciationRate={pronunciationRate} onLanguageChange={(language) => { setPronunciationLanguage(language); setPronunciationVoice('') }} onVoiceChange={setPronunciationVoice} onPronunciationRateChange={setPronunciationRate} onPronounce={(text) => speakWord({ text, languageCode: pronunciationLanguage, voiceURI: pronunciationVoice, rate: pronunciationRate })} onFollowUp={(text) => applySelection(text, false)} onAsk={(text) => { const ebookSelection = selectionAction?.source === 'ebook'; setSelectionAction(null); if (!ebookSelection) window.getSelection()?.removeAllRanges(); setQuickAskContext(selectionAction?.context || ''); setQuickAskSelection(text) }} onClose={() => setSelectionAction(null)} />
    <QuickAskPopup selection={quickAskSelection} providerReady={Boolean(provider.baseUrl && provider.model)} onAsk={quickAsk} onClose={() => { setQuickAskSelection(''); setQuickAskContext('') }} onOpenSettings={() => setSettingsOpen(true)} />
    <SettingsPanel open={settingsOpen} provider={provider} providers={providerOptions} activeProvider={providerOptions[activeProvider]} models={models} status={status} theme={theme} onThemeChange={setTheme} onProviderChange={changeProvider} onChange={updateProvider} onAdd={() => { setProviders((all) => [...all, { ...blankProvider, name: `Provider ${all.length + 1}` }]); setActiveProvider(providers.length); setModels([]); setStatus({ loading: false, ok: false, message: '' }) }} onClose={() => setSettingsOpen(false)} onLoadModels={loadModels} onSave={() => { try { if (provider.headersText) JSON.parse(provider.headersText); saveState({ theme, providers, activeProvider, models, quizCategories, savedQuizzes, quizAttempts, vocabularyLanguages, ebooks, mindMaps, workspaces, conversations, activeId, activeWorkspaceId, temperature, wideChat, sidebarWidth, sidebarVisible, pronunciationLanguage, pronunciationVoice, pronunciationRate }); setStatus({ loading: false, ok: true, message: 'Provider saved in this browser.' }) } catch { setStatus({ loading: false, ok: false, message: 'Additional headers must be valid JSON.' }) } }} onDelete={() => confirmAction('Reset provider configuration?', 'The current provider details, API key, selected model, and fetched model list will be cleared.', () => { setProviders([blankProvider]); setActiveProvider(0); setModels([]); setStatus({ loading: false, ok: true, message: 'Provider configuration reset.' }) }, 'Reset')} />
  </div>
}
