import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowsInLineHorizontal, ArrowsOutLineHorizontal, ArrowDown, ChatCircle, DownloadSimple, GearSix, List, PaperPlaneRight, Plus, Sparkle, Stop, Trash, X } from '@phosphor-icons/react'
import Message from './components/Message'
import SettingsPanel from './components/SettingsPanel'
import Listbox from './components/Listbox'
import ContextMeter from './components/ContextMeter'
import SelectionToolbar from './components/SelectionToolbar'
import QuickAskPopup from './components/QuickAskPopup'
import WorkspaceDialog from './components/WorkspaceDialog'
import { AvatarTrio, CursorGlow, DoodleField, RobotMascot } from './components/CreativeVisuals'
import { fetchModels, streamCompletion } from './lib/provider'
import { downloadJson, loadState, saveState } from './lib/storage'

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
const NATURAL_STYLE_PROMPT = `Respond naturally and directly in the user's language. Avoid unnecessary introductions, praise, repeating the question, redundant conclusions, excessive headings or lists, overusing bold text, clichéd AI-assistant phrases, and em or en dashes. Use simple sentences and punctuation. When the user requests code or a specific format, prioritize format accuracy.`
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
  const [workspaces, setWorkspaces] = useState(stored?.workspaces?.length ? stored.workspaces : [{ id: 'default', name: 'General', color: 'white', instructions: '' }])
  const initialWorkspaceId = stored?.workspaces?.[0]?.id || 'default'
  const [conversations, setConversations] = useState(() => {
    const saved = stored?.conversations?.length ? migrateInterfaceText(stored.conversations) : [{ id: id(), title: 'New conversation', messages: [createWelcome()], createdAt: Date.now() }]
    return saved.map((chat) => ({ ...chat, workspaceId: chat.workspaceId || initialWorkspaceId }))
  })
  const [activeId, setActiveId] = useState(stored?.activeId || conversations[0].id)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(() => conversations.find((chat) => chat.id === (stored?.activeId || conversations[0].id))?.workspaceId || initialWorkspaceId)
  const [workspaceDialog, setWorkspaceDialog] = useState({ open: false, workspace: null })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarVisible, setSidebarVisible] = useState(stored?.sidebarVisible ?? true)
  const [sidebarWidth, setSidebarWidth] = useState(clampSidebarWidth(stored?.sidebarWidth || 272))
  const [input, setInput] = useState('')
  const [followUpQuote, setFollowUpQuote] = useState('')
  const [status, setStatus] = useState({ loading: false, ok: false, message: '' })
  const [streaming, setStreaming] = useState(false)
  const [autoFollow, setAutoFollow] = useState(true)
  const [temperature, setTemperature] = useState(stored?.temperature ?? 0.7)
  const [wideChat, setWideChat] = useState(stored?.wideChat ?? false)
  const [selectionAction, setSelectionAction] = useState(null)
  const [quickAskSelection, setQuickAskSelection] = useState('')
  const [activeMessageIndex, setActiveMessageIndex] = useState(0)
  const abortRef = useRef(null)
  const scrollRef = useRef(null)
  const textareaRef = useRef(null)
  const activeConversation = conversations.find((item) => item.id === activeId) || conversations[0]
  const activeWorkspace = workspaces.find((item) => item.id === activeConversation?.workspaceId) || workspaces.find((item) => item.id === activeWorkspaceId) || workspaces[0]
  const messages = activeConversation?.messages || []
  const indexedMessages = messages.map((message, index) => ({ message, index }))
  const assistantMessages = indexedMessages.filter(({ message }) => message.role === 'assistant')
  const userMessages = indexedMessages.filter(({ message }) => message.role === 'user')
  const latestContent = messages.at(-1)?.content
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
  useEffect(() => { const timer = setTimeout(() => saveState({ theme, providers, activeProvider, models, workspaces, conversations, activeId, activeWorkspaceId, temperature, wideChat, sidebarWidth, sidebarVisible }), 300); return () => clearTimeout(timer) }, [theme, providers, activeProvider, models, workspaces, conversations, activeId, activeWorkspaceId, temperature, wideChat, sidebarWidth, sidebarVisible])
  useEffect(() => { if (autoFollow && messages.length) virtualizer.scrollToIndex(messages.length - 1, { align: 'end', behavior: streaming ? 'auto' : 'smooth' }) }, [messages.length, latestContent, autoFollow, streaming, virtualizer])
  useEffect(() => { virtualizer.measure() }, [wideChat, virtualizer])

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
  const newChat = (workspaceId = activeWorkspace?.id || workspaces[0].id) => { const next = { id: id(), workspaceId, title: 'New conversation', messages: [createWelcome()], createdAt: Date.now() }; setConversations((all) => [next, ...all]); setActiveId(next.id); setActiveWorkspaceId(workspaceId); setFollowUpQuote(''); setSidebarOpen(false) }
  const selectChat = (chat) => { setActiveId(chat.id); setActiveWorkspaceId(chat.workspaceId); setSidebarOpen(false) }
  const saveWorkspace = (values) => {
    if (workspaceDialog.workspace) {
      setWorkspaces((all) => all.map((item) => item.id === workspaceDialog.workspace.id ? { ...item, ...values } : item))
    } else {
      const workspace = { id: id(), ...values }
      setWorkspaces((all) => [...all, workspace])
      newChat(workspace.id)
    }
    setWorkspaceDialog({ open: false, workspace: null })
  }
  const deleteChat = (chatId) => { if (chatId === activeId && streaming) abortRef.current?.abort(); const removed = conversations.find((item) => item.id === chatId); const remaining = conversations.filter((item) => item.id !== chatId); if (!remaining.length) { const workspaceId = removed?.workspaceId || workspaces[0].id; const next = { id: id(), workspaceId, title: 'New conversation', messages: [createWelcome()], createdAt: Date.now() }; setConversations([next]); setActiveId(next.id); setActiveWorkspaceId(workspaceId); return } setConversations(remaining); if (chatId === activeId) { const next = remaining.find((item) => item.workspaceId === removed?.workspaceId) || remaining[0]; setActiveId(next.id); setActiveWorkspaceId(next.workspaceId) } }
  const updateProvider = (key, value) => setProviders((all) => all.map((item, index) => index === activeProvider ? { ...item, [key]: value } : item))

  const loadModels = async () => {
    setStatus({ loading: true, ok: false, message: 'Connecting to provider…' })
    try { const parsed = normalizeProvider(provider); if (provider.headersText) JSON.parse(provider.headersText); const list = await fetchModels(parsed); setModels(list); if (!provider.model && list[0]) updateProvider('model', list[0]); setStatus({ loading: false, ok: true, message: `Connected. ${list.length} models found.` }) }
    catch (error) { setStatus({ loading: false, ok: false, message: error.message }) }
  }

  const send = async (contentOverride) => {
    const content = (typeof contentOverride === 'string' ? contentOverride : input).trim()
    if (!content || streaming) return
    if (!provider.baseUrl || !provider.model) { setSettingsOpen(true); setStatus({ loading: false, ok: false, message: 'Enter a Base URL, test the connection, then select a model.' }); return }
    const quote = typeof contentOverride === 'string' ? '' : followUpQuote.trim()
    const user = { id: id(), role: 'user', content, ...(quote ? { quote } : {}) }
    const assistant = { id: id(), role: 'assistant', content: '' }
    const history = [...messages.filter((item, index) => !(index === 0 && item.role === 'assistant' && (item.content.startsWith('Halo! Saya **Chatty**') || item.content.startsWith('Halo. Hubungkan provider')))), user]
    updateConversation((chat) => ({ ...chat, title: chat.title === 'New conversation' ? content.slice(0, 42) : chat.title, messages: [...chat.messages, user, assistant] }))
    setInput(''); setFollowUpQuote(''); setStreaming(true); setAutoFollow(true); abortRef.current = new AbortController()
    let queued = ''; let frame = null
    const flush = () => { if (!queued) return; const chunk = queued; queued = ''; updateConversation((chat) => ({ ...chat, messages: chat.messages.map((item) => item.id === assistant.id ? { ...item, content: item.content + chunk } : item) })); frame = null }
    try { await streamCompletion({ provider: normalizeProvider(provider), model: provider.model, messages: [{ role: 'system', content: [NATURAL_STYLE_PROMPT, provider.instructions?.trim(), activeWorkspace?.instructions?.trim(), GRAMMAR_ASSIST_PROMPT].filter(Boolean).join('\n\n') }, ...history.map(({ role, content: text, quote: quotedText }) => ({ role, content: quotedText ? `Context quote:\n${quotedText}\n\nMessage:\n${text}` : text }))], settings: { temperature, maxTokens: OUTPUT_RESERVE }, signal: abortRef.current.signal, onToken: (token) => { queued += token; if (!frame) frame = requestAnimationFrame(flush) } }); flush() }
    catch (error) { if (error.name !== 'AbortError') updateConversation((chat) => ({ ...chat, messages: chat.messages.map((item) => item.id === assistant.id ? { ...item, content: `Failed to connect to provider: ${error.message}` } : item) })) }
    finally { if (frame) cancelAnimationFrame(frame); flush(); setStreaming(false); abortRef.current = null }
  }

  const onScroll = () => {
    const el = scrollRef.current
    if (el) {
      setAutoFollow(el.scrollHeight - el.scrollTop - el.clientHeight < 100)
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
    if (ask) { setQuickAskSelection(text); return }
    setFollowUpQuote(text)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }
  const quickAsk = async (question, onToken, signal, previousTurns = []) => {
    if (!provider.baseUrl || !provider.model) throw new Error('Connect a provider and select a model first.')
    await streamCompletion({
      provider: normalizeProvider(provider),
      model: provider.model,
      messages: [
        { role: 'system', content: [NATURAL_STYLE_PROMPT, 'Answer only this temporary quick question about the selected text. Do not assume it belongs to the saved chat history.', provider.instructions?.trim(), activeWorkspace?.instructions?.trim(), GRAMMAR_ASSIST_PROMPT].filter(Boolean).join('\n\n') },
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
  const providerOptions = providers.map((item, index) => `${item.name} · ${index + 1}`)
  const changeProvider = (option) => { const index = providerOptions.indexOf(option); if (index >= 0) { setActiveProvider(index); setModels([]); setStatus({ loading: false, ok: false, message: '' }) } }

  return <div className="relative flex h-dvh overflow-hidden bg-white font-sans text-sm text-slate-800 [&_*]:!font-sans [&_code]:!font-mono [&_pre]:!font-mono [&_pre_*]:!font-mono transition-[background-color,color] duration-500 dark:bg-slate-950 dark:text-slate-100">
    <CursorGlow />
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 opacity-[0.035] [background-image:radial-gradient(theme(colors.purple.700)_1px,transparent_1px)] [background-size:24px_24px] dark:opacity-[0.06]" />
    {sidebarOpen && <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-20 cursor-pointer bg-slate-950/45 backdrop-blur-sm md:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-30 flex max-w-[calc(100vw-24px)] ${sidebarWidths[sidebarWidth]} flex-col overflow-hidden border-r border-purple-100/70 bg-white/80 p-3 shadow-[16px_0_40px_rgba(76,29,149,0.08)] backdrop-blur-xl transition-transform duration-500 ease-out dark:border-white/5 dark:bg-slate-950/80 dark:shadow-[16px_0_45px_rgba(126,34,206,0.08)] ${sidebarVisible ? 'md:static md:translate-x-0' : 'md:fixed md:-translate-x-full'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <button type="button" aria-label={`Resize sidebar, current width ${sidebarWidth} pixels`} aria-valuemin="240" aria-valuemax="352" aria-valuenow={sidebarWidth} role="separator" title="Drag to resize · Double-click to reset" onPointerDown={startSidebarResize} onDoubleClick={() => setSidebarWidth(272)} onKeyDown={resizeSidebarWithKeyboard} className="absolute inset-y-0 right-0 z-20 hidden w-2 cursor-col-resize touch-none items-center justify-center focus:outline-none focus-visible:bg-purple-500/10 md:flex"><span className="h-10 w-0.5 rounded-full bg-slate-300 opacity-0 transition-opacity duration-300 ease-out hover:opacity-100 focus:opacity-100 dark:bg-slate-600" /></button>
      <div aria-hidden="true" className="absolute -left-20 top-16 h-44 w-44 animate-pulse rounded-full bg-purple-300/20 blur-3xl motion-reduce:animate-none dark:bg-purple-600/10" />
      <div className="relative flex h-10 items-center gap-2 px-1"><div className="group flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-700 to-purple-500 text-white shadow-[0_8px_20px_rgba(126,34,206,0.25)] transition-transform duration-500 motion-reduce:transform-none"><Sparkle size={17} weight="fill" /></div><span className="text-base leading-6 font-semibold tracking-tight">Chatty</span><span className="ml-auto rounded-full bg-purple-100 px-2 py-0.5 text-sm font-medium text-purple-700 dark:bg-purple-500/15 dark:text-purple-300">AI</span><button type="button" onClick={() => setSidebarVisible(false)} aria-label="Hide sidebar" title="Hide sidebar" className="hidden h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors duration-300 ease-out hover:bg-purple-100 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 md:flex dark:hover:bg-purple-500/15 dark:hover:text-purple-300"><X size={15} /></button></div>
      <button onClick={() => setWorkspaceDialog({ open: true, workspace: null })} className="group relative mt-3 flex h-10 w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-purple-700 to-purple-500 px-3 text-sm font-medium text-white shadow-[0_10px_26px_rgba(126,34,206,0.24)] transition-[transform,box-shadow] duration-300 ease-out active:scale-[0.97] motion-reduce:transform-none"><span className="absolute inset-y-0 -left-8 w-6 -skew-x-12 bg-white/20 transition-transform duration-700" /><Plus size={17} />New workspace</button>
      <div className="relative mt-4 flex items-center justify-between px-2"><p className="text-[13px] leading-[18px] font-medium uppercase tracking-[0.16em] text-slate-500">Workspaces</p><svg aria-hidden="true" viewBox="0 0 44 12" className="h-3 w-11 text-purple-300"><path d="M2 7c11-8 18 7 40-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></div>
      <nav className="mt-2 flex-1 space-y-3 overflow-y-auto">{workspaces.map((workspace) => {
        const workspaceChats = conversations.filter((chat) => chat.workspaceId === workspace.id)
        return <section key={workspace.id} aria-label={workspace.name}>
          <div className={`flex h-9 items-center gap-1 rounded-lg px-1.5 ${workspace.id === activeWorkspace?.id ? 'bg-slate-100 dark:bg-white/5' : ''}`}><span className={`h-3 w-3 shrink-0 rounded-md border border-slate-200 ${workspace.color === 'purple' ? 'bg-purple-200 dark:border-purple-700 dark:bg-purple-800' : workspace.color === 'blue' ? 'bg-blue-200 dark:border-blue-700 dark:bg-blue-800' : workspace.color === 'teal' ? 'bg-teal-200 dark:border-teal-700 dark:bg-teal-800' : 'bg-white dark:border-slate-600 dark:bg-slate-800'}`} /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{workspace.name}</span><button onClick={() => newChat(workspace.id)} aria-label={`New chat in ${workspace.name}`} title="New chat" className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors duration-300 ease-out hover:bg-purple-100 hover:text-purple-700 dark:hover:bg-purple-500/15 dark:hover:text-purple-300"><Plus size={15} /></button><button onClick={() => setWorkspaceDialog({ open: true, workspace })} aria-label={`Edit ${workspace.name}`} title="Workspace settings" className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors duration-300 ease-out hover:bg-purple-100 hover:text-purple-700 dark:hover:bg-purple-500/15 dark:hover:text-purple-300"><GearSix size={15} /></button></div>
          <div className="mt-1 space-y-0.5">{workspaceChats.map((chat) => <div key={chat.id} className={`group flex items-center rounded-lg transition-colors duration-300 ease-out ${chat.id === activeId ? 'bg-purple-100 text-purple-900 dark:bg-purple-500/15 dark:text-purple-100' : 'hover:bg-purple-50 dark:hover:bg-white/5'}`}><button onClick={() => selectChat(chat)} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pl-4 pr-2 text-left"><ChatCircle size={16} className="shrink-0" /><span className="truncate text-sm">{chat.title}</span></button><button aria-label={`Delete ${chat.title}`} onClick={() => deleteChat(chat.id)} className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md opacity-0 transition-colors duration-300 ease-out hover:bg-slate-200 group-hover:opacity-100 focus:opacity-100 dark:hover:bg-slate-700"><Trash size={15} /></button></div>)}{!workspaceChats.length && <button onClick={() => newChat(workspace.id)} className="ml-4 flex h-8 items-center gap-2 rounded-lg px-2 text-xs text-slate-400 transition-colors duration-300 ease-out hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-white/5 dark:hover:text-purple-300"><Plus size={14} />Start a chat</button>}</div>
        </section>
      })}</nav>
      <div className="relative mb-2 flex items-end justify-center gap-1"><RobotMascot compact className="animate-[bounce_5s_ease-in-out_infinite] motion-reduce:animate-none" /><AvatarTrio /></div>
      <div className="relative space-y-1 border-t border-purple-100 pt-2 dark:border-white/5"><button onClick={() => downloadJson({ workspaces, conversations }, 'chatty-export.json')} className={`${button} w-full justify-start gap-2 px-2`}><DownloadSimple size={17} />Export chats</button><button onClick={() => setSettingsOpen(true)} className={`${button} w-full justify-start gap-2 px-2`}><GearSix size={17} />Provider & model</button></div>
    </aside>

    <main className={`relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden transition-colors duration-500 ${workspaceBackgrounds[activeWorkspace?.color] || workspaceBackgrounds.white}`}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-20 h-72 w-72 animate-pulse rounded-full bg-purple-300/20 blur-3xl motion-reduce:animate-none dark:bg-purple-700/10" />
      <button onClick={() => setSidebarOpen(true)} aria-label="Open navigation" className={`${button} absolute left-3 top-3 z-20 w-9 bg-white/80 backdrop-blur-md md:hidden dark:bg-slate-900/80`}><List size={18} /></button>
      {!sidebarVisible && <button onClick={() => setSidebarVisible(true)} aria-label="Show sidebar" title="Show sidebar" className={`${button} absolute left-3 top-3 z-20 hidden w-9 bg-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.14)] backdrop-blur-md md:flex dark:bg-slate-900/80 dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)]`}><List size={18} /></button>}

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
      <div ref={scrollRef} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">{messages.length === 1 && !streaming ? null : <><DoodleField /><div className="relative mx-auto w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>{virtualizer.getVirtualItems().map((row) => <div key={row.key} data-index={row.index} ref={virtualizer.measureElement} className="absolute left-0 top-0 w-full" style={{ transform: `translateY(${row.start}px)` }}><Message message={messages[row.index]} wide={wideChat} streaming={streaming && row.index === messages.length - 1} onSelectionAction={messages[row.index].role === 'assistant' ? setSelectionAction : undefined} /></div>)}</div></>}{!autoFollow && <button onClick={() => { setAutoFollow(true); virtualizer.scrollToIndex(messages.length - 1, { align: 'end', behavior: 'smooth' }) }} className="sticky bottom-3 left-1/2 flex h-9 -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-slate-950 to-purple-900 px-3 text-sm font-medium text-white shadow-[0_10px_28px_rgba(76,29,149,0.25)] transition-[transform,box-shadow] duration-300 ease-out  active:scale-[0.97] motion-reduce:transform-none dark:from-white dark:to-purple-100 dark:text-slate-900"><ArrowDown size={16} />Jump to latest</button>}</div>

      <footer className="relative z-20 shrink-0 px-3 pb-3 sm:px-4"><div className={`mx-auto w-full ${wideChat ? 'max-w-5xl' : 'max-w-3xl'} rounded-xl border border-white/40 bg-white/75 p-2 shadow-[0_14px_42px_rgba(76,29,149,0.16)] backdrop-blur-xl transition-[transform,box-shadow,border-color] duration-500 ease-out focus-within:border-purple-300 focus-within:shadow-[0_20px_50px_rgba(76,29,149,0.22)] motion-reduce:transform-none dark:border-white/10 dark:bg-slate-900/75`}>{followUpQuote && <div className="mx-2 mb-1 flex items-start gap-2 rounded-lg bg-purple-50 p-2 text-slate-600 dark:bg-purple-500/10 dark:text-slate-300"><span className="mt-0.5 h-full min-h-8 w-0.5 shrink-0 rounded-full bg-purple-400" /><p className="line-clamp-3 min-w-0 flex-1 whitespace-pre-wrap">{followUpQuote}</p><button onClick={() => setFollowUpQuote('')} aria-label="Remove quote" className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-colors duration-300 hover:bg-purple-100 dark:hover:bg-purple-500/15"><X size={15} /></button></div>}<textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} rows="1" placeholder="Write an idea, question, or challenge…" className="max-h-40 min-h-10 w-full resize-none rounded-lg bg-transparent px-3 py-2 text-sm leading-5 text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100" /><div className="flex items-end justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><div className="w-44"><Listbox value={provider.model} options={models} onChange={(value) => updateProvider('model', value)} disabled={!models.length} placeholder="Select model" compact placement="top" searchable searchPlaceholder="Search models…" /></div><ContextMeter tokens={contextTokens} windowSize={contextWindow} reserve={OUTPUT_RESERVE} percent={contextPercent} remaining={contextRemaining} label={contextLabel} widthClass={contextWidthClass(contextPercent)} /><label className="group relative hidden items-center gap-2 rounded-lg bg-slate-100/70 px-2 py-1.5 text-sm text-slate-500 sm:flex dark:bg-white/5"><span>Creativity</span><input aria-label="Model creativity" aria-describedby="creativity-help" type="range" min="0" max="2" step="0.1" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} className="h-1.5 w-16 cursor-pointer appearance-none rounded-full bg-slate-200 accent-purple-600 dark:bg-slate-700" /><span className="w-5 tabular-nums">{temperature.toFixed(1)}</span><span id="creativity-help" role="tooltip" className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-50 w-56 -translate-x-1/2 rounded-lg bg-slate-950 px-3 py-2 text-xs leading-4 text-white opacity-0 shadow-[0_14px_35px_rgba(15,23,42,0.22)] transition-opacity duration-300 ease-out group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-white dark:text-slate-900">Controls response variety. Lower values are more focused and consistent; higher values are more varied and exploratory.</span></label><button type="button" onClick={() => setWideChat((current) => !current)} aria-pressed={wideChat} aria-label={wideChat ? 'Use compact chat width' : 'Use wide chat width'} title={wideChat ? 'Compact chat width' : 'Wide chat width'} className="hidden h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-slate-100/70 text-slate-500 transition-[transform,background-color,color] duration-300 ease-out hover:bg-purple-100 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 active:scale-[0.96] motion-reduce:transform-none sm:flex dark:bg-white/5 dark:text-slate-300 dark:hover:bg-purple-500/15 dark:hover:text-purple-300">{wideChat ? <ArrowsInLineHorizontal size={16} /> : <ArrowsOutLineHorizontal size={16} />}</button></div>{streaming ? <button onClick={() => abortRef.current?.abort()} className="flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-medium text-white transition-[transform,background-color] duration-300 ease-out hover:bg-slate-800 active:scale-[0.97] motion-reduce:transform-none dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"><Stop size={16} weight="fill" />Stop</button> : <button onClick={send} disabled={!input.trim()} aria-label="Send message" title="Send" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-gradient-to-r from-purple-700 to-purple-500 text-white shadow-[0_8px_22px_rgba(126,34,206,0.24)] transition-opacity duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-40"><PaperPlaneRight size={17} weight="bold" /></button>}</div></div></footer>
    </main>
    <WorkspaceDialog open={workspaceDialog.open} workspace={workspaceDialog.workspace} onClose={() => setWorkspaceDialog({ open: false, workspace: null })} onSave={saveWorkspace} />
    <SelectionToolbar selection={selectionAction} onFollowUp={(text) => applySelection(text, false)} onAsk={(text) => applySelection(text, true)} onClose={() => setSelectionAction(null)} />
    <QuickAskPopup selection={quickAskSelection} providerReady={Boolean(provider.baseUrl && provider.model)} onAsk={quickAsk} onClose={() => setQuickAskSelection('')} onOpenSettings={() => setSettingsOpen(true)} />
    <SettingsPanel open={settingsOpen} provider={provider} providers={providerOptions} activeProvider={providerOptions[activeProvider]} models={models} status={status} theme={theme} onThemeChange={setTheme} onProviderChange={changeProvider} onChange={updateProvider} onAdd={() => { setProviders((all) => [...all, { ...blankProvider, name: `Provider ${all.length + 1}` }]); setActiveProvider(providers.length); setModels([]); setStatus({ loading: false, ok: false, message: '' }) }} onClose={() => setSettingsOpen(false)} onLoadModels={loadModels} onSave={() => { try { if (provider.headersText) JSON.parse(provider.headersText); saveState({ theme, providers, activeProvider, models, workspaces, conversations, activeId, activeWorkspaceId, temperature, wideChat, sidebarWidth, sidebarVisible }); setStatus({ loading: false, ok: true, message: 'Provider saved in this browser.' }) } catch { setStatus({ loading: false, ok: false, message: 'Additional headers must be valid JSON.' }) } }} onDelete={() => { setProviders([blankProvider]); setActiveProvider(0); setModels([]); setStatus({ loading: false, ok: true, message: 'Provider configuration reset.' }) }} />
  </div>
}
