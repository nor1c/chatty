const TERM_DEFINITIONS = [
  { keys: ['noun', 'nomina', 'kata benda'], label: 'Noun', description: 'A word that names a person, thing, place, or idea. Example: book, teacher, freedom.' },
  { keys: ['proper noun', 'nomina diri', 'kata benda khusus'], label: 'Proper noun', description: 'The specific name of a person, place, or organisation, normally written with a capital letter. Example: Jakarta, Maria.' },
  { keys: ['pronoun', 'pronomina', 'kata ganti'], label: 'Pronoun', description: 'A word used in place of a noun so it does not have to be repeated. Example: I, she, they, this.' },
  { keys: ['verb', 'verba', 'kata kerja'], label: 'Verb', description: 'A word that expresses an action, event, or state. Example: eat, run, sleep.' },
  { keys: ['auxiliary verb', 'modal verb', 'verba bantu', 'kata kerja bantu'], label: 'Auxiliary verb', description: 'A helper verb used with a main verb to build tense, possibility, or the passive voice. Example: have, will, can.' },
  { keys: ['transitive verb', 'verba transitif', 'kata kerja transitif'], label: 'Transitive verb', description: 'A verb that needs a direct object to complete its meaning. Example: “she reads a book”.' },
  { keys: ['intransitive verb', 'verba intransitif', 'kata kerja intransitif'], label: 'Intransitive verb', description: 'A verb that works without a direct object. Example: “he sleeps”.' },
  { keys: ['reflexive verb', 'verba refleksif', 'kata kerja refleksif'], label: 'Reflexive verb', description: 'A verb whose action goes back to the person doing it. Example: Spanish “levantarse” (to get oneself up).' },
  { keys: ['phrasal verb'], label: 'Phrasal verb', description: 'A verb combined with a particle whose meaning differs from the original word. Example: “give up” means to quit.' },
  { keys: ['adjective', 'adjektiva', 'kata sifat'], label: 'Adjective', description: 'A word that describes a quality or state of a noun. Example: big, friendly, quick.' },
  { keys: ['adverb', 'adverbia', 'kata keterangan'], label: 'Adverb', description: 'A word that modifies a verb, an adjective, or a whole sentence, often showing manner, time, or place. Example: quickly, yesterday, very.' },
  { keys: ['preposition', 'preposisi', 'kata depan'], label: 'Preposition', description: 'A word that links a noun to the rest of the sentence to show place, time, or direction. Example: in, to, from, for.' },
  { keys: ['conjunction', 'konjungsi', 'kata hubung', 'kata sambung'], label: 'Conjunction', description: 'A word that joins words, phrases, or clauses together. Example: and, but, because, or.' },
  { keys: ['interjection', 'interjeksi', 'kata seru'], label: 'Interjection', description: 'An exclamation that expresses a sudden feeling. Example: wow!, ouch!, hooray!' },
  { keys: ['article', 'artikel', 'artikula', 'kata sandang'], label: 'Article', description: 'A word placed before a noun to mark it as definite or indefinite. Example: “the”, “a”, “el”, “la”.' },
  { keys: ['determiner', 'determinator'], label: 'Determiner', description: 'A word that limits or specifies a noun, such as an article, demonstrative, or possessive. Example: this, my, some.' },
  { keys: ['numeral', 'numeralia', 'kata bilangan'], label: 'Numeral', description: 'A word that expresses a quantity or an order. Example: one, two, first.' },
  { keys: ['particle', 'partikel'], label: 'Particle', description: 'A small function word with no meaning of its own that changes the nuance of a sentence. Example: Japanese “wa”, or English “up” in “look up”.' },
  { keys: ['idiom', 'idiomatic expression', 'ungkapan idiomatik'], label: 'Idiom', description: 'An expression whose meaning cannot be guessed from its individual words. Example: “break the ice” means to ease tension.' },
  { keys: ['phrase', 'frasa'], label: 'Phrase', description: 'A group of two or more words that works as a unit but is not yet a full sentence. Example: “a big house”.' },
  { keys: ['clause', 'klausa'], label: 'Clause', description: 'A group of words containing a subject and a verb, which can stand alone or form part of a longer sentence.' },
  { keys: ['subject', 'subjek'], label: 'Subject', description: 'The part of a sentence that performs or experiences the action. Example: “Maria” in “Maria reads”.' },
  { keys: ['object', 'objek'], label: 'Object', description: 'The part of a sentence that receives the action. Example: “a book” in “Maria reads a book”.' },
  { keys: ['tense', 'kala'], label: 'Tense', description: 'The verb form that shows when something happens: past, present, or future.' },
  { keys: ['plural', 'jamak'], label: 'Plural', description: 'The word form used for more than one thing. Example: books, niños.' },
  { keys: ['singular', 'tunggal'], label: 'Singular', description: 'The word form used for exactly one thing. Example: book, niño.' },
  { keys: ['masculine', 'maskulin'], label: 'Masculine', description: 'The male grammatical gender that many languages assign to nouns. Example: Spanish “el libro”.' },
  { keys: ['feminine', 'feminin'], label: 'Feminine', description: 'The female grammatical gender that many languages assign to nouns. Example: Spanish “la casa”.' },
  { keys: ['neuter', 'netral'], label: 'Neuter', description: 'A third grammatical gender that is neither masculine nor feminine. Example: German “das Buch”.' },
  { keys: ['synonym', 'sinonim'], label: 'Synonym', description: 'A word with the same or a very similar meaning to another word. Example: smart and clever.' },
  { keys: ['antonym', 'antonim'], label: 'Antonym', description: 'A word with the opposite meaning to another word. Example: big and small.' },
  { keys: ['formal', 'baku'], label: 'Formal', description: 'A polite or official register of language used in serious and professional situations.' },
  { keys: ['informal', 'tidak baku', 'kasual'], label: 'Informal', description: 'A relaxed register of language used in everyday conversation.' },
  { keys: ['slang', 'bahasa gaul'], label: 'Slang', description: 'Very casual vocabulary that is popular within a particular group or generation.' },
]

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const normalizeKey = (value) => String(value || '').normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/g, ' ')

