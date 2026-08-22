import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowRight, BookOpen, CaretDown, Check, CloudRain, GameController, GearSix, Heart, ListBullets, MagnifyingGlass, Plus, Shuffle, Sparkle, SpeakerHigh, SpinnerGap, SquaresFour, Trash, Translate, X } from '@phosphor-icons/react'
import { matchingVoices, pronunciationLocale, speakWord } from '../lib/pronunciation'
import { splitGrammarTerms } from '../lib/grammarTerms'
import { VOCABULARY_LEVELS, vocabularyLevel } from '../lib/vocabulary'
import { RAIN_DIRECTIONS, RAIN_DURATIONS, shuffleRainDeck } from '../lib/wordRain'
import WordRainGame from './WordRainGame'

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
const secondaryActive = '!bg-purple-700 !text-white hover:!bg-purple-600 hover:!text-white dark:!bg-purple-500 dark:!text-white dark:hover:!bg-purple-400'
const input = 'h-10 w-full rounded-lg border border-purple-100 bg-white px-3 text-sm outline-none transition-[border-color,background-color] duration-300 ease-out placeholder:text-slate-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/10 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100'

function Flag({ language, large = false }) {
  const countryCode = language.countryCode || LANGUAGES.find((item) => item.code === language.code)?.countryCode || language.code
  return <img src={`https://flagcdn.com/w80/${countryCode}.png`} alt={`Flag of ${language.country}`} className={`${large ? 'h-12 w-[72px]' : 'h-6 w-9'} rounded-md object-cover shadow-[0_4px_12px_rgba(15,23,42,0.16)]`} />
}

export default function VocabularyPage({ route, languages, onAddLanguage, onDeleteLanguage, onOpenLanguage, onOpenPractice, onBack, onAddWord, onDeleteWord, onUpdateUserLanguage, onUpdatePronunciation, providerReady, onExplainWord, onClassifyWords, onGeneratePractice }) {
  const language = languages.find((item) => item.id === route.languageId)
  if (route.page === 'vocabulary-practice' && language) return <PracticePage language={language} providerReady={providerReady} onGenerate={onGeneratePractice} onBack={() => onOpenLanguage(language)} />
  if (route.page === 'vocabulary-language' && language) return <Workspace language={language} onBack={onBack} onDeleteLanguage={onDeleteLanguage} onOpenPractice={onOpenPractice} onAddWord={onAddWord} onDeleteWord={onDeleteWord} onUpdateUserLanguage={onUpdateUserLanguage} onUpdatePronunciation={onUpdatePronunciation} providerReady={providerReady} onExplainWord={onExplainWord} onClassifyWords={onClassifyWords} />
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
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{languages.map((item) => <button key={item.id} onClick={() => onOpenLanguage(item)} className={`${surface} group text-left transition-transform duration-300 ease-out hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10 motion-reduce:transform-none`}><Flag language={item} /><h2 className="mt-2 text-base font-semibold">{item.name}</h2><p className="text-xs text-slate-500">{item.country} · {item.words?.length || 0} word{item.words?.length === 1 ? '' : 's'}</p><p className="mt-1 text-xs text-slate-400">Explained in {item.userLanguage?.name || 'English'}</p><span className="mt-3 flex items-center gap-1 text-sm font-medium text-purple-700 dark:text-purple-300">Open vocabulary<ArrowRight size={15} /></span></button>)}{!languages.length && <div className={`${surface} sm:col-span-2 lg:col-span-3 text-center`}><BookOpen size={30} className="mx-auto text-purple-500" /><p className="mt-2 font-medium">No languages yet</p><p className="mt-1 text-sm text-slate-500">Add a language to start collecting words.</p></div>}</div>
  </Page>
}

const readablePronunciation = (value) => String(value || '')
  .replace(/[/[\]]/g, '')
  .replace(/tʃ/g, 'ch').replace(/dʒ/g, 'j').replace(/ʃ/g, 'sh').replace(/ʒ/g, 'zh').replace(/θ/g, 'th').replace(/ð/g, 'dh')
  .replace(/[əɜɐʌ]/g, 'e').replace(/[ɛæ]/g, 'e').replace(/[ɪ]/g, 'i').replace(/[ʊ]/g, 'u').replace(/[ɔɒ]/g, 'o')
  .replace(/ŋ/g, 'ng').replace(/ɲ/g, 'ny').replace(/ɾ/g, 'r').replace(/ʔ/g, '').replace(/[ˈˌː]/g, '')
  .replace(/\s+/g, ' ').trim()

