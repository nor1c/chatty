const stripFence = (value) => value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')

function extractJsonObject(value) {
  const cleaned = stripFence(String(value || ''))
  const start = cleaned.indexOf('{')
  if (start < 0) return ''
  let depth = 0
  let inString = false
  let escaped = false
  for (let index = start; index < cleaned.length; index += 1) {
    const character = cleaned[index]
    if (inString) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === '"') inString = false
      continue
    }
    if (character === '"') inString = true
    else if (character === '{') depth += 1
    else if (character === '}' && --depth === 0) return cleaned.slice(start, index + 1)
  }
  return cleaned.slice(start)
}

function escapeControlCharacters(value) {
  let result = ''
  let inString = false
  let escaped = false
  for (const character of value) {
    if (inString && !escaped && (character === '\n' || character === '\r' || character === '\t')) {
      result += character === '\n' ? '\\n' : character === '\r' ? '\\r' : '\\t'
      continue
    }
    result += character
    if (escaped) escaped = false
    else if (character === '\\' && inString) escaped = true
    else if (character === '"') inString = !inString
  }
  return result
}

export function parseModelJson(value) {
  const candidate = extractJsonObject(value)
  if (!candidate) throw new Error('The model did not return a JSON object.')
  try { return JSON.parse(candidate) } catch {
    const repaired = escapeControlCharacters(candidate).replace(/,\s*([}\]])/g, '$1')
    try { return JSON.parse(repaired) } catch {
      const truncated = (candidate.match(/{/g)?.length || 0) > (candidate.match(/}/g)?.length || 0)
      throw new Error(truncated ? 'The model response was cut off before its JSON was complete.' : 'The model returned malformed JSON.')
    }
  }
}

export const parseQuizJson = parseModelJson

export function normalizeQuiz(raw, fallbackDescription = '') {
  if (!raw || !Array.isArray(raw.questions) || !raw.questions.length) throw new Error('The generated quiz does not contain any questions.')
  const questions = raw.questions.slice(0, 50).map((question, index) => {
    const mode = ['single_choice', 'multiple_choice', 'short_text', 'long_text', 'boolean', 'number'].includes(question.responseMode)
      ? question.responseMode
      : 'long_text'
    const options = Array.isArray(question.options) ? question.options.map(String).filter(Boolean).slice(0, 12) : []
    const responseMode = (mode === 'single_choice' || mode === 'multiple_choice') && options.length < 2 ? 'long_text' : mode
    return {
      id: `question-${index + 1}`,
      prompt: String(question.prompt || `Question ${index + 1}`),
      responseMode,
      options: responseMode === 'boolean' && options.length !== 2 ? ['True', 'False'] : options,
      helperText: question.helperText ? String(question.helperText) : '',
      points: Math.max(1, Number(question.points) || 1),
    }
  })
  return {
    title: String(raw.title || 'Untitled quiz'),
    description: String(raw.description || fallbackDescription),
    instructions: String(raw.instructions || ''),
    questions,
  }
}

export function normalizeGrade(raw) {
  const score = Math.min(100, Math.max(1, Math.round(Number(raw?.score) || 1)))
  const validGrade = /^(A\+|A|A-|B\+|B|B-|C\+|C|C-|D\+|D|D-|F)$/.test(raw?.grade)
  return {
    score,
    grade: validGrade ? raw.grade : score >= 97 ? 'A+' : score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F',
    summary: String(raw?.summary || 'Your quiz has been graded.'),
    review: String(raw?.review || raw?.summary || 'Review your answers and focus on the concepts that need more practice.'),
    advice: String(raw?.advice || 'Review incorrect answers before retaking this quiz.'),
    feedback: Array.isArray(raw?.feedback) ? raw.feedback.map((item) => ({ questionId: String(item.questionId || ''), note: String(item.note || ''), correct: item.correct === true })).filter((item) => item.questionId) : [],
  }
}
