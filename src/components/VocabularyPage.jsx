import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, Eye, GameController, ListBullets, MagnifyingGlass, Plus, Shuffle, SpinnerGap, SquaresFour, Translate, X } from '@phosphor-icons/react'

export const LANGUAGES = [
  ['es', 'Spanish', 'Spain', 'es'], ['fr', 'French', 'France', 'fr'], ['de', 'German', 'Germany', 'de'],
  ['it', 'Italian', 'Italy', 'it'], ['pt', 'Portuguese', 'Portugal', 'pt'], ['ja', 'Japanese', 'Japan', 'jp'],
  ['ko', 'Korean', 'South Korea', 'kr'], ['zh', 'Mandarin Chinese', 'China', 'cn'], ['ar', 'Arabic', 'Saudi Arabia', 'sa'],
  ['hi', 'Hindi', 'India', 'in'], ['id', 'Indonesian', 'Indonesia', 'id'], ['nl', 'Dutch', 'Netherlands', 'nl'],
  ['ru', 'Russian', 'Russia', 'ru'], ['tr', 'Turkish', 'Türkiye', 'tr'], ['vi', 'Vietnamese', 'Vietnam', 'vn'],
  ['th', 'Thai', 'Thailand', 'th'], ['pl', 'Polish', 'Poland', 'pl'], ['sv', 'Swedish', 'Sweden', 'se'],
  ['el', 'Greek', 'Greece', 'gr'], ['he', 'Hebrew', 'Israel', 'il'], ['uk', 'Ukrainian', 'Ukraine', 'ua'],
  ['en-us', 'English (US)', 'United States', 'us'], ['en-gb', 'English (UK)', 'United Kingdom', 'gb'],
].map(([code, name, country, countryCode]) => ({ code, name, country, countryCode }))

const surface = 'rounded-xl bg-white p-4 shadow-[0_10px_32px_rgba(76,29,149,0.11)] dark:bg-slate-900 dark:shadow-[0_14px_38px_rgba(0,0,0,0.32)]'
const primary = 'flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-700 to-purple-500 px-4 text-sm font-medium text-white shadow-[0_10px_26px_rgba(126,34,206,0.24)] transition-[transform,box-shadow,opacity] duration-300 ease-out hover:shadow-[0_14px_30px_rgba(126,34,206,0.3)] focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transform-none'
const secondary = 'flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-100 px-3 text-sm font-medium text-slate-700 transition-colors duration-300 ease-out hover:bg-purple-100 hover:text-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-purple-500/15'
const input = 'h-10 w-full rounded-lg border border-purple-100 bg-white px-3 text-sm outline-none transition-[border-color,background-color] duration-300 ease-out placeholder:text-slate-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/10 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100'

function Flag({ language, large = false }) {
  const countryCode = language.countryCode || LANGUAGES.find((item) => item.code === language.code)?.countryCode || language.code
  return <img src={`https://flagcdn.com/w80/${countryCode}.png`} alt={`Flag of ${language.country}`} className={`${large ? 'h-12 w-[72px]' : 'h-6 w-9'} rounded-md object-cover shadow-[0_4px_12px_rgba(15,23,42,0.16)]`} />
}

export default function VocabularyPage({ route, languages, onAddLanguage, onOpenLanguage, onBack, onAddWord, onUpdateUserLanguage, providerReady, onExplainWord }) {
  const language = languages.find((item) => item.id === route.languageId)
  if (route.page === 'vocabulary-language' && language) return <Workspace language={language} onBack={onBack} onAddWord={onAddWord} onUpdateUserLanguage={onUpdateUserLanguage} providerReady={providerReady} onExplainWord={onExplainWord} />
  return <Landing languages={languages} onAddLanguage={onAddLanguage} onOpenLanguage={onOpenLanguage} />
}

function Page({ children }) { return <div className="relative min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-5"><div className="mx-auto w-full max-w-5xl">{children}</div></div> }