const TERM_LOOKUP = new Map()
for (const entry of TERM_DEFINITIONS) {
  for (const key of entry.keys) TERM_LOOKUP.set(normalizeKey(key), { label: entry.label, description: entry.description })
}

const SORTED_KEYS = [...TERM_LOOKUP.keys()].sort((a, b) => b.length - a.length)
const TERM_PATTERN = `(?<![\\p{L}\\p{N}])(?:${SORTED_KEYS.map((key) => escapeRegExp(key).replace(/ /g, '\\s+')).join('|')})(?:s|es)?(?![\\p{L}\\p{N}])`

export function grammarTerm(value) {
  return TERM_LOOKUP.get(normalizeKey(value)) || TERM_LOOKUP.get(normalizeKey(String(value || '').replace(/(?:es|s)$/i, ''))) || null
}

export function splitGrammarTerms(text) {
  const value = String(text ?? '')
  if (!value) return []
  const pattern = new RegExp(TERM_PATTERN, 'giu')
  const segments = []
  let lastIndex = 0
  let match = pattern.exec(value)
  while (match) {
    const term = grammarTerm(match[0])
    if (term) {
      if (match.index > lastIndex) segments.push({ text: value.slice(lastIndex, match.index), term: null })
      segments.push({ text: match[0], term })
      lastIndex = match.index + match[0].length
    }
    match = pattern.exec(value)
  }
  if (lastIndex < value.length) segments.push({ text: value.slice(lastIndex), term: null })
  return segments.length ? segments : [{ text: value, term: null }]
}

export const GRAMMAR_TERMS = TERM_DEFINITIONS
