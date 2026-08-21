export const MIND_MAP_LIMITS = { nodes: 400, depth: 9, label: 180, note: 2000 }

export const MIND_MAP_LAYOUTS = [
  { id: 'balanced', name: 'Balanced', description: 'Classic mind map with branches on both sides' },
  { id: 'right', name: 'Logical', description: 'Every branch flows to the right' },
  { id: 'down', name: 'Org chart', description: 'Top-down hierarchy' },
]

export const MIND_MAP_THEMES = {
  aurora: { name: 'Aurora', root: '#6d28d9', branches: ['#7c3aed', '#2563eb', '#0891b2', '#0d9488', '#c026d3', '#4f46e5', '#0284c7', '#9333ea'] },
  sunset: { name: 'Sunset', root: '#b91c1c', branches: ['#dc2626', '#ea580c', '#d97706', '#db2777', '#e11d48', '#c2410c', '#f59e0b', '#be123c'] },
  forest: { name: 'Forest', root: '#166534', branches: ['#16a34a', '#0d9488', '#65a30d', '#0891b2', '#059669', '#4d7c0f', '#047857', '#0e7490'] },
  mono: { name: 'Graphite', root: '#334155', branches: ['#475569', '#64748b', '#52525b', '#57534e', '#3f3f46', '#44403c', '#6b7280', '#71717a'] },
}

export const NODE_COLORS = ['#7c3aed', '#2563eb', '#0891b2', '#0d9488', '#16a34a', '#ca8a04', '#ea580c', '#dc2626', '#db2777', '#475569']

const uid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `node-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`)
const text = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
const multiline = (value, max) => String(value ?? '').replace(/\r\n/g, '\n').trim().slice(0, max)
const isHex = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)

/* ---------------------------------- color --------------------------------- */

const channels = (hex) => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16))
const toHex = (values) => `#${values.map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`

export function mixHex(hex, target, amount) {
  if (!isHex(hex) || !isHex(target)) return hex
  const from = channels(hex)
  const to = channels(target)
  return toHex(from.map((value, index) => value + (to[index] - value) * amount))
}

