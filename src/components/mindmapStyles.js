export const surface = 'rounded-xl bg-white p-4 shadow-[0_10px_32px_rgba(76,29,149,0.12)] dark:bg-slate-900 dark:shadow-[0_14px_38px_rgba(0,0,0,0.32)]'
export const field = 'h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 transition-colors duration-300 ease-out placeholder:text-slate-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100'
export const secondary = 'flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-100 px-3 text-sm font-medium text-slate-700 transition-colors duration-300 ease-out hover:bg-purple-100 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-purple-500/15 dark:hover:text-purple-200'
export const primary = 'flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-700 to-purple-500 px-4 text-sm font-medium text-white shadow-[0_10px_26px_rgba(126,34,206,0.24)] transition-[transform,box-shadow,opacity] duration-300 ease-out hover:shadow-[0_14px_30px_rgba(126,34,206,0.32)] focus:outline-none focus:ring-2 focus:ring-purple-500/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none'
export const iconButton = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors duration-300 ease-out hover:bg-purple-100 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:opacity-35 dark:text-slate-300 dark:hover:bg-purple-500/15 dark:hover:text-purple-200'
export const menuItem = 'flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[13px] font-medium text-slate-700 transition-colors duration-300 ease-out hover:bg-purple-100 hover:text-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/10 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-purple-500/15 dark:hover:text-purple-200'
export const panel = 'rounded-xl border border-slate-200/80 bg-white/95 shadow-[0_14px_38px_rgba(76,29,149,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95 dark:shadow-[0_16px_44px_rgba(0,0,0,0.45)]'
export const chip = 'flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-purple-500/10'

export const formatDate = (value) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value || Date.now()))
export const formatRelative = (value) => {
  const diff = Date.now() - (value || Date.now())
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(value)
}
