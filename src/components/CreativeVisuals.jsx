import { useEffect, useRef } from 'react'

export function CursorGlow() {
  const glowRef = useRef(null)
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const move = (event) => { if (glowRef.current) glowRef.current.style.transform = `translate3d(${event.clientX - 128}px, ${event.clientY - 128}px, 0)` }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])
  return <div ref={glowRef} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-50 hidden h-64 w-64 rounded-full bg-purple-400/10 blur-3xl transition-transform duration-500 ease-out motion-reduce:hidden lg:block dark:bg-purple-500/10" />
}

export function RobotMascot({ compact = false, className = '' }) {
  return <svg viewBox="0 0 220 180" aria-label="ShinkuChat robot mascot" role="img" className={`${compact ? 'h-20 w-24' : 'h-40 w-48'} ${className}`}>
    <g className="origin-center animate-[pulse_4s_ease-in-out_infinite] motion-reduce:animate-none">
      <path d="M44 103c-17-35 6-72 43-78 39-7 78 17 87 52 9 38-16 74-55 80-31 5-62-10-75-54Z" className="fill-purple-100 stroke-purple-500 dark:fill-purple-500/15 dark:stroke-purple-300" strokeWidth="3" />
      <path d="M70 63c22-17 57-12 72 11 14 22 5 49-19 61-23 11-54 2-65-20-9-19-4-39 12-52Z" className="fill-white dark:fill-slate-900" />
      <circle cx="87" cy="92" r="7" className="fill-purple-600 dark:fill-purple-300" /><circle cx="126" cy="92" r="7" className="fill-purple-600 dark:fill-purple-300" />
      <path d="M91 116c10 8 21 8 31 0" fill="none" className="stroke-purple-600 dark:stroke-purple-300" strokeLinecap="round" strokeWidth="3" />
      <path d="M106 42V27m0 0 10-9m-10 9-9-9" fill="none" className="stroke-purple-500 dark:stroke-purple-300" strokeLinecap="round" strokeWidth="3" />
      <circle cx="106" cy="26" r="5" className="fill-purple-600" />
    </g>
    <g className="origin-center animate-[spin_18s_linear_infinite] motion-reduce:animate-none"><circle cx="34" cy="46" r="3" className="fill-purple-400" /><circle cx="181" cy="120" r="4" className="fill-purple-300" /><circle cx="177" cy="46" r="2" className="fill-purple-500" /></g>
  </svg>
}

export function AvatarTrio() {
  const faces = [
    ['bg-purple-100 dark:bg-purple-500/20', 'M9 17c2-5 10-5 12 0', 'M10 10h1m7 0h1'],
    ['bg-purple-200 dark:bg-purple-400/20', 'M8 16c3 3 10 3 13 0', 'M11 10h1m6 0h1'],
    ['bg-slate-200 dark:bg-slate-700', 'M9 17c4-2 8-2 12 0', 'M10 10h2m5 0h2'],
  ]
  return <div className="flex -space-x-2" aria-label="Three illustrated ShinkuChat personas">{faces.map(([tone, mouth, eyes], index) => <svg key={mouth} viewBox="0 0 30 30" className={`h-8 w-8 rounded-full ring-2 ring-white transition-[transform,box-shadow] duration-300  motion-reduce:transform-none dark:ring-slate-950 ${tone}`} role="img" aria-label={`Illustrated persona ${index + 1}`} ><circle cx="15" cy="15" r="12" fill="none" className="stroke-purple-500 dark:stroke-purple-300" strokeWidth="1.5" /><path d={mouth} fill="none" className="stroke-purple-700 dark:stroke-purple-200" strokeWidth="1.5" strokeLinecap="round" /><path d={eyes} className="stroke-purple-700 dark:stroke-purple-200" strokeWidth="2" strokeLinecap="round" /></svg>)}</div>
}

export function DoodleField() {
  return <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
    <svg className="absolute -right-8 top-12 h-40 w-40 animate-[spin_28s_linear_infinite] text-purple-300/40 motion-reduce:animate-none dark:text-purple-400/20" viewBox="0 0 120 120"><circle cx="60" cy="60" r="42" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2 9" /></svg>
    <svg className="absolute left-[7%] top-[18%] h-12 w-12 text-purple-400/50" viewBox="0 0 48 48"><path d="M24 2c1 15 7 21 22 22-15 1-21 7-22 22-1-15-7-21-22-22C17 23 23 17 24 2Z" fill="currentColor" /></svg>
    <svg className="absolute bottom-[16%] right-[11%] h-16 w-24 text-purple-400/40" viewBox="0 0 100 60"><path d="M4 38c19-34 38 22 59-8 10-15 22-12 33-2" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
    <svg className="absolute bottom-[24%] left-[8%] h-20 w-20 text-purple-300/50" viewBox="0 0 80 80"><path d="M10 42c1-23 19-34 39-29 21 5 29 26 20 43-10 19-38 22-53 6C3 49 8 27 25 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
    <div className="absolute left-[18%] top-[9%] grid grid-cols-3 gap-3 text-purple-400/30"><span>+</span><span>+</span><span>+</span><span>+</span><span>+</span><span>+</span></div>
    <svg className="absolute bottom-5 left-1/2 h-8 w-48 -translate-x-1/2 text-purple-400/30" viewBox="0 0 190 30"><path d="M3 15c25-12 39 11 63 0s39 11 63 0 39 11 58 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
    <svg className="absolute right-[22%] top-[22%] h-8 w-8 animate-[spin_14s_linear_infinite] text-purple-400/40 motion-reduce:animate-none" viewBox="0 0 32 32"><path d="m16 1 4 11 11 4-11 4-4 11-4-11-11-4 11-4Z" fill="currentColor" /></svg>
    <svg className="absolute left-[28%] top-[30%] h-6 w-32 text-purple-500/40" viewBox="0 0 128 24"><path d="M2 15c25-14 51 12 76-2 17-9 32-4 48 1" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
  </div>
}
