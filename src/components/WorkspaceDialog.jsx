import { useEffect, useRef, useState } from 'react'
import { Check, Palette, SlidersHorizontal, Trash, X } from '@phosphor-icons/react'

const COLORS = [
  { id: 'white', label: 'Clean', swatch: 'bg-white dark:bg-slate-900' },
  { id: 'purple', label: 'Lavender', swatch: 'bg-purple-100 dark:bg-purple-950' },
  { id: 'blue', label: 'Sky', swatch: 'bg-blue-100 dark:bg-blue-950' },
  { id: 'teal', label: 'Lagoon', swatch: 'bg-teal-100 dark:bg-teal-950' },
]

export default function WorkspaceDialog({ open, workspace, onClose, onSave, onDelete, canDelete = true }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('white')
  const [instructions, setInstructions] = useState('')
  const nameRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setName(workspace?.name || '')
    setColor(workspace?.color || 'white')
    setInstructions(workspace?.instructions || '')
    requestAnimationFrame(() => nameRef.current?.focus())
  }, [open, workspace])

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
    if (!trimmedName) return
    onSave({ name: trimmedName, color, instructions: instructions.trim() })
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-3 py-3 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="workspace-dialog-title" className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.24)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"><SlidersHorizontal size={17} /></div>
        <div className="min-w-0 flex-1"><h2 id="workspace-dialog-title" className="text-base leading-6 font-semibold">{workspace ? 'Edit workspace' : 'Create workspace'}</h2><p className="mt-0.5 text-[13px] leading-[18px] text-slate-500 dark:text-slate-400">Group related chats and give them shared context.</p></div>
        <button type="button" onClick={onClose} aria-label="Close workspace dialog" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors duration-300 ease-out hover:bg-slate-100 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:hover:bg-slate-800 dark:hover:text-purple-300"><X size={17} /></button>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block"><span className="text-[13px] leading-[18px] font-medium">Workspace name</span><input ref={nameRef} value={name} onChange={(event) => setName(event.target.value)} maxLength={48} placeholder="e.g. Product research" className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition-colors duration-300 ease-out placeholder:text-slate-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/10 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-purple-500" /></label>

        <fieldset><legend className="flex items-center gap-1.5 text-[13px] leading-[18px] font-medium"><Palette size={16} />Chat background</legend><div className="mt-1.5 grid grid-cols-4 gap-2" role="radiogroup">{COLORS.map((option) => <label key={option.id} className={`relative flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border p-2 text-xs transition-[border-color,background-color] duration-300 ease-out ${color === option.id ? 'border-purple-400 bg-purple-50 text-purple-800 dark:border-purple-500 dark:bg-purple-500/10 dark:text-purple-200' : 'border-slate-200 hover:border-purple-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-purple-700 dark:hover:bg-slate-800'}`}><input type="radio" name="workspace-color" value={option.id} checked={color === option.id} onChange={() => setColor(option.id)} className="sr-only" /><span className={`flex h-8 w-full items-center justify-center rounded-md border border-slate-200/70 ${option.swatch}`}>{color === option.id && <Check size={15} weight="bold" className="text-purple-700 dark:text-purple-300" />}</span><span>{option.label}</span></label>)}</div></fieldset>

        <label className="block"><span className="text-[13px] leading-[18px] font-medium">Additional instructions</span><textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} rows={4} placeholder="Applied to every chat in this workspace…" className="mt-1 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-5 outline-none transition-colors duration-300 ease-out placeholder:text-slate-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/10 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-purple-500" /><span className="mt-0.5 block text-xs leading-4 text-slate-400">These instructions are added to the system prompt.</span></label>
      </div>

      <div className="mt-4 flex items-center gap-2">{workspace && <button type="button" disabled={!canDelete} title={!canDelete ? 'The last workspace cannot be deleted' : undefined} onClick={() => onDelete(workspace.id)} className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-purple-700 transition-colors duration-300 ease-out hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:opacity-40 dark:text-purple-300 dark:hover:bg-purple-500/10"><Trash size={16} />Delete</button>}<div className="ml-auto flex gap-2"><button type="button" onClick={onClose} className="h-9 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors duration-300 ease-out hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button><button type="submit" disabled={!name.trim()} className="h-9 rounded-lg bg-gradient-to-r from-purple-700 to-purple-500 px-3 text-sm font-medium text-white shadow-[0_8px_20px_rgba(126,34,206,0.22)] transition-opacity duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-40">{workspace ? 'Save changes' : 'Create workspace'}</button></div></div>
    </form>
  </div>
}
