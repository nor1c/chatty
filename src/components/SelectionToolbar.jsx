import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CaretDown, ChatCircleDots, Check, MagnifyingGlass, Plus, SpeakerHigh, UserSound, X } from '@phosphor-icons/react'
import { matchingVoices, PRONUNCIATION_LANGUAGES, speakWord, VOICE_PREVIEW_TEXT } from '../lib/pronunciation'

function Flag({ language }) {
  return <img src={`https://flagcdn.com/w40/${language.countryCode}.png`} alt="" className="h-4 w-6 shrink-0 rounded-sm object-cover shadow-[0_2px_6px_rgba(15,23,42,0.18)]" />
}

function VoicePicker({ language, voiceURI, onChange, onClose }) {
  const [voices, setVoices] = useState([])
  const [query, setQuery] = useState('')
  const [previewing, setPreviewing] = useState('')
  const searchRef = useRef(null)

  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis?.getVoices?.() || [])
    const closeWithEscape = (event) => { if (event.key === 'Escape') onClose() }
    load()
    window.speechSynthesis?.addEventListener?.('voiceschanged', load)
    window.addEventListener('keydown', closeWithEscape)
    requestAnimationFrame(() => searchRef.current?.focus())
    return () => { window.speechSynthesis?.removeEventListener?.('voiceschanged', load); window.removeEventListener('keydown', closeWithEscape); window.speechSynthesis?.cancel() }
  }, [onClose])

  const available = useMemo(() => matchingVoices(voices, language.code), [voices, language.code])
  const filtered = available.filter((voice) => `${voice.name} ${voice.lang} ${voice.localService ? 'local' : 'online'}`.toLowerCase().includes(query.trim().toLowerCase()))
  const preview = (voice) => {
    speakWord({
      text: VOICE_PREVIEW_TEXT[language.code] || VOICE_PREVIEW_TEXT['en-us'],
      languageCode: language.code,
      voiceURI: voice.voiceURI,
      onStart: () => setPreviewing(voice.voiceURI),
      onEnd: () => setPreviewing(''),
      onError: () => setPreviewing(''),
    })
  }

  return <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }} className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 px-3 py-3 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-labelledby="voice-picker-title" className="flex max-h-[min(36rem,calc(100dvh-24px))] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.24)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
      <div className="flex items-start gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"><UserSound size={17} /></div><div className="min-w-0 flex-1"><h2 id="voice-picker-title" className="text-base font-semibold">Choose a voice</h2><p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500"><Flag language={language} />{language.name} · {available.length} available</p></div><button type="button" onClick={onClose} aria-label="Close voice picker" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors duration-300 ease-out hover:bg-slate-100 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:hover:bg-slate-800 dark:hover:text-purple-300"><X size={17} /></button></div>
      <label className="relative mt-3 block"><span className="sr-only">Quick search voices</span><MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Quick search voices…" className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition-colors duration-300 ease-out placeholder:text-slate-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /></label>
      <div className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto" role="listbox" aria-label={`${language.name} voices`}>{filtered.map((voice) => <div key={voice.voiceURI} className={`flex items-center gap-2 rounded-lg p-1 transition-colors duration-300 ease-out ${voice.voiceURI === voiceURI ? 'bg-purple-50 dark:bg-purple-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}><button type="button" role="option" aria-selected={voice.voiceURI === voiceURI} onClick={() => onChange(voice.voiceURI)} className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left focus:outline-none focus:ring-2 focus:ring-purple-500/10"><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-700 dark:text-slate-200">{voice.name}</span><span className="block text-xs text-slate-500">{voice.lang} · {voice.localService ? 'On device' : 'Online'}</span></span>{voice.voiceURI === voiceURI && <Check size={16} className="shrink-0 text-purple-600 dark:text-purple-300" />}</button><button type="button" onClick={() => preview(voice)} aria-label={`Preview ${voice.name}`} className="flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium text-purple-700 transition-colors duration-300 ease-out hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:text-purple-300 dark:hover:bg-purple-500/15"><SpeakerHigh size={15} />{previewing === voice.voiceURI ? 'Playing' : 'Preview'}</button></div>)}{!filtered.length && <p className="py-4 text-center text-sm text-slate-500">{available.length ? 'No matching voices.' : 'No voice for this language is installed in this browser.'}</p>}</div>
    </section>
  </div>
}

