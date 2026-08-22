const text = (value) => String(value || '').trim()

export function normalizeEbookMetadata(value) {
  if (!text(value?.title)) throw new Error('The provider returned incomplete ebook metadata.')
  return {
    title: text(value.title), subtitle: text(value.subtitle), author: text(value.author) || 'ShinkuChat AI',
    language: text(value.language) || 'English', coverPrompt: text(value.coverPrompt),
    endingTitle: text(value.endingTitle) || 'Closing', endingSummary: text(value.endingSummary),
  }
}

export function normalizeEbookOutlineChapter(value, index = 0) {
  if (!text(value?.title) || !text(value?.summary)) throw new Error(`The provider returned an incomplete outline for chapter ${index + 1}.`)
  return {
    id: text(value.id) || `chapter-${index + 1}`, title: text(value.title), summary: text(value.summary),
    illustrationNeeded: Boolean(value.illustrationNeeded), illustrationPrompt: text(value.illustrationPrompt),
  }
}

export function normalizeEbookSectionPlan(value) {
  const sections = Array.isArray(value?.sections) ? value.sections.slice(0, 3).map((section) => ({ heading: text(section.heading), brief: text(section.brief) })).filter((section) => section.heading && section.brief) : []
  if (sections.length !== 3) throw new Error('The provider must return exactly three planned sections.')
  return { openingQuote: text(value.openingQuote), takeaway: text(value.takeaway), sections }
}

export function normalizeEbookSection(value, fallbackHeading) {
  const paragraphs = Array.isArray(value?.paragraphs) ? value.paragraphs.slice(0, 2).map(text).filter(Boolean) : []
  if (paragraphs.length !== 2) throw new Error(`The provider returned incomplete content for “${fallbackHeading}”.`)
  return { heading: text(value.heading) || fallbackHeading, paragraphs }
}

export function normalizeEbookEnding(value, fallbackTitle = 'Closing') {
  const paragraphs = Array.isArray(value?.paragraphs) ? value.paragraphs.map(text).filter(Boolean) : []
  if (!paragraphs.length) throw new Error('The provider returned an incomplete ending.')
  return { title: text(value.title) || fallbackTitle, paragraphs, finalNote: text(value.finalNote) }
}

export function ebookWordCount(ebook) {
  const content = [ebook?.title, ebook?.subtitle, ...(ebook?.chapters || []).flatMap((chapter) => [chapter.title, chapter.openingQuote, ...(chapter.sections || []).flatMap((section) => [section.heading, ...section.paragraphs]), chapter.takeaway]), ...(ebook?.ending?.paragraphs || [])].filter(Boolean).join(' ')
  return content.trim() ? content.trim().split(/\s+/).length : 0
}