function Workspace({ language, onBack, onDeleteLanguage, onOpenPractice, onAddWord, onDeleteWord, onUpdateUserLanguage, onUpdatePronunciation, providerReady, onExplainWord, onClassifyWords }) {
  const [activePanel, setActivePanel] = useState(null)
  const [sort, setSort] = useState('newest')
  const [view, setView] = useState('wrap')
  const [openWord, setOpenWord] = useState(null)
  const [loadingWord, setLoadingWord] = useState(null)
  const [detailError, setDetailError] = useState('')
  const [classifying, setClassifying] = useState(false)
  const [classificationError, setClassificationError] = useState('')
  const classificationInFlightRef = useRef(false)
  const pronunciation = usePronunciation(language)
  const allWords = useMemo(() => language.words || [], [language.words])
  const words = useMemo(() => [...allWords].sort(sort === 'az' ? (a, b) => a.word.localeCompare(b.word) : (a, b) => (b.addedAt || 0) - (a.addedAt || 0)), [allWords, sort])
  const unclassifiedWords = useMemo(() => allWords.filter((word) => !vocabularyLevel(word.level)), [allWords])
  const groupedWords = useMemo(() => VOCABULARY_LEVELS.map((level) => ({ ...level, words: allWords.filter((word) => word.level === level.value).sort((a, b) => a.word.localeCompare(b.word)) })).filter((group) => group.words.length), [allWords])
  const classify = async () => {
    if (!providerReady || !unclassifiedWords.length || classificationInFlightRef.current) return
    classificationInFlightRef.current = true
    setClassifying(true); setClassificationError('')
    try { await onClassifyWords(language, unclassifiedWords); setSort('levels') } catch (error) { setClassificationError(error.message || 'Could not classify the vocabulary levels.') } finally { classificationInFlightRef.current = false; setClassifying(false) }
  }
  const openDetails = async (item) => {
    setOpenWord(item.id); setDetailError('')
    if (item.translation && item.meaning && item.explanation && item.example && item.pronunciation) return
    if (!providerReady) { setDetailError('Connect a provider to generate this word’s explanation.'); return }
    setLoadingWord(item.id)
    try { await onExplainWord(language, item) } catch (error) { setDetailError(error.message) } finally { setLoadingWord(null) }
  }
  return <Page>
    <div className="flex items-center justify-between gap-2"><button onClick={onBack} className={secondary}><ArrowLeft size={16} />Languages</button><button type="button" onClick={() => onDeleteLanguage(language.id)} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-red-50 px-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"><Trash size={17} />Delete language</button></div>
    <div className="mt-4 text-center"><div className="flex justify-center"><Flag language={language} large /></div><p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">{language.country}</p><h1 className="mt-1 text-xl font-semibold">{language.name} vocabulary</h1><p className="mt-1 text-xs text-slate-500">{allWords.length} learned word{allWords.length === 1 ? '' : 's'} · explanations in {language.userLanguage?.name || 'English'}</p></div>
    <div className="mt-4 flex flex-wrap justify-center gap-2"><button type="button" aria-pressed={activePanel === 'add'} onClick={() => setActivePanel((current) => current === 'add' ? null : 'add')} className={`${secondary} ${activePanel === 'add' ? secondaryActive : ''}`}><Plus size={17} />Add word</button><button type="button" aria-pressed={activePanel === 'pronounce'} onClick={() => { pronunciation.stop(); setActivePanel((current) => current === 'pronounce' ? null : 'pronounce') }} className={`${secondary} ${activePanel === 'pronounce' ? secondaryActive : ''}`}><SpeakerHigh size={17} />Pronounce</button><button type="button" onClick={() => { pronunciation.stop(); onOpenPractice(language) }} className={secondary}><GameController size={17} />Practice</button><button type="button" onClick={classify} disabled={!providerReady || !unclassifiedWords.length || classifying} title={!providerReady ? 'Connect a provider first' : !unclassifiedWords.length ? 'All words already have a level' : `Classify ${unclassifiedWords.length} uncategorized words`} className={secondary}>{classifying ? <SpinnerGap size={17} className="animate-spin" /> : <Sparkle size={17} />}{classifying ? 'Categorizing…' : 'Smart AI Categorize'}</button><button type="button" aria-pressed={activePanel === 'settings'} onClick={() => setActivePanel((current) => current === 'settings' ? null : 'settings')} className={`${secondary} ${activePanel === 'settings' ? secondaryActive : ''}`}><GearSix size={17} />Settings</button></div>
    {activePanel === 'add' && <WordForm existingWords={allWords} onCancel={() => setActivePanel(null)} onSave={(word) => onAddWord(language.id, word)} />}
    {activePanel === 'pronounce' && <PronouncePanel language={language} pronunciation={pronunciation} onClose={() => { pronunciation.stop(); setActivePanel(null) }} />}
    {activePanel === 'settings' && <VocabularySettings language={language} voices={pronunciation.voices} supported={pronunciation.supported} error={pronunciation.error} onSpeak={pronunciation.speak} onSaveLanguage={(value) => { onUpdateUserLanguage(language.id, value); setOpenWord(null) }} onSavePronunciation={(settings) => onUpdatePronunciation(language.id, settings)} onClose={() => { pronunciation.stop(); setActivePanel(null) }} />}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">Learned words</h2>{classifying && <p role="status" className="mt-0.5 flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-300"><SpinnerGap size={13} className="animate-spin" />AI is classifying {unclassifiedWords.length} uncategorized word{unclassifiedWords.length === 1 ? '' : 's'} for {language.name}…</p>}{classificationError && <p role="alert" className="mt-0.5 text-xs text-purple-700 dark:text-purple-300">{classificationError} <button type="button" onClick={classify} className="font-semibold underline transition-colors duration-300 ease-out hover:text-purple-500">Retry</button></p>}{unclassifiedWords.length > 0 && !classifying && !classificationError && <p className="mt-0.5 text-xs text-slate-500">{unclassifiedWords.length} word{unclassifiedWords.length === 1 ? '' : 's'} without a level.</p>}</div><div className="flex flex-wrap items-center justify-end gap-2"><div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800" aria-label="Arrange words">{[['newest', 'Newest'], ['az', 'A–Z'], ['levels', 'Levels']].map(([value, label]) => <button key={value} onClick={() => { setSort(value); setOpenWord(null) }} aria-pressed={sort === value} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-[background-color,color,box-shadow] duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10 ${sort === value ? 'bg-purple-700 text-white shadow-[0_4px_12px_rgba(126,34,206,0.24)] dark:bg-purple-500 dark:text-white' : 'text-slate-500'}`}>{label}</button>)}</div>{sort !== 'levels' && <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800" aria-label="Vocabulary view">{[['list', 'List view'], ['wrap', 'Wrapped view']].map(([value, label]) => <button key={value} onClick={() => { setView(value); setOpenWord(null) }} aria-label={label} aria-pressed={view === value} className={`flex h-7 w-8 items-center justify-center rounded-md transition-[background-color,color,box-shadow] duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10 ${view === value ? 'bg-purple-700 text-white shadow-[0_4px_12px_rgba(126,34,206,0.24)] dark:bg-purple-500 dark:text-white' : 'text-slate-500'}`}>{value === 'list' ? <ListBullets size={15} /> : <SquaresFour size={15} />}</button>)}</div>}</div></div>
    {sort === 'levels' ? <LevelGroups groups={groupedWords} unclassifiedWords={unclassifiedWords} onOpen={openDetails} onSpeak={pronunciation.speak} pronunciationSupported={pronunciation.supported} onDelete={(item) => { pronunciation.stop(); setOpenWord(null); onDeleteWord(language.id, item.id) }} /> : <WordCollection words={words} view={view} onOpen={openDetails} onSpeak={pronunciation.speak} pronunciationSupported={pronunciation.supported} onDelete={(item) => { pronunciation.stop(); setOpenWord(null); onDeleteWord(language.id, item.id) }} />}
    {openWord && <WordDetailModal word={allWords.find((item) => item.id === openWord)} loading={loadingWord === openWord} error={detailError} providerReady={providerReady} pronunciation={pronunciation} onClose={() => { pronunciation.stop(); setOpenWord(null); setDetailError('') }} />}
  </Page>
}

function usePronunciation(language) {
  const [voices, setVoices] = useState([])
  const [error, setError] = useState('')
  const generationRef = useRef(0)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
  useEffect(() => {
    if (!supported) return undefined
    const load = () => setVoices(window.speechSynthesis.getVoices())
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => { generationRef.current += 1; window.speechSynthesis.removeEventListener('voiceschanged', load); window.speechSynthesis.cancel() }
  }, [supported])
  const stop = () => { generationRef.current += 1; if (supported) window.speechSynthesis.cancel() }
  const speak = (text, rateOverride) => {
    const generation = generationRef.current + 1
    generationRef.current = generation
    setError('')
    try { speakWord({ text, languageCode: language.code, voiceURI: language.pronunciation?.voiceURI, rate: rateOverride ?? language.pronunciation?.rate ?? 1, onError: (cause) => { if (generationRef.current === generation && cause.message !== 'Pronunciation stopped.') setError(cause.message) } }) }
    catch (cause) { if (generationRef.current === generation) setError(cause.message) }
  }
  return { supported, voices, error, speak, stop }
}

function PronunciationSettings({ language, voices, supported, error, onSpeak, onSave }) {
  const available = matchingVoices(voices, language.code)
  const selectedVoice = language.pronunciation?.voiceURI || available[0]?.voiceURI || ''
  const rate = language.pronunciation?.rate ?? 1
  return <section className="mt-4" aria-label="Pronunciation settings"><div><h3 className="font-semibold">Pronunciation</h3><p className="mt-0.5 text-xs text-slate-500">Browser voice for {language.name} · {pronunciationLocale(language.code)}</p></div>{!supported ? <p role="alert" className="mt-3 rounded-lg bg-purple-50 p-3 text-sm text-purple-900 dark:bg-purple-500/10 dark:text-purple-200">Pronunciation is not supported by this browser.</p> : <><div className="mt-3"><p className="mb-1 text-[13px] font-medium">Voice</p><div className="grid gap-2 sm:grid-cols-2">{available.map((voice) => <button type="button" key={voice.voiceURI} aria-pressed={selectedVoice === voice.voiceURI} onClick={() => onSave({ voiceURI: voice.voiceURI })} className={`rounded-lg px-3 py-2 text-left text-sm transition-colors duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10 ${selectedVoice === voice.voiceURI ? 'bg-purple-100 text-purple-900 dark:bg-purple-500/20 dark:text-purple-100' : 'bg-slate-100 hover:bg-purple-50 dark:bg-slate-800 dark:hover:bg-purple-500/10'}`}><span className="block font-medium">{voice.name}</span><span className="text-xs opacity-70">{voice.lang}</span></button>)}</div>{!available.length && <p className="rounded-lg bg-purple-50 p-3 text-sm text-purple-900 dark:bg-purple-500/10 dark:text-purple-200">No matching installed voice. The browser will try its default {pronunciationLocale(language.code)} voice.</p>}</div><fieldset className="mt-3"><legend className="text-[13px] font-medium">Speed</legend><div className="mt-1 grid grid-cols-3 gap-2">{[[0.5, 'Slow'], [1, 'Normal'], [2, 'Fast']].map(([value, label]) => <button type="button" key={value} aria-pressed={rate === value} onClick={() => onSave({ rate: value })} className={`h-9 rounded-lg text-sm font-medium transition-colors duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10 ${rate === value ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-purple-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-purple-500/15'}`}>{label}</button>)}</div></fieldset><div className="mt-3 flex items-center gap-2"><button type="button" onClick={() => onSpeak(language.name.replace(/\s*\([^)]*\)$/, ''))} className={primary}><SpeakerHigh size={17} />Preview voice</button>{error && <p role="alert" className="text-xs text-purple-700 dark:text-purple-300">{error}</p>}</div></>}</section>
}

const TOOLTIP_WIDTH = 288

function GrammarTerm({ text, term }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState(null)
  const anchorRef = useRef(null)
  const tooltipId = useId()
  const place = () => {
    const rect = anchorRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = Math.min(TOOLTIP_WIDTH, window.innerWidth - 16)
    const half = width / 2
    const center = Math.min(Math.max(rect.left + rect.width / 2, 8 + half), window.innerWidth - 8 - half)
    const above = rect.top > 150
    setPosition({ left: center, top: above ? rect.top - 8 : rect.bottom + 8, width, above })
  }
  const show = () => { place(); setOpen(true) }
  const hide = () => setOpen(false)
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(false) } }
    const reposition = () => place()
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => { window.removeEventListener('keydown', onKeyDown, true); window.removeEventListener('resize', reposition); window.removeEventListener('scroll', reposition, true) }
  }, [open])
  return <>
    <button type="button" ref={anchorRef} aria-describedby={open ? tooltipId : undefined} aria-label={`${text}: ${term.description}`} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} onClick={(event) => { event.preventDefault(); if (open) hide(); else show() }} className="cursor-help rounded-sm font-medium text-cyan-700/90 underline decoration-cyan-500/35 decoration-dotted underline-offset-2 transition-colors duration-300 ease-out hover:text-cyan-800 hover:decoration-cyan-600/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/20 dark:text-cyan-300/85 dark:decoration-cyan-300/30 dark:hover:text-cyan-200">{text}</button>
    {open && position && typeof document !== 'undefined' && createPortal(
      <div role="tooltip" id={tooltipId} style={{ left: position.left, top: position.top, width: position.width, transform: `translate(-50%, ${position.above ? '-100%' : '0'})` }} className="pointer-events-none fixed z-[60] rounded-lg bg-slate-900 px-3 py-2 text-left shadow-[0_12px_32px_rgba(15,23,42,0.28)] dark:bg-slate-800">
        <span className="block text-xs font-semibold text-cyan-300">{term.label}</span>
        <span className="mt-0.5 block text-xs leading-4 text-slate-100">{term.description}</span>
      </div>, document.body)}
  </>
}