function Landing({ languages, onAddLanguage, onOpenLanguage }) {
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const [target, setTarget] = useState(null)
  const existingCodes = new Set(languages.map((item) => item.code))
  const source = target ? LANGUAGES : LANGUAGES.filter((item) => !existingCodes.has(item.code))
  const choices = source.filter((item) => `${item.name} ${item.country}`.toLowerCase().includes(query.toLowerCase()))
  const close = () => { setAdding(false); setTarget(null); setQuery('') }
  return <Page>
    <div className="flex items-end justify-between gap-3"><div><span className="text-xs font-medium uppercase tracking-[0.14em] text-purple-600 dark:text-purple-300">My Vocabulary</span><h1 className="mt-1 text-xl font-semibold">Languages</h1><p className="mt-1 text-sm text-slate-500">Build a personal word library and practice it locally.</p></div><button onClick={() => setAdding(true)} className={primary}><Plus size={17} />Add language</button></div>
    {adding && <section aria-label={target ? 'Choose your language' : 'Choose a language to learn'} className={`${surface} mt-4`}><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">{target ? 'Choose your language' : 'Choose a language to learn'}</h2><p className="mt-0.5 text-xs text-slate-500">{target ? `Meanings and explanations for ${target.name} will use this language.` : 'First, select the language whose words you want to learn.'}</p></div><button aria-label="Close language chooser" onClick={close} className={secondary}><X size={16} /></button></div><label className="relative mt-3 block"><span className="sr-only">Search languages or countries</span><MagnifyingGlass className="absolute left-3 top-3 text-slate-400" size={16} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search languages or countries…" className={`${input} pl-9`} /></label><div className="mt-2 grid max-h-72 gap-1 overflow-y-auto sm:grid-cols-2" role="listbox" aria-label="Available languages">{choices.map((item) => <button role="option" aria-selected="false" key={item.code} onClick={() => { if (!target) { setTarget(item); setQuery('') } else { onAddLanguage({ ...target, userLanguage: item }); close() } }} className="flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-300 ease-out hover:bg-purple-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10 dark:hover:bg-purple-500/10"><Flag language={item} /><span><span className="block font-medium">{item.name}</span><span className="text-xs text-slate-500">{item.country}</span></span></button>)}{!choices.length && <p className="col-span-full py-4 text-center text-sm text-slate-500">No matching languages.</p>}</div>{target && <button type="button" onClick={() => { setTarget(null); setQuery('') }} className={`${secondary} mt-3`}><ArrowLeft size={16} />Change target language</button>}</section>}
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{languages.map((item) => <button key={item.id} onClick={() => onOpenLanguage(item)} className={`${surface} group text-left transition-transform duration-300 ease-out hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10 motion-reduce:transform-none`}><Flag language={item} /><h2 className="mt-2 text-base font-semibold">{item.name}</h2><p className="text-xs text-slate-500">{item.country} · {item.words?.length || 0} word{item.words?.length === 1 ? '' : 's'}</p><p className="mt-1 text-xs text-slate-400">Explained in {item.userLanguage?.name || 'Indonesian'}</p><span className="mt-3 flex items-center gap-1 text-sm font-medium text-purple-700 dark:text-purple-300">Open vocabulary<ArrowRight size={15} /></span></button>)}{!languages.length && <div className={`${surface} sm:col-span-2 lg:col-span-3 text-center`}><BookOpen size={30} className="mx-auto text-purple-500" /><p className="mt-2 font-medium">No languages yet</p><p className="mt-1 text-sm text-slate-500">Add a language to start collecting words.</p></div>}</div>
  </Page>
}

