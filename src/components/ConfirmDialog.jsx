import { useEffect, useRef } from 'react'
import { Trash, X } from '@phosphor-icons/react'

export default function ConfirmDialog({ confirmation, onCancel, onConfirm }) {
  const confirmRef = useRef(null)

  useEffect(() => {
    if (!confirmation) return undefined
    requestAnimationFrame(() => confirmRef.current?.focus())
    const onKeyDown = (event) => { if (event.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [confirmation, onCancel])

  if (!confirmation) return null
  return <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }} className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 px-3 py-3 backdrop-blur-sm">
    <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description" className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.24)] dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
      <div className="flex items-start gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"><Trash size={17} /></div><div className="min-w-0 flex-1"><h2 id="confirm-title" className="text-base font-semibold">{confirmation.title}</h2><p id="confirm-description" className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-300">{confirmation.description}</p></div><button type="button" onClick={onCancel} aria-label="Close confirmation" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors duration-300 ease-out hover:bg-slate-100 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:hover:bg-slate-800 dark:hover:text-purple-300"><X size={17} /></button></div>
      <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onCancel} className="h-9 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors duration-300 ease-out hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button><button ref={confirmRef} type="button" onClick={onConfirm} className="flex h-9 items-center gap-2 rounded-lg bg-purple-700 px-3 text-sm font-medium text-white transition-colors duration-300 ease-out hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:bg-purple-500 dark:hover:bg-purple-400"><Trash size={16} />{confirmation.confirmLabel || 'Delete'}</button></div>
    </section>
  </div>
}
