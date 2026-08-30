import { useMemo, useState } from "react";
import { theme } from "../config/theme";
import { normalizePersian } from "../utilities/function";
import { SearchBox } from "./SearchBox";
import useSearch from "../hook/useSearch";

const formatPrice = (raw) => {
  const num = Number(raw);
  if (isNaN(num)) return raw ?? "—";
  return (num / 10).toLocaleString("fa-IR");
};

const PriceDiff = ({ oldPrice, newPrice }) => {
  const oldNum = Number(oldPrice) / 10;
  const newNum = Number(newPrice) / 10;
  const isValid = !isNaN(oldNum) && !isNaN(newNum);
  const increased = newNum > oldNum;
  const diff = isValid ? Math.abs(newNum - oldNum) : null;
  const pct =
    isValid && oldNum !== 0 ? ((newNum - oldNum) / oldNum) * 100 : null;

  return (
    <div className="flex flex-col items-end gap-1">
      {/* قیمت قدیم */}
      <span className="text-xs text-slate-400 line-through">
        {formatPrice(oldPrice)} تومان
      </span>
      {/* قیمت جدید */}
      <span
        className={`text-sm font-bold px-2 py-0.5 rounded-lg ${
          increased
            ? "bg-red-500/10 text-red-500"
            : "bg-emerald-500/10 text-emerald-500"
        }`}
      >
        {formatPrice(newPrice)} تومان
      </span>
      {/* اختلاف */}
      {diff !== null && (
        <span
          className={`text-[10px] font-medium ${
            increased ? "text-red-400" : "text-emerald-400"
          }`}
        >
          {increased ? "▲" : "▼"} {diff.toLocaleString("fa-IR")} تومان
          {pct !== null && ` (${Math.abs(pct).toFixed(1)}٪)`}
        </span>
      )}
    </div>
  );
};

const PriceChangesPage = ({ changes, onDismiss, onBack }) => {
  const { query, setQuery, filteredProducts } = useSearch(changes);

  return (
    <div
      dir="rtl"
      className={`min-h-screen ${theme.colors.background.page} font-['Vazirmatn','Noto_Sans_Arabic',sans-serif]`}
    >
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4 rotate-180"
          >
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
          بازگشت
        </button>

        <div className="flex-1">
          <h1 className="text-base font-bold text-slate-800">تغییر قیمت‌ها</h1>
          <p className="text-xs text-slate-400">
            {changes.length.toLocaleString("fa-IR")} محصول تغییر قیمت داشته
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* ── Empty state ── */}
        {changes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
            <div className="text-5xl opacity-20">✅</div>
            <p className="text-sm text-slate-500">
              هیچ تغییر قیمتی نسبت به آخرین به‌روزرسانی یافت نشد
            </p>
          </div>
        )}

        {/* ── Search ── */}
        {changes.length > 0 && <SearchBox query={query} onChange={setQuery} />}

        {/* ── Result count ── */}
        {query && (
          <p className="text-xs text-slate-400">
            {filteredProducts.length.toLocaleString("fa-IR")} نتیجه از{" "}
            {changes.length.toLocaleString("fa-IR")} محصول
          </p>
        )}

        {/* ── List ── */}
        <div className="space-y-3">
          {filteredProducts.map((p) => (
            <article
              key={p._code}
              className="relative flex items-start justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm"
            >
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-slate-800 leading-snug">
                  {p["عنوان کالا"]}
                </h3>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded w-fit">
                  ||| {p["بارکد کالا"]}
                </span>
              </div>

              <PriceDiff oldPrice={p._oldPrice} newPrice={p._newPrice} />

              <button
                onClick={() => onDismiss(p._code)}
                title="حذف از این لیست"
                className="absolute top-3 left-3 w-6 h-6 flex items-center justify-center rounded-full text-slate-300 hover:bg-red-50 hover:text-red-400 transition-colors"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </article>
          ))}

          {/* no search results */}
          {query && filteredProducts.length === 0 && changes.length > 0 && (
            <div className="flex flex-col items-center py-16 gap-2">
              <div className="text-4xl opacity-20">🔍</div>
              <p className="text-sm text-slate-400">
                نتیجه‌ای برای «{query}» یافت نشد
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PriceChangesPage;
