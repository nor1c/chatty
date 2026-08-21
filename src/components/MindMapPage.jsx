import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowClockwise, ArrowCounterClockwise, ArrowDown, ArrowLeft, ArrowLineLeft, ArrowLineRight, ArrowRight, ArrowUp,
  ArrowsInSimple, ArrowsOutSimple, Copy, DownloadSimple, Eye, FileArrowUp, FileText, FloppyDisk, HandGrabbing,
  Image as ImageIcon, Info, MagicWand, MagnifyingGlass, Minus, NotePencil, Path, Plus,
  Sidebar as SidebarIcon, TextAa, TreeStructure, Trash, X,
} from '@phosphor-icons/react'
import MindMapCanvas from './MindMapCanvas'
import { chip, field, formatRelative, iconButton, menuItem, panel, primary, secondary, surface } from './mindmapStyles'
import { downloadJson, downloadText, downloadBlob, readFileText, svgToPngBlob } from '../lib/storage'
import {
  MIND_MAP_LAYOUTS, MIND_MAP_LIMITS, MIND_MAP_THEMES,
  addChildNode, addSiblingNode, childrenOf, createMindMap, duplicateMindMap, duplicateSubtree, findNode, indentNode,
  layoutMindMap, mergeGeneratedChildren, mindMapFileName, mindMapFromOutline, mindMapStats, mindMapToMarkdown,
  mindMapToOutlineText, mindMapToSvg, moveNodeRelative, normalizeMindMap, outdentNode, pathToRoot, removeNode,
  reorderNode, searchNodes, setAllCollapsed, siblingsOf, toggleCollapse, updateNode,
} from '../lib/mindmap'

export default function MindMapPage({ route, maps, dark, providerReady, onGenerate, onExpandNode, onSave, onDelete, onOpenSettings, onBack, onOpenMap, onCloseMap }) {
  const activeMap = route.page === 'mind-map-detail' ? maps.find((map) => map.id === route.mindMapId) : null
  if (route.page === 'mind-map-detail' && activeMap) {
    return <MindMapEditor
      key={activeMap.id}
      map={activeMap}
      dark={dark}
      providerReady={providerReady}
      onExpandNode={onExpandNode}
      onSave={onSave}
      onDelete={onDelete}
      onOpenSettings={onOpenSettings}
      onClose={onCloseMap}
    />
  }
  return <MindMapLibrary
    maps={maps}
    providerReady={providerReady}
    onGenerate={onGenerate}
    onSave={onSave}
    onDelete={onDelete}
    onOpenSettings={onOpenSettings}
    onBack={onBack}
    onOpenMap={onOpenMap}
  />
}

/* ================================== library ================================= */

const SORTS = [['updated', 'Last updated'], ['created', 'Newest'], ['title', 'Title A–Z'], ['size', 'Most nodes']]

function MindMapLibrary({ maps, providerReady, onGenerate, onSave, onDelete, onOpenSettings, onBack, onOpenMap }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('updated')
  const [error, setError] = useState('')

  const visibleMaps = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = needle ? maps.filter((map) => map.title.toLowerCase().includes(needle) || map.nodes.some((node) => node.label.toLowerCase().includes(needle))) : maps
    return [...filtered].sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title)
      if (sort === 'created') return (b.createdAt || 0) - (a.createdAt || 0)
      if (sort === 'size') return b.nodes.length - a.nodes.length
      return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)
    })
  }, [maps, query, sort])

  const importMap = async () => {
    setError('')
    try {
      const file = await readFileText('.json,.md,.markdown,.txt,application/json,text/markdown,text/plain')
      if (!file) return
      let map
      if (file.name.toLowerCase().endsWith('.json')) {
        const parsed = JSON.parse(file.text)
        const source = Array.isArray(parsed) ? parsed[0] : parsed
        map = normalizeMindMap(source, source?.title || file.name.replace(/\.[^.]+$/, ''))
      } else {
        map = mindMapFromOutline(file.text, file.name.replace(/\.[^.]+$/, ''))
      }
      if (!map || !map.nodes.length) throw new Error('No mind map content was found in that file.')
      const imported = { ...map, id: crypto.randomUUID(), createdAt: Date.now(), updatedAt: Date.now() }
      onSave(imported)
      onOpenMap(imported)
    } catch (cause) {
      setError(cause.message || 'That file could not be imported.')
    }
  }

  return <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-5">
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <button type="button" onClick={onBack} className={secondary}><ArrowLeft size={16} />Home</button>
          <span className="mt-3 block text-xs font-medium uppercase tracking-[0.14em] text-purple-600 dark:text-purple-300">Visual thinking studio</span>
          <h1 className="mt-1 text-xl font-semibold">Mind Maps</h1>
          <p className="mt-0.5 text-sm text-slate-500">Organize ideas into clear visual branches and connections.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={importMap} className={secondary}><FileArrowUp size={16} />Import</button>
          <button type="button" onClick={() => setDialogOpen(true)} className={primary}><Plus size={17} />Add mind map</button>
        </div>
      </header>

      {error && <p role="alert" className="rounded-lg bg-purple-100 px-3 py-2 text-[13px] text-purple-900 dark:bg-purple-500/15 dark:text-purple-100">{error}</p>}

      {maps.length > 0 && <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-56 flex-1">
          <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search maps and nodes…" aria-label="Search mind maps" className={`${field} pl-9`} />
        </label>
        <div role="radiogroup" aria-label="Sort mind maps" className="flex flex-wrap items-center gap-1">
          {SORTS.map(([value, label]) => <button
            key={value}
            type="button"
            role="radio"
            aria-checked={sort === value}
            onClick={() => setSort(value)}
            className={`${chip} ${sort === value ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-purple-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-purple-500/15'}`}
          >{label}</button>)}
        </div>
      </div>}

      {visibleMaps.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleMaps.map((map) => <MapCard key={map.id} map={map} onOpen={() => onOpenMap(map)} onDelete={() => onDelete(map.id)} onDuplicate={() => { const copy = duplicateMindMap(map); onSave(copy); onOpenMap(copy) }} />)}
      </div> : <section className={`${surface} flex min-h-64 flex-col items-center justify-center text-center`}>
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-200"><TreeStructure size={24} /></span>
        <h2 className="mt-3 text-base font-semibold">{maps.length ? 'No maps match that search' : 'Create your first mind map'}</h2>
        <p className="mt-0.5 max-w-sm text-sm text-slate-500">{maps.length ? 'Try a different keyword or clear the search field.' : 'Start from a central idea yourself, import an outline, or ask AI to build the complete structure.'}</p>
        {maps.length
          ? <button type="button" onClick={() => setQuery('')} className={`${secondary} mt-4`}>Clear search</button>
          : <button type="button" onClick={() => setDialogOpen(true)} className={`${primary} mt-4`}><Plus size={17} />Add mind map</button>}
      </section>}
    </div>

    <CreateMindMapDialog
      open={dialogOpen}
      providerReady={providerReady}
      onClose={() => setDialogOpen(false)}
      onOpenSettings={onOpenSettings}
      onGenerate={onGenerate}
      onSave={onSave}
      onCreated={(map) => { setDialogOpen(false); onOpenMap(map) }}
    />
  </div>
}

