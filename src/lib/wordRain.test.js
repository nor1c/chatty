import test from 'node:test'
import assert from 'node:assert/strict'
import {
  RAIN_MAX_LEVEL,
  formatRainClock,
  rainDeckDraw,
  shuffleRainDeck,
  normalizeRainPairs,
  rainDrop,
  rainFallDuration,
  rainLevel,
  rainMatches,
  rainPoints,
  rainSpawnDelay,
} from './wordRain.js'

const pairs = [
  { wordId: 'a', word: 'casa', translation: 'house' },
  { wordId: 'b', word: 'perro', translation: 'dog' },
  { wordId: 'c', word: 'libro', translation: 'book' },
]

test('rainMatches ignores case, accents padding, and trailing punctuation', () => {
  assert.equal(rainMatches('  House! ', 'house'), true)
  assert.equal(rainMatches('house', 'House'), true)
  assert.equal(rainMatches('cat', 'house'), false)
  assert.equal(rainMatches('', 'house'), false)
})

test('rainMatches accepts any of several separated alternatives', () => {
  assert.equal(rainMatches('home', 'house / home / building'), true)
  assert.equal(rainMatches('building', 'house / home / building'), true)
  assert.equal(rainMatches('shed', 'house / home / building'), false)
})

test('rainDrop flips prompt and expected per direction', () => {
  const forward = rainDrop(pairs[0], 'target-to-user')
  assert.deepEqual([forward.prompt, forward.expected], ['casa', 'house'])
  const reverse = rainDrop(pairs[0], 'user-to-target')
  assert.deepEqual([reverse.prompt, reverse.expected], ['house', 'casa'])
})

test('rainDrop in mixed mode always yields one of the two valid directions', () => {
  for (let index = 0; index < 40; index += 1) {
    const drop = rainDrop(pairs[0], 'mixed')
    assert.ok(['target-to-user', 'user-to-target'].includes(drop.direction))
    assert.deepEqual([drop.prompt, drop.expected].sort(), ['casa', 'house'])
  }
})

test('shuffleRainDeck keeps every saved word exactly once', () => {
  const deck = shuffleRainDeck(pairs, 'target-to-user')
  assert.equal(deck.length, 3)
  assert.deepEqual(deck.map((pair) => pair.wordId).sort(), ['a', 'b', 'c'])
})

test('shuffleRainDeck rejects empty decks and unknown directions', () => {
  assert.throws(() => shuffleRainDeck([], 'mixed'), /at least one vocabulary word/)
  assert.throws(() => shuffleRainDeck(pairs, 'sideways'), /Unknown word rain direction/)
})

test('rainDeckDraw cycles through the deck so a timed round never runs dry', () => {
  const deck = shuffleRainDeck(pairs, 'target-to-user')
  const drawn = Array.from({ length: 7 }, (_, index) => rainDeckDraw(deck, index, 'target-to-user'))
  assert.equal(drawn.length, 7)
  assert.equal(drawn[0].wordId, drawn[3].wordId)
  assert.equal(drawn[1].wordId, drawn[4].wordId)
  assert.ok(drawn.every((drop) => drop.prompt && drop.expected))
})

test('formatRainClock renders a padded countdown and never goes negative', () => {
  assert.equal(formatRainClock(125000), '2:05')
  assert.equal(formatRainClock(60000), '1:00')
  assert.equal(formatRainClock(9000), '0:09')
  assert.equal(formatRainClock(-500), '0:00')
})

test('difficulty ramps up with cleared words but stays bounded', () => {
  assert.equal(rainLevel(0), 1)
  assert.equal(rainLevel(4), 2)
  assert.equal(rainLevel(999), RAIN_MAX_LEVEL)
  assert.ok(rainFallDuration(1) > rainFallDuration(RAIN_MAX_LEVEL))
  assert.ok(rainSpawnDelay(1) > rainSpawnDelay(RAIN_MAX_LEVEL))
  assert.ok(rainFallDuration(RAIN_MAX_LEVEL) >= 5200)
  assert.ok(rainPoints(3) > rainPoints(1))
})

test('normalizeRainPairs keeps only supplied words and rejects partial results', () => {
  const supplied = [{ wordId: 'a', word: 'casa' }, { wordId: 'b', word: 'perro' }]
  const result = normalizeRainPairs({ pairs: [
    { wordId: 'a', translation: 'house' },
    { wordId: 'b', translation: 'dog' },
    { wordId: 'zzz', translation: 'ignored' },
  ] }, supplied)
  assert.deepEqual(result, [
    { wordId: 'a', word: 'casa', translation: 'house' },
    { wordId: 'b', word: 'perro', translation: 'dog' },
  ])
  assert.throws(() => normalizeRainPairs({ pairs: [{ wordId: 'a', translation: 'house' }] }, supplied), /translated 1 of 2/)
  assert.throws(() => normalizeRainPairs({ pairs: [
    { wordId: 'a', translation: 'house' },
    { wordId: 'a', translation: 'duplicate' },
  ] }, supplied), /translated 1 of 2/)
})
