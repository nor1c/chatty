const stripFence = (value) => value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')

export function parseQuizJson(value) {
  const cleaned = stripFence(value)
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('The model did not return valid quiz data.')
  try { return JSON.parse(cleaned.slice(start, end + 1)) } catch { throw new Error('The model returned malformed quiz data. Please try generating it again.') }
}

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
