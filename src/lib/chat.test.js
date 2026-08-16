import test from 'node:test'
import assert from 'node:assert/strict'
import { buildChatContext } from './chat.js'

test('removes the welcome response and keeps a valid user-first context', () => {
  const context = buildChatContext([
    { role: 'assistant', content: 'Hello. Connect a provider, select a model, and start chatting.' },
    { role: 'user', content: 'New question' },
  ])

  assert.deepEqual(context, [{ role: 'user', content: 'New question' }])
})

test('repairs role order after an early user message is deleted', () => {
  const context = buildChatContext([
    { role: 'assistant', content: 'Old answer whose user prompt was deleted' },
    { role: 'user', content: 'New question' },
  ])

  assert.deepEqual(context, [{ role: 'user', content: 'New question' }])
})

test('merges adjacent user messages created by deleting an AI response', () => {
  const context = buildChatContext([
    { role: 'user', content: 'First surviving question' },
    { role: 'user', content: 'Second surviving question', quote: 'Useful quote' },
    { role: 'assistant', content: 'Surviving answer' },
  ])

  assert.deepEqual(context, [
    { role: 'user', content: 'First surviving question\n\nContext quote:\nUseful quote\n\nMessage:\nSecond surviving question' },
    { role: 'assistant', content: 'Surviving answer' },
  ])
})

test('drops an orphaned AI response instead of merging deleted-turn content', () => {
  const context = buildChatContext([
    { role: 'user', content: 'First surviving question' },
    { role: 'assistant', content: 'First surviving answer' },
    { role: 'assistant', content: 'Orphaned answer for a deleted user message' },
    { role: 'user', content: 'Latest question' },
  ])

  assert.deepEqual(context, [
    { role: 'user', content: 'First surviving question' },
    { role: 'assistant', content: 'First surviving answer' },
    { role: 'user', content: 'Latest question' },
  ])
})

test('does not restore deleted content', () => {
  const context = buildChatContext([
    { role: 'user', content: 'Still present' },
    { role: 'assistant', content: 'Still present answer' },
    { role: 'user', content: 'Latest message' },
  ])

  assert.equal(JSON.stringify(context).includes('DELETED SECRET'), false)
})
