import { memo, useMemo, useRef, useState } from 'react'
import { ArrowUp, Check, Copy, Robot } from '@phosphor-icons/react'
import DOMPurify from 'dompurify'
import { marked } from 'marked'

function renderMarkdown(content) {
  const sanitized = DOMPurify.sanitize(marked.parse(content || '', { gfm: true, breaks: true }))
  const documentNode = new DOMParser().parseFromString(sanitized, 'text/html')

  documentNode.querySelectorAll('table').forEach((table) => {
    const wrapper = documentNode.createElement('div')
    wrapper.className = 'markdown-table-wrap'
    table.parentNode.insertBefore(wrapper, table)
    wrapper.appendChild(table)
  })
  documentNode.querySelectorAll('pre').forEach((pre) => {
    const code = pre.querySelector('code')
    const language = [...(code?.classList || [])].find((name) => name.startsWith('language-'))?.replace('language-', '') || 'code'
    const wrapper = documentNode.createElement('div')
    wrapper.className = 'markdown-code-block'
    const header = documentNode.createElement('div')
    header.className = 'markdown-code-header'
    const label = documentNode.createElement('span')
    label.textContent = language
    const copyButton = documentNode.createElement('button')
    copyButton.type = 'button'
    copyButton.dataset.copyCode = 'true'
    copyButton.textContent = 'Copy'
    header.append(label, copyButton)
    pre.parentNode.insertBefore(wrapper, pre)
    wrapper.append(header, pre)
  })
  documentNode.querySelectorAll('a').forEach((link) => {
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
  })
  documentNode.querySelectorAll('input[type="checkbox"]').forEach((input) => input.setAttribute('aria-label', 'Task item'))
  documentNode.querySelectorAll('li > ul, li > ol, ol + ul').forEach((list) => list.classList.add('!pl-10'))

  const blocks = [...documentNode.body.children]
  let sectionLength = 0
  blocks.forEach((block, index) => {
    const isMainHeading = ['H1', 'H2'].includes(block.tagName)
    if (index > 0 && isMainHeading && sectionLength >= 1200) {
      block.classList.add('markdown-smart-break')
      sectionLength = 0
    }
    sectionLength += block.textContent.trim().length
  })

  const sectionStack = [{ level: 0, element: documentNode.body }]
  blocks.forEach((block) => {
    const headingLevel = /^H([1-6])$/.exec(block.tagName)?.[1]
    if (!headingLevel) {
      if (sectionStack.at(-1).level > 0) block.classList.add('heading-group-body')
      sectionStack.at(-1).element.appendChild(block)
      return
    }

    const level = Number(headingLevel)
    const prefixMatch = block.textContent.match(/^(\d+\.|[A-Za-z]+\.)\s+/)
    if (prefixMatch) {
      const marker = documentNode.createElement('span')
      marker.className = 'heading-marker'
      marker.textContent = prefixMatch[1]
      const label = documentNode.createElement('span')
      label.className = 'heading-label'
      while (block.firstChild) label.appendChild(block.firstChild)
      const firstTextNode = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE)
      if (firstTextNode) firstTextNode.textContent = firstTextNode.textContent.replace(prefixMatch[0], '')
      block.classList.add('numbered-heading')
      block.append(marker, label)
    }
    while (sectionStack.at(-1).level >= level) sectionStack.pop()
    const section = documentNode.createElement('section')
    section.className = `heading-group heading-group-level-${level}`
    sectionStack.at(-1).element.appendChild(section)
    section.appendChild(block)
    sectionStack.push({ level, element: section })
  })

  return documentNode.body.innerHTML
}