export function withAlpha(hex, alpha) {
  if (!isHex(hex)) return hex
  const [r, g, b] = channels(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function nodeColors(hex, dark) {
  return {
    line: dark ? mixHex(hex, '#ffffff', 0.22) : hex,
    fill: dark ? withAlpha(mixHex(hex, '#ffffff', 0.1), 0.28) : withAlpha(mixHex(hex, '#ffffff', 0.55), 0.95),
    border: dark ? withAlpha(mixHex(hex, '#ffffff', 0.45), 0.55) : withAlpha(mixHex(hex, '#000000', 0.05), 0.45),
    text: dark ? mixHex(hex, '#ffffff', 0.78) : mixHex(hex, '#000000', 0.55),
    solidText: '#ffffff',
  }
}

/* ------------------------------- normalizing ------------------------------ */

export function createNode(label, parentId = null, extra = {}) {
  return { id: uid(), label: text(label, MIND_MAP_LIMITS.label) || 'New idea', parentId, note: '', color: '', collapsed: false, ...extra }
}

export function createMindMap(title, options = {}) {
  const safeTitle = text(title, MIND_MAP_LIMITS.label) || 'Untitled mind map'
  const root = { ...createNode(safeTitle, null), id: uid() }
  const now = Date.now()
  return normalizeMindMap({ id: uid(), title: safeTitle, nodes: [root], layout: options.layout || 'balanced', theme: options.theme || 'aurora', createdAt: now, updatedAt: now }, safeTitle)
}

function sanitizeNode(source, index) {
  const label = text(source?.label ?? source?.title ?? source?.text, MIND_MAP_LIMITS.label)
  if (!label) return null
  const rawId = text(source?.id, 80).replace(/[^a-zA-Z0-9_:-]/g, '-')
  return {
    id: rawId || `node-${index + 1}`,
    label,
    parentId: text(source?.parentId ?? source?.parent, 80).replace(/[^a-zA-Z0-9_:-]/g, '-') || null,
    note: multiline(source?.note ?? source?.description, MIND_MAP_LIMITS.note),
    color: isHex(source?.color) ? source.color.toLowerCase() : '',
    collapsed: Boolean(source?.collapsed),
  }
}

/** Repairs any mind map shape (AI output, imported file, legacy state) into a single valid tree. */
export function normalizeMindMap(value, fallbackTopic = 'Untitled mind map') {
  const title = text(value?.title, MIND_MAP_LIMITS.label) || text(fallbackTopic, MIND_MAP_LIMITS.label) || 'Untitled mind map'
  const source = Array.isArray(value?.nodes) ? value.nodes : []
  const seen = new Set()
  const sanitized = []

  for (let index = 0; index < source.length && sanitized.length < MIND_MAP_LIMITS.nodes; index += 1) {
    const node = sanitizeNode(source[index], index)
    if (!node) continue
    let id = node.id
    let suffix = 2
    while (seen.has(id)) { id = `${node.id}-${suffix}`; suffix += 1 }
    seen.add(id)
    sanitized.push({ ...node, id })
  }

  if (!sanitized.length) sanitized.push({ ...createNode(title, null), collapsed: false })

  const byId = new Map(sanitized.map((node) => [node.id, node]))
  const rootIndex = sanitized.findIndex((node) => !node.parentId || !byId.has(node.parentId) || node.parentId === node.id)
  const root = sanitized[rootIndex < 0 ? 0 : rootIndex]
  const children = new Map(sanitized.map((node) => [node.id, []]))
  for (const node of sanitized) {
    if (node === root) continue
    const parent = node.parentId && node.parentId !== node.id ? byId.get(node.parentId) : null
    children.get(parent ? parent.id : root.id).push(node)
  }

  const ordered = []
  const visited = new Set()
  const walk = (node, parentId, depth) => {
    if (visited.has(node.id)) return
    visited.add(node.id)
    ordered.push({ ...node, parentId, collapsed: Boolean(node.collapsed) && Boolean(children.get(node.id)?.length) })
    if (depth >= MIND_MAP_LIMITS.depth) {
      for (const child of children.get(node.id) || []) walk(child, parentId, depth)
      return
    }
    for (const child of children.get(node.id) || []) walk(child, node.id, depth + 1)
  }
  walk(root, null, 0)
  for (const node of sanitized) if (!visited.has(node.id)) walk(node, root.id, 1)

  const finalRoot = { ...ordered[0], label: ordered[0].label || title, parentId: null }
  const nodes = [finalRoot, ...ordered.slice(1)]
  const now = Date.now()
  return {
    id: text(value?.id, 80) || uid(),
    title,
    nodes,
    layout: MIND_MAP_LAYOUTS.some((item) => item.id === value?.layout) ? value.layout : 'balanced',
    theme: MIND_MAP_THEMES[value?.theme] ? value.theme : 'aurora',
    createdAt: Number(value?.createdAt) || now,
    updatedAt: Number(value?.updatedAt) || Number(value?.createdAt) || now,
  }
}

/* ----------------------------- tree utilities ----------------------------- */

export const rootNode = (nodes) => nodes[0] || null
export const findNode = (nodes, nodeId) => nodes.find((node) => node.id === nodeId) || null
export const childrenOf = (nodes, nodeId) => nodes.filter((node) => node.parentId === nodeId)
export const parentOf = (nodes, nodeId) => { const node = findNode(nodes, nodeId); return node?.parentId ? findNode(nodes, node.parentId) : null }
export const siblingsOf = (nodes, nodeId) => { const node = findNode(nodes, nodeId); return node?.parentId ? childrenOf(nodes, node.parentId) : [] }

export function descendantIds(nodes, nodeId) {
  const result = new Set()
  const stack = [nodeId]
  while (stack.length) {
    const current = stack.pop()
    for (const node of nodes) {
      if (node.parentId === current && !result.has(node.id)) { result.add(node.id); stack.push(node.id) }
    }
  }
  return result
}

export function isDescendant(nodes, ancestorId, candidateId) {
  let current = findNode(nodes, candidateId)
  const guard = new Set()
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true
    if (guard.has(current.parentId)) return false
    guard.add(current.parentId)
    current = findNode(nodes, current.parentId)
  }
  return false
}

export function pathToRoot(nodes, nodeId) {
  const path = []
  let current = findNode(nodes, nodeId)
  while (current) {
    path.unshift(current)
    current = current.parentId ? findNode(nodes, current.parentId) : null
  }
  return path
}

export function depthOf(nodes, nodeId) { return Math.max(0, pathToRoot(nodes, nodeId).length - 1) }

export function mindMapStats(map) {
  const nodes = map?.nodes || []
  const branches = nodes.filter((node) => node.parentId === nodes[0]?.id).length
  const leaves = nodes.filter((node) => !nodes.some((item) => item.parentId === node.id)).length
  const depth = nodes.reduce((max, node) => Math.max(max, depthOf(nodes, node.id)), 0)
  const notes = nodes.filter((node) => node.note?.trim()).length
  return { nodes: nodes.length, branches, leaves, depth, notes }
}

const subtreeSlice = (nodes, nodeId) => {
  const ids = descendantIds(nodes, nodeId)
  ids.add(nodeId)
  return nodes.filter((node) => ids.has(node.id))
}

const touch = (map, nodes) => ({ ...map, nodes, updatedAt: Date.now() })

const insertAfterSubtree = (nodes, anchorId, added) => {
  const ids = descendantIds(nodes, anchorId)
  let lastIndex = nodes.findIndex((node) => node.id === anchorId)
  nodes.forEach((node, index) => { if (ids.has(node.id)) lastIndex = Math.max(lastIndex, index) })
  return [...nodes.slice(0, lastIndex + 1), ...added, ...nodes.slice(lastIndex + 1)]
}

export function addChildNode(map, parentId, label = 'New idea') {
  if (map.nodes.length >= MIND_MAP_LIMITS.nodes) return { map, node: null, error: `A mind map can hold up to ${MIND_MAP_LIMITS.nodes} nodes.` }
  const parent = findNode(map.nodes, parentId)
  if (!parent) return { map, node: null, error: 'That parent node no longer exists.' }
  if (depthOf(map.nodes, parentId) + 1 > MIND_MAP_LIMITS.depth) return { map, node: null, error: `Nodes can be nested up to ${MIND_MAP_LIMITS.depth} levels deep.` }
  const node = createNode(label, parentId)
  const withParentExpanded = map.nodes.map((item) => item.id === parentId ? { ...item, collapsed: false } : item)
  return { map: touch(map, insertAfterSubtree(withParentExpanded, parentId, [node])), node, error: '' }
}

export function addSiblingNode(map, nodeId, label = 'New idea') {
  const node = findNode(map.nodes, nodeId)
  if (!node?.parentId) return addChildNode(map, nodeId, label)
  if (map.nodes.length >= MIND_MAP_LIMITS.nodes) return { map, node: null, error: `A mind map can hold up to ${MIND_MAP_LIMITS.nodes} nodes.` }
  const created = createNode(label, node.parentId)
  return { map: touch(map, insertAfterSubtree(map.nodes, nodeId, [created])), node: created, error: '' }
}

export function updateNode(map, nodeId, patch) {
  const nodes = map.nodes.map((node) => {
    if (node.id !== nodeId) return node
    const next = { ...node, ...patch }
    return {
      ...next,
      label: text(next.label, MIND_MAP_LIMITS.label) || node.label,
      note: multiline(next.note, MIND_MAP_LIMITS.note),
      color: isHex(next.color) ? next.color.toLowerCase() : '',
    }
  })
  const isRoot = map.nodes[0]?.id === nodeId
  const title = isRoot && patch.label !== undefined ? text(patch.label, MIND_MAP_LIMITS.label) || map.title : map.title
  return { ...touch(map, nodes), title }
}

export function removeNode(map, nodeId) {
  const node = findNode(map.nodes, nodeId)
  if (!node || !node.parentId) return { map, nextSelection: map.nodes[0]?.id || null, removed: 0 }
  const removed = descendantIds(map.nodes, nodeId)
  removed.add(nodeId)
  const siblings = siblingsOf(map.nodes, nodeId)
  const position = siblings.findIndex((item) => item.id === nodeId)
  const nextSelection = siblings[position + 1]?.id || siblings[position - 1]?.id || node.parentId
  return { map: touch(map, map.nodes.filter((item) => !removed.has(item.id))), nextSelection, removed: removed.size }
}

export function moveNode(map, nodeId, nextParentId, index = -1) {
  const node = findNode(map.nodes, nodeId)
  const parent = findNode(map.nodes, nextParentId)
  if (!node || !parent || !node.parentId) return map
  if (nodeId === nextParentId || isDescendant(map.nodes, nodeId, nextParentId)) return map
  const subtree = subtreeSlice(map.nodes, nodeId)
  const subtreeDepth = subtree.reduce((max, item) => Math.max(max, depthOf(map.nodes, item.id) - depthOf(map.nodes, nodeId)), 0)
  if (depthOf(map.nodes, nextParentId) + 1 + subtreeDepth > MIND_MAP_LIMITS.depth) return map
  const detached = map.nodes.filter((item) => !subtree.some((entry) => entry.id === item.id))
  const reparented = subtree.map((item) => item.id === nodeId ? { ...item, parentId: nextParentId } : item)
  const expandedParent = detached.map((item) => item.id === nextParentId ? { ...item, collapsed: false } : item)
  const targetSiblings = expandedParent.filter((item) => item.parentId === nextParentId)
  const anchor = index < 0 || index >= targetSiblings.length ? null : targetSiblings[index]
  if (!anchor) {
    const lastSibling = targetSiblings[targetSiblings.length - 1]
    return touch(map, lastSibling ? insertAfterSubtree(expandedParent, lastSibling.id, reparented) : insertAfterSubtree(expandedParent, nextParentId, reparented))
  }
  const anchorIndex = expandedParent.findIndex((item) => item.id === anchor.id)
  return touch(map, [...expandedParent.slice(0, anchorIndex), ...reparented, ...expandedParent.slice(anchorIndex)])
}

/**
 * Drops a node relative to a reference node, the way a canvas drag reads:
 * `inside` makes it the last child, `before`/`after` place it among the reference's siblings.
 * The index is computed against the sibling list without the dragged node, which is the
 * ordering `moveNode` sees after it detaches the subtree.
 */
export function moveNodeRelative(map, nodeId, referenceId, position = 'inside') {
  if (position === 'inside') return moveNode(map, nodeId, referenceId)
  const reference = findNode(map.nodes, referenceId)
  if (!reference) return map
  if (!reference.parentId) return moveNode(map, nodeId, referenceId)
  const siblings = childrenOf(map.nodes, reference.parentId).filter((item) => item.id !== nodeId)
  const base = siblings.findIndex((item) => item.id === referenceId)
  if (base < 0) return map
  return moveNode(map, nodeId, reference.parentId, base + (position === 'after' ? 1 : 0))
}

export function reorderNode(map, nodeId, direction) {
  const node = findNode(map.nodes, nodeId)
  if (!node?.parentId) return map
  const siblings = siblingsOf(map.nodes, nodeId)
  const position = siblings.findIndex((item) => item.id === nodeId)
  const target = position + (direction < 0 ? -1 : 1)
  if (target < 0 || target >= siblings.length) return map
  return moveNode(map, nodeId, node.parentId, target)
}

export function indentNode(map, nodeId) {
  const node = findNode(map.nodes, nodeId)
  if (!node?.parentId) return map
  const siblings = siblingsOf(map.nodes, nodeId)
  const position = siblings.findIndex((item) => item.id === nodeId)
  const previous = siblings[position - 1]
  return previous ? moveNode(map, nodeId, previous.id) : map
}

export function outdentNode(map, nodeId) {
  const node = findNode(map.nodes, nodeId)
  const parent = node?.parentId ? findNode(map.nodes, node.parentId) : null
  if (!parent?.parentId) return map
  const parentSiblings = childrenOf(map.nodes, parent.parentId)
  const position = parentSiblings.findIndex((item) => item.id === parent.id)
  return moveNode(map, nodeId, parent.parentId, position + 1)
}

export function toggleCollapse(map, nodeId, collapsed) {
  const hasChildren = map.nodes.some((node) => node.parentId === nodeId)
  if (!hasChildren) return map
  return touch(map, map.nodes.map((node) => node.id === nodeId ? { ...node, collapsed: collapsed ?? !node.collapsed } : node))
}

export function setAllCollapsed(map, collapsed, fromDepth = 1) {
  return touch(map, map.nodes.map((node) => {
    const hasChildren = map.nodes.some((item) => item.parentId === node.id)
    if (!hasChildren) return { ...node, collapsed: false }
    return { ...node, collapsed: collapsed && depthOf(map.nodes, node.id) >= fromDepth }
  }))
}

export function mergeGeneratedChildren(map, parentId, labels) {
  const room = MIND_MAP_LIMITS.nodes - map.nodes.length
  const accepted = labels.map((label) => text(label, MIND_MAP_LIMITS.label)).filter(Boolean).slice(0, Math.max(0, room))
  if (!accepted.length) return { map, added: [] }
  let next = map
  const added = []
  for (const label of accepted) {
    const result = addChildNode(next, parentId, label)
    if (!result.node) break
    next = result.map
    added.push(result.node)
  }
  return { map: next, added }
}

export function duplicateSubtree(map, nodeId) {
  const node = findNode(map.nodes, nodeId)
  if (!node?.parentId) return { map, node: null }
  const subtree = subtreeSlice(map.nodes, nodeId)
  if (map.nodes.length + subtree.length > MIND_MAP_LIMITS.nodes) return { map, node: null }
  const idMap = new Map(subtree.map((item) => [item.id, uid()]))
  const copies = subtree.map((item) => ({ ...item, id: idMap.get(item.id), parentId: item.id === nodeId ? node.parentId : idMap.get(item.parentId) || node.parentId }))
  return { map: touch(map, insertAfterSubtree(map.nodes, nodeId, copies)), node: copies[0] }
}

export function duplicateMindMap(map) {
  const copy = normalizeMindMap({ ...map, id: uid(), title: `${map.title} (copy)` }, map.title)
  const idMap = new Map(copy.nodes.map((node) => [node.id, uid()]))
  const now = Date.now()
  return { ...copy, nodes: copy.nodes.map((node) => ({ ...node, id: idMap.get(node.id), parentId: node.parentId ? idMap.get(node.parentId) : null })), createdAt: now, updatedAt: now }
}

export function searchNodes(nodes, query) {
  const needle = query.trim().toLowerCase()
  if (!needle) return []
  return nodes.filter((node) => node.label.toLowerCase().includes(needle) || (node.note || '').toLowerCase().includes(needle)).map((node) => node.id)
}

/* --------------------------------- layout --------------------------------- */

const metricsFor = (depth) => depth === 0
  ? { fontSize: 17, weight: 700, padX: 22, padY: 14, maxWidth: 268, minWidth: 148, radius: 18 }
  : depth === 1
    ? { fontSize: 15, weight: 600, padX: 18, padY: 12, maxWidth: 236, minWidth: 124, radius: 14 }
    : { fontSize: 13.5, weight: 500, padX: 15, padY: 10, maxWidth: 212, minWidth: 104, radius: 12 }

const CHAR_RATIO = 0.55

export function wrapLabel(label, fontSize, maxWidth) {
  const maxChars = Math.max(8, Math.floor(maxWidth / (fontSize * CHAR_RATIO)))
  const words = String(label).split(/\s+/).filter(Boolean)
  const lines = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= maxChars) { current = candidate; continue }
    if (current) lines.push(current)
    if (word.length <= maxChars) { current = word; continue }
    let rest = word
    while (rest.length > maxChars) { lines.push(`${rest.slice(0, maxChars - 1)}-`); rest = rest.slice(maxChars - 1) }
    current = rest
  }
  if (current) lines.push(current)
  return lines.length ? lines.slice(0, 4) : ['Untitled']
}

