import test from 'node:test'
import assert from 'node:assert/strict'
import { grammarTerm, splitGrammarTerms } from './grammarTerms.js'

test('grammarTerm resolves English, Indonesian, and plural forms', () => {
  assert.equal(grammarTerm('Adverb').label, 'Adverb')
  assert.equal(grammarTerm('kata hubung').label, 'Conjunction')
  assert.equal(grammarTerm('verbs').label, 'Verb')
  assert.equal(grammarTerm('rumah'), null)
})

test('splitGrammarTerms marks only whole-word matches', () => {
  const segments = splitGrammarTerms('This word is a common adverb here.')
  assert.deepEqual(segments.map((segment) => segment.text), ['This word is a common ', 'adverb', ' here.'])
  assert.equal(segments[1].term.label, 'Adverb')
  assert.equal(segments[0].term, null)
})

test('splitGrammarTerms ignores terms embedded inside other words', () => {
  const segments = splitGrammarTerms('adverbial reverbnoun')
  assert.deepEqual(segments, [{ text: 'adverbial reverbnoun', term: null }])
})

test('splitGrammarTerms prefers the longest matching term', () => {
  const [segment] = splitGrammarTerms('phrasal verb')
  assert.equal(segment.text, 'phrasal verb')
  assert.equal(segment.term.label, 'Phrasal verb')
})

test('splitGrammarTerms handles empty and plain input', () => {
  assert.deepEqual(splitGrammarTerms(''), [])
  assert.deepEqual(splitGrammarTerms('hello world'), [{ text: 'hello world', term: null }])
})
