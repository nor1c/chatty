export const RAIN_DIRECTIONS = [
  { value: 'target-to-user', label: 'Target → yours', description: 'A word falls in the target language and you type its meaning' },
  { value: 'user-to-target', label: 'Yours → target', description: 'A word falls in your language and you type the target word' },
  { value: 'mixed', label: 'Mixed', description: 'Both directions alternate at random' },
]

export const RAIN_LIVES = 3
export const RAIN_MAX_LEVEL = 8

export const RAIN_DURATIONS = [
  { value: 60000, label: '1:00', caption: 'sprint', description: 'A quick warm-up sprint' },
  { value: 120000, label: '2:00', caption: 'standard', description: 'A balanced round' },
  { value: 300000, label: '5:00', caption: 'endurance', description: 'A long endurance storm' },
  { value: 0, label: '∞', caption: 'endless', description: 'Play until you run out of lives' },
]

const DIRECTION_VALUES = new Set(RAIN_DIRECTIONS.map((item) => item.value))
const text = (value) => String(value ?? '').trim()

export const normalizeRainAnswer = (value) => String(value ?? '')
  .normalize('NFKC').trim().toLocaleLowerCase()
  .replace(/[.!?¡¿,;:]+/g, '')
  .replace(/\s+/g, ' ')

export const rainAcceptedAnswers = (expected) => String(expected ?? '')
  .split(/\s*(?:\/|;|\||,)\s*/)
  .map((option) => normalizeRainAnswer(option))
  .filter(Boolean)

export function rainMatches(answer, expected) {
  const normalized = normalizeRainAnswer(answer)
  if (!normalized) return false
  return rainAcceptedAnswers(expected).includes(normalized)
}

export function normalizeRainPairs(raw, suppliedWords) {
  const supplied = new Map(suppliedWords.map((word) => [word.wordId, word.word]))
  const seen = new Set()
  const pairs = Array.isArray(raw?.pairs) ? raw.pairs : []
  const normalized = pairs.map((item) => {
    const wordId = text(item?.wordId)
    const translation = text(item?.translation)
    if (!supplied.has(wordId) || seen.has(wordId) || !translation) return null
    seen.add(wordId)
    return { wordId, word: supplied.get(wordId), translation }
  }).filter(Boolean)

  if (normalized.length !== suppliedWords.length) {
    throw new Error(`The provider translated ${normalized.length} of ${suppliedWords.length} words. Try again.`)
  }
  return normalized
}

export function rainDrop(pair, direction) {
  const resolved = direction === 'mixed'
    ? (Math.random() < 0.5 ? 'target-to-user' : 'user-to-target')
    : direction
  return resolved === 'user-to-target'
    ? { wordId: pair.wordId, direction: 'user-to-target', prompt: pair.translation, expected: pair.word }
    : { wordId: pair.wordId, direction: 'target-to-user', prompt: pair.word, expected: pair.translation }
}

export function shuffleRainDeck(pairs, direction) {
  if (!DIRECTION_VALUES.has(direction)) throw new Error('Unknown word rain direction.')
  const usable = pairs.filter((pair) => text(pair?.word) && text(pair?.translation))
  if (!usable.length) throw new Error('Add at least one vocabulary word first.')
  const shuffled = [...usable]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]]
  }
  return shuffled
}

export function rainDeckDraw(deck, drawIndex, direction) {
  if (!deck.length) throw new Error('Add at least one vocabulary word first.')
  return rainDrop(deck[drawIndex % deck.length], direction)
}

export function formatRainClock(remainingMs) {
  const total = Math.max(0, Math.ceil(Number(remainingMs) / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export function rainLevel(cleared) {
  return Math.min(RAIN_MAX_LEVEL, 1 + Math.floor(Math.max(0, cleared) / 4))
}

export function rainFallDuration(level) {
  const capped = Math.min(RAIN_MAX_LEVEL, Math.max(1, level))
  return Math.max(5200, 12000 - (capped - 1) * 950)
}

export function rainSpawnDelay(level) {
  const capped = Math.min(RAIN_MAX_LEVEL, Math.max(1, level))
  return Math.max(1500, 3400 - (capped - 1) * 260)
}

export function rainPoints(level) {
  return 10 * Math.min(RAIN_MAX_LEVEL, Math.max(1, level))
}

export function rainLane(index) {
  const lanes = [8, 30, 52, 74, 19, 63, 41, 85]
  return lanes[index % lanes.length]
}
