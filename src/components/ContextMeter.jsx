export default function ContextMeter({ tokens, windowSize, reserve, percent, remaining, label, widthClass }) {
  return <div className="group relative">
    <div className="flex h-8 items-center gap-2 rounded-lg bg-slate-100/70 px-2 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300" aria-label={`Context ${label}, ${percent}% used`} tabIndex="0">
      <span>Context</span>
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><span className={`block h-full rounded-full bg-purple-600 transition-[width] duration-500 dark:bg-purple-400 ${widthClass}`} /></span>
      <span className="font-medium tabular-nums text-slate-800 dark:text-slate-100">{percent}%</span>
    </div>
    <div className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 w-56 rounded-lg border border-slate-200 bg-white p-3 opacity-0 shadow-[0_14px_35px_rgba(15,23,42,0.18)] transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex justify-between text-sm"><span className="text-slate-500">Used</span><span className="font-medium tabular-nums">~{tokens.toLocaleString('en-US')}</span></div>
      <div className="mt-1 flex justify-between text-sm"><span className="text-slate-500">Response reserve</span><span className="font-medium tabular-nums">{reserve.toLocaleString('en-US')}</span></div>
      <div className="mt-1 flex justify-between text-sm"><span className="text-slate-500">Remaining</span><span className="font-medium tabular-nums">~{remaining.toLocaleString('en-US')}</span></div>
      <div className="mt-1 flex justify-between text-sm"><span className="text-slate-500">Capacity</span><span className="font-medium tabular-nums">{windowSize.toLocaleString('en-US')}</span></div>
    </div>
  </div>
}