export default function SelectionToolbar({ selection, chatActions = false, languageCode, voiceURI, onLanguageChange, onVoiceChange, onPronounce, onFollowUp, onAsk, onClose }) {
  const toolbarRef = useRef(null)
  const [languagesOpen, setLanguagesOpen] = useState(false)
  const [voicePickerOpen, setVoicePickerOpen] = useState(false)
  const [languageQuery, setLanguageQuery] = useState('')
  const language = PRONUNCIATION_LANGUAGES.find((item) => item.code === languageCode) || PRONUNCIATION_LANGUAGES.at(-2)
  const filteredLanguages = PRONUNCIATION_LANGUAGES.filter((item) => `${item.name} ${item.country}`.toLowerCase().includes(languageQuery.trim().toLowerCase()))

  useEffect(() => {
    if (!selection || !toolbarRef.current || voicePickerOpen) return undefined
    toolbarRef.current.style.left = `${selection.x}px`
    toolbarRef.current.style.top = `${selection.y}px`
    const close = (event) => { if (!toolbarRef.current?.contains(event.target)) onClose() }
    const escape = (event) => { if (event.key === 'Escape') languagesOpen ? setLanguagesOpen(false) : onClose() }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape) }
  }, [selection, languagesOpen, voicePickerOpen, onClose])

  useEffect(() => { if (!selection) { setLanguagesOpen(false); setVoicePickerOpen(false) } }, [selection])
  if (!selection) return null

  return <div ref={toolbarRef} data-selection-toolbar role="toolbar" aria-label="Actions for selected text" className="fixed z-[65] flex max-w-[calc(100vw-16px)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-[0_14px_35px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900">
    {chatActions && <><button type="button" onClick={() => onFollowUp(selection.text)} className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm text-slate-700 transition-colors duration-300 ease-out hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:text-slate-200 dark:hover:bg-purple-500/10"><Plus size={15} />Add follow-up</button><button type="button" onClick={() => onAsk(selection.text)} className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm text-slate-700 transition-colors duration-300 ease-out hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:text-slate-200 dark:hover:bg-purple-500/10"><ChatCircleDots size={15} />Quick ask</button><span aria-hidden="true" className="h-5 w-px bg-slate-200 dark:bg-slate-700" /></>}
    <button type="button" onClick={() => onPronounce(selection.text)} className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm text-slate-700 transition-colors duration-300 ease-out hover:bg-purple-50 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:text-slate-200 dark:hover:bg-purple-500/10 dark:hover:text-purple-300"><SpeakerHigh size={15} />Pronounce</button>
    <button type="button" onClick={() => setVoicePickerOpen(true)} className="flex h-8 max-w-28 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-purple-700 transition-colors duration-300 ease-out hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:text-purple-300 dark:hover:bg-purple-500/10"><UserSound size={15} /><span className="truncate">Voice</span></button>
    <div className="relative">
      <button type="button" aria-haspopup="listbox" aria-expanded={languagesOpen} aria-label={`Pronunciation language: ${language.name}`} title={language.name} onClick={() => setLanguagesOpen((open) => !open)} className="flex h-8 max-w-36 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs font-medium text-purple-700 transition-colors duration-300 ease-out hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:text-purple-300 dark:hover:bg-purple-500/10"><Flag language={language} /><span className="truncate">{language.name}</span><CaretDown size={13} className={`shrink-0 transition-transform duration-300 ${languagesOpen ? 'rotate-180' : ''}`} /></button>
      {languagesOpen && <div className="absolute bottom-full right-0 mb-1 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-[0_14px_35px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900"><label className="relative block p-1"><span className="sr-only">Quick search languages</span><MagnifyingGlass size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input autoFocus type="search" value={languageQuery} onChange={(event) => setLanguageQuery(event.target.value)} placeholder="Quick search…" className="h-9 w-full rounded-md border border-slate-200 bg-white pl-8 pr-2 text-sm outline-none transition-colors duration-300 ease-out focus:border-purple-400 focus:ring-2 focus:ring-purple-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /></label><div role="listbox" aria-label="Pronunciation language" className="max-h-64 overflow-y-auto">{filteredLanguages.map((item) => <button type="button" role="option" aria-selected={item.code === language.code} key={item.code} onClick={() => { onLanguageChange(item.code); setLanguagesOpen(false); setLanguageQuery('') }} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-700 transition-colors duration-300 ease-out hover:bg-purple-50 focus:bg-purple-50 focus:outline-none dark:text-slate-200 dark:hover:bg-purple-500/10 dark:focus:bg-purple-500/10"><Flag language={item} /><span className="min-w-0 flex-1"><span className="block truncate">{item.name}</span><span className="block truncate text-xs text-slate-500">{item.country}</span></span>{item.code === language.code && <Check size={15} className="shrink-0 text-purple-600 dark:text-purple-300" />}</button>)}{!filteredLanguages.length && <p className="px-3 py-4 text-center text-sm text-slate-500">No matching languages.</p>}</div></div>}
    </div>
    {voicePickerOpen && createPortal(<VoicePicker language={language} voiceURI={voiceURI} onChange={(value) => { onVoiceChange(value); setVoicePickerOpen(false) }} onClose={() => setVoicePickerOpen(false)} />, document.body)}
  </div>
}
