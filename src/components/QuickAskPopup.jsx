import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowClockwise, ChatCircleDots, PaperPlaneRight, Stop, X } from '@phosphor-icons/react'
import DOMPurify from 'dompurify'
import { marked } from 'marked'

function renderMarkdown(content) {
  return DOMPurify.sanitize(marked.parse(content || '', { gfm: true, breaks: true }))
}

export default function QuickAskPopup({ selection, providerReady, onAsk, onClose, onOpenSettings }) {
  const [question, setQuestion] = useState('')
  const [turns, setTurns] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const dialogRef = useRef(null)
  const chatRef = useRef(null)
  const abortRef = useRef(null)
  const closePopup = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!selection) return
    setQuestion('')
    setTurns([])
    setCurrentQuestion('')
    setAnswer('')
    setError('')
    setLoading(false)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [selection])

  useEffect(() => {
    if (!selection) return
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') { closePopup(); return }
      if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const activeElement = document.activeElement
        const activeIsInteractive = activeElement?.matches('button, input, textarea, select, a[href], [contenteditable="true"]')
        if (!activeIsInteractive && !loading) {
          event.preventDefault()
          inputRef.current?.focus()
        }
        return
      }
      if (event.key !== 'Tab') return
      const focusable = [...(dialogRef.current?.querySelectorAll('button:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])') || [])]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selection, closePopup, loading])

  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    if (!selection) return
    const frame = requestAnimationFrame(() => {
      const chat = chatRef.current
      if (chat) chat.scrollTop = chat.scrollHeight
    })
    return () => cancelAnimationFrame(frame)
  }, [selection, turns.length, currentQuestion, answer, error, loading])

  if (!selection) return null

  const submit = async (event) => {
    event?.preventDefault()
    const prompt = question.trim()
    if (!prompt || loading || !providerReady) return
    const controller = new AbortController()
    const previousTurns = currentQuestion
      ? [...turns, { question: currentQuestion, answer, error }]
      : turns
    abortRef.current = controller
    setTurns(previousTurns)
    setQuestion('')
    setCurrentQuestion(prompt)
    setAnswer('')
    setError('')
    setLoading(true)
    try {
      await onAsk(prompt, (token) => {
        if (abortRef.current === controller) setAnswer((current) => current + token)
      }, controller.signal, previousTurns)
    } catch (requestError) {
      if (requestError.name !== 'AbortError' && abortRef.current === controller) setError(requestError.message)
    } finally {
      if (abortRef.current === controller) {
        setLoading(false)
        abortRef.current = null
      }
    }
  }

  const stop = () => abortRef.current?.abort()
  const reset = () => {
    if (currentQuestion) setTurns((current) => [...current, { question: currentQuestion, answer, error }])
    setQuestion('')
    setCurrentQuestion('')
    setAnswer('')
    setError('')
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/35 p-3 backdrop-blur-sm sm:items-center" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closePopup() }}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="quick-ask-title" className="flex max-h-[min(82dvh,640px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-[0_20px_55px_rgba(15,23,42,0.24)] dark:bg-slate-900 dark:shadow-[0_20px_55px_rgba(0,0,0,0.48)]">
      <header className="flex h-14 shrink-0 items-center gap-2 px-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"><ChatCircleDots size={17} /></span>
        <div className="min-w-0 flex-1"><h2 id="quick-ask-title" className="text-base leading-6 font-semibold">Quick ask</h2><p className="text-xs leading-4 text-slate-500 dark:text-slate-400">Temporary response, not saved to chat history</p></div>
        <button type="button" onClick={closePopup} aria-label="Close quick ask" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors duration-300 ease-out hover:bg-purple-50 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:hover:bg-purple-500/10 dark:hover:text-purple-300"><X size={17} /></button>
      </header>

      <div ref={chatRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        <blockquote className="max-h-28 overflow-y-auto rounded-lg bg-purple-50 p-3 text-sm leading-5 text-slate-600 dark:bg-purple-500/10 dark:text-slate-300"><span className="mb-1 block text-xs font-medium uppercase tracking-[0.12em] text-purple-700 dark:text-purple-300">Selected text</span><span className="whitespace-pre-wrap">{selection}</span></blockquote>

        {turns.map((turn, index) => <div key={`${index}-${turn.question}`} className="space-y-2 rounded-xl bg-slate-50 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.10)] dark:bg-slate-950 dark:shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
          <div className="ml-auto w-fit max-w-[90%] whitespace-pre-wrap rounded-lg bg-purple-700 px-3 py-2 text-sm leading-5 text-white">{turn.question}</div>
          {turn.answer && <div className="max-w-none break-words text-sm leading-5 text-slate-700 dark:text-slate-200 [&_p]:my-0 [&_p+p]:mt-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-950 [&_pre]:p-3 [&_pre]:text-slate-100 [&_code]:font-mono [&_a]:text-purple-600 [&_a]:underline dark:[&_a]:text-purple-300" dangerouslySetInnerHTML={{ __html: renderMarkdown(turn.answer) }} />}
          {turn.error && <p className="text-sm leading-5 text-slate-600 dark:text-slate-300">Could not complete the quick ask: {turn.error}</p>}
        </div>)}

        {(currentQuestion || answer || error || loading) && <div aria-live="polite" className="rounded-xl bg-slate-50 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.10)] dark:bg-slate-950 dark:shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
          {currentQuestion && <div className="mb-3 ml-auto w-fit max-w-[90%] whitespace-pre-wrap rounded-lg bg-purple-700 px-3 py-2 text-sm leading-5 text-white">{currentQuestion}</div>}
          <div className="mb-2 flex items-center justify-between gap-2"><span className="text-[13px] leading-[18px] font-medium text-purple-700 dark:text-purple-300">ShinkuChat</span>{!loading && <button type="button" onClick={reset} className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-slate-500 transition-colors duration-300 ease-out hover:bg-purple-100 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:hover:bg-purple-500/15 dark:hover:text-purple-300"><ArrowClockwise size={14} />Ask another</button>}</div>
          {answer && <div className="max-w-none break-words text-sm leading-5 text-slate-700 dark:text-slate-200 [&_p]:my-0 [&_p+p]:mt-3 [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold [&_strong]:font-semibold [&_em]:italic [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-purple-300 [&_blockquote]:pl-3 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-950 [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-slate-100 [&_code]:font-mono [&_code]:text-[13px] [&_p_code]:rounded [&_p_code]:bg-slate-200 [&_p_code]:px-1 dark:[&_p_code]:bg-slate-800 [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_table]:text-sm [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:px-3 [&_th]:py-2 dark:[&_th]:border-slate-700 dark:[&_th]:bg-slate-800 [&_td]:border [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-2 dark:[&_td]:border-slate-700 [&_a]:text-purple-600 [&_a]:underline dark:[&_a]:text-purple-300" dangerouslySetInnerHTML={{ __html: renderMarkdown(answer) }} />}
          {error && <p className="text-sm leading-5 text-slate-600 dark:text-slate-300">Could not complete the quick ask: {error}</p>}
          {loading && !answer && <span className="inline-flex gap-1" aria-label="Generating response"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-500 motion-reduce:animate-none" /><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-500 [animation-delay:150ms] motion-reduce:animate-none" /><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-500 [animation-delay:300ms] motion-reduce:animate-none" /></span>}
        </div>}
      </div>

      <form onSubmit={submit} className="shrink-0 px-4 pb-4">
        {!providerReady && <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-purple-50 p-2 text-[13px] leading-[18px] text-slate-600 dark:bg-purple-500/10 dark:text-slate-300"><span>Connect a provider and select a model first.</span><button type="button" onClick={() => { closePopup(); onOpenSettings() }} className="h-8 shrink-0 rounded-lg bg-purple-700 px-3 text-sm font-medium text-white transition-colors duration-300 ease-out hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/10">Open settings</button></div>}
        <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-white p-2 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-500/10 dark:border-slate-700 dark:bg-slate-950 dark:focus-within:border-purple-500">
          <textarea ref={inputRef} value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit() } }} rows="2" disabled={loading} placeholder="Ask about the selected text…" className="max-h-28 min-h-10 flex-1 resize-none rounded-lg bg-transparent px-2 py-2 text-sm leading-5 text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-60 dark:text-slate-100" />
          {loading ? <button type="button" onClick={stop} className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white transition-colors duration-300 ease-out hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"><Stop size={15} weight="fill" />Stop</button> : <button type="submit" disabled={!question.trim() || !providerReady} aria-label="Send quick ask" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-700 text-white transition-colors duration-300 ease-out hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:opacity-40"><PaperPlaneRight size={17} weight="bold" /></button>}
        </div>
      </form>
    </section>
  </div>
}
