import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowsInSimple, ArrowsOutSimple, ArrowDown, ChatCircle, DownloadSimple, GearSix, List, PaperPlaneRight, Plus, Sparkle, Stop, Trash, X } from '@phosphor-icons/react'
import Message from './components/Message'
import SettingsPanel from './components/SettingsPanel'
import Listbox from './components/Listbox'
import ContextMeter from './components/ContextMeter'
import SelectionToolbar from './components/SelectionToolbar'
import { AvatarTrio, CursorGlow, DoodleField, EmptyState, RobotMascot } from './components/CreativeVisuals'
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
  const [conversations, setConversations] = useState(stored?.conversations?.length ? migrateInterfaceText(stored.conversations) : [{ id: id(), title: 'New conversation', messages: [createWelcome()], createdAt: Date.now() }])
  const [activeId, setActiveId] = useState(stored?.activeId || conversations[0].id)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [input, setInput] = useState('')
  const [followUpQuote, setFollowUpQuote] = useState('')
  const [status, setStatus] = useState({ loading: false, ok: false, message: '' })
  const [streaming, setStreaming] = useState(false)
  const [autoFollow, setAutoFollow] = useState(true)
  const [temperature, setTemperature] = useState(stored?.temperature ?? 0.7)
  const [wideChat, setWideChat] = useState(stored?.wideChat ?? false)
  const [selectionAction, setSelectionAction] = useState(null)
  const abortRef = useRef(null)
  const scrollRef = useRef(null)
  const textareaRef = useRef(null)
  const activeConversation = conversations.find((item) => item.id === activeId) || conversations[0]
  const messages = activeConversation?.messages || []
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
  useEffect(() => { document.body.style.overflow = settingsOpen ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [settingsOpen])
  useEffect(() => { const timer = setTimeout(() => saveState({ theme, providers, activeProvider, models, conversations, activeId, temperature, wideChat }), 300); return () => clearTimeout(timer) }, [theme, providers, activeProvider, models, conversations, activeId, temperature, wideChat])
  useEffect(() => { if (autoFollow && messages.length) virtualizer.scrollToIndex(messages.length - 1, { align: 'end', behavior: streaming ? 'auto' : 'smooth' }) }, [messages.length, latestContent, autoFollow, streaming, virtualizer])
  useEffect(() => { virtualizer.measure() }, [wideChat, virtualizer])

  const updateConversation = useCallback((updater) => setConversations((all) => all.map((conversation) => conversation.id === activeId ? updater(conversation) : conversation)), [activeId])
  const newChat = () => { const next = { id: id(), title: 'New conversation', messages: [createWelcome()], createdAt: Date.now() }; setConversations((all) => [next, ...all]); setActiveId(next.id); setFollowUpQuote(''); setSidebarOpen(false) }
  const deleteChat = (chatId) => { if (chatId === activeId && streaming) abortRef.current?.abort(); const remaining = conversations.filter((item) => item.id !== chatId); if (!remaining.length) { const next = { id: id(), title: 'New conversation', messages: [createWelcome()], createdAt: Date.now() }; setConversations([next]); setActiveId(next.id); return } setConversations(remaining); if (chatId === activeId) setActiveId(remaining[0].id) }
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
    try { await streamCompletion({ provider: normalizeProvider(provider), model: provider.model, messages: [{ role: 'system', content: [NATURAL_STYLE_PROMPT, provider.instructions?.trim()].filter(Boolean).join('\n\n') }, ...history.map(({ role, content: text, quote: quotedText }) => ({ role, content: quotedText ? `Context quote:\n${quotedText}\n\nMessage:\n${text}` : text }))], settings: { temperature, maxTokens: OUTPUT_RESERVE }, signal: abortRef.current.signal, onToken: (token) => { queued += token; if (!frame) frame = requestAnimationFrame(flush) } }); flush() }
    catch (error) { if (error.name !== 'AbortError') updateConversation((chat) => ({ ...chat, messages: chat.messages.map((item) => item.id === assistant.id ? { ...item, content: `Failed to connect to provider: ${error.message}` } : item) })) }
    finally { if (frame) cancelAnimationFrame(frame); flush(); setStreaming(false); abortRef.current = null }
  }

  const onScroll = () => { const el = scrollRef.current; if (el) setAutoFollow(el.scrollHeight - el.scrollTop - el.clientHeight < 100); setSelectionAction(null) }
  const handlePrompt = (prompt) => { if (prompt === null) { setSettingsOpen(true); return } setInput(prompt); textareaRef.current?.focus() }
  const applySelection = (text, ask) => { setSelectionAction(null); window.getSelection()?.removeAllRanges(); if (ask) { send(`Explain this section:\n\n"${text}"`); return } setFollowUpQuote(text); requestAnimationFrame(() => textareaRef.current?.focus()) }
  const providerOptions = providers.map((item, index) => `${item.name} · ${index + 1}`)
  const changeProvider = (option) => { const index = providerOptions.indexOf(option); if (index >= 0) { setActiveProvider(index); setModels([]); setStatus({ loading: false, ok: false, message: '' }) } }

  return <div className="relative flex h-dvh overflow-hidden bg-white font-sans text-sm text-slate-800 [&_*]:!font-sans [&_code]:!font-mono [&_pre]:!font-mono [&_pre_*]:!font-mono transition-[background-color,color] duration-500 dark:bg-slate-950 dark:text-slate-100">
    <CursorGlow />
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 opacity-[0.035] [background-image:radial-gradient(theme(colors.purple.700)_1px,transparent_1px)] [background-size:24px_24px] dark:opacity-[0.06]" />
    {sidebarOpen && <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-20 cursor-pointer bg-slate-950/45 backdrop-blur-sm md:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col overflow-hidden border-r border-purple-100/70 bg-white/80 p-3 shadow-[16px_0_40px_rgba(76,29,149,0.08)] backdrop-blur-xl transition-transform duration-500 ease-out dark:border-white/5 dark:bg-slate-950/80 dark:shadow-[16px_0_45px_rgba(126,34,206,0.08)] md:static md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div aria-hidden="true" className="absolute -left-20 top-16 h-44 w-44 animate-pulse rounded-full bg-purple-300/20 blur-3xl motion-reduce:animate-none dark:bg-purple-600/10" />
      <div className="relative flex h-10 items-center gap-2 px-1"><div className="group flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-700 to-purple-500 text-white shadow-[0_8px_20px_rgba(126,34,206,0.25)] transition-transform duration-500 motion-reduce:transform-none"><Sparkle size={17} weight="fill" /></div><span className="text-base leading-6 font-semibold tracking-tight">Chatty</span><span className="ml-auto rounded-full bg-purple-100 px-2 py-0.5 text-sm font-medium text-purple-700 dark:bg-purple-500/15 dark:text-purple-300">AI</span></div>
      <button onClick={newChat} className="group relative mt-3 flex h-10 w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-purple-700 to-purple-500 px-3 text-sm font-medium text-white shadow-[0_10px_26px_rgba(126,34,206,0.24)] transition-[transform,box-shadow] duration-300 ease-out  active:scale-[0.97] motion-reduce:transform-none"><span className="absolute inset-y-0 -left-8 w-6 -skew-x-12 bg-white/20 transition-transform duration-700 " /><Plus size={17} />New chat</button>
      <div className="relative mt-4 flex items-center justify-between px-2"><p className="text-[15px] leading-6 font-medium uppercase tracking-[0.16em] text-slate-500">Conversations</p><svg aria-hidden="true" viewBox="0 0 44 12" className="h-3 w-11 text-purple-300"><path d="M2 7c11-8 18 7 40-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></div>
      <nav className="mt-2 flex-1 space-y-1 overflow-y-auto">{conversations.map((chat) => <div key={chat.id} className={`group flex items-center rounded-lg transition-colors duration-300 ease-out ${chat.id === activeId ? 'bg-purple-100 dark:bg-purple-500/15' : 'hover:bg-purple-50 dark:hover:bg-white/5'}`}><button onClick={() => { setActiveId(chat.id); setSidebarOpen(false) }} className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left"><ChatCircle size={16} className="shrink-0" /><span className="truncate text-sm">{chat.title}</span></button><button aria-label={`Delete ${chat.title}`}  onClick={() => deleteChat(chat.id)} className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md opacity-0 transition-colors duration-300 ease-out hover:bg-slate-200 group-hover:opacity-100 dark:hover:bg-slate-700"><Trash size={15} /></button></div>)}</nav>
      <div className="relative mb-2 flex items-end justify-center gap-1"><RobotMascot compact className="animate-[bounce_5s_ease-in-out_infinite] motion-reduce:animate-none" /><AvatarTrio /></div>
      <div className="relative space-y-1 border-t border-purple-100 pt-2 dark:border-white/5"><button onClick={() => downloadJson(conversations, 'chatty-export.json')} className={`${button} w-full justify-start gap-2 px-2`}><DownloadSimple size={17} />Export chats</button><button onClick={() => setSettingsOpen(true)} className={`${button} w-full justify-start gap-2 px-2`}><GearSix size={17} />Provider & model</button></div>
    </aside>

    <main className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-20 h-72 w-72 animate-pulse rounded-full bg-purple-300/20 blur-3xl motion-reduce:animate-none dark:bg-purple-700/10" />
      <button onClick={() => setSidebarOpen(true)} aria-label="Open navigation" className={`${button} absolute left-3 top-3 z-20 w-9 bg-white/80 backdrop-blur-md md:hidden dark:bg-slate-900/80`}><List size={18} /></button>

      <div ref={scrollRef} onScroll={onScroll} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">{messages.length === 1 && !streaming ? <EmptyState onPrompt={handlePrompt} providerReady={Boolean(provider.baseUrl && provider.model)} /> : <><DoodleField /><div className="relative mx-auto w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>{virtualizer.getVirtualItems().map((row) => <div key={row.key} data-index={row.index} ref={virtualizer.measureElement} className="absolute left-0 top-0 w-full" style={{ transform: `translateY(${row.start}px)` }}><Message message={messages[row.index]} wide={wideChat} streaming={streaming && row.index === messages.length - 1} onSelectionAction={messages[row.index].role === 'assistant' ? setSelectionAction : undefined} /></div>)}</div></>}{!autoFollow && <button onClick={() => { setAutoFollow(true); virtualizer.scrollToIndex(messages.length - 1, { align: 'end', behavior: 'smooth' }) }} className="sticky bottom-3 left-1/2 flex h-9 -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-slate-950 to-purple-900 px-3 text-sm font-medium text-white shadow-[0_10px_28px_rgba(76,29,149,0.25)] transition-[transform,box-shadow] duration-300 ease-out  active:scale-[0.97] motion-reduce:transform-none dark:from-white dark:to-purple-100 dark:text-slate-900"><ArrowDown size={16} />Jump to latest</button>}</div>

      <footer className="relative z-20 shrink-0 px-3 pb-3 sm:px-4"><div className={`mx-auto w-full ${wideChat ? 'max-w-5xl' : 'max-w-3xl'} rounded-xl border border-white/40 bg-white/75 p-2 shadow-[0_14px_42px_rgba(76,29,149,0.16)] backdrop-blur-xl transition-[transform,box-shadow,border-color] duration-500 ease-out focus-within:border-purple-300 focus-within:shadow-[0_20px_50px_rgba(76,29,149,0.22)] motion-reduce:transform-none dark:border-white/10 dark:bg-slate-900/75`}>{followUpQuote && <div className="mx-2 mb-1 flex items-start gap-2 rounded-lg bg-purple-50 p-2 text-slate-600 dark:bg-purple-500/10 dark:text-slate-300"><span className="mt-0.5 h-full min-h-8 w-0.5 shrink-0 rounded-full bg-purple-400" /><p className="line-clamp-3 min-w-0 flex-1 whitespace-pre-wrap">{followUpQuote}</p><button onClick={() => setFollowUpQuote('')} aria-label="Remove quote" className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-colors duration-300 hover:bg-purple-100 dark:hover:bg-purple-500/15"><X size={15} /></button></div>}<textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} rows="1" placeholder="Write an idea, question, or challenge…" className="max-h-40 min-h-10 w-full resize-none rounded-lg bg-transparent px-3 py-2 text-sm leading-5 text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100" /><div className="flex items-end justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><div className="w-44"><Listbox value={provider.model} options={models} onChange={(value) => updateProvider('model', value)} disabled={!models.length} placeholder="Select model" compact placement="top" searchable searchPlaceholder="Search models…" /></div><ContextMeter tokens={contextTokens} windowSize={contextWindow} reserve={OUTPUT_RESERVE} percent={contextPercent} remaining={contextRemaining} label={contextLabel} widthClass={contextWidthClass(contextPercent)} /><label className="hidden items-center gap-2 rounded-lg bg-slate-100/70 px-2 py-1.5 text-sm text-slate-500 sm:flex dark:bg-white/5"><span>Creativity</span><input aria-label="Model creativity" type="range" min="0" max="2" step="0.1" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} className="h-1.5 w-16 cursor-pointer appearance-none rounded-full bg-slate-200 accent-purple-600 dark:bg-slate-700" /><span className="w-5 tabular-nums">{temperature.toFixed(1)}</span></label><button type="button" onClick={() => setWideChat((current) => !current)} aria-pressed={wideChat} aria-label={wideChat ? 'Use compact chat width' : 'Use wide chat width'} title={wideChat ? 'Compact chat width' : 'Wide chat width'} className="hidden h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-slate-100/70 text-slate-500 transition-[transform,background-color,color] duration-300 ease-out hover:bg-purple-100 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 active:scale-[0.96] motion-reduce:transform-none sm:flex dark:bg-white/5 dark:text-slate-300 dark:hover:bg-purple-500/15 dark:hover:text-purple-300">{wideChat ? <ArrowsInSimple size={16} /> : <ArrowsOutSimple size={16} />}</button></div>{streaming ? <button onClick={() => abortRef.current?.abort()} className="flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-medium text-white transition-[transform,background-color] duration-300 ease-out hover:bg-slate-800 active:scale-[0.97] motion-reduce:transform-none dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"><Stop size={16} weight="fill" />Stop</button> : <button onClick={send} disabled={!input.trim()} aria-label="Send message" title="Send" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-gradient-to-r from-purple-700 to-purple-500 text-white shadow-[0_8px_22px_rgba(126,34,206,0.24)] transition-opacity duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-40"><PaperPlaneRight size={17} weight="bold" /></button>}</div></div></footer>
    </main>
    <SelectionToolbar selection={selectionAction} onFollowUp={(text) => applySelection(text, false)} onAsk={(text) => applySelection(text, true)} onClose={() => setSelectionAction(null)} />
    <SettingsPanel open={settingsOpen} provider={provider} providers={providerOptions} activeProvider={providerOptions[activeProvider]} models={models} status={status} theme={theme} onThemeChange={setTheme} onProviderChange={changeProvider} onChange={updateProvider} onAdd={() => { setProviders((all) => [...all, { ...blankProvider, name: `Provider ${all.length + 1}` }]); setActiveProvider(providers.length); setModels([]); setStatus({ loading: false, ok: false, message: '' }) }} onClose={() => setSettingsOpen(false)} onLoadModels={loadModels} onSave={() => { try { if (provider.headersText) JSON.parse(provider.headersText); saveState({ theme, providers, activeProvider, models, conversations, activeId, temperature, wideChat }); setStatus({ loading: false, ok: true, message: 'Provider saved in this browser.' }) } catch { setStatus({ loading: false, ok: false, message: 'Additional headers must be valid JSON.' }) } }} onDelete={() => { setProviders([blankProvider]); setActiveProvider(0); setModels([]); setStatus({ loading: false, ok: true, message: 'Provider configuration reset.' }) }} />
  </div>
}