const Message = memo(function Message({ message, wide = false, streaming, onSelectionAction }) {
  const [copied, setCopied] = useState(false)
  const articleRef = useRef(null)
  const html = useMemo(() => renderMarkdown(message.content), [message.content])
  const copy = async () => { await navigator.clipboard.writeText(message.content); setCopied(true); setTimeout(() => setCopied(false), 1200) }
  const assistant = message.role === 'assistant'
  const scrollToResponse = () => articleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const handleClick = async (event) => {
    const button = event.target.closest('[data-copy-code]')
    if (!button) return
    const code = button.closest('.markdown-code-block')?.querySelector('code')?.textContent || ''
    await navigator.clipboard.writeText(code)
    button.textContent = 'Copied'
    setTimeout(() => { if (button.isConnected) button.textContent = 'Copy' }, 1200)
  }
  const handleSelection = () => {
    if (!assistant || !onSelectionAction) return
    requestAnimationFrame(() => {
      const selection = window.getSelection()
      const text = selection?.toString().trim()
      if (!text || !articleRef.current?.contains(selection.anchorNode)) { onSelectionAction(null); return }
      const rect = selection.getRangeAt(0).getBoundingClientRect()
      onSelectionAction({ text, x: Math.min(window.innerWidth - 170, Math.max(8, rect.left + rect.width / 2)), y: Math.max(8, rect.top - 48) })
    })
  }

  return <article ref={articleRef} onClick={handleClick} onMouseUp={handleSelection} onKeyUp={handleSelection} className={`mx-auto flex w-full ${wide ? 'max-w-5xl' : 'max-w-3xl'} scroll-mt-3 gap-3 px-3 py-3 [content-visibility:auto] [contain-intrinsic-size:auto_120px] sm:px-4 ${assistant ? 'justify-start' : 'justify-end'}`}>
    {assistant && <div className="relative mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-700 to-purple-500 text-white shadow-[0_8px_18px_rgba(126,34,206,0.22)]"><Robot size={17} weight="fill" /><span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-purple-200 ring-2 ring-white motion-reduce:animate-none dark:ring-slate-950" /></div>}
    <div className={`min-w-0 ${assistant ? 'max-w-[calc(100%-44px)] flex-1' : 'max-w-[86%] sm:max-w-[76%]'}`}>
      {assistant && <div className="mb-1 flex min-h-7 items-center justify-between gap-2"><span className="text-sm font-medium text-slate-800 dark:text-slate-100">ShinkuChat</span><button onClick={copy} aria-label="Copy response" className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10">{copied ? <Check size={16} /> : <Copy size={16} />}</button></div>}
      <div className={assistant ? '' : 'rounded-xl bg-gradient-to-br from-purple-700 to-purple-600 px-4 py-3 text-white shadow-[0_10px_28px_rgba(126,34,206,0.20)]'}>{!assistant && message.quote && <div className="mb-2 rounded-lg bg-white/10 p-2 text-purple-50"><div className="line-clamp-4 whitespace-pre-wrap">{message.quote}</div></div>}<div className={`max-w-none break-words text-sm leading-5 [&_h1]:text-xl [&_h1]:leading-7 [&_h1]:font-medium [&_h2]:text-base [&_h2]:leading-6 [&_h2]:font-medium [&_h3]:text-[15px] [&_h3]:leading-6 [&_h3]:font-medium [&_h4]:text-sm [&_h4]:leading-5 [&_h4]:font-medium [&_h5]:text-[13px] [&_h5]:leading-[18px] [&_h5]:font-medium [&_h6]:text-xs [&_h6]:leading-4 [&_h6]:font-medium [&_p]:my-0 [&_p+p]:mt-3 [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:mt-4 [&_h3]:mb-2 [&_h4]:mt-4 [&_h4]:mb-2 [&_h5]:mt-4 [&_h5]:mb-2 [&_h6]:mt-4 [&_h6]:mb-2 [&_ul]:my-3 [&_ul]:text-[15px] [&_ul]:leading-6 [&_ul]:font-medium [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:text-[15px] [&_ol]:leading-6 [&_ol]:font-medium [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_.heading-group]:min-w-0 [&_.numbered-heading]:grid [&_.numbered-heading]:grid-cols-[1.5rem_minmax(0,1fr)] [&_.heading-marker]:text-left [&_.heading-label]:min-w-0 [&_.heading-group>.heading-group-body]:ml-6 [&_blockquote]:my-3 [&_blockquote]:font-medium [&_blockquote]:border-l-2 [&_blockquote]:border-purple-200 [&_blockquote]:pl-3 [&_pre]:my-3 [&_pre]:!font-mono [&_pre]:!text-sm [&_pre]:!leading-5 [&_pre_*]:!font-mono [&_pre_*]:!text-sm [&_pre_*]:!leading-5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-950 [&_pre]:p-3 [&_pre]:text-slate-100 [&_code]:!font-mono [&_code]:!text-sm [&_code]:!leading-5 [&_code]:break-words [&_hr]:my-4 [&_hr]:h-px [&_hr]:border-0 [&_hr]:bg-slate-200 dark:[&_hr]:bg-slate-700 [&_.markdown-table-wrap]:my-3 [&_.markdown-table-wrap]:overflow-x-auto [&_.markdown-table-wrap]:rounded-lg [&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_thead]:bg-slate-100 dark:[&_thead]:bg-slate-800 [&_th]:border-b [&_th]:border-slate-200 [&_th]:px-3 [&_th]:py-2 [&_th]:text-sm [&_th]:leading-5 [&_th]:font-medium dark:[&_th]:border-slate-700 [&_td]:border-b [&_td]:border-slate-100 [&_td]:px-3 [&_td]:py-2 dark:[&_td]:border-slate-800 [&_tbody_tr:last-child_td]:border-b-0 [&_.markdown-code-block]:my-3 [&_.markdown-code-block]:overflow-hidden [&_.markdown-code-block]:rounded-lg [&_.markdown-code-block]:bg-slate-950 [&_.markdown-code-header]:flex [&_.markdown-code-header]:h-8 [&_.markdown-code-header]:items-center [&_.markdown-code-header]:justify-between [&_.markdown-code-header]:bg-slate-800 [&_.markdown-code-header]:px-3 [&_.markdown-code-header]:text-slate-300 [&_.markdown-code-header_button]:cursor-pointer [&_.markdown-code-header_button]:rounded-md [&_.markdown-code-header_button]:px-2 [&_.markdown-code-header_button]:transition-colors [&_.markdown-code-header_button]:duration-300 [&_.markdown-code-header_button:hover]:bg-white/10 [&_.markdown-code-block_pre]:my-0 [&_.markdown-code-block_pre]:rounded-none [&_p_code]:rounded-md [&_p_code]:bg-slate-100 [&_p_code]:px-1.5 [&_p_code]:py-0.5 [&_p_code]:text-purple-700 dark:[&_p_code]:bg-slate-800 dark:[&_p_code]:text-purple-300 [&_del]:text-slate-500 [&_a]:underline [&_a]:decoration-purple-300 [&_a]:underline-offset-2 [&_input[type=checkbox]]:mr-2 [&_input[type=checkbox]]:accent-purple-600 [&_li:has(input[type=checkbox])]:list-none [&_.markdown-smart-break]:relative [&_.markdown-smart-break]:mt-5 [&_.markdown-smart-break]:pt-4 [&_.markdown-smart-break]:before:absolute [&_.markdown-smart-break]:before:left-0 [&_.markdown-smart-break]:before:top-0 [&_.markdown-smart-break]:before:h-px [&_.markdown-smart-break]:before:w-24 [&_.markdown-smart-break]:before:bg-slate-200/60 dark:[&_.markdown-smart-break]:before:bg-slate-700/40 [&_h1]:text-purple-900 [&_h2]:text-purple-900 [&_h3]:text-purple-900 [&_h4]:text-purple-900 [&_h5]:text-purple-900 [&_h6]:text-purple-900 [&_th]:text-purple-900 dark:[&_h1]:text-purple-200 dark:[&_h2]:text-purple-200 dark:[&_h3]:text-purple-200 dark:[&_h4]:text-purple-200 dark:[&_h5]:text-purple-200 dark:[&_h6]:text-purple-200 dark:[&_th]:text-purple-200 ${assistant ? 'text-slate-700 [&_a]:text-purple-600 dark:text-slate-300 dark:[&_h1]:text-purple-200 dark:[&_h2]:text-purple-200 dark:[&_h3]:text-purple-200 dark:[&_h4]:text-purple-200 dark:[&_h5]:text-purple-200 dark:[&_h6]:text-purple-200 [&_strong]:font-medium dark:[&_strong]:text-slate-100 dark:[&_a]:text-purple-400' : 'text-white [&_h1]:!text-white [&_h2]:!text-white [&_h3]:!text-white [&_h4]:!text-white [&_h5]:!text-white [&_h6]:!text-white [&_ul]:!text-purple-50 [&_ol]:!text-purple-50 [&_blockquote]:!text-purple-50 [&_th]:!text-white [&_strong]:font-medium [&_strong]:text-white [&_a]:text-purple-100 [&_thead]:!bg-white/15 [&_th]:!border-white/20 [&_td]:!border-white/10 [&_blockquote]:!border-white/30 [&_hr]:!bg-white/20 [&_p_code]:!bg-white/15 [&_p_code]:!text-white'}`} dangerouslySetInnerHTML={{ __html: html }} />{streaming && <span aria-label="Generating response" className="mt-2 inline-flex gap-1"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-500 motion-reduce:animate-none" /><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-500 [animation-delay:150ms] motion-reduce:animate-none" /><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-500 [animation-delay:300ms] motion-reduce:animate-none" /></span>}</div>
      {assistant && !streaming && <div className="mt-2 flex justify-end"><button onClick={scrollToResponse} className="flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs leading-4 text-slate-500 transition-colors duration-300 hover:bg-purple-50 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:hover:bg-purple-500/10 dark:hover:text-purple-300"><ArrowUp size={15} />Response start</button></div>}
    </div>
  </article>
})
export default Message