function AnnotatedText({ value }) {
  const segments = useMemo(() => splitGrammarTerms(value), [value])
  return segments.map((segment, index) => segment.term
    ? <GrammarTerm key={`${segment.text}-${index}`} text={segment.text} term={segment.term} />
    : <span key={`${segment.text}-${index}`}>{segment.text}</span>)
}

function Detail({ label, value, annotate = true }) { return <div><span className="block text-xs font-medium uppercase tracking-wide text-purple-600 dark:text-purple-300">{label}</span><p className="mt-0.5 text-sm leading-5 text-slate-700 dark:text-slate-200">{annotate ? <AnnotatedText value={value} /> : value}</p></div> }

function WordDetailModal({ word, loading, error, providerReady, pronunciation, onClose }) {
  const dialogRef = useRef(null)
  const previousFocusRef = useRef(null)
  useEffect(() => {
    previousFocusRef.current = document.activeElement
    requestAnimationFrame(() => dialogRef.current?.querySelector('button')?.focus())
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { onClose(); return }
      if (event.key !== 'Tab') return
      const focusable = [...(dialogRef.current?.querySelectorAll('button:not(:disabled)') || [])]
      if (!focusable.length) return
      const first = focusable[0]; const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => { window.removeEventListener('keydown', onKeyDown); previousFocusRef.current?.focus?.() }
  }, [onClose])
  if (!word) return null
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="word-detail-title" className="max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-4 shadow-[0_20px_55px_rgba(15,23,42,0.24)] dark:bg-slate-900 dark:shadow-[0_20px_55px_rgba(0,0,0,0.48)]"><header className="relative text-center"><span className="text-xs font-medium uppercase tracking-[0.14em] text-purple-600 dark:text-purple-300">Word details</span><h2 id="word-detail-title" className="mt-0.5 text-xl font-semibold">{word.word}</h2><div className="mt-2 flex items-center justify-center gap-2"><span className="text-sm text-slate-500">{readablePronunciation(word.pronunciation) || 'Not available yet'}</span><button type="button" onClick={() => pronunciation.speak(word.word)} disabled={!pronunciation.supported} className="flex h-8 items-center gap-1.5 rounded-lg bg-purple-100 px-2.5 text-xs font-medium text-purple-700 transition-colors duration-300 ease-out hover:bg-purple-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-purple-500/15 dark:text-purple-200 dark:hover:bg-purple-500/25"><SpeakerHigh size={15} />Listen</button><button type="button" onClick={() => pronunciation.speak(word.word, 0.65)} disabled={!pronunciation.supported} className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 text-xs font-medium text-slate-600 transition-colors duration-300 ease-out hover:bg-purple-100 hover:text-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-purple-500/15"><SpeakerHigh size={15} />Slow</button></div>{pronunciation.error && <p role="alert" className="mt-2 text-xs text-purple-700 dark:text-purple-300">{pronunciation.error}</p>}<button type="button" onClick={onClose} aria-label="Close word details" className={`${secondary} absolute right-0 top-0 w-10 px-0`}><X size={16} /></button></header>{loading && <div role="status" className="mt-4 flex items-center gap-2 rounded-lg bg-purple-50 p-3 text-sm text-purple-900 dark:bg-purple-500/10 dark:text-purple-200"><SpinnerGap size={17} className="animate-spin" />Generating details…</div>}{error && <div role="alert" className="mt-4 rounded-lg bg-purple-50 p-3 text-sm text-purple-900 dark:bg-purple-500/10 dark:text-purple-200">{error}{!providerReady && <span className="ml-1">Open Provider & model from the sidebar settings.</span>}</div>}<div className="mt-5 space-y-5">{word.translation && <Detail label="Translation" value={word.translation} />}{word.meaning && <Detail label="Meaning" value={word.meaning} />}{word.explanation && <Detail label="Explanation" value={word.explanation} />}{word.example && <Detail label="Example" value={word.example} annotate={false} />}</div>{!loading && !error && !word.translation && <p className="mt-4 text-sm text-slate-500">No details available.</p>}</section></div>
}

