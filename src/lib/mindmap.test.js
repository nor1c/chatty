import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MIND_MAP_LIMITS,
  addChildNode,
  addSiblingNode,
  createMindMap,
  depthOf,
  descendantIds,
  duplicateMindMap,
  duplicateSubtree,
  indentNode,
  isDescendant,
  layoutMindMap,
  mindMapFromOutline,
  mindMapStats,
  mindMapToMarkdown,
  mindMapToSvg,
  moveNode,
  moveNodeRelative,
  normalizeMindMap,
  outdentNode,
  removeNode,
  reorderNode,
  searchNodes,
  setAllCollapsed,
  toggleCollapse,
  updateNode,
  wrapLabel,
} from './mindmap.js'

const sample = () => normalizeMindMap({
  title: 'Root',
  nodes: [
    { id: 'r', label: 'Root', parentId: null },
    { id: 'a', label: 'Branch A', parentId: 'r' },
    { id: 'a1', label: 'A one', parentId: 'a' },
    { id: 'a2', label: 'A two', parentId: 'a' },
    { id: 'b', label: 'Branch B', parentId: 'r' },
    { id: 'b1', label: 'B one', parentId: 'b' },
  ],
})

test('normalizes a well formed map without changing structure', () => {
  const map = sample()
  assert.equal(map.nodes.length, 6)
  assert.equal(map.nodes[0].parentId, null)
  assert.equal(map.layout, 'balanced')
  assert.equal(map.theme, 'aurora')
  assert.deepEqual(map.nodes.map((node) => node.id), ['r', 'a', 'a1', 'a2', 'b', 'b1'])
})

test('repairs forward references instead of flattening them to the root', () => {
  const map = normalizeMindMap({ title: 'T', nodes: [
    { id: 'child', label: 'Child', parentId: 'parent' },
    { id: 'parent', label: 'Parent', parentId: null },
  ] })
  assert.equal(map.nodes[0].id, 'parent')
  assert.equal(map.nodes[1].parentId, 'parent')
})