function MapCard({ map, onOpen, onDelete, onDuplicate }) {
  const stats = useMemo(() => mindMapStats(map), [map])
  const theme = MIND_MAP_THEMES[map.theme] || MIND_MAP_THEMES.aurora
  return <article className={`${surface} group flex flex-col`}>
    <button type="button" onClick={onOpen} className="w-full flex-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10">
      <MapPreview map={map} />
      <div className="mt-3 flex items-start gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: theme.root }}><TreeStructure size={17} /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold">{map.title}</span>
          <span className="mt-0.5 block text-xs text-slate-500">{stats.nodes} node{stats.nodes === 1 ? '' : 's'} · {stats.branches} branch{stats.branches === 1 ? '' : 'es'} · depth {stats.depth}</span>
          <span className="mt-0.5 block text-xs text-slate-400">Updated {formatRelative(map.updatedAt || map.createdAt)}</span>
        </span>
      </div>
      <span className="mt-3 flex items-center gap-1 text-[13px] font-medium text-purple-700 dark:text-purple-300">Open full-screen map<ArrowRight size={15} /></span>
    </button>
    <div className="mt-3 flex justify-end gap-1 border-t border-slate-100 pt-2 dark:border-slate-800">
      <button type="button" onClick={onDuplicate} className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-500 transition-colors duration-300 ease-out hover:bg-purple-100 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:hover:bg-purple-500/15"><Copy size={14} />Duplicate</button>
      <button type="button" onClick={onDelete} className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-500 transition-colors duration-300 ease-out hover:bg-purple-100 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:hover:bg-purple-500/15"><Trash size={14} />Delete</button>
    </div>
  </article>
}