function Workspace({ language, onBack, onAddWord, onUpdateUserLanguage, providerReady, onExplainWord }) {
  const [adding, setAdding] = useState(false)
  const [languageSettings, setLanguageSettings] = useState(false)
  const [languageQuery, setLanguageQuery] = useState('')
  const [sort, setSort] = useState('newest')
  const [view, setView] = useState('list')
  const [openWord, setOpenWord] = useState(null)
  const [loadingWord, setLoadingWord] = useState(null)
  const [detailError, setDetailError] = useState('')
  const [practice, setPractice] = useState(false)
  const words = useMemo(() => [...(language.words || [])].sort(sort === 'az' ? (a, b) => a.word.localeCompare(b.word) : (a, b) => (b.addedAt || 0) - (a.addedAt || 0)), [language.words, sort])
  const openDetails = async (item) => {
    setOpenWord(item.id); setDetailError('')
    if (item.translation && item.meaning && item.explanation && item.example) return
    if (!providerReady) { setDetailError('Connect a provider to generate this word’s explanation.'); return }
    setLoadingWord(item.id)
    try { await onExplainWord(language, item) } catch (error) { setDetailError(error.message) } finally { setLoadingWord(null) }
  }
  return <Page>
    <button onClick={onBack} className={secondary}><ArrowLeft size={16} />Languages</button>
    <div className="mt-4 text-center"><div className="flex justify-center"><Flag language={language} large /></div><p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">{language.country}</p><h1 className="mt-1 text-xl font-semibold">{language.name} vocabulary</h1><p className="mt-1 text-xs text-slate-500">{words.length} learned word{words.length === 1 ? '' : 's'} · explanations in {language.userLanguage?.name || 'Indonesian'}</p></div>
    <div className="mt-4 flex flex-wrap justify-center gap-2"><button onClick={() => setLanguageSettings((current) => !current)} className={secondary}><Translate size={17} />Explanation language</button><button onClick={() => setPractice(true)} className={secondary}><GameController size={17} />Practice</button><button onClick={() => setAdding(true)} className={primary}><Plus size={17} />Add word</button></div>
    {languageSettings && <UserLanguageSettings language={language} query={languageQuery} onQueryChange={setLanguageQuery} onSave={(value) => { onUpdateUserLanguage(language.id, value); setLanguageSettings(false); setLanguageQuery(''); setOpenWord(null) }} onClose={() => { setLanguageSettings(false); setLanguageQuery('') }} />}
    {adding && <WordForm onCancel={() => setAdding(false)} onSave={(word) => onAddWord(language.id, word)} />}
    {practice && <Practice words={words} language={language} onClose={() => setPractice(false)} />}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Learned words</h2><div className="flex items-center gap-2"><div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800" aria-label="Sort words">{[['newest', 'Newest'], ['az', 'A–Z']].map(([value, label]) => <button key={value} onClick={() => setSort(value)} aria-pressed={sort === value} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-[background-color,color,box-shadow] duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10 ${sort === value ? 'bg-white text-purple-700 shadow-[0_4px_12px_rgba(76,29,149,0.12)] dark:bg-slate-700 dark:text-purple-300' : 'text-slate-500'}`}>{label}</button>)}</div><div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800" aria-label="Vocabulary view">{[['list', 'List view'], ['wrap', 'Wrapped view']].map(([value, label]) => <button key={value} onClick={() => { setView(value); setOpenWord(null) }} aria-label={label} aria-pressed={view === value} className={`flex h-7 w-8 items-center justify-center rounded-md transition-[background-color,color,box-shadow] duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10 ${view === value ? 'bg-white text-purple-700 shadow-[0_4px_12px_rgba(76,29,149,0.12)] dark:bg-slate-700 dark:text-purple-300' : 'text-slate-500'}`}>{value === 'list' ? <ListBullets size={15} /> : <SquaresFour size={15} />}</button>)}</div></div></div>
    <div className={`${surface} mt-2 ${view === 'list' ? 'divide-y divide-slate-100 dark:divide-slate-800' : 'flex flex-wrap gap-2'}`}>{words.map((item) => <button key={item.id} onClick={() => openDetails(item)} className={`${view === 'list' ? 'w-full px-2 py-3' : 'w-auto bg-purple-50 px-3 py-2 dark:bg-purple-500/10'} rounded-lg text-left transition-colors duration-300 ease-out hover:bg-purple-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10 dark:hover:bg-purple-500/10`}><span className="flex items-center justify-between gap-3"><strong>{item.word}</strong>{loadingWord === item.id ? <SpinnerGap size={16} className="animate-spin text-purple-500" /> : <Eye size={16} className="text-purple-500" />}</span></button>)}{!words.length && <p className="w-full py-4 text-center text-sm text-slate-500">Add your first word to begin.</p>}</div>
    {openWord && <WordDetailModal word={words.find((item) => item.id === openWord)} loading={loadingWord === openWord} error={detailError} providerReady={providerReady} onClose={() => { setOpenWord(null); setDetailError('') }} />}
  </Page>
}

