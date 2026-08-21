import { useEffect, useRef, useState } from 'react'
import { Copy, EyeSlash, MagicWand, NotePencil, Palette, Plus, SidebarSimple, Trash } from '@phosphor-icons/react'
import { NODE_COLORS } from '../lib/mindmap'
import { iconButton, panel, primary, secondary } from './mindmapStyles'

export const TOOLBAR_HALF_WIDTH = 132

/** Floating per-node actions anchored to the selected bubble on the canvas. */
export default function MindMapNodeToolbar({ node, left, top, placement, busy, actions, onHide }) {
  const rootRef = useRef(null)
  const noteRef = useRef(null)
  const [popover, setPopover] = useState(null)
  const [note, setNote] = useState(node.note || '')
  const isRoot = !node.parentId

  useEffect(() => { setPopover(null) }, [node.id])
  useEffect(() => { if (popover === 'note') { setNote(node.note || ''); requestAnimationFrame(() => noteRef.current?.focus()) } }, [popover, node.note])

  // Capture phase keeps Escape from reaching the editor shortcut chain, which would
  // otherwise close the whole map instead of just this popover.
  useEffect(() => {
    if (!popover) return undefined
    const onKeyDown = (event) => { if (event.key === 'Escape') { event.stopPropagation(); event.preventDefault(); setPopover(null) } }
    const onPointerDown = (event) => { if (!rootRef.current?.contains(event.target)) setPopover(null) }
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('pointerdown', onPointerDown, true)
    return () => { window.removeEventListener('keydown', onKeyDown, true); window.removeEventListener('pointerdown', onPointerDown, true) }
  }, [popover])

  const saveNote = () => { actions.onSetNote(node.id, note); setPopover(null) }
  const toggle = (name) => setPopover((current) => current === name ? null : name)

  return <div
    ref={rootRef}
    onPointerDown={(event) => event.stopPropagation()}
    onContextMenu={(event) => event.stopPropagation()}
    className="absolute z-40 -translate-x-1/2"
    style={{ left, top, ...(placement === 'above' ? { transform: 'translate(-50%, -100%)' } : undefined) }}
  >
    <div role="toolbar" aria-label={`Actions for ${node.label}`} className={`flex items-center gap-0.5 p-1 ${panel}`}>
      <button type="button" onClick={() => actions.onAddChild(node.id)} aria-label="Add child node" title="Add child (Tab)" className={iconButton}><Plus size={16} /></button>
      <button type="button" onClick={() => actions.onExpandAi(node.id)} disabled={busy} aria-label="Expand with AI" title="Expand with AI" className={iconButton}>
        {busy ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-purple-300 border-t-purple-700 motion-reduce:animate-none" /> : <MagicWand size={16} />}
      </button>
      <button type="button" onClick={() => toggle('note')} aria-expanded={popover === 'note'} aria-label="Edit note" title={node.note ? 'Edit note' : 'Add note'} className={`${iconButton} ${popover === 'note' || node.note ? 'text-purple-700 dark:text-purple-300' : ''}`}><NotePencil size={16} /></button>
      <button type="button" onClick={() => toggle('color')} aria-expanded={popover === 'color'} aria-label="Change node color" title="Node color" className={iconButton}><Palette size={16} /></button>
      <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-slate-200 dark:bg-slate-700" />
      <button type="button" onClick={() => actions.onDuplicate(node.id)} disabled={isRoot} aria-label="Duplicate branch" title="Duplicate (Ctrl+D)" className={iconButton}><Copy size={16} /></button>
      <button type="button" onClick={() => actions.onDelete(node.id)} disabled={isRoot} aria-label="Delete node" title="Delete (Del)" className={iconButton}><Trash size={16} /></button>
      <button type="button" onClick={() => actions.onOpenInspector(node.id)} aria-label="Open inspector" title="More in inspector (N)" className={iconButton}><SidebarSimple size={16} /></button>
      <button type="button" onClick={onHide} aria-label="Hide these actions" title="Hide actions (H)" className={iconButton}><EyeSlash size={16} /></button>
    </div>

    {popover === 'color' && <div className={`absolute left-1/2 top-[calc(100%+6px)] w-52 -translate-x-1/2 p-2 ${panel}`}>
      <p className="px-0.5 pb-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-slate-400">Node color</p>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => { actions.onSetColor(node.id, ''); setPopover(null) }} aria-pressed={!node.color} title="Use theme color" className={`h-7 w-7 rounded-lg border-2 bg-gradient-to-br from-slate-200 to-slate-400 transition-transform duration-300 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 motion-reduce:transform-none ${!node.color ? 'border-purple-600' : 'border-transparent'}`} />
        {NODE_COLORS.map((color) => <button
          key={color}
          type="button"
          onClick={() => { actions.onSetColor(node.id, color); setPopover(null) }}
          aria-pressed={node.color === color}
          aria-label={`Set node color ${color}`}
          className={`h-7 w-7 rounded-lg border-2 transition-transform duration-300 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 motion-reduce:transform-none ${node.color === color ? 'border-purple-600' : 'border-transparent'}`}
          style={{ backgroundColor: color }}
        />)}
      </div>
    </div>}

    {popover === 'note' && <div className={`absolute left-1/2 top-[calc(100%+6px)] w-72 -translate-x-1/2 p-2 ${panel}`}>
      <label className="block">
        <span className="px-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-slate-400">Note</span>
        <textarea
          ref={noteRef}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); saveNote() } }}
          rows="4"
          maxLength={2000}
          placeholder="Details, links, or context for this node…"
          className="mt-1 w-full resize-y rounded-md border border-slate-200 bg-white p-2 text-[13px] text-slate-800 outline-none transition-colors duration-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
      </label>
      <div className="mt-2 flex justify-end gap-1.5">
        <button type="button" onClick={() => setPopover(null)} className={secondary}>Cancel</button>
        <button type="button" onClick={saveNote} className={`${primary} h-9 px-3`}>Save note</button>
      </div>
    </div>}
  </div>
}