export function measureNode(label, depth) {
  const metrics = metricsFor(depth)
  const lines = wrapLabel(label, metrics.fontSize, metrics.maxWidth)
  const longest = lines.reduce((max, line) => Math.max(max, line.length), 0)
  const lineHeight = Math.round(metrics.fontSize * 1.35)
  const width = Math.min(metrics.maxWidth + metrics.padX * 2, Math.max(metrics.minWidth, Math.round(longest * metrics.fontSize * CHAR_RATIO) + metrics.padX * 2))
  const height = Math.max(depth === 0 ? 58 : 42, lines.length * lineHeight + metrics.padY * 2)
  return { ...metrics, lines, lineHeight, width, height }
}

/** Places a subtree along `depth` (columns) and `flow` (stacking) axes without overlaps. */
function placeSide(roots, context, gapDepth, gapFlow) {
  const { childrenMap, measured } = context
  const entries = []
  const columns = []
  const scan = (node, depth) => {
    columns[depth] = Math.max(columns[depth] || 0, measured.get(node.id).depthSize)
    if (node.collapsed) return
    for (const child of childrenMap.get(node.id) || []) scan(child, depth + 1)
  }
  for (const root of roots) scan(root, 0)
  const columnStart = []
  columns.forEach((size, index) => { columnStart[index] = index === 0 ? 0 : columnStart[index - 1] + columns[index - 1] + gapDepth })

  let cursor = 0
  const place = (node, depth) => {
    const size = measured.get(node.id)
    const children = node.collapsed ? [] : (childrenMap.get(node.id) || [])
    const top = cursor
    const startIndex = entries.length
    let flow
    if (!children.length) {
      flow = cursor + size.flowSize / 2
      cursor += size.flowSize + gapFlow
    } else {
      const placed = children.map((child) => place(child, depth + 1))
      flow = (placed[0].flow + placed[placed.length - 1].flow) / 2
      const overflow = top - (flow - size.flowSize / 2)
      if (overflow > 0) {
        for (let index = startIndex; index < entries.length; index += 1) entries[index].flow += overflow
        flow += overflow
        cursor += overflow
      }
      cursor = Math.max(cursor, flow + size.flowSize / 2 + gapFlow)
    }
    const entry = { node, depth, flow, depthPos: columnStart[depth] + size.depthSize / 2, size }
    entries.splice(startIndex, 0, entry)
    return entry
  }
  for (const root of roots) place(root, 0)
  const span = Math.max(0, cursor - gapFlow)
  return { entries, span, extent: columnStart.length ? columnStart[columnStart.length - 1] + columns[columns.length - 1] : 0 }
}