function Detail({ label, value }) { return <div><span className="block text-xs font-medium uppercase tracking-wide text-purple-600 dark:text-purple-300">{label}</span><p className="mt-0.5 text-sm leading-5 text-slate-700 dark:text-slate-200">{value}</p></div> }

function WordDetailModal({ word, loading, error, providerReady, onClose }) {
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])
  if (!word) return null
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section role="dialog" aria-modal="true" aria-labelledby="word-detail-title" className="max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-4 shadow-[0_20px_55px_rgba(15,23,42,0.24)] dark:bg-slate-900 dark:shadow-[0_20px_55px_rgba(0,0,0,0.48)]"><header className="relative text-center"><span className="text-xs font-medium uppercase tracking-[0.14em] text-purple-600 dark:text-purple-300">Word details</span><h2 id="word-detail-title" className="mt-0.5 text-xl font-semibold">{word.word}</h2><button type="button" onClick={onClose} aria-label="Close word details" className={`${secondary} absolute right-0 top-0 w-10 px-0`}><X size={16} /></button></header>{loading && <div role="status" className="mt-4 flex items-center gap-2 rounded-lg bg-purple-50 p-3 text-sm text-purple-900 dark:bg-purple-500/10 dark:text-purple-200"><SpinnerGap size={17} className="animate-spin" />Generating details…</div>}{error && <div role="alert" className="mt-4 rounded-lg bg-purple-50 p-3 text-sm text-purple-900 dark:bg-purple-500/10 dark:text-purple-200">{error}{!providerReady && <span className="ml-1">Open Provider & model from the sidebar settings.</span>}</div>}<div className="mt-5 space-y-5">{word.translation && <Detail label="Translation" value={word.translation} />}{word.meaning && <Detail label="Meaning" value={word.meaning} />}{word.explanation && <Detail label="Explanation" value={word.explanation} />}{word.example && <Detail label="Example" value={word.example} />}</div>{!loading && !error && !word.translation && <p className="mt-4 text-sm text-slate-500">No details available.</p>}</section></div>
}

function UserLanguageSettings({ language, query, onQueryChange, onSave, onClose }) {
  const choices = LANGUAGES.filter((item) => `${item.name} ${item.country}`.toLowerCase().includes(query.toLowerCase()))
  return <section className={`${surface} mt-4`} aria-label="Explanation language settings"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Explanation language</h2><p className="mt-0.5 text-xs text-slate-500">Currently {language.userLanguage?.name || 'Indonesian'}. Changing it will regenerate word details when opened.</p></div><button type="button" onClick={onClose} aria-label="Close language settings" className={secondary}><X size={16} /></button></div><label className="relative mt-3 block"><span className="sr-only">Search your language</span><MagnifyingGlass className="absolute left-3 top-3 text-slate-400" size={16} /><input autoFocus value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search your language…" className={`${input} pl-9`} /></label><div className="mt-2 grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2" role="listbox" aria-label="Explanation languages">{choices.map((item) => <button type="button" role="option" aria-selected={language.userLanguage?.code === item.code} key={item.code} onClick={() => onSave(item)} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-300 ease-out hover:bg-purple-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10 dark:hover:bg-purple-500/10 ${language.userLanguage?.code === item.code ? 'bg-purple-100 text-purple-900 dark:bg-purple-500/15 dark:text-purple-100' : ''}`}><Flag language={item} /><span><span className="block font-medium">{item.name}</span><span className="text-xs text-slate-500">{item.country}</span></span></button>)}</div></section>
}

