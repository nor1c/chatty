export const VOCABULARY_LEVELS = [
  { value: 'beginner', label: 'Beginner', range: 'A1' },
  { value: 'elementary', label: 'Elementary', range: 'A2' },
  { value: 'intermediate', label: 'Intermediate', range: 'B1–B2' },
  { value: 'advanced', label: 'Advanced', range: 'C1–C2' },
]

const LEVEL_VALUES = new Set(VOCABULARY_LEVELS.map((level) => level.value))

export function normalizeVocabularyClassifications(raw, suppliedWords) {
  const suppliedIds = new Set(suppliedWords.map((word) => word.id))
  const seen = new Set()
  const classifications = Array.isArray(raw?.classifications) ? raw.classifications : []
  const normalized = classifications.map((item) => {
    const wordId = String(item?.wordId || '')
    const level = String(item?.level || '').toLowerCase()
    if (!suppliedIds.has(wordId) || seen.has(wordId) || !LEVEL_VALUES.has(level)) return null
    seen.add(wordId)
    return { wordId, level }
  }).filter(Boolean)

  if (normalized.length !== suppliedWords.length) {
    throw new Error(`The provider classified ${normalized.length} of ${suppliedWords.length} words. Try again.`)
  }
  return normalized
}

export function vocabularyLevel(level) {
  return VOCABULARY_LEVELS.find((item) => item.value === level)
}
