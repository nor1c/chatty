export default function SingleTabBlocked() {
  return <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-6 font-sans text-slate-800 dark:bg-slate-950 dark:text-slate-100">
    <section role="alert" className="w-full max-w-md rounded-2xl border border-purple-100 bg-white p-8 text-center shadow-[0_20px_60px_rgba(76,29,149,0.12)] dark:border-white/10 dark:bg-slate-900">
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-2xl dark:bg-purple-500/15" aria-hidden="true">🔒</div>
      <h1 className="text-xl font-semibold tracking-tight">ShinkuChat is already open</h1>
      <p className="mt-3 leading-6 text-slate-600 dark:text-slate-300">Only one tab can be used at a time to protect synchronized data. Close the other ShinkuChat tab, then try again.</p>
    </section>
  </main>
}