function MapPreview({ map }) {
  const layout = useMemo(() => layoutMindMap(map.nodes || [], { layout: map.layout, theme: map.theme, padding: 40 }), [map.nodes, map.layout, map.theme])
  if (!layout.nodes.length) return <div className="h-32 rounded-xl bg-purple-50 dark:bg-purple-500/10" />
  return <div className="h-32 overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-950/60">
    <svg viewBox={`0 0 ${layout.width} ${layout.height}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {layout.edges.map((edge) => <path key={edge.id} d={edge.path} fill="none" stroke={edge.color} strokeWidth={edge.strokeWidth * 1.6} opacity="0.45" strokeLinecap="round" />)}
      {layout.nodes.map((node) => <rect key={node.id} x={node.x - node.width / 2} y={node.y - node.height / 2} width={node.width} height={node.height} rx={node.radius} fill={node.accent} opacity={node.depth === 0 ? 1 : 0.72 - Math.min(0.3, node.depth * 0.12)} />)}
    </svg>
  </div>
}

/* =============================== create dialog ============================== */

function CreateMindMapDialog({ open, providerReady, onClose, onOpenSettings, onGenerate, onSave, onCreated }) {
  const [mode, setMode] = useState('manual')
  const [topic, setTopic] = useState('')
  const [instructions, setInstructions] = useState('')
  const [outline, setOutline] = useState('')
  const [depth, setDepth] = useState('standard')
  const [layout, setLayout] = useState('balanced')
  const [theme, setTheme] = useState('aurora')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const topicRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setMode('manual'); setTopic(''); setInstructions(''); setOutline(''); setDepth('standard'); setLayout('balanced'); setTheme('aurora'); setError(''); setBusy(false)
    requestAnimationFrame(() => topicRef.current?.focus())
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => { if (event.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, busy, onClose])

  if (!open) return null

  const canSubmit = mode === 'outline' ? Boolean(outline.trim()) : Boolean(topic.trim())

  const submit = async (event) => {
    event.preventDefault()
    if (!canSubmit || busy) return
    if (mode === 'ai' && !providerReady) { onClose(); onOpenSettings(); return }
    setBusy(true); setError('')
    try {
      let map
      if (mode === 'ai') {
        map = await onGenerate({ topic: topic.trim(), instructions: instructions.trim(), depth, layout, theme })
      } else if (mode === 'outline') {
        const parsed = mindMapFromOutline(outline, topic.trim() || 'Imported outline')
        if (!parsed) throw new Error('Write at least one outline line.')
        map = { ...parsed, layout, theme, id: crypto.randomUUID() }
        onSave(map)
      } else {
        map = { ...createMindMap(topic.trim(), { layout, theme }) }
        onSave(map)
      }
      onCreated(map)
    } catch (cause) {
      setError(cause.message || 'The mind map could not be created.')
      setBusy(false)
    }
  }

  return <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }} className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/50 px-3 py-6 backdrop-blur-sm">
    <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="mind-map-dialog-title" className="my-auto w-full max-w-lg rounded-xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.24)] dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"><TreeStructure size={17} /></span>
        <div className="min-w-0 flex-1">
          <h2 id="mind-map-dialog-title" className="text-base font-semibold">Create mind map</h2>
          <p className="mt-0.5 text-[13px] text-slate-500">Choose how you want to turn your idea into a visual map.</p>
        </div>
        <button type="button" disabled={busy} onClick={onClose} aria-label="Close create mind map dialog" className={iconButton}><X size={17} /></button>
      </div>

      <div role="radiogroup" aria-label="Creation method" className="mt-4 grid grid-cols-3 gap-2">
        {[['manual', <Plus key="m" size={16} />, 'Manual'], ['ai', <MagicWand key="a" size={16} />, 'AI'], ['outline', <FileText key="o" size={16} />, 'Outline']].map(([value, icon, label]) => <button
          key={value}
          type="button"
          role="radio"
          aria-checked={mode === value}
          onClick={() => setMode(value)}
          className={`flex h-10 items-center justify-center gap-1.5 rounded-lg text-[13px] font-medium transition-[background-color,color,box-shadow] duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-purple-500/10 ${mode === value ? 'bg-purple-700 text-white shadow-[0_6px_16px_rgba(126,34,206,0.22)]' : 'bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-purple-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-purple-500/15'}`}
        >{icon}{label}</button>)}
      </div>

      <label className="mt-3 block">
        <span className="text-[13px] font-medium">{mode === 'manual' ? 'Central idea' : mode === 'ai' ? 'Topic to map' : 'Map title'}{mode === 'outline' && <span className="font-normal text-slate-400"> (optional)</span>}</span>
        <input ref={topicRef} value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={MIND_MAP_LIMITS.label} className={`${field} mt-1`} placeholder={mode === 'ai' ? 'Example: Learn machine learning' : 'Example: Product launch'} />
      </label>

      {mode === 'ai' && <>
        <label className="mt-3 block">
          <span className="text-[13px] font-medium">Additional direction <span className="font-normal text-slate-400">(optional)</span></span>
          <textarea rows="3" value={instructions} onChange={(event) => setInstructions(event.target.value)} className={`${field} mt-1 h-auto resize-y p-3`} placeholder="Focus on the learning sequence, core concepts, projects, and evaluation." />
        </label>
        <fieldset className="mt-3">
          <legend className="text-[13px] font-medium">Detail level</legend>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {[['compact', 'Compact', '4 branches'], ['standard', 'Standard', '6 branches'], ['deep', 'Deep', '8 branches']].map(([value, label, hint]) => <button
              key={value}
              type="button"
              role="radio"
              aria-checked={depth === value}
              onClick={() => setDepth(value)}
              className={`flex h-14 flex-col items-center justify-center rounded-lg text-[13px] font-medium transition-colors duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-purple-500/10 ${depth === value ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-purple-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-purple-500/15'}`}
            >{label}<span className={`text-[11px] font-normal ${depth === value ? 'text-purple-100' : 'text-slate-400'}`}>{hint}</span></button>)}
          </div>
        </fieldset>
      </>}

      {mode === 'outline' && <label className="mt-3 block">
        <span className="text-[13px] font-medium">Indented outline</span>
        <textarea rows="7" value={outline} onChange={(event) => setOutline(event.target.value)} className={`${field} mt-1 h-auto resize-y p-3 font-mono text-[13px]`} placeholder={'Product launch\n  Research\n    Interviews\n    Surveys\n  Marketing\n    Landing page'} />
        <span className="mt-1 block text-xs text-slate-400">Each level of indentation creates a child node. Markdown bullets and numbering are supported.</span>
      </label>}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <fieldset>
          <legend className="text-[13px] font-medium">Layout</legend>
          <div className="mt-1 flex flex-wrap gap-1">
            {MIND_MAP_LAYOUTS.map((item) => <button key={item.id} type="button" role="radio" aria-checked={layout === item.id} title={item.description} onClick={() => setLayout(item.id)} className={`${chip} ${layout === item.id ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-purple-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-purple-500/15'}`}>{item.name}</button>)}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-[13px] font-medium">Theme</legend>
          <div className="mt-1 flex flex-wrap gap-1">
            {Object.entries(MIND_MAP_THEMES).map(([key, value]) => <button key={key} type="button" role="radio" aria-checked={theme === key} onClick={() => setTheme(key)} className={`${chip} gap-1 ${theme === key ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-purple-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-purple-500/15'}`}>
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: value.root }} />{value.name}
            </button>)}
          </div>
        </fieldset>
      </div>

      {mode === 'ai' && !providerReady && <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-[13px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">Connect a provider and select a model to generate with AI.</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-purple-100 px-3 py-2 text-[13px] text-purple-900 dark:bg-purple-500/15 dark:text-purple-100">{error}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" disabled={busy} onClick={onClose} className={secondary}>Cancel</button>
        <button type="submit" disabled={!canSubmit || busy} className={primary}>
          {busy ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none" />Generating…</> : mode === 'ai' ? <><MagicWand size={17} />Generate map</> : <><Plus size={17} />Create map</>}
        </button>
      </div>
    </form>
  </div>
}

/* ================================== editor ================================== */

const HISTORY_LIMIT = 60

function MindMapEditor({ map, dark, providerReady, onExpandNode, onSave, onDelete, onOpenSettings, onClose }) {
  const canvasRef = useRef(null)
  const searchRef = useRef(null)
  const [selectedId, setSelectedId] = useState(map.nodes[0]?.id || null)
  const [editingId, setEditingId] = useState(null)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [matchIndex, setMatchIndex] = useState(0)
  const [menu, setMenu] = useState(null)
  const [toast, setToast] = useState(null)
  const [busyNodeId, setBusyNodeId] = useState(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const history = useRef({ past: [], future: [], lastKey: '', lastAt: 0 })
  const [historySize, setHistorySize] = useState({ past: 0, future: 0 })

  const selectedNode = findNode(map.nodes, selectedId) || map.nodes[0]
  const stats = useMemo(() => mindMapStats(map), [map])
  const matches = useMemo(() => searchNodes(map.nodes, query), [map.nodes, query])
  const matchSet = useMemo(() => new Set(matches), [matches])
  const breadcrumb = useMemo(() => pathToRoot(map.nodes, selectedNode?.id), [map.nodes, selectedNode?.id])

  const notify = useCallback((message, tone = 'info') => setToast({ message, tone, key: Date.now() }), [])
  useEffect(() => { if (!toast) return undefined; const timer = setTimeout(() => setToast(null), 2600); return () => clearTimeout(timer) }, [toast])

  const commit = useCallback((nextMap, options = {}) => {
    if (!nextMap || nextMap === map) return
    const now = Date.now()
    const coalesced = Boolean(options.coalesceKey) && history.current.lastKey === options.coalesceKey && now - history.current.lastAt < 1200
    history.current.lastKey = options.coalesceKey || ''
    history.current.lastAt = now
    if (!coalesced) {
      history.current.past = [...history.current.past, map].slice(-HISTORY_LIMIT)
      history.current.future = []
      setHistorySize({ past: history.current.past.length, future: 0 })
    }
    onSave(nextMap)
  }, [map, onSave])

  const undo = useCallback(() => {
    const previous = history.current.past.pop()
    if (!previous) return
    history.current.future = [map, ...history.current.future].slice(0, HISTORY_LIMIT)
    history.current.lastKey = ''
    setHistorySize({ past: history.current.past.length, future: history.current.future.length })
    onSave(previous)
    notify('Undone')
  }, [map, onSave, notify])

  const redo = useCallback(() => {
    const next = history.current.future.shift()
    if (!next) return
    history.current.past = [...history.current.past, map].slice(-HISTORY_LIMIT)
    history.current.lastKey = ''
    setHistorySize({ past: history.current.past.length, future: history.current.future.length })
    onSave(next)
    notify('Redone')
  }, [map, onSave, notify])

  /* ------------------------------- operations ------------------------------ */

  const addChild = useCallback((parentId, options = {}) => {
    const result = addChildNode(map, parentId)
    if (!result.node) { notify(result.error, 'error'); return }
    commit(result.map)
    setSelectedId(result.node.id)
    if (options.edit !== false) setEditingId(result.node.id)
  }, [map, commit, notify])

  const addSibling = useCallback((nodeId) => {
    const result = addSiblingNode(map, nodeId)
    if (!result.node) { notify(result.error, 'error'); return }
    commit(result.map)
    setSelectedId(result.node.id)
    setEditingId(result.node.id)
  }, [map, commit, notify])

  const deleteNode = useCallback((nodeId) => {
    const node = findNode(map.nodes, nodeId)
    if (!node?.parentId) { notify('The central idea cannot be deleted', 'error'); return }
    const result = removeNode(map, nodeId)
    commit(result.map)
    setSelectedId(result.nextSelection)
    setEditingId(null)
    notify(result.removed > 1 ? `Deleted ${result.removed} nodes` : 'Node deleted')
  }, [map, commit, notify])

  const renameNode = useCallback((nodeId, label) => { commit(updateNode(map, nodeId, { label })); setEditingId(null) }, [map, commit])
  const setNote = useCallback((nodeId, note) => commit(updateNode(map, nodeId, { note }), { coalesceKey: `note-${nodeId}` }), [map, commit])
  const setColor = useCallback((nodeId, color) => commit(updateNode(map, nodeId, { color })), [map, commit])
  const collapse = useCallback((nodeId) => commit(toggleCollapse(map, nodeId)), [map, commit])
  const reparent = useCallback((nodeId, referenceId, position = 'inside') => {
    const next = moveNodeRelative(map, nodeId, referenceId, position)
    if (next === map) { notify('That move is not allowed', 'error'); return }
    commit(next)
    const reference = findNode(map.nodes, referenceId)
    notify(position === 'inside' ? `Moved into ${reference?.label || 'node'}` : `Moved ${position} ${reference?.label || 'node'}`)
  }, [map, commit, notify])

  const duplicateNode = useCallback((nodeId) => {
    const result = duplicateSubtree(map, nodeId)
    if (!result.node) { notify('The node could not be duplicated', 'error'); return }
    commit(result.map)
    setSelectedId(result.node.id)
    notify('Node duplicated')
  }, [map, commit, notify])

  const expandWithAi = useCallback(async (nodeId) => {
    if (!providerReady) { onOpenSettings(); return }
    const node = findNode(map.nodes, nodeId)
    if (!node) return
    setBusyNodeId(nodeId)
    try {
      const labels = await onExpandNode({ map, node, path: pathToRoot(map.nodes, nodeId).map((item) => item.label) })
      const result = mergeGeneratedChildren(map, nodeId, labels)
      if (!result.added.length) throw new Error('The provider returned no usable ideas.')
      commit(result.map)
      setSelectedId(result.added[0].id)
      notify(`Added ${result.added.length} AI idea${result.added.length === 1 ? '' : 's'}`)
    } catch (cause) {
      notify(cause.message || 'The node could not be expanded', 'error')
    } finally {
      setBusyNodeId(null)
    }
  }, [map, providerReady, onExpandNode, onOpenSettings, commit, notify])

  /* ------------------------------- navigation ------------------------------ */

  const moveSelection = useCallback((direction) => {
    const node = selectedNode
    if (!node) return
    const positioned = canvasRef.current?.getLayout()?.nodes || []
    const sideOf = (nodeId) => positioned.find((item) => item.id === nodeId)?.side ?? 1
    const vertical = map.layout === 'down'
    const isRoot = !node.parentId
    const children = childrenOf(map.nodes, node.id)
    const towardChild = vertical ? 'down' : sideOf(node.id) === -1 ? 'left' : 'right'
    const towardParent = vertical ? 'up' : towardChild === 'left' ? 'right' : 'left'

    if (!vertical && isRoot && (direction === 'left' || direction === 'right')) {
      const wanted = direction === 'left' ? -1 : 1
      const target = children.find((child) => sideOf(child.id) === wanted) || children[0]
      if (node.collapsed) { collapse(node.id); return }
      if (target) setSelectedId(target.id)
      return
    }
    if (direction === towardChild) {
      if (node.collapsed) { collapse(node.id); return }
      if (children[0]) setSelectedId(children[0].id)
      return
    }
    if (direction === towardParent) {
      if (node.parentId) setSelectedId(node.parentId)
      return
    }

    const siblings = siblingsOf(map.nodes, node.id)
    const position = siblings.findIndex((item) => item.id === node.id)
    const step = direction === 'up' || direction === 'left' ? -1 : 1
    const next = siblings[position + step]
    if (next) setSelectedId(next.id)
  }, [map, selectedNode, collapse])

  /* -------------------------------- shortcuts ------------------------------ */

  useEffect(() => {
    const onKeyDown = (event) => {
      const typing = event.target instanceof HTMLElement && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable)
      const meta = event.ctrlKey || event.metaKey

      if (meta && event.key.toLowerCase() === 'f') { event.preventDefault(); setSearchOpen(true); requestAnimationFrame(() => searchRef.current?.focus()); return }
      if (meta && event.key.toLowerCase() === 'z' && !event.shiftKey) { event.preventDefault(); undo(); return }
      if (meta && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) { event.preventDefault(); redo(); return }
      if (meta && event.key.toLowerCase() === 's') { event.preventDefault(); notify('Every change is saved automatically'); return }
      if (meta && event.key.toLowerCase() === 'd' && selectedId && !typing) { event.preventDefault(); duplicateNode(selectedId); return }

      if (typing) {
        if (event.key === 'Escape') { event.target.blur?.(); if (searchOpen && event.target === searchRef.current) { setSearchOpen(false); setQuery('') } }
        return
      }

      if (event.key === 'Escape') {
        if (menu) { setMenu(null); return }
        if (shortcutsOpen) { setShortcutsOpen(false); return }
        if (exportOpen) { setExportOpen(false); return }
        if (searchOpen) { setSearchOpen(false); setQuery(''); return }
        if (focusMode) { setFocusMode(false); return }
        onClose()
        return
      }

      switch (event.key) {
        case 'Tab': event.preventDefault(); if (selectedId) addChild(selectedId); break
        case 'Enter': event.preventDefault(); if (selectedId) addSibling(selectedId); break
        case 'F2': event.preventDefault(); if (selectedId) setEditingId(selectedId); break
        case 'Delete': case 'Backspace': event.preventDefault(); if (selectedId) deleteNode(selectedId); break
        case 'ArrowUp': event.preventDefault(); if (event.altKey && selectedId) commit(reorderNode(map, selectedId, -1)); else moveSelection('up'); break
        case 'ArrowDown': event.preventDefault(); if (event.altKey && selectedId) commit(reorderNode(map, selectedId, 1)); else moveSelection('down'); break
        case 'ArrowLeft': event.preventDefault(); if (event.altKey && selectedId) commit(outdentNode(map, selectedId)); else moveSelection('left'); break
        case 'ArrowRight': event.preventDefault(); if (event.altKey && selectedId) commit(indentNode(map, selectedId)); else moveSelection('right'); break
        case ' ': event.preventDefault(); if (selectedId) collapse(selectedId); break
        case 'f': case 'F': event.preventDefault(); canvasRef.current?.fit(); break
        case 'c': case 'C': event.preventDefault(); canvasRef.current?.center(selectedId); break
        case 'n': case 'N': event.preventDefault(); setInspectorOpen((value) => !value); break
        case 'h': case 'H': event.preventDefault(); canvasRef.current?.toggleToolbar(); break
        case '?': event.preventDefault(); setShortcutsOpen(true); break
        case '+': case '=': event.preventDefault(); canvasRef.current?.zoomIn(); break
        case '-': event.preventDefault(); canvasRef.current?.zoomOut(); break
        default: break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [addChild, addSibling, collapse, commit, deleteNode, duplicateNode, exportOpen, focusMode, map, menu, moveSelection, notify, onClose, redo, searchOpen, selectedId, shortcutsOpen, undo])

  useEffect(() => { if (!matches.length) return; setMatchIndex((current) => Math.min(current, matches.length - 1)) }, [matches])
  useEffect(() => { if (matches.length) { const target = matches[Math.min(matchIndex, matches.length - 1)]; setSelectedId(target); canvasRef.current?.center(target) } }, [matchIndex, matches])
  useEffect(() => { const onClick = () => setMenu(null); if (!menu) return undefined; window.addEventListener('click', onClick); return () => window.removeEventListener('click', onClick) }, [menu])

  /* --------------------------------- exports ------------------------------- */

  const exportAs = async (kind) => {
    setExportOpen(false)
    try {
      if (kind === 'json') downloadJson(map, mindMapFileName(map, 'json'))
      else if (kind === 'markdown') downloadText(mindMapToMarkdown(map), mindMapFileName(map, 'md'), 'text/markdown')
      else if (kind === 'text') downloadText(mindMapToOutlineText(map), mindMapFileName(map, 'txt'))
      else if (kind === 'svg') downloadText(mindMapToSvg(map, { dark }), mindMapFileName(map, 'svg'), 'image/svg+xml')
      else if (kind === 'png') downloadBlob(await svgToPngBlob(mindMapToSvg(map, { dark })), mindMapFileName(map, 'png'))
      else if (kind === 'clipboard') { await navigator.clipboard.writeText(mindMapToMarkdown(map)); notify('Outline copied to clipboard'); return }
      notify('Export downloaded')
    } catch (cause) {
      notify(cause.message || 'The export failed', 'error')
    }
  }

  const nodeActions = useMemo(() => ({
    onAddChild: (nodeId) => addChild(nodeId),
    onExpandAi: expandWithAi,
    onSetNote: setNote,
    onSetColor: setColor,
    onDuplicate: duplicateNode,
    onDelete: deleteNode,
    onOpenInspector: (nodeId) => { setSelectedId(nodeId); setInspectorOpen(true) },
  }), [addChild, expandWithAi, setNote, setColor, duplicateNode, deleteNode])

  const contextActions = useMemo(() => {
    const node = menu?.nodeId ? findNode(map.nodes, menu.nodeId) : null
    if (!node) return []
    const isRoot = !node.parentId
    return [
      { icon: <Plus size={15} />, label: 'Add child', hint: 'Tab', run: () => addChild(node.id) },
      ...(isRoot ? [] : [{ icon: <Plus size={15} />, label: 'Add sibling', hint: 'Enter', run: () => addSibling(node.id) }]),
      { icon: <TextAa size={15} />, label: 'Rename', hint: 'F2', run: () => setEditingId(node.id) },
      { icon: <MagicWand size={15} />, label: 'Expand with AI', run: () => expandWithAi(node.id) },
      ...(node.childCount || map.nodes.some((item) => item.parentId === node.id) ? [{ icon: <ArrowsInSimple size={15} />, label: node.collapsed ? 'Expand branch' : 'Collapse branch', hint: 'Space', run: () => collapse(node.id) }] : []),
      ...(isRoot ? [] : [
        { icon: <Copy size={15} />, label: 'Duplicate', hint: 'Ctrl+D', run: () => duplicateNode(node.id) },
        { icon: <ArrowLeft size={15} />, label: 'Outdent', hint: 'Alt+←', run: () => commit(outdentNode(map, node.id)) },
        { icon: <ArrowRight size={15} />, label: 'Indent', hint: 'Alt+→', run: () => commit(indentNode(map, node.id)) },
        { icon: <Trash size={15} />, label: 'Delete', hint: 'Del', run: () => deleteNode(node.id), danger: true },
      ]),
    ]
  }, [menu, map, addChild, addSibling, collapse, commit, deleteNode, duplicateNode, expandWithAi])

  return <div className="fixed inset-0 z-[60] flex flex-col bg-slate-100 font-sans text-sm text-slate-800 dark:bg-slate-950 dark:text-slate-100">
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-1.5 border-b border-slate-200 bg-white px-2 dark:border-slate-800 dark:bg-slate-900 sm:gap-2 sm:px-3">
      <button type="button" onClick={onClose} className={secondary}><ArrowLeft size={16} /><span className="hidden sm:inline">Mind maps</span></button>
      <div className="min-w-0 flex-1">
        <input
          value={map.title}
          onChange={(event) => commit(updateNode(map, map.nodes[0].id, { label: event.target.value }), { coalesceKey: 'title' })}
          maxLength={MIND_MAP_LIMITS.label}
          aria-label="Mind map title"
          className="w-full truncate rounded-md bg-transparent px-1 text-base font-semibold outline-none transition-colors duration-300 hover:bg-slate-100 focus:bg-slate-100 focus:ring-2 focus:ring-purple-500/20 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
        />
        <p className="px-1 text-xs text-slate-500">{stats.nodes} nodes · {stats.branches} branches · depth {stats.depth} · saved {formatRelative(map.updatedAt)}</p>
      </div>

      <button type="button" onClick={undo} disabled={!historySize.past} aria-label="Undo" title="Undo (Ctrl+Z)" className={iconButton}><ArrowCounterClockwise size={17} /></button>
      <button type="button" onClick={redo} disabled={!historySize.future} aria-label="Redo" title="Redo (Ctrl+Shift+Z)" className={iconButton}><ArrowClockwise size={17} /></button>
      <button type="button" onClick={() => { setSearchOpen((value) => !value); requestAnimationFrame(() => searchRef.current?.focus()) }} aria-pressed={searchOpen} aria-label="Search nodes" title="Search (Ctrl+F)" className={iconButton}><MagnifyingGlass size={17} /></button>
      <button type="button" onClick={() => commit(setAllCollapsed(map, true))} aria-label="Collapse all branches" title="Collapse all" className={`${iconButton} hidden sm:flex`}><ArrowsInSimple size={17} /></button>
      <button type="button" onClick={() => commit(setAllCollapsed(map, false))} aria-label="Expand all branches" title="Expand all" className={`${iconButton} hidden sm:flex`}><ArrowsOutSimple size={17} /></button>
      <button type="button" onClick={() => setFocusMode((value) => !value)} aria-pressed={focusMode} aria-label="Focus on selected branch" title="Focus mode" className={`${iconButton} ${focusMode ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/15' : ''}`}><Eye size={17} /></button>

      <div className="relative">
        <button type="button" onClick={(event) => { event.stopPropagation(); setExportOpen((value) => !value) }} aria-expanded={exportOpen} aria-label="Export mind map" title="Export" className={iconButton}><DownloadSimple size={17} /></button>
        {exportOpen && <div role="menu" onClick={(event) => event.stopPropagation()} className={`absolute right-0 top-11 z-40 w-56 space-y-0.5 p-1.5 ${panel}`}>
          <button type="button" role="menuitem" onClick={() => exportAs('png')} className={menuItem}><ImageIcon size={15} />PNG image</button>
          <button type="button" role="menuitem" onClick={() => exportAs('svg')} className={menuItem}><Path size={15} />SVG vector</button>
          <button type="button" role="menuitem" onClick={() => exportAs('markdown')} className={menuItem}><FileText size={15} />Markdown outline</button>
          <button type="button" role="menuitem" onClick={() => exportAs('text')} className={menuItem}><TextAa size={15} />Plain text outline</button>
          <button type="button" role="menuitem" onClick={() => exportAs('json')} className={menuItem}><FloppyDisk size={15} />JSON backup</button>
          <button type="button" role="menuitem" onClick={() => exportAs('clipboard')} className={menuItem}><Copy size={15} />Copy outline</button>
        </div>}
      </div>

      <button type="button" onClick={() => setInspectorOpen((value) => !value)} aria-pressed={inspectorOpen} aria-label="Toggle inspector panel" title="Layout, theme and ordering panel (N)" className={`${iconButton} ${inspectorOpen ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/15' : ''}`}><SidebarIcon size={17} /></button>
      <button type="button" onClick={() => setShortcutsOpen(true)} aria-label="Keyboard shortcuts" title="Shortcuts (?)" className={`${iconButton} hidden sm:flex`}><Info size={17} /></button>
      <button type="button" onClick={() => { onDelete(map.id); onClose() }} aria-label="Delete mind map" title="Delete map" className={iconButton}><Trash size={17} /></button>
    </header>

    {searchOpen && <div className="relative z-30 flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
      <MagnifyingGlass size={16} className="text-slate-400" />
      <input
        ref={searchRef}
        value={query}
        onChange={(event) => { setQuery(event.target.value); setMatchIndex(0) }}
        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); setMatchIndex((current) => matches.length ? (current + (event.shiftKey ? -1 + matches.length : 1)) % matches.length : 0) } }}
        placeholder="Search labels and notes…"
        aria-label="Search nodes"
        className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
      />
      <span className="shrink-0 text-xs tabular-nums text-slate-500">{matches.length ? `${matchIndex + 1} / ${matches.length}` : query ? 'No matches' : ''}</span>
      <button type="button" onClick={() => setMatchIndex((current) => matches.length ? (current - 1 + matches.length) % matches.length : 0)} disabled={!matches.length} aria-label="Previous match" className={iconButton}><ArrowLeft size={15} /></button>
      <button type="button" onClick={() => setMatchIndex((current) => matches.length ? (current + 1) % matches.length : 0)} disabled={!matches.length} aria-label="Next match" className={iconButton}><ArrowRight size={15} /></button>
      <button type="button" onClick={() => { setSearchOpen(false); setQuery('') }} aria-label="Close search" className={iconButton}><X size={15} /></button>
    </div>}

    <div className="relative flex min-h-0 flex-1">
      <div className="relative min-w-0 flex-1">
        <MindMapCanvas
          ref={canvasRef}
          map={map}
          dark={dark}
          selectedId={selectedId}
          editingId={editingId}
          highlightIds={matchSet}
          focusModeId={focusMode ? selectedId : null}
          busyNodeId={busyNodeId}
          nodeActions={nodeActions}
          onSelect={(nodeId) => { setSelectedId(nodeId || map.nodes[0]?.id); setEditingId(null) }}
          onStartEdit={setEditingId}
          onCommitEdit={renameNode}
          onCancelEdit={() => setEditingId(null)}
          onAddChild={(parentId) => addChild(parentId)}
          onToggleCollapse={collapse}
          onMoveNode={reparent}
          onOpenContextMenu={(position) => { if (position.nodeId) setSelectedId(position.nodeId); setMenu(position) }}
        />

        {breadcrumb.length > 1 && <nav aria-label="Selected node path" className={`absolute left-3 top-3 z-20 flex max-w-[min(70%,520px)] items-center gap-1 overflow-x-auto px-2 py-1.5 ${panel}`}>
          {breadcrumb.map((node, index) => <span key={node.id} className="flex shrink-0 items-center gap-1">
            {index > 0 && <span aria-hidden="true" className="text-slate-300">/</span>}
            <button type="button" onClick={() => { setSelectedId(node.id); canvasRef.current?.center(node.id) }} className={`max-w-40 truncate rounded px-1 text-xs font-medium transition-colors duration-300 hover:text-purple-700 dark:hover:text-purple-300 ${index === breadcrumb.length - 1 ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500'}`}>{node.label}</button>
          </span>)}
        </nav>}

        {busyNodeId && <p role="status" className={`absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-2 px-3 py-2 text-xs font-medium ${panel}`}>
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-purple-300 border-t-purple-700 motion-reduce:animate-none" />Expanding with AI…
        </p>}

        {toast && <p key={toast.key} role="status" className={`absolute bottom-16 left-1/2 z-30 -translate-x-1/2 rounded-lg px-3 py-2 text-xs font-medium shadow-lg ${toast.tone === 'error' ? 'bg-purple-700 text-white' : 'bg-slate-950 text-white dark:bg-white dark:text-slate-900'}`}>{toast.message}</p>}

        {menu && <div role="menu" style={{ left: Math.min(menu.x, window.innerWidth - 220), top: Math.min(menu.y, window.innerHeight - 60 - contextActions.length * 38) }} onClick={(event) => event.stopPropagation()} className={`fixed z-50 w-52 space-y-0.5 p-1.5 ${panel}`}>
          {contextActions.length ? contextActions.map((action) => <button
            key={action.label}
            type="button"
            role="menuitem"
            onClick={() => { action.run(); setMenu(null) }}
            className={`${menuItem} justify-between ${action.danger ? 'text-purple-700 dark:text-purple-300' : ''}`}
          ><span className="flex items-center gap-2">{action.icon}{action.label}</span>{action.hint && <span className="text-[11px] text-slate-400">{action.hint}</span>}</button>)
            : <button type="button" role="menuitem" onClick={() => { canvasRef.current?.fit(); setMenu(null) }} className={menuItem}><ArrowsOutSimple size={15} />Fit to screen</button>}
        </div>}
      </div>

      {inspectorOpen && <Inspector
        map={map}
        node={selectedNode}
        busy={busyNodeId === selectedNode?.id}
        providerReady={providerReady}
        onSelect={(nodeId) => { setSelectedId(nodeId); canvasRef.current?.center(nodeId) }}
        onRename={renameNode}
        onNote={setNote}
        onColor={setColor}
        onAddChild={addChild}
        onDelete={deleteNode}
        onDuplicate={duplicateNode}
        onExpand={expandWithAi}
        onReorder={(nodeId, direction) => commit(reorderNode(map, nodeId, direction))}
        onIndent={(nodeId) => commit(indentNode(map, nodeId))}
        onOutdent={(nodeId) => commit(outdentNode(map, nodeId))}
        onLayout={(layout) => commit({ ...map, layout, updatedAt: Date.now() })}
        onTheme={(theme) => commit({ ...map, theme, updatedAt: Date.now() })}
        onClose={() => setInspectorOpen(false)}
      />}
    </div>

    {shortcutsOpen && <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />}
  </div>
}

/* ================================= inspector ================================ */

function Inspector({ map, node, onSelect, onRename, onNote, onReorder, onIndent, onOutdent, onLayout, onTheme, onClose }) {
  const [label, setLabel] = useState(node?.label || '')
  const [note, setNote] = useState(node?.note || '')
  const children = useMemo(() => (node ? childrenOf(map.nodes, node.id) : []), [map.nodes, node])
  const siblings = useMemo(() => (node ? siblingsOf(map.nodes, node.id) : []), [map.nodes, node])
  const position = siblings.findIndex((item) => item.id === node?.id)

  useEffect(() => { setLabel(node?.label || ''); setNote(node?.note || '') }, [node?.id, node?.label, node?.note])
  if (!node) return null
  const isRoot = !node.parentId

  return <aside aria-label="Node inspector" className="z-20 flex w-full max-w-full shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:w-80">
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-sm font-semibold">Inspector</h2>
      <button type="button" onClick={onClose} aria-label="Close inspector" className={iconButton}><X size={16} /></button>
    </div>

    <label className="mt-3 block">
      <span className="text-[13px] font-medium">Label</span>
      <textarea
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        onBlur={() => { const value = label.trim(); if (value && value !== node.label) onRename(node.id, value); else setLabel(node.label) }}
        onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.target.blur() } }}
        rows="2"
        maxLength={MIND_MAP_LIMITS.label}
        className={`${field} mt-1 h-auto resize-y p-2`}
      />
    </label>

    <label className="mt-3 block">
      <span className="flex items-center gap-1.5 text-[13px] font-medium"><NotePencil size={14} />Note</span>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        onBlur={() => { if (note !== (node.note || '')) onNote(node.id, note) }}
        rows="4"
        maxLength={MIND_MAP_LIMITS.note}
        placeholder="Details, links, or context for this node…"
        className={`${field} mt-1 h-auto resize-y p-2`}
      />
      <span className="mt-1 block text-right text-[11px] tabular-nums text-slate-400">{note.length} / {MIND_MAP_LIMITS.note}</span>
    </label>

    {!isRoot && <div className="mt-4">
      <h3 className="text-[13px] font-medium">Position <span className="font-normal text-slate-400">({position + 1} of {siblings.length})</span></h3>
      <p className="mt-1 flex items-start gap-1.5 text-xs leading-4 text-slate-500"><HandGrabbing size={14} className="mt-0.5 shrink-0" />Drag the node on the canvas to reorder it or drop it onto a new parent.</p>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <button type="button" onClick={() => onReorder(node.id, -1)} disabled={position <= 0} className={secondary}><ArrowUp size={15} />Move up</button>
        <button type="button" onClick={() => onReorder(node.id, 1)} disabled={position < 0 || position >= siblings.length - 1} className={secondary}><ArrowDown size={15} />Move down</button>
        <button type="button" onClick={() => onOutdent(node.id)} className={secondary}><ArrowLineLeft size={15} />Outdent</button>
        <button type="button" onClick={() => onIndent(node.id)} disabled={position <= 0} className={secondary}><ArrowLineRight size={15} />Indent</button>
      </div>
    </div>}

    {Boolean(children.length) && <div className="mt-4">
      <h3 className="text-[13px] font-medium">Children <span className="text-slate-400">({children.length})</span></h3>
      <ul className="mt-1 space-y-0.5">
        {children.map((child) => <li key={child.id}>
          <button type="button" onClick={() => onSelect(child.id)} className="flex min-h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-[13px] transition-colors duration-300 ease-out hover:bg-purple-100 hover:text-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10 dark:hover:bg-purple-500/15">
            <Minus size={12} className="shrink-0 text-slate-400" /><span className="truncate">{child.label}</span>
          </button>
        </li>)}
      </ul>
    </div>}

    <div className="mt-auto space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
      <fieldset>
        <legend className="text-[13px] font-medium">Layout</legend>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {MIND_MAP_LAYOUTS.map((item) => <button key={item.id} type="button" role="radio" aria-checked={map.layout === item.id} title={item.description} onClick={() => onLayout(item.id)} className={`${chip} ${map.layout === item.id ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-purple-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-purple-500/15'}`}>{item.name}</button>)}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-[13px] font-medium">Theme</legend>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {Object.entries(MIND_MAP_THEMES).map(([key, value]) => <button key={key} type="button" role="radio" aria-checked={map.theme === key} onClick={() => onTheme(key)} className={`${chip} gap-1 ${map.theme === key ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-purple-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-purple-500/15'}`}>
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: value.root }} />{value.name}
          </button>)}
        </div>
      </fieldset>
    </div>
  </aside>
}

