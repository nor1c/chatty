const MAX_NODES = 60
const MAX_DEPTH = 6

const clean = (value, fallback = '') => String(value || fallback).trim().slice(0, 160)

export function normalizeMindMap(value, fallbackTopic = 'Untitled mind map') {
  const title = clean(value?.title, fallbackTopic) || 'Untitled mind map'
  const sourceNodes = Array.isArray(value?.nodes) ? value.nodes : []
  const nodes = []
  const usedIds = new Set()

  for (let index = 0; index < sourceNodes.length && nodes.length < MAX_NODES; index += 1) {
    const source = sourceNodes[index]
    const label = clean(source?.label)
    if (!label) continue
    let nodeId = clean(source?.id, `node-${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, '-') || `node-${index + 1}`
    while (usedIds.has(nodeId)) nodeId = `${nodeId}-${index + 1}`
    usedIds.add(nodeId)
    nodes.push({ id: nodeId, label, parentId: clean(source?.parentId) || null })
  }

  if (!nodes.length) nodes.push({ id: 'root', label: title, parentId: null })
  const earlierIds = new Set()
  const rootId = nodes[0].id
  const normalized = nodes.map((node, index) => {
    const normalizedNode = { ...node, parentId: index === 0 ? null : earlierIds.has(node.parentId) ? node.parentId : rootId }
    earlierIds.add(node.id)
    return normalizedNode
  })

  const depthOf = (node) => {
    let depth = 0
    let parentId = node.parentId
    while (parentId && depth < MAX_DEPTH) {
      parentId = normalized.find((item) => item.id === parentId)?.parentId
      depth += 1
    }
    return depth
  }

  return { title, nodes: normalized.map((node) => depthOf(node) >= MAX_DEPTH ? { ...node, parentId: rootId } : node) }
}

const palette = [
  { line: '#7c3aed', fill: '#f3e8ff', text: '#581c87', darkFill: '#3b1764', darkText: '#f3e8ff' },
  { line: '#2563eb', fill: '#dbeafe', text: '#1e3a8a', darkFill: '#172554', darkText: '#dbeafe' },
  { line: '#0d9488', fill: '#ccfbf1', text: '#134e4a', darkFill: '#134e4a', darkText: '#ccfbf1' },
  { line: '#9333ea', fill: '#f3e8ff', text: '#6b21a8', darkFill: '#4a176b', darkText: '#f3e8ff' },
  { line: '#0284c7', fill: '#e0f2fe', text: '#0c4a6e', darkFill: '#164e63', darkText: '#e0f2fe' },
  { line: '#0891b2', fill: '#cffafe', text: '#164e63', darkFill: '#164e63', darkText: '#cffafe' },
]

export function layoutMindMap(nodes) {
  if (!nodes.length) return { width: 1200, height: 700, nodes: [], edges: [] }
  const root = nodes[0]
  const children = new Map(nodes.map((node) => [node.id, []]))
  nodes.slice(1).forEach((node) => children.get(node.parentId)?.push(node))
  const rootChildren = children.get(root.id) || []
  const sides = new Map(rootChildren.map((node, index) => [node.id, index % 2 === 0 ? 1 : -1]))
  const branchIndex = new Map(rootChildren.map((node, index) => [node.id, index]))
  const branchOf = (node) => {
    let current = node
    while (current.parentId && current.parentId !== root.id) current = nodes.find((item) => item.id === current.parentId) || current
    return branchIndex.get(current.id) || 0
  }
  const depthOf = (node) => {
    let depth = 0
    let current = node
    while (current.parentId && depth < MAX_DEPTH) { current = nodes.find((item) => item.id === current.parentId); depth += 1 }
    return depth
  }
  const leafWeight = (node) => {
    const descendants = children.get(node.id) || []
    return descendants.length ? descendants.reduce((sum, child) => sum + leafWeight(child), 0) : 1
  }

  const verticalSlot = 132
  const horizontalSlot = 270
  const totalLeaves = Math.max(6, rootChildren.reduce((sum, node) => sum + leafWeight(node), 0))
  const height = Math.max(1400, totalLeaves * verticalSlot + 240)
  const maximumDepth = Math.max(1, ...nodes.map(depthOf))
  const width = Math.max(2400, 2 * (220 + maximumDepth * horizontalSlot + 220))
  const centerX = width / 2
  const centerY = height / 2
  const positioned = [{ ...root, x: centerX, y: centerY, width: 210, height: 64, depth: 0, branch: -1 }]

  for (const side of [-1, 1]) {
    const sideRoots = rootChildren.filter((node) => sides.get(node.id) === side)
    const sideWeight = sideRoots.reduce((sum, node) => sum + leafWeight(node), 0) || 1
    const available = Math.min(height - 180, Math.max(360, sideWeight * verticalSlot))
    let cursor = centerY - available / 2
    const place = (node, top, span) => {
      const descendants = children.get(node.id) || []
      const depth = depthOf(node)
      const x = centerX + side * (220 + depth * horizontalSlot)
      const y = descendants.length ? top + span / 2 : top + span / 2
      positioned.push({ ...node, x, y, width: depth === 1 ? 210 : 188, height: depth === 1 ? 56 : 48, depth, branch: branchOf(node) })
      let childCursor = top
      const weight = leafWeight(node)
      descendants.forEach((child) => {
        const childSpan = span * (leafWeight(child) / weight)
        place(child, childCursor, childSpan)
        childCursor += childSpan
      })
    }
    sideRoots.forEach((node) => {
      const span = available * (leafWeight(node) / sideWeight)
      place(node, cursor, span)
      cursor += span
    })
  }

  const byId = new Map(positioned.map((node) => [node.id, node]))
  const edges = positioned.slice(1).map((node) => {
    const parent = byId.get(node.parentId)
    const side = node.x > parent.x ? 1 : -1
    const startX = parent.x + side * parent.width / 2
    const endX = node.x - side * node.width / 2
    const bend = Math.abs(endX - startX) * 0.52
    return { id: `${parent.id}-${node.id}`, path: `M ${startX} ${parent.y} C ${startX + side * bend} ${parent.y}, ${endX - side * bend} ${node.y}, ${endX} ${node.y}`, branch: node.branch }
  })
  return { width, height, nodes: positioned, edges, palette }
}