function WordForm({ onCancel, onSave }) {
  const [word, setWord] = useState('')
  return <form onSubmit={(event) => { event.preventDefault(); const value = word.trim(); if (value) { onSave({ word: value, id: crypto.randomUUID(), addedAt: Date.now() }); setWord('') } }} className={`${surface} mt-4`}><h2 className="font-semibold">Add a learned word</h2><label className="mt-3 block"><span className="mb-1 block text-sm font-medium">Word</span><input autoFocus required value={word} onChange={(event) => setWord(event.target.value)} placeholder="Type a word…" className={input} /></label><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onCancel} className={secondary}>Cancel</button><button disabled={!word.trim()} className={primary}><Check size={16} />Save word</button></div></form>
}

const MODES = [
  { value: 'reverse', label: 'Translate', description: 'Your language to target' },
  { value: 'random', label: 'Mixed', description: 'A rotating challenge' },
  { value: 'missing', label: 'Missing word', description: 'Complete the sentence' },
  { value: 'sentence', label: 'Write', description: 'Create your own sentence' },
  { value: 'translate', label: 'Recall', description: 'Translate into target' },
]

function PracticeModeIcon({ mode }) {
  if (mode === 'random') return <Shuffle size={17} />
  if (mode === 'missing') return <BookOpen size={17} />
  if (mode === 'sentence') return <Check size={17} />
  return <Translate size={17} />
}