/* ================================= shortcuts ================================ */

const SHORTCUTS = [
  ['Tab', 'Add child node'],
  ['Enter', 'Add sibling node'],
  ['F2 / double-click', 'Rename node'],
  ['Delete', 'Delete node and its branch'],
  ['Arrow keys', 'Move between nodes'],
  ['Alt + ↑ / ↓', 'Reorder among siblings'],
  ['Alt + ← / →', 'Outdent / indent'],
  ['Space', 'Collapse or expand branch'],
  ['Ctrl + Z / Ctrl + Shift + Z', 'Undo / redo'],
  ['Ctrl + D', 'Duplicate branch'],
  ['Ctrl + F', 'Search nodes'],
  ['F', 'Fit map to screen'],
  ['C', 'Center on selection'],
  ['N', 'Open the layout and ordering panel'],
  ['Click node', 'Show its actions on the canvas'],
  ['H', 'Hide or show the node actions'],
  ['+ / −', 'Zoom in and out'],
  ['Drag node', 'Reorder it or drop it onto a new parent'],
  ['Right-click', 'Node actions menu'],
  ['Escape', 'Close panel or leave the editor'],
]

function ShortcutsDialog({ onClose }) {
  useEffect(() => { const onKeyDown = (event) => { if (event.key === 'Escape') onClose() }; window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown) }, [onClose])
  return <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }} className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/50 px-3 py-6 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-labelledby="shortcuts-title" className="my-auto w-full max-w-md rounded-xl bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.28)] dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h2 id="shortcuts-title" className="text-base font-semibold">Keyboard shortcuts</h2>
        <button type="button" onClick={onClose} aria-label="Close shortcuts" className={iconButton}><X size={17} /></button>
      </div>
      <dl className="mt-3 space-y-1">
        {SHORTCUTS.map(([keys, description]) => <div key={keys} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 odd:bg-slate-50 dark:odd:bg-slate-800/50">
          <dt className="shrink-0 font-mono text-xs text-purple-700 dark:text-purple-300">{keys}</dt>
          <dd className="text-right text-[13px] text-slate-600 dark:text-slate-300">{description}</dd>
        </div>)}
      </dl>
    </section>
  </div>
}
