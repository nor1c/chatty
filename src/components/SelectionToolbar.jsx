import { useEffect, useRef } from 'react'
import { ChatCircleDots, Plus } from '@phosphor-icons/react'

export default function SelectionToolbar({ selection, onFollowUp, onAsk, onClose }) {
  const toolbarRef = useRef(null)
  useEffect(() => {
    if (!selection || !toolbarRef.current) return
    toolbarRef.current.style.left = `${selection.x}px`
    toolbarRef.current.style.top = `${selection.y}px`
    const close = (event) => { if (!toolbarRef.current?.contains(event.target)) onClose() }
    const escape = (event) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape) }
  }, [selection, onClose])
  if (!selection) return null
  return <div ref={toolbarRef} role="toolbar" aria-label="Actions for selected text" className="fixed z-50 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-[0_14px_35px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900">
    <button onClick={() => onFollowUp(selection.text)} className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm text-slate-700 transition-colors duration-300 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:text-slate-200 dark:hover:bg-purple-500/10"><Plus size={15} />Add follow-up</button>
    <button onClick={() => onAsk(selection.text)} className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm text-slate-700 transition-colors duration-300 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:text-slate-200 dark:hover:bg-purple-500/10"><ChatCircleDots size={15} />Ask</button>
  </div>
}