test('drops cycles and keeps every reachable node exactly once', () => {
  const map = normalizeMindMap({ title: 'T', nodes: [
    { id: 'root', label: 'Root', parentId: null },
    { id: 'x', label: 'X', parentId: 'y' },
    { id: 'y', label: 'Y', parentId: 'x' },
  ] })
  const ids = map.nodes.map((node) => node.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.equal(map.nodes.length, 3)
  assert.ok(map.nodes.every((node) => node.parentId === null || ids.includes(node.parentId)))
})

test('deduplicates repeated ids', () => {
  const map = normalizeMindMap({ title: 'T', nodes: [
    { id: 'same', label: 'Root', parentId: null },
    { id: 'same', label: 'Duplicate', parentId: 'same' },
    { id: 'same', label: 'Another', parentId: 'same' },
  ] })
  assert.equal(new Set(map.nodes.map((node) => node.id)).size, map.nodes.length)
})

test('enforces node and depth limits', () => {
  const nodes = [{ id: 'root', label: 'Root', parentId: null }]
  for (let index = 0; index < MIND_MAP_LIMITS.nodes + 50; index += 1) nodes.push({ id: `n${index}`, label: `Node ${index}`, parentId: index === 0 ? 'root' : `n${index - 1}` })
  const map = normalizeMindMap({ title: 'Deep', nodes })
  assert.equal(map.nodes.length, MIND_MAP_LIMITS.nodes)
  assert.ok(map.nodes.every((node) => depthOf(map.nodes, node.id) <= MIND_MAP_LIMITS.depth))
})

test('creates a map with a single root whose label matches the title', () => {
  const map = createMindMap('  Launch   plan  ')
  assert.equal(map.title, 'Launch plan')
  assert.equal(map.nodes.length, 1)
  assert.equal(map.nodes[0].label, 'Launch plan')
})

test('adds children after the full subtree of their parent', () => {
  const { map, node } = addChildNode(sample(), 'a', 'A three')
  assert.equal(node.parentId, 'a')
  const ids = map.nodes.map((item) => item.id)
  assert.deepEqual(ids.slice(0, 5), ['r', 'a', 'a1', 'a2', node.id])
})

test('adding a child expands a collapsed parent', () => {
  const collapsed = toggleCollapse(sample(), 'a', true)
  const { map } = addChildNode(collapsed, 'a', 'New')
  assert.equal(map.nodes.find((node) => node.id === 'a').collapsed, false)
})

test('adds siblings directly after the source subtree', () => {
  const { map, node } = addSiblingNode(sample(), 'a', 'Branch A2')
  assert.equal(node.parentId, 'r')
  assert.equal(map.nodes.findIndex((item) => item.id === node.id), 4)
})

test('sibling of the root becomes a child of the root', () => {
  const { node } = addSiblingNode(sample(), 'r', 'Extra')
  assert.equal(node.parentId, 'r')
})

test('rejects adding beyond the node limit', () => {
  let map = createMindMap('Root')
  for (let index = 0; index < MIND_MAP_LIMITS.nodes - 1; index += 1) map = addChildNode(map, map.nodes[0].id, `Node ${index}`).map
  const result = addChildNode(map, map.nodes[0].id, 'Overflow')
  assert.equal(result.node, null)
  assert.match(result.error, /up to/)
})

test('rejects adding beyond the depth limit', () => {
  let map = createMindMap('Root')
  let parentId = map.nodes[0].id
  for (let index = 0; index < MIND_MAP_LIMITS.depth; index += 1) {
    const result = addChildNode(map, parentId, `Level ${index + 1}`)
    map = result.map
    parentId = result.node.id
  }
  const overflow = addChildNode(map, parentId, 'Too deep')
  assert.equal(overflow.node, null)
  assert.match(overflow.error, /levels deep/)
})

test('updating the root label also renames the map', () => {
  const map = updateNode(sample(), 'r', { label: 'New root' })
  assert.equal(map.title, 'New root')
  assert.equal(map.nodes[0].label, 'New root')
})

test('updating a branch label leaves the map title untouched', () => {
  const map = updateNode(sample(), 'a', { label: 'Renamed', note: 'Some note', color: '#ABCDEF' })
  assert.equal(map.title, 'Root')
  const node = map.nodes.find((item) => item.id === 'a')
  assert.equal(node.label, 'Renamed')
  assert.equal(node.note, 'Some note')
  assert.equal(node.color, '#abcdef')
})

test('rejects invalid colors and empty labels', () => {
  const map = updateNode(sample(), 'a', { label: '   ', color: 'red' })
  const node = map.nodes.find((item) => item.id === 'a')
  assert.equal(node.label, 'Branch A')
  assert.equal(node.color, '')
})

test('removing a node deletes its whole subtree and selects a sibling', () => {
  const { map, nextSelection, removed } = removeNode(sample(), 'a')
  assert.equal(removed, 3)
  assert.equal(nextSelection, 'b')
  assert.deepEqual(map.nodes.map((node) => node.id), ['r', 'b', 'b1'])
})

test('removing the last child selects the parent', () => {
  const { nextSelection } = removeNode(sample(), 'b1')
  assert.equal(nextSelection, 'b')
})

test('the root cannot be removed', () => {
  const map = sample()
  const { map: next, removed } = removeNode(map, 'r')
  assert.equal(removed, 0)
  assert.equal(next.nodes.length, map.nodes.length)
})

test('moving a node carries its subtree', () => {
  const map = moveNode(sample(), 'a', 'b')
  assert.equal(map.nodes.find((node) => node.id === 'a').parentId, 'b')
  assert.deepEqual([...descendantIds(map.nodes, 'a')].sort(), ['a1', 'a2'])
  assert.equal(map.nodes.length, 6)
})

test('moving into a descendant or itself is ignored', () => {
  const map = sample()
  assert.equal(moveNode(map, 'a', 'a1'), map)
  assert.equal(moveNode(map, 'a', 'a'), map)
  assert.equal(moveNode(map, 'r', 'a'), map)
})

test('moving respects the index within the new parent', () => {
  const map = moveNode(sample(), 'b', 'a', 0)
  const childrenOfA = map.nodes.filter((node) => node.parentId === 'a').map((node) => node.id)
  assert.deepEqual(childrenOfA, ['b', 'a1', 'a2'])
})

test('reordering swaps siblings and clamps at the edges', () => {
  const down = reorderNode(sample(), 'a', 1)
  assert.deepEqual(down.nodes.filter((node) => node.parentId === 'r').map((node) => node.id), ['b', 'a'])
  const clamped = reorderNode(sample(), 'a', -1)
  assert.deepEqual(clamped.nodes.filter((node) => node.parentId === 'r').map((node) => node.id), ['a', 'b'])
})

test('indent moves a node under its previous sibling', () => {
  const map = indentNode(sample(), 'b')
  assert.equal(map.nodes.find((node) => node.id === 'b').parentId, 'a')
})

test('indent is a no-op for the first sibling and the root', () => {
  const map = sample()
  assert.equal(indentNode(map, 'a'), map)
  assert.equal(indentNode(map, 'r'), map)
})

test('outdent lifts a node next to its former parent', () => {
  const map = outdentNode(sample(), 'a1')
  assert.equal(map.nodes.find((node) => node.id === 'a1').parentId, 'r')
  assert.deepEqual(map.nodes.filter((node) => node.parentId === 'r').map((node) => node.id), ['a', 'a1', 'b'])
})

test('outdent is a no-op for direct children of the root', () => {
  const map = sample()
  assert.equal(outdentNode(map, 'a'), map)
})

test('collapse only applies to nodes with children', () => {
  const map = toggleCollapse(sample(), 'a1', true)
  assert.equal(map.nodes.find((node) => node.id === 'a1').collapsed, false)
  const collapsed = toggleCollapse(sample(), 'a', true)
  assert.equal(collapsed.nodes.find((node) => node.id === 'a').collapsed, true)
})

test('collapse all keeps the root visible and expands leaves', () => {
  const map = setAllCollapsed(sample(), true)
  assert.equal(map.nodes.find((node) => node.id === 'r').collapsed, false)
  assert.equal(map.nodes.find((node) => node.id === 'a').collapsed, true)
  assert.equal(map.nodes.find((node) => node.id === 'a1').collapsed, false)
})

test('duplicating a subtree creates fresh ids under the same parent', () => {
  const { map, node } = duplicateSubtree(sample(), 'a')
  assert.equal(map.nodes.length, 9)
  assert.equal(node.parentId, 'r')
  assert.notEqual(node.id, 'a')
  assert.equal(descendantIds(map.nodes, node.id).size, 2)
})

test('duplicating a map produces new ids everywhere', () => {
  const original = sample()
  const copy = duplicateMindMap(original)
  assert.notEqual(copy.id, original.id)
  assert.equal(copy.title, 'Root (copy)')
  assert.equal(copy.nodes.length, original.nodes.length)
  assert.ok(copy.nodes.every((node) => !original.nodes.some((item) => item.id === node.id)))
  assert.equal(copy.nodes[0].parentId, null)
})

test('search matches labels and notes case-insensitively', () => {
  const map = updateNode(sample(), 'b1', { note: 'Contains a HIDDEN keyword' })
  assert.deepEqual(searchNodes(map.nodes, 'branch'), ['a', 'b'])
  assert.deepEqual(searchNodes(map.nodes, 'hidden'), ['b1'])
  assert.deepEqual(searchNodes(map.nodes, '   '), [])
})

test('stats describe the tree', () => {
  const stats = mindMapStats(sample())
  assert.deepEqual(stats, { nodes: 6, branches: 2, leaves: 3, depth: 2, notes: 0 })
})

test('descendant checks are cycle safe', () => {
  const map = sample()
  assert.equal(isDescendant(map.nodes, 'a', 'a1'), true)
  assert.equal(isDescendant(map.nodes, 'a1', 'a'), false)
  const looped = [{ id: 'x', label: 'X', parentId: 'y' }, { id: 'y', label: 'Y', parentId: 'x' }]
  assert.equal(isDescendant(looped, 'z', 'x'), false)
})

test('label wrapping honours the width budget and breaks long words', () => {
  const lines = wrapLabel('a much longer label that needs to wrap over multiple lines', 14, 200)
  assert.ok(lines.length > 1)
  assert.ok(lines.length <= 4)
  const broken = wrapLabel('supercalifragilisticexpialidocious'.repeat(3), 14, 120)
  assert.ok(broken.every((line) => line.length <= 20))
})

test('layout produces one positioned node per visible node with no overlap', () => {
  const map = sample()
  const layout = layoutMindMap(map.nodes, { layout: map.layout, theme: map.theme })
  assert.equal(layout.nodes.length, 6)
  assert.equal(layout.edges.length, 5)
  for (const node of layout.nodes) {
    assert.ok(node.x - node.width / 2 >= -0.01, 'node stays inside the canvas horizontally')
    assert.ok(node.y - node.height / 2 >= -0.01, 'node stays inside the canvas vertically')
    assert.ok(node.x + node.width / 2 <= layout.width + 0.01)
    assert.ok(node.y + node.height / 2 <= layout.height + 0.01)
  }
  for (const a of layout.nodes) {
    for (const b of layout.nodes) {
      if (a.id === b.id) continue
      const overlapX = Math.abs(a.x - b.x) < (a.width + b.width) / 2 - 1
      const overlapY = Math.abs(a.y - b.y) < (a.height + b.height) / 2 - 1
      assert.ok(!(overlapX && overlapY), `${a.label} overlaps ${b.label}`)
    }
  }
})

test('every layout mode keeps a non-overlapping arrangement for a wide tree', () => {
  let map = createMindMap('Center')
  const rootId = map.nodes[0].id
  for (let branch = 0; branch < 7; branch += 1) {
    const created = addChildNode(map, rootId, `Branch number ${branch}`)
    map = created.map
    for (let child = 0; child < 4; child += 1) {
      const leaf = addChildNode(map, created.node.id, `Child ${branch}-${child} with a longer label`)
      map = leaf.map
      map = addChildNode(map, leaf.node.id, `Detail ${branch}-${child}`).map
    }
  }
  for (const mode of ['balanced', 'right', 'down']) {
    const layout = layoutMindMap(map.nodes, { layout: mode })
    assert.equal(layout.nodes.length, map.nodes.length)
    for (const a of layout.nodes) {
      for (const b of layout.nodes) {
        if (a.id === b.id) continue
        const overlapX = Math.abs(a.x - b.x) < (a.width + b.width) / 2 - 1
        const overlapY = Math.abs(a.y - b.y) < (a.height + b.height) / 2 - 1
        assert.ok(!(overlapX && overlapY), `${mode}: ${a.label} overlaps ${b.label}`)
      }
    }
  }
})

test('balanced layout spreads root children to both sides', () => {
  const layout = layoutMindMap(sample().nodes, { layout: 'balanced' })
  const sides = new Set(layout.nodes.filter((node) => node.depth === 1).map((node) => node.side))
  assert.deepEqual([...sides].sort(), [-1, 1])
})

test('logical layout keeps every node on the right of the root', () => {
  const layout = layoutMindMap(sample().nodes, { layout: 'right' })
  const root = layout.nodes[0]
  assert.ok(layout.nodes.slice(1).every((node) => node.x > root.x))
})

test('org chart layout keeps every node below the root', () => {
  const layout = layoutMindMap(sample().nodes, { layout: 'down' })
  const root = layout.nodes[0]
  assert.ok(layout.nodes.slice(1).every((node) => node.y > root.y))
})

test('collapsed nodes hide descendants and report the hidden count', () => {
  const map = toggleCollapse(sample(), 'a', true)
  const layout = layoutMindMap(map.nodes, {})
  assert.equal(layout.nodes.length, 4)
  assert.equal(layout.nodes.find((node) => node.id === 'a').hiddenCount, 2)
  assert.ok(!layout.edges.some((edge) => edge.to === 'a1'))
})

test('node color overrides the theme color', () => {
  const map = updateNode(sample(), 'a', { color: '#123456' })
  const layout = layoutMindMap(map.nodes, { theme: 'forest' })
  assert.equal(layout.nodes.find((node) => node.id === 'a').accent, '#123456')
})

test('layout of an empty tree stays safe', () => {
  const layout = layoutMindMap([], {})
  assert.deepEqual(layout.nodes, [])
  assert.deepEqual(layout.edges, [])
})

test('markdown export nests notes under their node', () => {
  const map = updateNode(sample(), 'a1', { note: 'Detail line' })
  const markdown = mindMapToMarkdown(map)
  assert.match(markdown, /^# Root/)
  assert.match(markdown, /- Branch A/)
  assert.match(markdown, /> Detail line/)
})

test('outline import round-trips through markdown export', () => {
  const map = sample()
  const imported = mindMapFromOutline(mindMapToMarkdown(map))
  assert.equal(imported.title, 'Root')
  assert.deepEqual(imported.nodes.map((node) => node.label), ['Root', 'Branch A', 'A one', 'A two', 'Branch B', 'B one'])
})

test('outline import handles tabs, bullets and numbering', () => {
  const map = mindMapFromOutline('Plan\n\t1. First\n\t\t- Deep\n\t* Second')
  assert.deepEqual(map.nodes.map((node) => node.label), ['Plan', 'First', 'Deep', 'Second'])
  assert.equal(map.nodes[2].parentId, map.nodes[1].id)
  assert.equal(map.nodes[3].parentId, map.nodes[0].id)
})

test('outline import rejects empty input', () => {
  assert.equal(mindMapFromOutline('   \n  '), null)
})

test('svg export escapes labels and includes every node', () => {
  const map = updateNode(sample(), 'a', { label: 'A & B <tag>' })
  const svg = mindMapToSvg(map, {})
  assert.match(svg, /^<svg /)
  assert.match(svg, /A &amp; B &lt;tag&gt;/)
  assert.equal(svg.match(/<rect /g).length, map.nodes.length + 1)
  assert.match(svg, /<\/svg>$/)
})

test('dropping before a reference places the node ahead of it', () => {
  const map = moveNodeRelative(sample(), 'b', 'a', 'before')
  assert.deepEqual(map.nodes.filter((node) => node.parentId === 'r').map((node) => node.id), ['b', 'a'])
})

test('dropping after a reference places the node behind it', () => {
  const map = moveNodeRelative(sample(), 'a', 'b', 'after')
  assert.deepEqual(map.nodes.filter((node) => node.parentId === 'r').map((node) => node.id), ['b', 'a'])
})

test('dropping between branches reparents and orders in one step', () => {
  const map = moveNodeRelative(sample(), 'b', 'a2', 'before')
  const childrenOfA = map.nodes.filter((node) => node.parentId === 'a').map((node) => node.id)
  assert.deepEqual(childrenOfA, ['a1', 'b', 'a2'])
  assert.equal(map.nodes.find((node) => node.id === 'b1').parentId, 'b')
})

test('dropping inside makes the node the last child', () => {
  const map = moveNodeRelative(sample(), 'b', 'a', 'inside')
  assert.deepEqual(map.nodes.filter((node) => node.parentId === 'a').map((node) => node.id), ['a1', 'a2', 'b'])
})

test('reordering next to itself keeps the sibling order stable', () => {
  const map = sample()
  assert.deepEqual(moveNodeRelative(map, 'a', 'a', 'before').nodes.map((node) => node.id), map.nodes.map((node) => node.id))
  assert.deepEqual(moveNodeRelative(map, 'a', 'a', 'after').nodes.map((node) => node.id), map.nodes.map((node) => node.id))
})

test('dropping beside a root sibling falls back to nesting inside the root', () => {
  const map = moveNodeRelative(sample(), 'a1', 'r', 'before')
  assert.equal(map.nodes.find((node) => node.id === 'a1').parentId, 'r')
})

test('an invalid relative drop into a descendant is ignored', () => {
  const map = sample()
  assert.equal(moveNodeRelative(map, 'a', 'a1', 'before'), map)
  assert.equal(moveNodeRelative(map, 'a', 'a1', 'inside'), map)
})
