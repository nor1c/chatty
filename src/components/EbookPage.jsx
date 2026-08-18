import { useMemo, useState } from 'react'
import { ArrowLeft, BookOpen, Books, CaretLeft, CaretRight, DownloadSimple, Image, MagicWand, Printer, Trash } from '@phosphor-icons/react'
import { ebookWordCount } from '../lib/ebook'

const surface = 'rounded-xl bg-white p-4 shadow-[0_10px_32px_rgba(76,29,149,0.12)] dark:bg-slate-900 dark:shadow-[0_14px_38px_rgba(0,0,0,0.32)]'
const field = 'w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 transition-colors duration-300 ease-out placeholder:text-slate-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100'
const primary = 'flex h-10 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-700 to-purple-500 px-4 text-sm font-medium text-white shadow-[0_10px_26px_rgba(126,34,206,0.24)] transition-[transform,box-shadow,opacity] duration-300 ease-out hover:shadow-[0_14px_30px_rgba(126,34,206,0.32)] focus:outline-none focus:ring-2 focus:ring-purple-500/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none'
const secondary = 'flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-100 px-3 text-sm font-medium text-slate-700 transition-colors duration-300 ease-out hover:bg-purple-100 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-purple-500/15 dark:hover:text-purple-200'

export default function EbookPage({ ebooks, providerReady, onGenerate, onDelete, onOpenSettings, onBack, onReaderSelection }) {
  const [description, setDescription] = useState('')
  const [author, setAuthor] = useState('')
  const [chapterCount, setChapterCount] = useState(5)
  const [includeIllustrations, setIncludeIllustrations] = useState(true)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [active, setActive] = useState(null)
  const [page, setPage] = useState(0)

  const pages = useMemo(() => active ? buildPages(active) : [], [active])
  const openBook = (ebook) => { setActive(ebook); setPage(0) }
  const selectChapterCount = (event, count) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const choices = [3, 5, 8]
    const current = choices.indexOf(count)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1 : (current + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length
    setChapterCount(choices[next])
    event.currentTarget.parentElement?.querySelector(`[data-chapters="${choices[next]}"]`)?.focus()
  }
  const create = async (event) => {
    event.preventDefault()
    if (!description.trim() || busy) return
    if (!providerReady) { onOpenSettings(); return }
    setBusy(true); setError(''); setProgress('Planning cover and chapters…')
    try { const ebook = await onGenerate({ description: description.trim(), author: author.trim(), chapterCount, includeIllustrations, onProgress: setProgress }); openBook(ebook); setDescription('') }
    catch (cause) { setError(cause.message || 'Could not generate the ebook.') }
    finally { setBusy(false); setProgress('') }
  }

  if (active) return <Reader ebook={active} pages={pages} page={page} setPage={setPage} onClose={() => setActive(null)} onSelection={onReaderSelection} />

  return <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-5"><div className="mx-auto w-full max-w-5xl space-y-4">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><button type="button" onClick={onBack} className={secondary}><ArrowLeft size={16} />Home</button><span className="mt-3 block text-xs font-medium uppercase tracking-[0.14em] text-purple-600 dark:text-purple-300">AI publishing studio</span><h1 className="mt-1 text-xl font-semibold">Ebook/PDF Maker</h1><p className="mt-0.5 text-sm text-slate-500">Describe a book. AI builds its cover concept, table of contents, chapters, illustrations, and ending.</p></div><div className="flex items-center gap-2 rounded-lg bg-purple-100 px-3 py-2 text-[13px] font-medium text-purple-800 dark:bg-purple-500/15 dark:text-purple-200"><Books size={17} />{ebooks.length} saved book{ebooks.length === 1 ? '' : 's'}</div></header>
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)]">
      <form onSubmit={create} className={`${surface} space-y-3`}><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-200"><MagicWand size={17} /></span><div><h2 className="text-base font-semibold">Create a complete ebook</h2><p className="text-xs text-slate-500">More detail gives the author a clearer direction.</p></div></div>
        <label className="block"><span className="mb-1 block text-[13px] font-medium">Book description</span><textarea required rows="7" value={description} onChange={(event) => setDescription(event.target.value)} className={`${field} resize-y p-3`} placeholder="Example: A practical Indonesian guide for first-time freelancers, friendly tone, real scenarios, actionable exercises, and a simple illustration at the start of each chapter." /></label>
        <label className="block"><span className="mb-1 block text-[13px] font-medium">Author name <span className="font-normal text-slate-400">(optional)</span></span><input value={author} onChange={(event) => setAuthor(event.target.value)} className={`${field} h-10`} placeholder="Your name or pen name" /></label>
        <div><span className="mb-1 block text-[13px] font-medium">Length</span><div role="radiogroup" aria-label="Number of chapters" className="grid grid-cols-3 gap-2">{[3, 5, 8].map((count) => <button key={count} type="button" role="radio" aria-checked={chapterCount === count} tabIndex={chapterCount === count ? 0 : -1} data-chapters={count} onKeyDown={(event) => selectChapterCount(event, count)} onClick={() => setChapterCount(count)} className={`h-9 rounded-lg text-sm font-medium transition-[background-color,color,box-shadow] duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-purple-500/10 ${chapterCount === count ? 'bg-purple-700 text-white shadow-[0_6px_16px_rgba(126,34,206,0.22)]' : 'bg-slate-100 text-slate-600 hover:bg-purple-100 hover:text-purple-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-purple-500/15'}`}>{count} chapters</button>)}</div></div>
        <button type="button" role="switch" aria-checked={includeIllustrations} onClick={() => setIncludeIllustrations((value) => !value)} className="flex w-full items-center gap-3 rounded-lg bg-slate-50 p-3 text-left transition-colors duration-300 ease-out hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:bg-white/5 dark:hover:bg-purple-500/10"><span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-300 ease-out ${includeIllustrations ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-600'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-300 ease-out ${includeIllustrations ? 'translate-x-[18px]' : 'translate-x-0.5'}`} /></span><span><span className="block text-sm font-medium">Prepare illustrations when useful</span><span className="block text-xs text-slate-500">The book includes art direction and visual placeholders ready for image generation.</span></span></button>
        {error && <p role="alert" className="rounded-lg bg-purple-100 px-3 py-2 text-[13px] text-purple-900 dark:bg-purple-500/15 dark:text-purple-100">{error}</p>}
        <button type="submit" disabled={!description.trim() || busy} className={`${primary} w-full`}>{busy ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none" />{progress || 'Writing ebook…'}</> : <><MagicWand size={17} />Generate full ebook</>}</button>
      </form>
      <section aria-labelledby="library-title"><div className="flex items-center justify-between"><div><h2 id="library-title" className="text-base font-semibold">Your library</h2><p className="mt-0.5 text-xs text-slate-500">Open any saved book in reading mode.</p></div></div><div className="mt-3 space-y-3">{ebooks.map((ebook) => <article key={ebook.id} className={`${surface} group`}><button type="button" onClick={() => openBook(ebook)} className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10"><div className="flex gap-3"><CoverMini ebook={ebook} /><div className="min-w-0 flex-1"><span className="text-xs font-medium uppercase tracking-[0.12em] text-purple-600 dark:text-purple-300">{ebook.chapters.length} chapters</span><h3 className="mt-1 line-clamp-2 text-base font-semibold">{ebook.title}</h3><p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{ebook.subtitle || ebook.description}</p><span className="mt-3 flex items-center gap-1 text-[13px] font-medium text-purple-700 dark:text-purple-300"><BookOpen size={15} />Read ebook</span></div></div></button><div className="mt-3 flex justify-end border-t border-slate-100 pt-2 dark:border-slate-800"><button type="button" onClick={() => onDelete(ebook.id)} className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-500 transition-colors duration-300 ease-out hover:bg-purple-100 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:hover:bg-purple-500/15"><Trash size={14} />Delete</button></div></article>)}{!ebooks.length && <div className={`${surface} text-center`}><BookOpen size={24} className="mx-auto text-purple-500" /><h3 className="mt-2 text-base font-semibold">Your first ebook starts here</h3><p className="mt-0.5 text-sm text-slate-500">Describe it on the left and let AI handle the full structure.</p></div>}</div></section>
    </div>
  </div></div>
}

function CoverMini({ ebook }) { return <div className="flex aspect-[3/4] w-24 shrink-0 flex-col justify-between overflow-hidden rounded-lg bg-gradient-to-br from-purple-950 via-purple-700 to-purple-400 p-3 text-white shadow-[0_8px_22px_rgba(76,29,149,0.25)]"><MagicWand size={18} /><span className="line-clamp-4 text-[13px] leading-[18px] font-semibold">{ebook.title}</span><span className="truncate text-xs text-purple-100">{ebook.author}</span></div> }

function Reader({ ebook, pages, page, setPage, onClose, onSelection }) {
  const current = pages[page]
  const download = () => { const html = buildPrintableHtml(ebook); const blob = new Blob([html], { type: 'text/html' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${safeFilename(ebook.title)}.html`; link.click(); URL.revokeObjectURL(url) }
  const printCompleteBook = () => {
    const frame = document.createElement('iframe')
    frame.className = 'fixed bottom-0 right-0 h-0 w-0 border-0'
    frame.setAttribute('title', 'Printable ebook')
    document.body.appendChild(frame)
    const documentToPrint = frame.contentDocument
    if (!documentToPrint) { frame.remove(); return }
    frame.onload = () => { frame.contentWindow?.focus(); frame.contentWindow?.print(); window.setTimeout(() => frame.remove(), 1000) }
    documentToPrint.open(); documentToPrint.write(buildPrintableHtml(ebook)); documentToPrint.close()
  }
  const captureSelection = (event) => {
    event.stopPropagation()
    window.setTimeout(() => {
      const selection = window.getSelection()
      const text = selection?.toString().trim()
      if (!text || !selection.rangeCount) return
      const anchor = selection.anchorNode?.nodeType === Node.ELEMENT_NODE ? selection.anchorNode : selection.anchorNode?.parentElement
      if (!anchor?.closest('[data-ebook-reading-page]')) return
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      if (!rect.width && !rect.height) return
      const halfToolbar = Math.min(180, window.innerWidth / 2 - 8)
      onSelection?.({ text, range: range.cloneRange(), context: `Ebook: ${ebook.title}. Current reading page: ${page + 1} of ${pages.length}.`, askActions: true, x: Math.min(window.innerWidth - halfToolbar, Math.max(halfToolbar, rect.left + rect.width / 2)), y: Math.max(8, rect.top - 48) })
    }, 0)
  }
  return <div className="flex min-h-0 flex-1 flex-col bg-slate-100 dark:bg-slate-950"><header className="flex min-h-14 shrink-0 flex-wrap items-center gap-2 bg-white px-3 py-2 shadow-[0_6px_20px_rgba(15,23,42,0.10)] dark:bg-slate-900"><button type="button" onClick={onClose} className={secondary}><ArrowLeft size={16} />Library</button><div className="min-w-0 flex-1"><h1 className="truncate text-sm font-semibold">{ebook.title}</h1><p className="text-xs text-slate-500">{ebookWordCount(ebook).toLocaleString()} words · {pages.length} reading pages</p></div><button type="button" onClick={printCompleteBook} className={secondary}><Printer size={16} />Print / PDF</button><button type="button" onClick={download} className={secondary}><DownloadSimple size={16} />HTML</button></header>
    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4"><main data-ebook-reading-page onMouseUp={captureSelection} onTouchEnd={captureSelection} className="mx-auto min-h-[min(720px,calc(100dvh-150px))] w-full max-w-3xl overflow-hidden rounded-xl bg-white p-4 shadow-[0_16px_42px_rgba(15,23,42,0.16)] dark:bg-slate-900 dark:shadow-[0_18px_48px_rgba(0,0,0,0.38)] sm:p-5"><ReadingPage page={current} ebook={ebook} /></main></div>
    <footer className="flex min-h-14 shrink-0 items-center justify-center gap-3 bg-white px-3 py-2 shadow-[0_-6px_20px_rgba(15,23,42,0.08)] dark:bg-slate-900"><button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => setPage((value) => value - 1)} className={`${secondary} w-9 px-0 disabled:opacity-40`}><CaretLeft size={17} /></button><span className="min-w-28 text-center text-xs font-medium tabular-nums text-slate-500">Page {page + 1} of {pages.length}</span><button type="button" aria-label="Next page" disabled={page === pages.length - 1} onClick={() => setPage((value) => value + 1)} className={`${secondary} w-9 px-0 disabled:opacity-40`}><CaretRight size={17} /></button></footer>
  </div>
}

function ReadingPage({ page, ebook }) {
  if (page.type === 'cover') return <div className="flex min-h-[600px] flex-col justify-between rounded-xl bg-gradient-to-br from-purple-950 via-purple-800 to-purple-500 p-5 text-white"><div className="flex items-center justify-between text-xs uppercase tracking-[0.16em]"><span>Ebook edition</span><MagicWand size={22} /></div><div><h2 className="max-w-xl text-2xl font-semibold leading-7">{ebook.title}</h2>{ebook.subtitle && <p className="mt-3 max-w-lg text-base leading-6 text-purple-100">{ebook.subtitle}</p>}{ebook.coverPrompt && <div className="mt-4 rounded-xl bg-white/10 p-4 backdrop-blur-sm"><Image size={20} /><p className="mt-2 text-xs leading-4 text-purple-100">Cover art direction: {ebook.coverPrompt}</p></div>}</div><p className="text-sm font-medium">{ebook.author}</p></div>
  if (page.type === 'toc') return <div><span className="text-xs font-medium uppercase tracking-[0.14em] text-purple-600 dark:text-purple-300">Contents</span><h2 className="mt-1 text-xl font-semibold">Table of contents</h2><ol className="mt-4 space-y-2">{ebook.chapters.map((chapter, index) => <li key={chapter.id} className="flex items-baseline gap-3 border-b border-slate-100 py-2 dark:border-slate-800"><span className="text-xs font-medium tabular-nums text-purple-600">{String(index + 1).padStart(2, '0')}</span><span className="flex-1 text-sm font-medium">{chapter.title}</span></li>)}<li className="flex items-baseline gap-3 py-2"><span className="text-xs font-medium text-purple-600">END</span><span className="text-sm font-medium">{ebook.ending.title}</span></li></ol></div>
  if (page.type === 'chapter') return <article><span className="text-xs font-medium uppercase tracking-[0.14em] text-purple-600 dark:text-purple-300">Chapter {page.number}</span><h2 className="mt-1 text-xl font-semibold">{page.chapter.title}</h2>{page.chapter.openingQuote && <blockquote className="mt-4 rounded-lg bg-purple-50 p-3 text-sm italic leading-6 text-purple-900 dark:bg-purple-500/10 dark:text-purple-100">“{page.chapter.openingQuote}”</blockquote>}{page.chapter.illustrationNeeded && page.chapter.illustrationPrompt && <div className="mt-4 rounded-xl bg-gradient-to-br from-purple-100 to-white p-4 dark:from-purple-500/15 dark:to-slate-900"><Image size={22} className="text-purple-600" /><p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-purple-600">Illustration brief</p><p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{page.chapter.illustrationPrompt}</p></div>}{page.chapter.sections.map((section) => <section key={section.heading} className="mt-4"><h3 className="text-base font-semibold">{section.heading}</h3>{section.paragraphs.map((paragraph, index) => <p key={index} className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{paragraph}</p>)}</section>)}{page.chapter.takeaway && <div className="mt-4 rounded-lg bg-slate-100 p-3 dark:bg-slate-800"><p className="text-xs font-medium uppercase tracking-[0.12em] text-purple-600">Key takeaway</p><p className="mt-1 text-sm leading-5">{page.chapter.takeaway}</p></div>}</article>
  return <article><span className="text-xs font-medium uppercase tracking-[0.14em] text-purple-600">The end</span><h2 className="mt-1 text-xl font-semibold">{ebook.ending.title}</h2>{ebook.ending.paragraphs.map((paragraph, index) => <p key={index} className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">{paragraph}</p>)}{ebook.ending.finalNote && <p className="mt-5 rounded-lg bg-purple-100 p-3 text-sm font-medium leading-5 text-purple-900 dark:bg-purple-500/15 dark:text-purple-100">{ebook.ending.finalNote}</p>}</article>
}

const buildPages = (ebook) => [{ type: 'cover' }, { type: 'toc' }, ...ebook.chapters.map((chapter, index) => ({ type: 'chapter', chapter, number: index + 1 })), { type: 'ending' }]
const safeFilename = (value) => value.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'ebook'
const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character])
function buildPrintableHtml(ebook) {
  const chapters = ebook.chapters.map((chapter, index) => `<section><h2>Chapter ${index + 1}: ${escapeHtml(chapter.title)}</h2>${chapter.illustrationPrompt ? `<aside><b>Illustration brief:</b> ${escapeHtml(chapter.illustrationPrompt)}</aside>` : ''}${chapter.sections.map((section) => `<h3>${escapeHtml(section.heading)}</h3>${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}`).join('')}</section>`).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(ebook.title)}</title><style>@page{margin:20mm}body{font-family:Inter,Arial,sans-serif;max-width:760px;margin:auto;line-height:1.7;color:#1e293b}header{min-height:85vh;display:flex;flex-direction:column;justify-content:center;page-break-after:always}section{page-break-before:always}h1{font-size:38px}h2{font-size:26px}h3{font-size:18px;margin-top:28px}aside{padding:16px;background:#f3e8ff;border-radius:10px}p{font-size:15px}</style></head><body><header><h1>${escapeHtml(ebook.title)}</h1><p>${escapeHtml(ebook.subtitle)}</p><b>${escapeHtml(ebook.author)}</b></header><section><h2>Table of contents</h2><ol>${ebook.chapters.map((chapter) => `<li>${escapeHtml(chapter.title)}</li>`).join('')}<li>${escapeHtml(ebook.ending.title)}</li></ol></section>${chapters}<section><h2>${escapeHtml(ebook.ending.title)}</h2>${ebook.ending.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}<p><b>${escapeHtml(ebook.ending.finalNote)}</b></p></section></body></html>`
}