function WordItem({ item, view, showLevel = true, onOpen, onSpeak, pronunciationSupported, onDelete }) {
  const level = vocabularyLevel(item.level)
  return <div className={`${view === 'list' ? 'flex w-full items-center gap-2 py-1' : 'flex w-auto items-center gap-1 rounded-lg bg-purple-50 p-1 dark:bg-purple-500/10'}`}><button type="button" onClick={() => onOpen(item)} className={`${view === 'list' ? 'min-w-0 flex-1 px-2 py-2 text-left' : 'max-w-56 px-2 py-1.5 text-left'} rounded-lg transition-colors duration-300 ease-out hover:bg-purple-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10 dark:hover:bg-purple-500/10`}><span className="flex items-center gap-1.5"><strong className="min-w-0 flex-1 truncate">{item.word}</strong>{showLevel && level && <span className="shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-500/15 dark:text-purple-300">{level.label}</span>}</span><span className="mt-0.5 block truncate text-xs font-normal text-slate-500 dark:text-slate-400">{readablePronunciation(item.pronunciation) || 'Open to generate details'}</span></button><span className="ml-auto flex shrink-0 items-center"><button type="button" onClick={() => onSpeak(item.word)} disabled={!pronunciationSupported} aria-label={`Pronounce ${item.word}`} title={`Pronounce ${item.word}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-purple-600 transition-colors duration-300 ease-out hover:bg-purple-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10 disabled:cursor-not-allowed disabled:opacity-40 dark:text-purple-300 dark:hover:bg-purple-500/15"><SpeakerHigh size={16} /></button><button type="button" onClick={() => onDelete(item)} aria-label={`Delete ${item.word}`} title={`Delete ${item.word}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors duration-300 ease-out hover:bg-purple-100 hover:text-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10 dark:hover:bg-purple-500/15 dark:hover:text-purple-300"><Trash size={16} /></button></span></div>
}

function WordCollection({ words, view, onOpen, onSpeak, pronunciationSupported, onDelete }) {
  return <div className={`${surface} mt-2 ${view === 'list' ? 'divide-y divide-slate-100 dark:divide-slate-800' : 'flex flex-wrap gap-2'}`}>{words.map((item) => <WordItem key={item.id} item={item} view={view} onOpen={onOpen} onSpeak={onSpeak} pronunciationSupported={pronunciationSupported} onDelete={onDelete} />)}{!words.length && <p className="w-full py-4 text-center text-sm text-slate-500">Add your first word to begin.</p>}</div>
}

function LevelGroups({ groups, unclassifiedWords, onOpen, onSpeak, pronunciationSupported, onDelete }) {
  const sections = [...groups, ...(unclassifiedWords.length ? [{ value: 'uncategorized', label: 'Uncategorized', range: 'Not classified yet', words: [...unclassifiedWords].sort((a, b) => a.word.localeCompare(b.word)) }] : [])]
  if (!sections.length) return <div className={`${surface} mt-2 text-center text-sm text-slate-500`}>Add your first word to begin.</div>
  return <div className="mt-2 space-y-3">{sections.map((group) => <section key={group.value} aria-labelledby={`level-${group.value}`} className={surface}><header className="flex items-center justify-between gap-3"><div><h3 id={`level-${group.value}`} className="text-base font-semibold">{group.label}</h3><p className="mt-0.5 text-xs text-slate-500">{group.range}</p></div><span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-500/15 dark:text-purple-300">{group.words.length} word{group.words.length === 1 ? '' : 's'}</span></header><div className="mt-3 flex flex-wrap gap-2">{group.words.map((item) => <WordItem key={item.id} item={item} view="wrap" showLevel={false} onOpen={onOpen} onSpeak={onSpeak} pronunciationSupported={pronunciationSupported} onDelete={onDelete} />)}</div></section>)}</div>
}

function LanguageDropdown({ language, onSave }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef(null)
  const selected = language.userLanguage || LANGUAGES.find((item) => item.code === 'en-us')
  const choices = LANGUAGES.filter((item) => `${item.name} ${item.country}`.toLowerCase().includes(query.toLowerCase()))
  useEffect(() => {
    const close = (event) => { if (!containerRef.current?.contains(event.target)) { setOpen(false); setQuery('') } }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [])
  return <div ref={containerRef} className="relative mt-2"><button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex h-10 w-full items-center gap-3 rounded-lg border border-purple-100 bg-white px-3 text-left text-sm transition-colors duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10 dark:border-white/10 dark:bg-slate-950"><Flag language={selected} /><span className="min-w-0 flex-1 truncate font-medium">{selected.name}</span><CaretDown size={16} className={`shrink-0 text-slate-400 transition-transform duration-300 ease-out ${open ? 'rotate-180' : ''}`} /></button>{open && <div className="absolute left-0 right-0 top-11 z-30 rounded-lg bg-white p-2 shadow-[0_14px_35px_rgba(15,23,42,0.18)] dark:bg-slate-900 dark:shadow-[0_14px_35px_rgba(0,0,0,0.45)]"><label className="relative block"><span className="sr-only">Search your language</span><MagnifyingGlass className="absolute left-3 top-3 text-slate-400" size={16} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') { setOpen(false); setQuery('') } }} placeholder="Search languages…" className={`${input} pl-9`} /></label><div role="listbox" aria-label="Your language" className="mt-2 max-h-56 overflow-y-auto">{choices.map((item) => <button type="button" role="option" aria-selected={selected.code === item.code} key={item.code} onClick={() => { onSave(item); setOpen(false); setQuery('') }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-300 ease-out hover:bg-purple-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10 dark:hover:bg-purple-500/10 ${selected.code === item.code ? 'bg-purple-100 text-purple-900 dark:bg-purple-500/15 dark:text-purple-100' : ''}`}><Flag language={item} /><span className="min-w-0"><span className="block truncate font-medium">{item.name}</span><span className="block truncate text-xs text-slate-500">{item.country}</span></span></button>)}{!choices.length && <p className="p-3 text-center text-xs text-slate-500">No matching languages.</p>}</div></div>}</div>
}

function VocabularySettings({ language, voices, supported, error, onSpeak, onSaveLanguage, onSavePronunciation, onClose }) {
  return <section className={`${surface} mt-4`} aria-label="Vocabulary settings"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Settings</h2><p className="mt-0.5 text-xs text-slate-500">Choose your language and pronunciation preferences.</p></div><button type="button" onClick={onClose} aria-label="Close settings" className={secondary}><X size={16} /></button></div><div className="mt-3"><h3 className="font-semibold">Your language</h3><p className="mt-0.5 text-xs text-slate-500">Meanings, explanations, and practice translations use this language.</p><LanguageDropdown language={language} onSave={onSaveLanguage} /></div><PronunciationSettings language={language} voices={voices} supported={supported} error={error} onSpeak={onSpeak} onSave={onSavePronunciation} /></section>
}

function PronouncePanel({ language, pronunciation, onClose }) {
  const [text, setText] = useState('')
  const value = text.trim()
  const replay = () => pronunciation.speak(value)
  return <section className={`${surface} mt-4`} aria-label={`${language.name} sentence pronunciation`}><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Pronounce a sentence</h2><p className="mt-0.5 text-xs text-slate-500">Enter a sentence in {language.name} to hear its pronunciation.</p></div><button type="button" onClick={onClose} aria-label="Close pronunciation tool" className={secondary}><X size={16} /></button></div><label className="mt-3 block"><span className="mb-1 block text-sm font-medium">{language.name} sentence</span><textarea autoFocus value={text} onChange={(event) => { pronunciation.stop(); setText(event.target.value) }} rows="3" placeholder={`Type a sentence in ${language.name}…`} className={`${input} h-auto min-h-24 resize-y py-2`} /></label><div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" onClick={replay} disabled={!value || !pronunciation.supported} className={primary}><SpeakerHigh size={17} />Play pronunciation</button>{value && <button type="button" onClick={() => { pronunciation.stop(); setText('') }} className={secondary}>Clear</button>}</div>{!pronunciation.supported && <p role="alert" className="mt-2 text-xs text-purple-700 dark:text-purple-300">Pronunciation is not supported by this browser.</p>}{pronunciation.error && <p role="alert" className="mt-2 text-xs text-purple-700 dark:text-purple-300">{pronunciation.error}</p>}</section>
}

function WordForm({ existingWords, onCancel, onSave }) {
  const [word, setWord] = useState('')
  const normalizeWord = (value) => value.normalize('NFKC').trim().toLocaleLowerCase()
  const duplicate = Boolean(word.trim()) && existingWords.some((item) => normalizeWord(item.word) === normalizeWord(word))
  return <form onSubmit={(event) => { event.preventDefault(); const value = word.trim(); if (value && !duplicate) { onSave({ word: value, id: crypto.randomUUID(), addedAt: Date.now() }); setWord('') } }} className={`${surface} mt-4`}><h2 className="font-semibold">Add a learned word</h2><label className="mt-3 block"><span className="mb-1 block text-sm font-medium">Word</span><input autoFocus required aria-invalid={duplicate} aria-describedby={duplicate ? 'duplicate-word-error' : undefined} value={word} onChange={(event) => setWord(event.target.value)} placeholder="Type a word…" className={`${input} ${duplicate ? 'border-purple-500 dark:border-purple-400' : ''}`} /></label>{duplicate && <p id="duplicate-word-error" role="alert" className="mt-1 text-xs font-medium text-purple-700 dark:text-purple-300">This word is already in your vocabulary list.</p>}<div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onCancel} className={secondary}>Cancel</button><button disabled={!word.trim() || duplicate} className={primary}><Check size={16} />Save word</button></div></form>
}

const PRACTICE_MODES = [
  { value: 'mixed', label: 'Mixed game', description: 'Rotate through every available challenge', countLabel: 'Rounds to play', countOptions: [5, 10, 'all'], defaultCount: 10, allLabel: 'Marathon', countHint: 'Each round draws a random challenge type.', startLabel: 'Create questions with AI', busyLabel: 'Generating questions…' },
  { value: 'target-to-user', label: 'Translate', description: 'Target language to your selected language', countLabel: 'Words to translate', countOptions: [5, 10, 'all'], defaultCount: 10, allLabel: 'Every word', countHint: 'One saved word per question.', startLabel: 'Create questions with AI', busyLabel: 'Generating questions…' },
  { value: 'user-to-target', label: 'Reverse', description: 'Your selected language to the target language', countLabel: 'Words to recall', countOptions: [5, 10, 'all'], defaultCount: 10, allLabel: 'Every word', countHint: 'One saved word per question.', startLabel: 'Create questions with AI', busyLabel: 'Generating questions…' },
  { value: 'missing', label: 'Missing words', description: 'Complete one or more saved words', countLabel: 'Sentences with gaps', countOptions: [5, 10, 'all'], defaultCount: 5, allLabel: 'Every word', countHint: 'A sentence may hide more than one word.', startLabel: 'Create gap sentences with AI', busyLabel: 'Writing gap sentences…' },
  { value: 'sentence', label: 'Make a sentence', description: 'Use a saved word in your own sentence', countLabel: 'Sentences to write', countOptions: [3, 5, 10], defaultCount: 3, countHint: 'Writing takes longer, so keep the set short.', startLabel: 'Create writing prompts with AI', busyLabel: 'Preparing prompts…' },
  { value: 'listen', label: 'Listen', description: 'Hear a saved word and identify it', countLabel: 'Clips to play', countOptions: [5, 10, 'all'], defaultCount: 10, allLabel: 'Every word', countHint: 'Replay each clip as often as you need.', startLabel: 'Create listening clips with AI', busyLabel: 'Preparing clips…' },
  { value: 'rain', label: 'Word rain', description: 'Type fast before the falling words hit the ground', startLabel: 'Start word rain', busyLabel: 'Preparing words…' },
]
const practiceMode = (value) => PRACTICE_MODES.find((item) => item.value === value) || PRACTICE_MODES[0]

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const normalizeAnswer = (value) => String(value || '').normalize('NFKC').trim().toLocaleLowerCase().replace(/[.!?]+$/g, '')
const answerMatches = (answer, expected) => String(expected).split(/\s+(?:\/|;|\|)\s+/).some((option) => normalizeAnswer(answer) === normalizeAnswer(option))
const usesSavedWord = (answer, savedWord) => new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(normalizeAnswer(savedWord))}(?=$|[^\\p{L}\\p{N}])`, 'iu').test(normalizeAnswer(answer))
const gradeFromPercentage = (percentage) => {
  if (percentage >= 97) return 'A+'
  if (percentage >= 93) return 'A'
  if (percentage >= 90) return 'A-'
  if (percentage >= 87) return 'B+'
  if (percentage >= 83) return 'B'
  if (percentage >= 80) return 'B-'
  if (percentage >= 77) return 'C+'
  if (percentage >= 73) return 'C'
  if (percentage >= 70) return 'C-'
  if (percentage >= 67) return 'D+'
  if (percentage >= 63) return 'D'
  if (percentage >= 60) return 'D-'
  return 'F'
}
function PracticeModeIcon({ mode }) {
  if (mode === 'rain') return <CloudRain size={17} />
  if (mode === 'listen') return <SpeakerHigh size={17} />
  if (mode === 'mixed') return <Shuffle size={17} />
  if (mode === 'missing') return <BookOpen size={17} />
  if (mode === 'sentence') return <Check size={17} />
  return <Translate size={17} />
}

function OptionGroup({ legend, hint, options, value, onSelect }) {
  return <fieldset className="w-full max-w-md text-center">
    <legend className="mb-1.5 block w-full text-[13px] font-medium">{legend}</legend>
    <div role="radiogroup" aria-label={legend} className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      {options.map((option) => {
        const selected = value === option.value
        return <button type="button" role="radio" aria-checked={selected} key={String(option.value)} onClick={() => onSelect(option.value)} title={option.description} className={`flex h-11 min-w-0 flex-col items-center justify-center rounded-lg px-2 transition-[background-color,color,box-shadow] duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10 ${selected ? 'bg-white text-purple-800 shadow-[0_4px_12px_rgba(76,29,149,0.12)] dark:bg-slate-700 dark:text-purple-200' : 'text-slate-500 hover:text-purple-700 dark:hover:text-purple-300'}`}>
          <span className="w-full truncate text-sm font-semibold leading-4">{option.label}</span>
          {option.caption && <span className={`w-full truncate text-[10px] leading-3 ${selected ? 'text-purple-500/80 dark:text-purple-300/70' : 'text-slate-400'}`}>{option.caption}</span>}
        </button>
      })}
    </div>
    {hint && <p className="mt-1.5 text-xs leading-4 text-slate-500">{hint}</p>}
  </fieldset>
}

function PracticePage({ language, providerReady, onGenerate, onGenerateRainPairs, onBack }) {
  const [screen, setScreen] = useState('setup')
  const [generating, setGenerating] = useState(false)
  const [generationError, setGenerationError] = useState('')
  const [mode, setMode] = useState('mixed')
  const [length, setLength] = useState(practiceMode('mixed').defaultCount)
  const [questions, setQuestions] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState({})
  const [results, setResults] = useState([])
  const [rainDirection, setRainDirection] = useState('mixed')
  const [rainDeck, setRainDeck] = useState([])
  const [rainPairs, setRainPairs] = useState([])
  const [rainDuration, setRainDuration] = useState(120000)
  const [rainRound, setRainRound] = useState(0)
  const pronunciation = usePronunciation(language)
  const words = useMemo(() => language.words || [], [language.words])
  const activeMode = practiceMode(mode)
  const isRain = mode === 'rain'
  const maximumQuestions = mode === 'mixed' ? words.length * 5 : words.length
  const countOptions = (activeMode.countOptions || []).filter((value, index) => value === 'all' || index === 0 || value <= maximumQuestions)
  const selectMode = (value) => { setMode(value); setLength(practiceMode(value).defaultCount ?? length); setGenerationError('') }
  const modeHint = !words.length ? 'Add at least one word to your vocabulary list first.' : !providerReady ? `Connect a provider to generate ${isRain ? 'the word rain translations' : 'practice questions'} with AI.` : generationError
  const score = results.filter((result) => result.correct).length
  const incorrectCount = Math.max(0, questions.length - score)
  const percentage = questions.length ? Math.round((score / questions.length) * 100) : 0
  const grade = gradeFromPercentage(percentage)
  const resultMessage = percentage >= 90 ? 'Excellent recall. You are ready for a harder round.' : percentage >= 75 ? 'Good progress. Review the missed words and try again.' : percentage >= 60 ? 'You are building momentum. Focus on the corrections below.' : 'Keep practicing. Review the expected answers before your next attempt.'
  const activeQuestion = questions[currentQuestion]
  const activeAnswers = activeQuestion ? answers[activeQuestion.id] || [] : []
  const activeAnswered = activeAnswers.length > 0 && activeAnswers.every((answer) => answer.trim())
  const isLastQuestion = currentQuestion === questions.length - 1

  const begin = async () => {
    if (!providerReady || !words.length || generating) return
    const requestedCount = length === 'all' ? maximumQuestions : Math.min(length, maximumQuestions)
    pronunciation.stop(); setGenerating(true); setGenerationError('')
    try {
      if (isRain) {
        const pairs = rainPairs.length ? rainPairs : await onGenerateRainPairs(language)
        setRainPairs(pairs); setRainDeck(shuffleRainDeck(pairs, rainDirection)); setRainRound((value) => value + 1); setScreen('rain')
        return
      }
      const nextQuestions = await onGenerate(language, mode, requestedCount)
      const nextAnswers = Object.fromEntries(nextQuestions.map((question) => [question.id, Array(question.type === 'missing' ? question.expected.length : 1).fill('')]))
      setQuestions(nextQuestions); setCurrentQuestion(0); setAnswers(nextAnswers); setResults([]); setScreen('exam')
    } catch (error) {
      setGenerationError(error.message || `Could not generate the ${isRain ? 'word rain translations' : 'practice questions'}.`)
    } finally {
      setGenerating(false)
    }
  }
  const updateAnswer = (questionId, answerIndex, value) => setAnswers((current) => ({ ...current, [questionId]: current[questionId].map((answer, index) => index === answerIndex ? value : answer) }))
  const submitAnswers = () => {
    const nextResults = questions.map((question) => ({
      id: question.id,
      correct: question.type === 'sentence' ? usesSavedWord(answers[question.id][0], question.word.word) : question.expected.every((expected, index) => answerMatches(answers[question.id][index], expected)),
    }))
    pronunciation.stop(); setResults(nextResults); setScreen('result'); window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const advance = () => {
    if (!activeAnswered) return
    pronunciation.stop()
    if (isLastQuestion) submitAnswers()
    else setCurrentQuestion((value) => value + 1)
  }
  const handleAnswerKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault(); advance()
  }
  const retry = () => {
    const nextAnswers = Object.fromEntries(questions.map((question) => [question.id, Array(question.type === 'missing' ? question.expected.length : 1).fill('')]))
    pronunciation.stop(); setCurrentQuestion(0); setAnswers(nextAnswers); setResults([]); setGenerationError(''); setScreen('exam'); window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const reset = () => { pronunciation.stop(); setQuestions([]); setCurrentQuestion(0); setAnswers({}); setResults([]); setRainDeck([]); setRainPairs([]); setGenerationError(''); setScreen('setup') }

  return <Page>
    <button type="button" onClick={() => { pronunciation.stop(); onBack() }} className={secondary}><ArrowLeft size={16} />Back to {language.name}</button>
    <div className="mt-4 flex items-center gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"><GameController size={24} weight="fill" /></span><div><span className="text-xs font-medium uppercase tracking-[0.14em] text-purple-600 dark:text-purple-300">Dedicated practice</span><h1 className="mt-0.5 text-xl font-semibold">{language.name} vocabulary exam</h1><p className="mt-1 text-sm text-slate-500">Answer every question, then submit once to calculate your score.</p></div></div>

    {screen === 'setup' && <div className="flex min-h-[calc(100dvh-190px)] items-center justify-center py-4"><section className={`${surface} w-full`}><h2 className="text-center text-base font-semibold">Choose a practice type</h2><div role="radiogroup" aria-label="Practice mode" className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{PRACTICE_MODES.map((item) => { const selected = mode === item.value; return <button type="button" role="radio" aria-checked={selected} key={item.value} onClick={() => selectMode(item.value)} className={`group relative flex min-h-32 flex-col items-center justify-center overflow-hidden rounded-xl px-4 py-3 text-center transition-[background-color,color,box-shadow,transform] duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10 active:scale-[0.98] motion-reduce:transform-none ${selected ? 'bg-purple-50 text-purple-950 shadow-[0_10px_30px_rgba(126,34,206,0.2)] dark:bg-purple-500/15 dark:text-purple-100 dark:shadow-[0_10px_30px_rgba(126,34,206,0.16)]' : 'bg-white text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(76,29,149,0.16)] dark:bg-slate-800 dark:text-slate-200 dark:shadow-[0_10px_28px_rgba(0,0,0,0.28)] dark:hover:shadow-[0_14px_32px_rgba(0,0,0,0.34)]'}`}><span className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-300 ease-out ${selected ? 'bg-purple-700 text-white dark:bg-purple-400 dark:text-slate-950' : 'bg-slate-100 text-purple-700 dark:bg-slate-700 dark:text-purple-300'}`}><PracticeModeIcon mode={item.value} /></span><span className="mt-2 block text-base font-semibold">{item.label}</span><span className="mt-1 block max-w-52 text-xs leading-4 text-slate-500 dark:text-slate-400">{item.description}</span><span aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-1 bg-purple-600 transition-transform duration-300 ease-out dark:bg-purple-400 ${selected ? 'scale-x-100' : 'scale-x-0'}`} /></button> })}</div><div className="mt-4 flex flex-col items-center gap-3">{isRain && <OptionGroup legend="Direction" options={RAIN_DIRECTIONS.map((item) => ({ ...item, label: item.value === 'target-to-user' ? language.name : item.value === 'user-to-target' ? (language.userLanguage?.name || 'English') : item.label, caption: item.value === 'target-to-user' ? `→ ${language.userLanguage?.name || 'English'}` : item.value === 'user-to-target' ? `→ ${language.name}` : 'both ways' }))} value={rainDirection} onSelect={setRainDirection} hint={RAIN_DIRECTIONS.find((item) => item.value === rainDirection)?.description} />}{isRain ? <OptionGroup legend="Round length" options={RAIN_DURATIONS} value={rainDuration} onSelect={setRainDuration} hint={`${RAIN_DURATIONS.find((item) => item.value === rainDuration)?.description} · all ${words.length} saved word${words.length === 1 ? '' : 's'} keep cycling until the clock runs out.`} /> : <OptionGroup legend={activeMode.countLabel} options={countOptions.map((value) => value === 'all' ? { value, label: activeMode.allLabel || 'All', caption: `${maximumQuestions} items` } : { value, label: String(value), caption: 'items' })} value={length} onSelect={setLength} hint={activeMode.countHint} />}<button type="button" onClick={begin} disabled={!providerReady || !words.length || generating} className={primary}>{generating ? <SpinnerGap size={17} className="animate-spin" /> : isRain ? <CloudRain size={17} /> : <GameController size={17} />}{generating ? activeMode.busyLabel : activeMode.startLabel}</button></div>{modeHint && <p role="status" className="mt-3 rounded-lg bg-purple-100 p-3 text-center text-xs text-purple-900 dark:bg-purple-500/10 dark:text-purple-200">{modeHint}</p>}</section></div>}

    {screen === 'rain' && <WordRainGame key={rainRound} language={language} deck={rainDeck} direction={rainDirection} durationMs={rainDuration} onExit={reset} onRestart={() => { setRainDeck(shuffleRainDeck(rainPairs, rainDirection)); setRainRound((value) => value + 1) }} />}

    {screen === 'exam' && activeQuestion && <div className="flex min-h-[calc(100dvh-190px)] items-center justify-center py-4"><section className="w-full max-w-xl rounded-xl bg-white p-4 shadow-[0_12px_38px_rgba(76,29,149,0.14)] dark:bg-slate-900 dark:shadow-[0_16px_42px_rgba(0,0,0,0.38)]"><div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-slate-500">{currentQuestion + 1} / {questions.length}</span><span className="flex items-center gap-1.5 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"><PracticeModeIcon mode={activeQuestion.type} />{PRACTICE_MODES.find((item) => item.value === activeQuestion.type)?.label}</span></div>{activeQuestion.prompts ? <div className="mt-3 space-y-2">{activeQuestion.prompts.map((prompt, promptIndex) => <p key={`${activeQuestion.id}-${promptIndex}`} className="rounded-lg bg-slate-50 p-3 text-sm font-medium dark:bg-slate-800/70"><span className="mr-2 text-purple-600 dark:text-purple-300">{promptIndex + 1}.</span>{prompt}</p>)}</div> : <p className="mt-3 text-base font-medium leading-6">{activeQuestion.prompt}</p>}{activeQuestion.type === 'listen' && <button type="button" onClick={() => pronunciation.speak(activeQuestion.word.word)} disabled={!pronunciation.supported} className={`${secondary} mt-3`}><SpeakerHigh size={17} />Play audio</button>}<div className="mt-3 space-y-2">{activeAnswers.map((answer, answerIndex) => <label key={`${activeQuestion.id}-${answerIndex}`} className="block"><span className="mb-1 block text-[13px] font-medium">{activeQuestion.type === 'missing' && activeQuestion.expected.length > 1 ? `Missing word ${answerIndex + 1}` : 'Your answer'}</span><textarea autoFocus required value={answer} onChange={(event) => updateAnswer(activeQuestion.id, answerIndex, event.target.value)} onKeyDown={handleAnswerKeyDown} rows={activeQuestion.type === 'sentence' ? 3 : 1} placeholder={activeQuestion.type === 'sentence' ? `Write a sentence with “${activeQuestion.word.word}”…` : 'Type your answer…'} className={`${input} h-auto min-h-10 resize-none py-2`} /></label>)}</div><div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-slate-500">{activeQuestion.type === 'sentence' ? 'Shift + Enter for a new line' : 'Press Enter to continue'}</span><button type="button" onClick={advance} disabled={!activeAnswered} className={primary}>{isLastQuestion ? <Check size={16} /> : null}{isLastQuestion ? 'Submit answers' : 'Next'}{!isLastQuestion && <ArrowRight size={16} />}</button></div></section></div>}

    {screen === 'result' && <div className="mt-4 space-y-3"><section className={surface}><div className="flex flex-col items-center text-center"><span className={`flex h-12 w-12 items-center justify-center rounded-xl ${percentage >= 60 ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'}`}>{percentage >= 60 ? <Check size={24} weight="bold" /> : <X size={24} weight="bold" />}</span><h2 className="mt-3 text-xl font-semibold">Practice complete</h2><p className="mt-1 max-w-lg text-sm text-slate-500">{resultMessage}</p></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-lg bg-purple-50 p-3 text-center dark:bg-purple-500/10"><p className="text-xs font-medium text-slate-500">Grade</p><p className="mt-1 text-2xl font-bold text-purple-700 dark:text-purple-300">{grade}</p></div><div className="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800"><p className="text-xs font-medium text-slate-500">Score</p><p className="mt-1 text-2xl font-bold">{percentage}%</p></div><div className="rounded-lg bg-green-50 p-3 text-center dark:bg-green-500/10"><p className="text-xs font-medium text-slate-500">Correct</p><p className="mt-1 text-2xl font-bold text-green-700 dark:text-green-300">{score}</p></div><div className="rounded-lg bg-red-50 p-3 text-center dark:bg-red-500/10"><p className="text-xs font-medium text-slate-500">Incorrect</p><p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-300">{incorrectCount}</p></div></div><div className="mt-4 flex flex-wrap justify-center gap-2"><button type="button" onClick={retry} className={primary}><Shuffle size={17} />Try again</button><button type="button" onClick={reset} className={secondary}>Change practice</button></div></section><div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold">Answer review</h2><span className="text-xs text-slate-500">{score} correct · {incorrectCount} to review</span></div>{questions.map((question, index) => { const result = results.find((item) => item.id === question.id); return <section key={question.id} className={surface}><div className="flex items-center gap-3"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${result?.correct ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'}`}>{result?.correct ? <Check size={17} weight="bold" /> : <X size={17} weight="bold" />}</span><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">Question {index + 1}</h3><p className={`text-xs font-medium ${result?.correct ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>{result?.correct ? 'Correct' : 'Incorrect'}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">{PRACTICE_MODES.find((item) => item.value === question.type)?.label}</span></div><p className="mt-3 text-sm">{question.prompt || question.prompts?.join(' ')}</p><div className={`mt-2 rounded-lg p-3 text-xs ${result?.correct ? 'bg-green-50 dark:bg-green-500/10' : 'bg-red-50 dark:bg-red-500/10'}`}><p><strong>Your answer:</strong> {(answers[question.id] || []).join(', ') || 'No answer'}</p>{!result?.correct && <p className="mt-1"><strong>Expected:</strong> {question.type === 'sentence' ? `A sentence containing “${question.word.word}”` : question.expected.join(', ')}</p>}</div></section> })}</div>}
  </Page>
}