function Practice({ words, language, onClose }) {
  const [mode, setMode] = useState('reverse')
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [revealed, setRevealed] = useState(false)
  const randomModes = ['reverse', 'missing', 'sentence']
  const actualMode = mode === 'random' ? randomModes[index % randomModes.length] : mode
  const eligible = actualMode === 'missing' ? words.filter((word) => word.example && word.example.toLowerCase().includes(word.word.toLowerCase())) : actualMode === 'sentence' ? words : words.filter((word) => word.translation)
  const word = eligible[index % Math.max(eligible.length, 1)]
  const prompt = word && (actualMode === 'reverse' || actualMode === 'translate' ? `Translate “${word.translation}” from ${language.userLanguage?.name || 'your language'} into ${language.name}.` : actualMode === 'missing' ? word.example.replace(new RegExp(word.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '_____') : `Write a sentence using “${word.word}”.`)
  const expected = word && (actualMode === 'missing' || actualMode === 'reverse' || actualMode === 'translate' ? word.word : '')
  const correct = expected && answer.trim().localeCompare(expected.trim(), undefined, { sensitivity: 'accent' }) === 0
  const next = () => { setIndex((value) => value + 1); setAnswer(''); setRevealed(false) }
  const resetMode = (value) => { setMode(value); setIndex(0); setAnswer(''); setRevealed(false) }
  const emptyMessage = actualMode === 'missing' ? 'Open a word first to generate an example sentence for this mode.' : actualMode === 'sentence' ? 'Add at least one vocabulary word before starting practice.' : 'Open a word first to generate its explanation and translation.'

  return <section className="mt-4 overflow-hidden rounded-xl bg-white shadow-[0_12px_38px_rgba(76,29,149,0.14)] dark:bg-slate-900 dark:shadow-[0_16px_42px_rgba(0,0,0,0.38)]" aria-label="Vocabulary practice">
    <header className="flex items-center gap-3 px-4 py-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"><GameController size={18} weight="fill" /></span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="text-base font-semibold">Practice</h2><span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-500/15 dark:text-purple-300">{language.name}</span></div><p className="mt-0.5 text-xs text-slate-500">Choose a challenge, then work through your saved words.</p></div><button onClick={onClose} aria-label="Close practice" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors duration-300 ease-out hover:bg-purple-100 hover:text-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-purple-500/15 dark:hover:text-purple-200"><X size={16} /></button></header>
    <div className="bg-slate-50/80 px-4 py-3 dark:bg-slate-950/55"><div role="radiogroup" aria-label="Practice mode" className="grid grid-cols-2 gap-2 md:grid-cols-5">{MODES.map((item) => { const selected = mode === item.value; return <button type="button" role="radio" aria-checked={selected} key={item.value} onClick={() => resetMode(item.value)} className={`group flex min-h-16 items-start gap-2 rounded-lg px-3 py-2.5 text-left transition-[background-color,color,box-shadow,transform] duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10 active:scale-[0.98] motion-reduce:transform-none ${selected ? 'bg-gradient-to-br from-purple-700 to-purple-500 text-white shadow-[0_8px_22px_rgba(126,34,206,0.24)]' : 'bg-white text-slate-700 shadow-[0_4px_14px_rgba(15,23,42,0.08)] hover:bg-purple-50 hover:text-purple-800 dark:bg-slate-800 dark:text-slate-200 dark:shadow-[0_5px_16px_rgba(0,0,0,0.24)] dark:hover:bg-purple-500/15 dark:hover:text-purple-200'}`}><span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${selected ? 'bg-white/15 text-white' : 'bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300'}`}><PracticeModeIcon mode={item.value} /></span><span className="min-w-0"><span className="block text-[13px] font-semibold leading-[18px]">{item.label}</span><span className={`mt-0.5 block text-xs leading-4 ${selected ? 'text-purple-100' : 'text-slate-500 dark:text-slate-400'}`}>{item.description}</span></span></button> })}</div></div>
    <div className="p-4">{!eligible.length ? <div role="status" className="flex items-start gap-3 rounded-lg bg-purple-50 p-3 text-sm text-purple-900 dark:bg-purple-500/10 dark:text-purple-200"><BookOpen size={18} className="mt-0.5 shrink-0" /><div><p className="font-medium">This mode is not ready yet</p><p className="mt-0.5 text-xs leading-4 opacity-80">{emptyMessage}</p></div></div> : <div><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.12em] text-purple-600 dark:text-purple-300">{mode === 'random' ? <Shuffle size={16} /> : <PracticeModeIcon mode={actualMode} />}Prompt {index + 1}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">{MODES.find((item) => item.value === actualMode)?.label}</span></div><p className="mt-2 text-base font-medium leading-6">{prompt}</p><label className="mt-3 block"><span className="sr-only">Your answer</span><textarea value={answer} onChange={(event) => { setAnswer(event.target.value); setRevealed(false) }} rows="2" placeholder="Type your answer…" className={`${input} h-auto min-h-20 resize-none py-2`} /></label><div className="mt-3 flex flex-wrap gap-2"><button disabled={!answer.trim()} onClick={() => setRevealed(true)} className={primary}>{actualMode === 'sentence' ? 'Review answer' : 'Check answer'}</button><button onClick={() => setRevealed(true)} className={secondary}>Reveal</button>{revealed && <button onClick={next} className={secondary}>Next<ArrowRight size={15} /></button>}</div>{revealed && <div role="status" className="mt-3 rounded-lg bg-purple-50 p-3 text-sm text-purple-900 dark:bg-purple-500/10 dark:text-purple-200">{actualMode === 'sentence' ? <><strong>Self-review:</strong> Does your sentence use “{word.word}” naturally?{word.example && <span className="mt-1 block">Example: {word.example}</span>}</> : <><strong>{correct ? 'Correct!' : 'Suggested answer:'}</strong> {!correct && expected}</>}</div>}</div>}</div>
  </section>
}