export function layoutMindMap(nodes, options = {}) {
  const layout = MIND_MAP_LAYOUTS.some((item) => item.id === options.layout) ? options.layout : 'balanced'
  const theme = MIND_MAP_THEMES[options.theme] ? MIND_MAP_THEMES[options.theme] : MIND_MAP_THEMES.aurora
  const padding = options.padding ?? 160
  const spacing = options.spacing ?? 1
  const empty = { width: 800, height: 600, nodes: [], edges: [], contentWidth: 0, contentHeight: 0, padding, layout, theme }
  const root = nodes?.[0]
  if (!root) return empty

  const childrenMap = new Map(nodes.map((node) => [node.id, []]))
  for (const node of nodes) if (node.parentId && childrenMap.has(node.parentId)) childrenMap.get(node.parentId).push(node)

  const depths = new Map([[root.id, 0]])
  const branchOf = new Map([[root.id, -1]])
  const rootChildren = childrenMap.get(root.id) || []
  rootChildren.forEach((child, index) => branchOf.set(child.id, index))
  const visible = []
  const walkVisible = (node) => {
    visible.push(node)
    if (node.collapsed) return
    for (const child of childrenMap.get(node.id) || []) {
      depths.set(child.id, (depths.get(node.id) || 0) + 1)
      if (!branchOf.has(child.id)) branchOf.set(child.id, branchOf.get(node.id) ?? 0)
      walkVisible(child)
    }
  }
  walkVisible(root)

  const vertical = layout === 'down'
  const measured = new Map(visible.map((node) => {
    const size = measureNode(node.label, depths.get(node.id) || 0)
    return [node.id, { ...size, depthSize: vertical ? size.height : size.width, flowSize: vertical ? size.width : size.height }]
  }))
  const context = { childrenMap, measured }
  const gapDepth = Math.round((vertical ? 86 : 74) * spacing)
  const gapFlow = Math.round((vertical ? 26 : 22) * spacing)
  const rootSize = measured.get(root.id)

  const visibleRootChildren = root.collapsed ? [] : rootChildren
  let sides
  if (layout === 'balanced' && visibleRootChildren.length > 1) {
    const weights = visibleRootChildren.map((node) => {
      let count = 0
      const stack = [node]
      while (stack.length) { const current = stack.pop(); count += 1; if (!current.collapsed) stack.push(...(childrenMap.get(current.id) || [])) }
      return count
    })
    const right = []
    const left = []
    let rightWeight = 0
    let leftWeight = 0
    visibleRootChildren.forEach((node, index) => {
      if (rightWeight <= leftWeight) { right.push(node); rightWeight += weights[index] }
      else { left.push(node); leftWeight += weights[index] }
    })
    sides = [{ roots: right, sign: 1 }, { roots: left, sign: -1 }]
  } else {
    sides = [{ roots: visibleRootChildren, sign: 1 }]
  }

  const positioned = [{ node: root, depth: 0, x: 0, y: 0, size: rootSize, side: 0 }]
  for (const side of sides) {
    if (!side.roots.length) continue
    const { entries, span } = placeSide(side.roots, context, gapDepth, gapFlow)
    const offset = -span / 2
    for (const entry of entries) {
      const depthPos = (vertical ? rootSize.height / 2 : rootSize.width / 2) + gapDepth + entry.depthPos
      const flowPos = entry.flow + offset
      positioned.push({
        node: entry.node,
        depth: (depths.get(entry.node.id) || 1),
        x: vertical ? flowPos : side.sign * depthPos,
        y: vertical ? depthPos : flowPos,
        size: entry.size,
        side: side.sign,
      })
    }
  }

  const minX = Math.min(...positioned.map((item) => item.x - item.size.width / 2))
  const maxX = Math.max(...positioned.map((item) => item.x + item.size.width / 2))
  const minY = Math.min(...positioned.map((item) => item.y - item.size.height / 2))
  const maxY = Math.max(...positioned.map((item) => item.y + item.size.height / 2))
  const offsetX = padding - minX
  const offsetY = padding - minY
  const contentWidth = maxX - minX
  const contentHeight = maxY - minY

  const hiddenCounts = new Map()
  for (const node of nodes) {
    if (!node.collapsed) continue
    hiddenCounts.set(node.id, descendantIds(nodes, node.id).size)
  }

  const laidOut = positioned.map((item) => {
    const depth = item.depth
    const branch = branchOf.get(item.node.id) ?? -1
    const themeColor = depth === 0 ? theme.root : theme.branches[(branch < 0 ? 0 : branch) % theme.branches.length]
    return {
      ...item.node,
      depth,
      branch,
      side: item.side,
      color: item.node.color || themeColor,
      accent: item.node.color || themeColor,
      x: item.x + offsetX,
      y: item.y + offsetY,
      width: item.size.width,
      height: item.size.height,
      fontSize: item.size.fontSize,
      fontWeight: item.size.weight,
      lineHeight: item.size.lineHeight,
      radius: item.size.radius,
      lines: item.size.lines,
      childCount: (childrenMap.get(item.node.id) || []).length,
      hiddenCount: hiddenCounts.get(item.node.id) || 0,
      hasNote: Boolean(item.node.note?.trim()),
    }
  })

  const byId = new Map(laidOut.map((node) => [node.id, node]))
  const edges = []
  for (const node of laidOut) {
    const parent = node.parentId ? byId.get(node.parentId) : null
    if (!parent) continue
    const strokeWidth = Math.max(1.6, 4.4 - node.depth * 0.8)
    if (vertical) {
      const startY = parent.y + parent.height / 2
      const endY = node.y - node.height / 2
      const bend = Math.max(28, (endY - startY) * 0.55)
      edges.push({ id: `${parent.id}--${node.id}`, from: parent.id, to: node.id, color: node.accent, strokeWidth, path: `M ${parent.x} ${startY} C ${parent.x} ${startY + bend}, ${node.x} ${endY - bend}, ${node.x} ${endY}` })
    } else {
      const direction = node.x >= parent.x ? 1 : -1
      const startX = parent.x + direction * parent.width / 2
      const endX = node.x - direction * node.width / 2
      const bend = Math.max(30, Math.abs(endX - startX) * 0.5)
      edges.push({ id: `${parent.id}--${node.id}`, from: parent.id, to: node.id, color: node.accent, strokeWidth, path: `M ${startX} ${parent.y} C ${startX + direction * bend} ${parent.y}, ${endX - direction * bend} ${node.y}, ${endX} ${node.y}` })
    }
  }

  return {
    width: contentWidth + padding * 2,
    height: contentHeight + padding * 2,
    contentWidth,
    contentHeight,
    padding,
    layout,
    theme,
    nodes: laidOut,
    edges,
  }
}

