import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, CloudRain, Heart } from '@phosphor-icons/react'
import { RAIN_LIVES, formatRainClock, rainDeckDraw, rainFallDuration, rainLane, rainLevel, rainMatches, rainPoints, rainSpawnDelay } from '../lib/wordRain'
import { input, primary, secondary, surface } from './vocabularyStyles'

export default function WordRainGame({ language, deck, direction, durationMs, onExit, onRestart }) {
  const [drops, setDrops] = useState([])
  const [answer, setAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [cleared, setCleared] = useState(0)
  const [lives, setLives] = useState(RAIN_LIVES)
  const [missed, setMissed] = useState([])
  const [flash, setFlash] = useState(null)
  const [paused, setPaused] = useState(false)
  const [remaining, setRemaining] = useState(durationMs)
  const [outcome, setOutcome] = useState(null)
  const drawRef = useRef(0)
  const dropKeyRef = useRef(0)
  const inputRef = useRef(null)
  const level = rainLevel(cleared)
  const timed = durationMs > 0
  const finished = Boolean(outcome)

  useEffect(() => {
    if (finished || paused || !timed) return undefined
    const timer = window.setInterval(() => setRemaining((value) => {
      const next = value - 200
      if (next <= 0) { setOutcome('time'); return 0 }
      return next
    }), 200)
    return () => window.clearInterval(timer)
  }, [finished, paused, timed])

  useEffect(() => {
    if (finished || paused) return undefined
    const timer = window.setInterval(() => {
      dropKeyRef.current += 1
      const key = dropKeyRef.current
      const drop = rainDeckDraw(deck, drawRef.current, direction)
      drawRef.current += 1
      setDrops((current) => [...current, { ...drop, key, lane: rainLane(key), duration: rainFallDuration(rainLevel(cleared)), bornAt: Date.now() }])
    }, rainSpawnDelay(level))
    return () => window.clearInterval(timer)
  }, [deck, direction, level, cleared, finished, paused])

  useEffect(() => {
    if (finished || paused || !drops.length) return undefined
    const timer = window.setInterval(() => {
      const now = Date.now()
      const landed = drops.filter((drop) => now - drop.bornAt >= drop.duration)
      if (!landed.length) return
      const landedKeys = new Set(landed.map((drop) => drop.key))
      setDrops((current) => current.filter((drop) => !landedKeys.has(drop.key)))
      setMissed((current) => [...current, ...landed.map(({ prompt, expected }) => ({ prompt, expected }))])
      setLives((current) => {
        const next = Math.max(0, current - landed.length)
        if (!next) setOutcome('lives')
        return next
      })
      setFlash({ type: 'miss', text: landed[0].expected })
    }, 120)
    return () => window.clearInterval(timer)
  }, [drops, finished, paused])

  useEffect(() => { if (!finished && !paused) inputRef.current?.focus() }, [finished, paused])

  useEffect(() => {
    if (!flash) return undefined
    const timer = window.setTimeout(() => setFlash(null), 900)
    return () => window.clearTimeout(timer)
  }, [flash])

  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') { event.preventDefault(); setPaused((value) => !value) } }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const submit = (event) => {
    event.preventDefault()
    const value = answer.trim()
    if (!value || finished || paused) return
    const hit = drops.find((drop) => rainMatches(value, drop.expected))
    setAnswer('')
    if (!hit) { setFlash({ type: 'wrong', text: value }); return }
    setDrops((current) => current.filter((drop) => drop.key !== hit.key))
    setScore((current) => current + rainPoints(level))
    setCleared((current) => current + 1)
    setFlash({ type: 'hit', text: hit.prompt })
  }

  if (finished) {
    const attempted = cleared + missed.length
    const accuracy = attempted ? Math.round((cleared / attempted) * 100) : 0
    const survived = outcome === 'time'
    const elapsed = timed ? durationMs - remaining : 0
    const perMinute = timed && elapsed > 0 ? Math.round((cleared / elapsed) * 60000) : 0
    return <div className="flex min-h-[calc(100dvh-190px)] items-center justify-center py-4">
      <section className={`${surface} w-full max-w-xl`}>
        <div className="flex flex-col items-center text-center">
          <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${survived ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300'}`}><CloudRain size={24} weight="fill" /></span>
          <h2 className="mt-2 text-lg font-semibold">{survived ? 'You survived the storm' : 'Game over'}</h2>
          <p className="mt-1 text-sm text-slate-500">{survived ? `You lasted the full ${formatRainClock(durationMs)} with ${lives} life${lives === 1 ? '' : 's'} to spare.` : `You caught ${cleared} word${cleared === 1 ? '' : 's'} before running out of lives.`}</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          {[['Score', score], ['Caught', cleared], ['Accuracy', `${accuracy}%`], [timed ? 'Per minute' : 'Top level', timed ? perMinute : level]].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-100 p-3 dark:bg-slate-800"><span className="block text-xs text-slate-500">{label}</span><span className="mt-0.5 block text-base font-semibold">{value}</span></div>)}
        </div>
        {missed.length > 0 && <div className="mt-4">
          <h3 className="text-sm font-semibold">Words that got away</h3>
          <ul className="mt-2 space-y-1">{missed.map((item, index) => <li key={`${item.prompt}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/70"><span className="min-w-0 truncate font-medium">{item.prompt}</span><span className="min-w-0 truncate text-slate-500">{item.expected}</span></li>)}</ul>
        </div>}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={onRestart} className={primary}><CloudRain size={17} />Play again</button>
          <button type="button" onClick={onExit} className={secondary}><ArrowLeft size={16} />Practice menu</button>
        </div>
      </section>
    </div>
  }

  const lowTime = timed && remaining <= 10000
  return <section className="mt-4" aria-label={`${language.name} word rain game`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        {timed
          ? <span aria-label={`${formatRainClock(remaining)} left`} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${lowTime ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300'}`}>{formatRainClock(remaining)}</span>
          : <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-500/15 dark:text-purple-300">Endless</span>}
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">Level {level}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">Score {score}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1" role="status" aria-label={`${lives} lives left`}>{Array.from({ length: RAIN_LIVES }, (_, index) => <Heart key={index} size={17} weight={index < lives ? 'fill' : 'regular'} className={index < lives ? 'text-red-500' : 'text-slate-300 dark:text-slate-600'} />)}</span>
        <button type="button" onClick={() => setPaused((value) => !value)} className={`${secondary} h-8 px-2.5 text-xs`}>{paused ? 'Resume' : 'Pause'}</button>
        <button type="button" onClick={onExit} className={`${secondary} h-8 px-2.5 text-xs`}>Quit</button>
      </div>
    </div>
    {timed && <div aria-hidden="true" className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className={`h-full transition-[width] duration-200 ease-linear ${lowTime ? 'bg-red-500' : 'bg-purple-500'}`} style={{ width: `${Math.max(0, (remaining / durationMs) * 100)}%` }} /></div>}
    <div className="relative mt-2 h-[54dvh] min-h-72 overflow-hidden rounded-xl bg-gradient-to-b from-purple-50 to-white shadow-[inset_0_2px_18px_rgba(76,29,149,0.1)] dark:from-slate-900 dark:to-slate-950">
      {drops.map((drop) => <span key={drop.key} style={{ left: `${drop.lane}%`, animationDuration: `${drop.duration}ms`, animationPlayState: paused ? 'paused' : 'running' }} className="animate-[word-rain-fall_linear_forwards] absolute top-0 max-w-[42%] truncate rounded-lg bg-white px-2.5 py-1.5 text-sm font-medium shadow-[0_6px_18px_rgba(76,29,149,0.16)] motion-reduce:animate-none dark:bg-slate-800">
        <span className={`mr-1.5 text-[10px] font-semibold ${drop.direction === 'user-to-target' ? 'text-cyan-700 dark:text-cyan-300' : 'text-purple-600 dark:text-purple-300'}`}>{drop.direction === 'user-to-target' ? '→' : '←'}</span>{drop.prompt}
      </span>)}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-purple-300/60 dark:bg-purple-500/30" />
      {paused && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/35 backdrop-blur-sm"><p className="rounded-lg bg-white px-4 py-2 text-sm font-medium shadow dark:bg-slate-800">Paused · press Escape to resume</p></div>}
      {!drops.length && !paused && <p className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">Get ready…</p>}
    </div>
    <form onSubmit={submit} className="mt-2 flex items-center gap-2">
      <label className="min-w-0 flex-1"><span className="sr-only">Type the matching word</span><input ref={inputRef} value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={paused} autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false" placeholder="Type the matching word and press Enter…" className={input} /></label>
      <button type="submit" disabled={!answer.trim() || paused} className={primary}>Catch</button>
    </form>
    <p role="status" className="mt-2 h-5 text-center text-xs font-medium">
      {flash?.type === 'hit' ? <span className="text-green-600 dark:text-green-400">Caught “{flash.text}”</span>
        : flash?.type === 'miss' ? <span className="text-red-600 dark:text-red-400">Missed · the answer was “{flash.text}”</span>
          : flash?.type === 'wrong' ? <span className="text-slate-500">“{flash.text}” does not match any falling word</span>
            : <span className="text-slate-400">← target word · → your language</span>}
    </p>
  </section>
}
