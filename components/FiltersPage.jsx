export default function FiltersPage({ onBack, onInventoryMonitoring, onDisabledProducts }) {
  return (
    <div dir="rtl" className="min-h-screen bg-white font-['Vazirmatn',_'Noto_Sans_Arabic',_sans-serif]">
      <header className="border-b border-slate-200 bg-slate-100">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <h1 className="text-lg font-bold text-slate-900">فیلترها</h1>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            <span aria-hidden="true">→</span>
            صفحه اصلی
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article className="flex min-h-48 flex-col justify-between rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-amber-500/15 text-2xl" aria-hidden="true">
                ⚠
              </div>
              <h2 className="text-base font-bold text-slate-900">پایش موجودی</h2>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                مشاهده محصولات بحرانی، هشدار و محصولاتی که آستانه موجودی آن‌ها غیرفعال است.
              </p>
            </div>
            <button
              type="button"
              onClick={onInventoryMonitoring}
              className="mt-5 min-h-11 rounded-md bg-amber-500 px-4 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400"
            >
              ورود
            </button>
          </article>
          <article className="flex min-h-48 flex-col justify-between rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-slate-100 text-2xl text-slate-700" aria-hidden="true">
                ⊘
              </div>
              <h2 className="text-base font-bold text-slate-900">محصولات غیرفعال</h2>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                مشاهده محصولات غیرفعال و ورود به جزئیات آن‌ها.
              </p>
            </div>
            <button
              type="button"
              onClick={onDisabledProducts}
              className="mt-5 min-h-11 rounded-md bg-amber-500 px-4 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400"
            >
              ورود
            </button>
          </article>
        </div>
      </main>
    </div>
  );
}
