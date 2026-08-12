import { useEffect, useRef, useState } from 'react'
import { Folder, X } from '@phosphor-icons/react'

export default function CategoryDialog({ open, onClose, onSave }) {
  const [name, setName] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setName('')
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null
  const submit = (event) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (trimmedName) onSave(trimmedName)
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-3 py-3 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="category-dialog-title" className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.24)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"><Folder size={17} /></div>
        <div className="min-w-0 flex-1"><h2 id="category-dialog-title" className="text-base leading-6 font-semibold">Create category</h2><p className="mt-0.5 text-[13px] leading-[18px] text-slate-500 dark:text-slate-400">Group related quizzes in one category.</p></div>
        <button type="button" onClick={onClose} aria-label="Close category dialog" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors duration-300 ease-out hover:bg-slate-100 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:hover:bg-slate-800 dark:hover:text-purple-300"><X size={17} /></button>
      </div>
      <label className="mt-4 block"><span className="text-[13px] leading-[18px] font-medium">Category name</span><input ref={inputRef} value={name} onChange={(event) => setName(event.target.value)} maxLength={48} placeholder="e.g. Frontend fundamentals" className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition-colors duration-300 ease-out placeholder:text-slate-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/10 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-purple-500" /></label>
      <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onClose} className="h-9 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors duration-300 ease-out hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button><button type="submit" disabled={!name.trim()} className="h-9 rounded-lg bg-gradient-to-r from-purple-700 to-purple-500 px-3 text-sm font-medium text-white shadow-[0_8px_20px_rgba(126,34,206,0.22)] transition-opacity duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-40">Create category</button></div>
    </form>
  </div>
}
