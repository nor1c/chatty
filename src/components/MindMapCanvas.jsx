import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { ArrowsOut, Crosshair, DotsThree, Minus, Plus } from '@phosphor-icons/react'
import { layoutMindMap, nodeColors, withAlpha } from '../lib/mindmap'
import MindMapNodeToolbar, { TOOLBAR_HALF_WIDTH } from './MindMapNodeToolbar'
import { iconButton, panel } from './mindmapStyles'

const MIN_SCALE = 0.2
const MAX_SCALE = 2.6
const clampScale = (value) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value))
const DRAG_THRESHOLD = 5

const MindMapCanvas = forwardRef(function MindMapCanvas({
  map,
  dark,
  selectedId,
  editingId,
  highlightIds,
  focusModeId,
  showMinimap = true,
  nodeActions,
  busyNodeId,
  onSelect,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onAddChild,
  onToggleCollapse,
  onMoveNode,
  onOpenContextMenu,
}, ref) {
  const viewportRef = useRef(null)
  const editorRef = useRef(null)
  const gestureRef = useRef(null)
  const pointersRef = useRef(new Map())
  const viewRef = useRef({ scale: 1, x: 0, y: 0 })
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 })
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [dragState, setDragState] = useState(null)
  const [toolbarHidden, setToolbarHidden] = useState(false)
  const dragFrameRef = useRef(0)
  const dropRef = useRef(null)
  const [panning, setPanning] = useState(false)
  const [editingValue, setEditingValue] = useState('')

  const layout = useMemo(
    () => layoutMindMap(map?.nodes || [], { layout: map?.layout, theme: map?.theme }),
    [map?.nodes, map?.layout, map?.theme],
  )
  const nodeById = useMemo(() => new Map(layout.nodes.map((node) => [node.id, node])), [layout.nodes])
  const dimmedIds = useMemo(() => {
    if (!focusModeId || !nodeById.has(focusModeId)) return null
    const keep = new Set([focusModeId])
    let changed = true
    while (changed) {
      changed = false
      for (const node of layout.nodes) {
        if (!keep.has(node.id) && node.parentId && keep.has(node.parentId)) { keep.add(node.id); changed = true }
      }
    }
    let current = nodeById.get(focusModeId)
    while (current?.parentId) { keep.add(current.parentId); current = nodeById.get(current.parentId) }
    return new Set(layout.nodes.filter((node) => !keep.has(node.id)).map((node) => node.id))
  }, [focusModeId, layout.nodes, nodeById])

  const applyView = useCallback((next) => {
    const value = typeof next === 'function' ? next(viewRef.current) : next
    const safe = { scale: clampScale(value.scale), x: value.x, y: value.y }
    viewRef.current = safe
    setView(safe)
  }, [])

  const fitToView = useCallback((padding = 56) => {
    const viewport = viewportRef.current
    if (!viewport || !layout.nodes.length) return
    const width = viewport.clientWidth
    const height = viewport.clientHeight
    if (!width || !height) return
    const scale = clampScale(Math.min((width - padding * 2) / Math.max(1, layout.contentWidth), (height - padding * 2) / Math.max(1, layout.contentHeight), 1.4))
    applyView({ scale, x: width / 2 - (layout.padding + layout.contentWidth / 2) * scale, y: height / 2 - (layout.padding + layout.contentHeight / 2) * scale })
  }, [applyView, layout.contentHeight, layout.contentWidth, layout.nodes.length, layout.padding])

  // Opening a map starts at true 100% zoom, centred on the root, so labels are always
  // readable. Fit-to-screen stays available on demand for a whole-map overview.
  const resetToDefaultView = useCallback(() => {
    const viewport = viewportRef.current
    const root = layout.nodes[0]
    if (!viewport || !root) return
    const width = viewport.clientWidth
    const height = viewport.clientHeight
    if (!width || !height) return
    applyView({ scale: 1, x: width / 2 - root.x, y: height / 2 - root.y })
  }, [applyView, layout.nodes])

  const centerOnNode = useCallback((nodeId, options = {}) => {
    const viewport = viewportRef.current
    const node = nodeById.get(nodeId)
    if (!viewport || !node) return
    const { scale } = viewRef.current
    const targetScale = options.scale ? clampScale(options.scale) : scale
    applyView({ scale: targetScale, x: viewport.clientWidth / 2 - node.x * targetScale, y: viewport.clientHeight / 2 - node.y * targetScale })
  }, [applyView, nodeById])

  const revealNode = useCallback((nodeId) => {
    const viewport = viewportRef.current
    const node = nodeById.get(nodeId)
    if (!viewport || !node) return
    const { scale, x, y } = viewRef.current
    const margin = 90
    const screenX = node.x * scale + x
    const screenY = node.y * scale + y
    const halfWidth = (node.width * scale) / 2
    const halfHeight = (node.height * scale) / 2
    let nextX = x
    let nextY = y
    if (screenX - halfWidth < margin) nextX = x + (margin - (screenX - halfWidth))
    else if (screenX + halfWidth > viewport.clientWidth - margin) nextX = x - ((screenX + halfWidth) - (viewport.clientWidth - margin))
    if (screenY - halfHeight < margin) nextY = y + (margin - (screenY - halfHeight))
    else if (screenY + halfHeight > viewport.clientHeight - margin) nextY = y - ((screenY + halfHeight) - (viewport.clientHeight - margin))
    if (nextX !== x || nextY !== y) applyView({ scale, x: nextX, y: nextY })
  }, [applyView, nodeById])

  const zoomAt = useCallback((factor, origin) => {
    const viewport = viewportRef.current
    if (!viewport) return
    const rect = viewport.getBoundingClientRect()
    const point = origin || { x: rect.width / 2, y: rect.height / 2 }
    applyView((current) => {
      const scale = clampScale(current.scale * factor)
      const ratio = scale / current.scale
      return { scale, x: point.x - (point.x - current.x) * ratio, y: point.y - (point.y - current.y) * ratio }
    })
  }, [applyView])

  useImperativeHandle(ref, () => ({
    fit: fitToView,
    center: centerOnNode,
    reveal: revealNode,
    zoomIn: () => zoomAt(1.2),
    zoomOut: () => zoomAt(1 / 1.2),
    resetZoom: resetToDefaultView,
    getScale: () => viewRef.current.scale,
    getLayout: () => layout,
    focusViewport: () => viewportRef.current?.focus(),
    toggleToolbar: () => setToolbarHidden((value) => !value),
  }), [centerOnNode, fitToView, layout, resetToDefaultView, revealNode, zoomAt])

  useEffect(() => () => { if (dragFrameRef.current) cancelAnimationFrame(dragFrameRef.current) }, [])

  // Hiding is a per-selection choice: picking another node brings the actions back.
  useEffect(() => { setToolbarHidden(false) }, [selectedId])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(() => setViewportSize({ width: viewport.clientWidth, height: viewport.clientHeight }))
    observer.observe(viewport)
    setViewportSize({ width: viewport.clientWidth, height: viewport.clientHeight })
    return () => observer.disconnect()
  }, [])

  const defaultViewRef = useRef(resetToDefaultView)
  const revealRef = useRef(revealNode)
  useEffect(() => { defaultViewRef.current = resetToDefaultView; revealRef.current = revealNode }, [resetToDefaultView, revealNode])

  // Reset only when a different map or layout mode is opened. Collapsing, expanding,
  // editing, or theming must never move the viewport the reader already chose.
  useEffect(() => { const frame = requestAnimationFrame(() => defaultViewRef.current()); return () => cancelAnimationFrame(frame) }, [map?.id, map?.layout])
  useEffect(() => { if (selectedId && !editingId) revealRef.current(selectedId) }, [selectedId, editingId])
  useEffect(() => {
    if (!editingId) return
    setEditingValue(nodeById.get(editingId)?.label || '')
    const frame = requestAnimationFrame(() => { editorRef.current?.focus(); editorRef.current?.select() })
    return () => cancelAnimationFrame(frame)
  }, [editingId, nodeById])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return undefined
    const onWheel = (event) => {
      event.preventDefault()
      const rect = viewport.getBoundingClientRect()
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top }
      if (event.ctrlKey || event.metaKey) { zoomAt(event.deltaY < 0 ? 1.12 : 1 / 1.12, point); return }
      if (event.shiftKey) { applyView((current) => ({ ...current, x: current.x - (event.deltaY || event.deltaX) })); return }
      applyView((current) => ({ ...current, x: current.x - event.deltaX, y: current.y - event.deltaY }))
    }
    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', onWheel)
  }, [applyView, zoomAt])

  const pointFromEvent = (event) => {
    const rect = viewportRef.current.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const startPan = (event) => {
    if (event.target.closest('[data-node-id]') || event.target.closest('button')) return
    if (event.button !== 0 && event.button !== 1) return
    const viewport = viewportRef.current
    viewport.setPointerCapture(event.pointerId)
    pointersRef.current.set(event.pointerId, pointFromEvent(event))
    if (pointersRef.current.size === 2) {
      const [first, second] = [...pointersRef.current.values()]
      gestureRef.current = {
        type: 'pinch',
        distance: Math.hypot(first.x - second.x, first.y - second.y) || 1,
        center: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
        origin: { ...viewRef.current },
      }
      setPanning(false)
      return
    }
    gestureRef.current = { type: 'pan', pointerId: event.pointerId, start: pointFromEvent(event), origin: { ...viewRef.current } }
    setPanning(true)
    if (event.button === 0 && event.target === viewport.firstChild) onSelect?.(null)
  }

  const startNodeDrag = (event, node) => {
    if (event.button !== 0 || editingId === node.id) return
    event.stopPropagation()
    const viewport = viewportRef.current
    viewport.setPointerCapture(event.pointerId)
    const subtree = new Set([node.id])
    let changed = true
    while (changed) {
      changed = false
      for (const candidate of layout.nodes) {
        if (!subtree.has(candidate.id) && candidate.parentId && subtree.has(candidate.parentId)) { subtree.add(candidate.id); changed = true }
      }
    }
    gestureRef.current = {
      type: 'node',
      pointerId: event.pointerId,
      nodeId: node.id,
      draggable: Boolean(node.parentId) && Boolean(onMoveNode),
      start: pointFromEvent(event),
      subtree,
      moved: false,
    }
  }

  // Pointer events can outpace the display, so drag updates are coalesced to one per frame.
  const scheduleDragState = (next) => {
    // The drop reads this ref, so a frame that has not painted yet can never lose the last hit test.
    dropRef.current = next
    if (dragFrameRef.current) cancelAnimationFrame(dragFrameRef.current)
    dragFrameRef.current = requestAnimationFrame(() => { dragFrameRef.current = 0; setDragState(next) })
  }

  const clearDragState = () => {
    if (dragFrameRef.current) { cancelAnimationFrame(dragFrameRef.current); dragFrameRef.current = 0 }
    dropRef.current = null
    setDragState(null)
  }

  const movePointer = (event) => {
    const gesture = gestureRef.current
    if (pointersRef.current.has(event.pointerId)) pointersRef.current.set(event.pointerId, pointFromEvent(event))
    if (gesture?.type === 'pinch') {
      if (pointersRef.current.size < 2) return
      const [first, second] = [...pointersRef.current.values()]
      const distance = Math.hypot(first.x - second.x, first.y - second.y) || 1
      const scale = clampScale(gesture.origin.scale * (distance / gesture.distance))
      const ratio = scale / gesture.origin.scale
      applyView({ scale, x: gesture.center.x - (gesture.center.x - gesture.origin.x) * ratio, y: gesture.center.y - (gesture.center.y - gesture.origin.y) * ratio })
      return
    }
    if (!gesture || gesture.pointerId !== event.pointerId) return
    const point = pointFromEvent(event)
    if (gesture.type === 'pan') {
      applyView({ scale: gesture.origin.scale, x: gesture.origin.x + (point.x - gesture.start.x), y: gesture.origin.y + (point.y - gesture.start.y) })
      return
    }
    const distance = Math.hypot(point.x - gesture.start.x, point.y - gesture.start.y)
    if (!gesture.moved && distance < DRAG_THRESHOLD) return
    if (!gesture.draggable) return
    gesture.moved = true
    const { scale, x, y } = viewRef.current
    const canvasPoint = { x: (point.x - x) / scale, y: (point.y - y) / scale }
    const vertical = layout.layout === 'down'
    const edge = 22

    // The dragged bubble follows the cursor in canvas units, so it stays under the
    // pointer at any zoom level. The grabbed offset keeps it from snapping to centre.
    const offsetPoint = { x: (point.x - gesture.start.x) / scale, y: (point.y - gesture.start.y) / scale }

    // Hit test with a margin so the reorder bands sit just outside each node.
    const target = layout.nodes.find((node) => node.id !== gesture.nodeId
      && Math.abs(canvasPoint.x - node.x) <= node.width / 2 + edge
      && Math.abs(canvasPoint.y - node.y) <= node.height / 2 + edge)

    const base = { nodeId: gesture.nodeId, point, offset: offsetPoint, subtree: gesture.subtree }
    if (!target) { scheduleDragState({ ...base, targetId: null, position: null, invalid: false }); return }
    if (isAncestorOf(nodeById, gesture.nodeId, target.id)) {
      scheduleDragState({ ...base, targetId: null, position: null, invalid: true })
      return
    }

    // The axis that stacks siblings decides reorder; the other axis means "nest inside".
    const edgeOffset = vertical ? canvasPoint.x - target.x : canvasPoint.y - target.y
    const half = (vertical ? target.width : target.height) / 2
    const position = !target.parentId || Math.abs(edgeOffset) < half * 0.62 ? 'inside' : edgeOffset < 0 ? 'before' : 'after'
    scheduleDragState({ ...base, targetId: target.id, position, invalid: false })
  }

  const endPointer = (event) => {
    const gesture = gestureRef.current
    pointersRef.current.delete(event.pointerId)
    if (gesture?.type === 'pinch') { if (pointersRef.current.size < 2) gestureRef.current = null; setPanning(false); return }
    if (!gesture || gesture.pointerId !== event.pointerId) { setPanning(false); return }
    gestureRef.current = null
    setPanning(false)
    if (gesture.type === 'pan') return
    if (gesture.moved) {
      const drop = dropRef.current
      if (drop?.targetId) onMoveNode?.(gesture.nodeId, drop.targetId, drop.position || 'inside')
      clearDragState()
      return
    }
    clearDragState()
    onSelect?.(gesture.nodeId)
  }

  const commitEdit = () => {
    const value = editingValue.trim()
    if (value) onCommitEdit?.(editingId, value)
    else onCancelEdit?.()
  }

  const minimap = showMinimap && layout.nodes.length > 1 && viewportSize.width > 640
  const minimapScale = minimap ? Math.min(184 / layout.width, 128 / layout.height) : 0

  return <section data-no-selection-toolbar="true" aria-label="Mind map canvas" className="relative h-full w-full select-none overflow-hidden bg-slate-50 dark:bg-slate-950">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-60 dark:opacity-25" style={{ backgroundImage: `radial-gradient(${dark ? 'rgba(148,163,184,0.28)' : 'rgba(168,85,247,0.35)'} 1px, transparent 1px)`, backgroundSize: `${24 * view.scale}px ${24 * view.scale}px`, backgroundPosition: `${view.x}px ${view.y}px` }} />

    <div
      ref={viewportRef}
      tabIndex={-1}
      role="application"
      aria-label="Mind map nodes"
      onPointerDown={startPan}
      onPointerMove={movePointer}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onMouseDown={(event) => { if (!event.target.closest('textarea, input')) event.preventDefault() }}
      onContextMenu={(event) => {
        const host = event.target.closest('[data-node-id]')
        event.preventDefault()
        onOpenContextMenu?.({ nodeId: host?.dataset.nodeId || null, x: event.clientX, y: event.clientY })
      }}
      className={`absolute inset-0 touch-none outline-none ${panning ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      <div className="absolute left-0 top-0 origin-top-left will-change-transform" style={{ width: layout.width, height: layout.height, transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})` }}>
        <svg width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`} className="absolute left-0 top-0" aria-hidden="true">
          {layout.edges.map((edge) => {
            const dimmed = dimmedIds?.has(edge.to)
            // An edge travels with the drag only when both ends move, so the edge that
            // links the dragged branch to its old parent stretches instead of detaching.
            const carried = dragState?.subtree?.has(edge.to) && dragState.subtree.has(edge.from)
            const detaching = dragState?.subtree?.has(edge.to) && !carried
            return <path
              key={edge.id}
              d={edge.path}
              fill="none"
              stroke={dark ? withAlpha(edge.color, 0.85) : edge.color}
              strokeWidth={edge.strokeWidth}
              strokeLinecap="round"
              strokeDasharray={detaching ? '6 8' : undefined}
              opacity={dimmed ? 0.12 : detaching ? 0.25 : 0.62}
              className={dragState ? '' : 'transition-opacity duration-300 ease-out'}
              style={carried ? { transform: `translate(${dragState.offset.x}px, ${dragState.offset.y}px)` } : undefined}
            />
          })}
        </svg>

        {layout.nodes.map((node) => {
          const colors = nodeColors(node.accent, dark)
          const isRoot = node.depth === 0
          const selected = selectedId === node.id
          const highlighted = highlightIds?.has(node.id)
          const dimmed = dimmedIds?.has(node.id)
          const dropTarget = dragState?.targetId === node.id
          const nesting = dropTarget && dragState.position === 'inside'
          const dragging = dragState?.nodeId === node.id
          const carried = dragState?.subtree?.has(node.id) && !dragging
          const shift = dragging || carried ? dragState.offset : null
          return <div
            key={node.id}
            data-node-id={node.id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 ${shift ? '' : 'transition-opacity duration-300 ease-out'} ${dimmed ? 'opacity-25' : 'opacity-100'} ${dragging ? 'z-40' : carried ? 'z-30 opacity-70' : ''}`}
            style={{
              left: node.x,
              top: node.y,
              width: node.width,
              height: node.height,
              ...(shift ? { transform: `translate(calc(-50% + ${shift.x}px), calc(-50% + ${shift.y}px))`, willChange: 'transform' } : {}),
            }}
          >
            <div
              role="treeitem"
              tabIndex={-1}
              aria-selected={selected}
              aria-expanded={node.childCount ? !node.collapsed : undefined}
              aria-label={node.label}
              onPointerDown={(event) => startNodeDrag(event, node)}
              onDoubleClick={(event) => { event.stopPropagation(); onStartEdit?.(node.id) }}
              title={node.parentId && onMoveNode ? 'Drag to reorder or reparent · double-click to rename' : 'Double-click to rename'}
              className={`group flex h-full w-full select-none items-center justify-center rounded-[inherit] px-2 text-center ${dragging ? 'scale-105 cursor-grabbing' : `transition-[box-shadow,transform,background-color] duration-300 ease-out ${node.parentId && onMoveNode ? 'cursor-grab' : 'cursor-pointer'}`} ${dragState ? '' : 'hover:scale-[1.02]'} motion-reduce:transform-none`}
              style={{
                borderRadius: node.radius,
                backgroundColor: isRoot ? colors.line : colors.fill,
                color: isRoot ? colors.solidText : colors.text,
                border: `1.5px solid ${nesting ? colors.line : isRoot ? 'transparent' : colors.border}`,
                boxShadow: dragging
                  ? `0 0 0 3px ${withAlpha(node.accent, 0.5)}, 0 22px 44px ${withAlpha('#000000', dark ? 0.55 : 0.28)}`
                  : selected
                    ? `0 0 0 3px ${withAlpha(node.accent, 0.4)}, 0 12px 30px ${withAlpha(node.accent, 0.28)}`
                    : nesting
                      ? `0 0 0 3px ${withAlpha(node.accent, 0.55)}`
                      : highlighted
                        ? `0 0 0 3px ${withAlpha('#f59e0b', 0.6)}`
                        : `0 6px 18px ${withAlpha(node.accent, dark ? 0.28 : 0.16)}`,
              }}
            >
              {editingId === node.id
                ? <textarea
                    ref={editorRef}
                    value={editingValue}
                    onChange={(event) => setEditingValue(event.target.value)}
                    onPointerDown={(event) => event.stopPropagation()}
                    onBlur={commitEdit}
                    onKeyDown={(event) => {
                      event.stopPropagation()
                      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); commitEdit() }
                      if (event.key === 'Escape') { event.preventDefault(); onCancelEdit?.() }
                    }}
                    aria-label={`Edit label of ${node.label}`}
                    className="h-full w-full select-text resize-none rounded-md bg-transparent text-center leading-tight outline-none ring-2 ring-white/70 dark:ring-white/30"
                    style={{ fontSize: node.fontSize, fontWeight: node.fontWeight, color: 'inherit' }}
                  />
                : <span className="pointer-events-none block w-full break-words leading-tight" style={{ fontSize: node.fontSize, fontWeight: node.fontWeight }}>{node.label}</span>}
            </div>

            {dropTarget && dragState.position !== 'inside' && <span
              aria-hidden="true"
              className="pointer-events-none absolute rounded-full"
              style={layout.layout === 'down'
                ? { top: -6, bottom: -6, width: 4, backgroundColor: node.accent, ...(dragState.position === 'before' ? { left: -12 } : { right: -12 }) }
                : { left: -6, right: -6, height: 4, backgroundColor: node.accent, ...(dragState.position === 'before' ? { top: -12 } : { bottom: -12 }) }}
            />}

            {node.hasNote && <span title="This node has a note" aria-label="Has note" className="pointer-events-none absolute -left-1.5 -top-1.5 h-2.5 w-2.5 rounded-full border border-white shadow dark:border-slate-900" style={{ backgroundColor: node.accent }} />}

            {Boolean(node.childCount) && <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => { event.stopPropagation(); onToggleCollapse?.(node.id) }}
              aria-label={node.collapsed ? `Expand ${node.label}, ${node.hiddenCount} hidden nodes` : `Collapse ${node.label}`}
              title={node.collapsed ? `Expand (${node.hiddenCount})` : 'Collapse'}
              className="absolute flex h-5 min-w-5 items-center justify-center rounded-full border px-1 text-[10px] font-bold tabular-nums shadow-sm transition-transform duration-300 ease-out hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 motion-reduce:transform-none"
              style={{
                backgroundColor: node.collapsed ? node.accent : dark ? '#0f172a' : '#ffffff',
                color: node.collapsed ? '#ffffff' : node.accent,
                borderColor: node.accent,
                ...collapseButtonPosition(node, layout.layout),
              }}
            >{node.collapsed ? node.hiddenCount : '−'}</button>}

            {onAddChild && !editingId && <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => { event.stopPropagation(); onAddChild(node.id) }}
              aria-label={`Add child to ${node.label}`}
              title="Add child node"
              className="absolute flex h-6 w-6 items-center justify-center rounded-full bg-purple-700 text-white opacity-0 shadow-[0_6px_16px_rgba(126,34,206,0.35)] transition-[opacity,transform] duration-300 ease-out hover:scale-110 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 group-hover:opacity-100 motion-reduce:transform-none"
              style={addButtonPosition(node, layout.layout)}
            ><Plus size={13} weight="bold" /></button>}
          </div>
        })}
      </div>
    </div>

    {nodeActions && selectedId && !editingId && !dragState && !toolbarHidden && (() => {
      const node = nodeById.get(selectedId)
      if (!node) return null
      const centerX = node.x * view.scale + view.x
      const bottom = (node.y + node.height / 2) * view.scale + view.y
      const top = (node.y - node.height / 2) * view.scale + view.y
      // In org chart mode the add-child button hangs below the node, so clear it.
      const gap = layout.layout === 'down' ? 46 : 12
      const toolbarHeight = 46

      // Prefer the side that covers no sibling. Only then fall back to viewport fit,
      // so the toolbar stops sitting on top of the node underneath the selection.
      const halfWidth = TOOLBAR_HALF_WIDTH / view.scale
      const bandHeight = (gap + toolbarHeight) / view.scale
      const collides = (fromY, toY) => layout.nodes.some((other) => other.id !== node.id
        && Math.abs(other.x - node.x) < halfWidth + other.width / 2
        && other.y + other.height / 2 > fromY
        && other.y - other.height / 2 < toY)
      const belowBlocked = collides(node.y + node.height / 2, node.y + node.height / 2 + bandHeight)
      const aboveBlocked = collides(node.y - node.height / 2 - bandHeight, node.y - node.height / 2)
      const fitsBelow = bottom + gap + toolbarHeight < viewportSize.height
      const fitsAbove = top - gap - toolbarHeight > 0
      const below = belowBlocked !== aboveBlocked ? (!belowBlocked && fitsBelow) || !fitsAbove : fitsBelow || !fitsAbove

      return <MindMapNodeToolbar
        key={node.id}
        node={node}
        busy={busyNodeId === node.id}
        placement={below ? 'below' : 'above'}
        left={Math.max(TOOLBAR_HALF_WIDTH + 8, Math.min(viewportSize.width - TOOLBAR_HALF_WIDTH - 8, centerX))}
        top={below ? bottom + gap : top - gap}
        actions={nodeActions}
        onHide={() => setToolbarHidden(true)}
      />
    })()}

    {nodeActions && selectedId && toolbarHidden && !editingId && !dragState && (() => {
      const node = nodeById.get(selectedId)
      if (!node) return null
      return <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => setToolbarHidden(false)}
        aria-label={`Show actions for ${node.label}`}
        title="Show node actions (H)"
        className={`absolute z-40 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full ${panel}`}
        style={{ left: (node.x + node.width / 2) * view.scale + view.x + 14, top: (node.y - node.height / 2) * view.scale + view.y - 4 }}
      ><DotsThree size={16} weight="bold" /></button>
    })()}

    {dragState && (dragState.invalid || dragState.targetId) && <p role="status" className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-lg bg-slate-950/85 px-3 py-1.5 text-xs font-medium text-white">
      {dragState.invalid
        ? 'A node cannot be moved inside itself'
        : dragState.position === 'inside'
          ? `Drop inside ${truncate(nodeById.get(dragState.targetId)?.label)}`
          : `Drop ${dragState.position} ${truncate(nodeById.get(dragState.targetId)?.label)}`}
    </p>}

    <div className={`absolute bottom-3 left-3 z-20 flex items-center gap-0.5 p-1 ${panel}`}>
      <button type="button" onClick={() => zoomAt(1 / 1.2)} aria-label="Zoom out" title="Zoom out" className={iconButton}><Minus size={15} /></button>
      <button type="button" onClick={resetToDefaultView} title="Reset to 100% and centre the map" className="h-9 rounded-lg px-2 text-xs font-semibold tabular-nums text-slate-600 transition-colors duration-300 ease-out hover:bg-purple-100 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:text-slate-300 dark:hover:bg-purple-500/15">{Math.round(view.scale * 100)}%</button>
      <button type="button" onClick={() => zoomAt(1.2)} aria-label="Zoom in" title="Zoom in" className={iconButton}><Plus size={15} /></button>
      <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-slate-200 dark:bg-slate-700" />
      <button type="button" onClick={() => fitToView()} aria-label="Fit map to screen" title="Fit to screen (F)" className={iconButton}><ArrowsOut size={15} /></button>
      <button type="button" onClick={() => centerOnNode(selectedId || layout.nodes[0]?.id)} aria-label="Center on selected node" title="Center selection (C)" className={iconButton}><Crosshair size={15} /></button>
    </div>

    {minimap && <div className={`absolute bottom-3 right-3 z-20 overflow-hidden p-1.5 ${panel}`} aria-hidden="true">
      <svg width={layout.width * minimapScale} height={layout.height * minimapScale} viewBox={`0 0 ${layout.width} ${layout.height}`}>
        {layout.edges.map((edge) => <path key={edge.id} d={edge.path} fill="none" stroke={edge.color} strokeWidth={6} opacity="0.35" />)}
        {layout.nodes.map((node) => <rect key={node.id} x={node.x - node.width / 2} y={node.y - node.height / 2} width={node.width} height={node.height} rx={node.radius} fill={node.accent} opacity={selectedId === node.id ? 1 : 0.55} />)}
        <rect
          x={-view.x / view.scale}
          y={-view.y / view.scale}
          width={viewportSize.width / view.scale}
          height={viewportSize.height / view.scale}
          fill="none"
          stroke={dark ? '#e2e8f0' : '#4c1d95'}
          strokeWidth={10}
          opacity="0.5"
        />
      </svg>
    </div>}
  </section>
})

function truncate(value, max = 28) {
  const text = String(value || '')
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function isAncestorOf(nodeById, ancestorId, candidateId) {
  let current = nodeById.get(candidateId)
  const guard = new Set()
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true
    if (guard.has(current.parentId)) return false
    guard.add(current.parentId)
    current = nodeById.get(current.parentId)
  }
  return false
}

function collapseButtonPosition(node, layoutMode) {
  if (layoutMode === 'down') return { left: '50%', bottom: -10, transform: 'translateX(-50%)' }
  const right = node.side >= 0
  return right ? { right: -10, top: '50%', transform: 'translateY(-50%)' } : { left: -10, top: '50%', transform: 'translateY(-50%)' }
}

function addButtonPosition(node, layoutMode) {
  if (layoutMode === 'down') return { left: '50%', bottom: -30, transform: 'translateX(-50%)' }
  const right = node.side >= 0
  return right ? { right: -30, top: '50%', transform: 'translateY(-50%)' } : { left: -30, top: '50%', transform: 'translateY(-50%)' }
}

export default MindMapCanvas