/* --------------------------------- exports -------------------------------- */

export function mindMapToMarkdown(map) {
  const nodes = map.nodes || []
  const lines = [`# ${map.title}`, '']
  const walk = (parentId, depth) => {
    for (const node of nodes.filter((item) => item.parentId === parentId)) {
      lines.push(`${'  '.repeat(Math.max(0, depth - 1))}- ${node.label}`)
      if (node.note?.trim()) for (const line of node.note.trim().split('\n')) lines.push(`${'  '.repeat(depth)}  > ${line}`)
      walk(node.id, depth + 1)
    }
  }
  walk(nodes[0]?.id, 1)
  return `${lines.join('\n')}\n`
}

export function mindMapToOutlineText(map) {
  const nodes = map.nodes || []
  const lines = [map.title]
  const walk = (parentId, depth) => {
    for (const node of nodes.filter((item) => item.parentId === parentId)) {
      lines.push(`${'    '.repeat(depth)}${node.label}`)
      walk(node.id, depth + 1)
    }
  }
  walk(nodes[0]?.id, 1)
  return `${lines.join('\n')}\n`
}

/** Builds a mind map from an indented outline (tabs or spaces) or a Markdown bullet list. */
export function mindMapFromOutline(outline, fallbackTitle = 'Imported outline') {
  const rows = String(outline || '').replace(/\r\n/g, '\n').split('\n').filter((line) => line.trim())
  if (!rows.length) return null
  const parsed = rows.map((line) => {
    const indentMatch = line.match(/^[\t ]*/)[0]
    const indent = indentMatch.replace(/\t/g, '  ').length
    const label = line.trim().replace(/^#+\s*/, '').replace(/^[-*+]\s*/, '').replace(/^\d+[.)]\s*/, '').trim()
    return { indent, label }
  }).filter((row) => row.label)
  if (!parsed.length) return null

  const nodes = []
  const stack = []
  const title = parsed[0].label || fallbackTitle
  const root = createNode(title, null)
  nodes.push(root)
  stack.push({ indent: parsed[0].indent, id: root.id })
  for (const row of parsed.slice(1)) {
    while (stack.length > 1 && row.indent <= stack[stack.length - 1].indent) stack.pop()
    const parent = stack[stack.length - 1]
    const node = createNode(row.label, parent.id)
    nodes.push(node)
    stack.push({ indent: row.indent, id: node.id })
  }
  const now = Date.now()
  return normalizeMindMap({ id: uid(), title, nodes, createdAt: now, updatedAt: now }, title)
}

const escapeXml = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function mindMapToSvg(map, options = {}) {
  const dark = Boolean(options.dark)
  const layout = layoutMindMap(map.nodes || [], { layout: options.layout || map.layout, theme: options.theme || map.theme, padding: options.padding ?? 80 })
  const background = options.transparent ? 'none' : dark ? '#020617' : '#ffffff'
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(layout.width)}" height="${Math.round(layout.height)}" viewBox="0 0 ${Math.round(layout.width)} ${Math.round(layout.height)}" font-family="Inter, ui-sans-serif, system-ui, sans-serif">`]
  if (background !== 'none') parts.push(`<rect width="100%" height="100%" fill="${background}"/>`)
  for (const edge of layout.edges) parts.push(`<path d="${edge.path}" fill="none" stroke="${edge.color}" stroke-width="${edge.strokeWidth}" stroke-linecap="round" opacity="0.75"/>`)
  for (const node of layout.nodes) {
    const colors = nodeColors(node.accent, dark)
    const isRoot = node.depth === 0
    const fill = isRoot ? colors.line : colors.fill
    const color = isRoot ? '#ffffff' : colors.text
    parts.push(`<rect x="${node.x - node.width / 2}" y="${node.y - node.height / 2}" width="${node.width}" height="${node.height}" rx="${node.radius}" fill="${fill}" stroke="${isRoot ? colors.line : colors.line}" stroke-width="${isRoot ? 0 : 1.5}" stroke-opacity="0.5"/>`)
    const startY = node.y - ((node.lines.length - 1) * node.lineHeight) / 2 + node.fontSize * 0.34
    node.lines.forEach((line, index) => {
      parts.push(`<text x="${node.x}" y="${startY + index * node.lineHeight}" fill="${color}" font-size="${node.fontSize}" font-weight="${node.fontWeight}" text-anchor="middle">${escapeXml(line)}</text>`)
    })
    if (node.hiddenCount) parts.push(`<text x="${node.x + node.width / 2 + 12}" y="${node.y + 4}" fill="${colors.line}" font-size="11" font-weight="600">+${node.hiddenCount}</text>`)
  }
  parts.push('</svg>')
  return parts.join('\n')
}

export function mindMapFileName(map, extension) {
  const base = String(map?.title || 'mind-map').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'mind-map'
  return `${base}.${extension}`
}
