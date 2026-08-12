import { useEffect, useRef, useState } from 'react'
import { CaretDown, Check, MagnifyingGlass } from '@phosphor-icons/react'

export default function Listbox({ label, value, options, onChange, placeholder = 'Select an option', disabled = false, compact = false, placement = 'bottom', searchable = false, searchPlaceholder = 'Search options…' }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const root = useRef(null)
  const searchInput = useRef(null)
  const selectedIndex = Math.max(0, options.indexOf(value))
  const filteredOptions = query.trim()
    ? options.filter((option) => option.toLowerCase().includes(query.trim().toLowerCase()))
    : options
  useEffect(() => {
    const close = (event) => { if (!root.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])
  useEffect(() => {
    if (open && searchable) requestAnimationFrame(() => searchInput.current?.focus())
    if (!open) setQuery('')
  }, [open, searchable])
  const select = (option) => { onChange(option); setOpen(false) }
  const onKeyDown = (event) => {
    if (event.key === 'Escape') setOpen(false)
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setOpen((current) => !current) }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); const direction = event.key === 'ArrowDown' ? 1 : -1; select(options[(selectedIndex + direction + options.length) % options.length]) }
  }
  return <div ref={root} className="relative">
    {label && <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
    <button type="button" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)} onKeyDown={onKeyDown} className={`flex w-full cursor-pointer ${compact ? 'h-8 px-2' : 'h-10 px-3'} items-center justify-between rounded-lg border border-purple-100 bg-white/70 text-left text-sm text-slate-800 backdrop-blur-md transition-[transform,border-color,box-shadow,background-color] duration-300 ease-out hover:border-purple-300  focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:border-purple-500/40`}>
      <span className="truncate">{value || placeholder}</span><CaretDown size={16} className={`shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div className={`absolute z-30 flex h-fit max-h-[min(24rem,60dvh)] w-full flex-col overflow-hidden rounded-lg border border-white/30 bg-white/90 p-1 shadow-[0_18px_45px_rgba(15,23,42,0.20)] backdrop-blur-xl motion-reduce:animate-none dark:border-white/10 dark:bg-slate-900/90 ${placement === 'top' ? 'bottom-full mb-1 origin-bottom' : 'top-full mt-1 origin-top'}`}>
      {searchable && <div className="relative shrink-0 p-1"><MagnifyingGlass aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input ref={searchInput} type="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false) }} placeholder={searchPlaceholder} aria-label={searchPlaceholder.replace('…', '')} className="h-9 w-full rounded-md border border-purple-100 bg-white/80 pl-8 pr-3 text-sm text-slate-800 outline-none transition-[border-color,box-shadow,background-color] duration-300 ease-out placeholder:text-slate-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/10 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-100" /></div>}
      <div role="listbox" className="min-h-0 overflow-y-auto">
        {filteredOptions.length ? filteredOptions.map((option) => <button type="button" role="option" aria-selected={value === option} key={option} onClick={() => select(option)} className="flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-left text-sm text-slate-700 transition-[transform,background-color,color] duration-300 ease-out hover:bg-purple-50 focus:bg-purple-50 focus:outline-none active:scale-[0.98] motion-reduce:transform-none dark:text-slate-200 dark:hover:bg-purple-500/10 dark:focus:bg-purple-500/10"><span className="truncate">{option}</span>{value === option && <Check size={16} weight="bold" className="text-purple-600 dark:text-purple-400" />}</button>) : <p className="px-3 py-2 text-sm text-slate-500">{options.length ? 'No matching models.' : 'No options available.'}</p>}
      </div>
    </div>}
  </div>
}
