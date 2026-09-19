import { useEffect, useState } from "react";
import { ProductGrid } from "./ProductGrid";
import { SearchBox } from "./SearchBox";
import { theme } from "../config/theme";
import { loadProductsByInventoryFilter } from "../services/dataService";
import useSearch from "../hook/useSearch";

const FILTERS = [
  { id: "alerts", label: "بحرانی و هشدار" },
  { id: "critical", label: "فقط بحرانی" },
  { id: "warning", label: "فقط هشدار" },
  { id: "disabled", label: "آستانه غیرفعال" },
];

const getFilterParams = (filter) => {
  if (filter === "critical") return { inventoryStatus: "critical" };
  if (filter === "warning") return { inventoryStatus: "warning" };
  if (filter === "disabled") return { thresholdEnabled: false };
  return { inventoryStatus: "critical,warning" };
};

export default function InventoryAlertsPage({ onBack, onOpenProduct }) {
  const [filter, setFilter] = useState("alerts");
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTarget, setSearchTarget] = useState("title");
  const { query, setQuery, filteredProducts } = useSearch(products, {
    searchTarget,
  });

  useEffect(() => {
    const controller = new AbortController();
    const loadProducts = async () => {
      setIsLoading(true);
      setError("");
      try {
        const nextProducts = await loadProductsByInventoryFilter({
          ...getFilterParams(filter),
          signal: controller.signal,
        });
        setProducts(nextProducts);
      } catch (loadError) {
        if (loadError.name !== "AbortError") {
          setProducts([]);
          setError(loadError.message || "دریافت محصولات ناموفق بود.");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    loadProducts();

    return () => {
      controller.abort();
    };
  }, [filter]);

  return (
    <div dir="rtl" className={`min-h-screen ${theme.colors.background.page} font-['Vazirmatn',_'Noto_Sans_Arabic',_sans-serif]`}>
      <header className="border-b border-slate-200 bg-slate-100">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div>
            <h1 className="text-lg font-bold text-slate-900">پایش هشدار موجودی</h1>
            <p className="mt-1 text-xs text-slate-500">محصولات بحرانی، هشدار و آستانه‌های غیرفعال</p>
          </div>
          <button type="button" onClick={onBack} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50">
            <span aria-hidden="true">→</span>
            داشبورد مدیریت
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <section className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <SearchBox query={query} onChange={setQuery} />
            <div className="flex min-h-10 overflow-hidden rounded-xl border border-slate-300 bg-white text-xs font-bold shadow-sm">
              <button type="button" onClick={() => setSearchTarget("title")} className={`flex-1 px-3 transition-colors sm:flex-none ${searchTarget === "title" ? "bg-slate-800 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
                اسم اصلی
              </button>
              <button type="button" onClick={() => setSearchTarget("alias")} className={`flex-1 border-r border-slate-200 px-3 transition-colors sm:flex-none ${searchTarget === "alias" ? "bg-slate-800 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
                اسم مستعار
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="فیلتر وضعیت موجودی">
            {FILTERS.map((item) => (
              <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`min-h-10 rounded-md border px-3 text-sm font-bold transition-colors ${filter === item.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>
        )}

        {!isLoading && !error && (
          <p className="text-sm text-slate-500">
            {filteredProducts.length.toLocaleString("fa-IR")} محصول پیدا شد
          </p>
        )}

        <ProductGrid products={filteredProducts} isLoading={isLoading} searchQuery={query} isAdmin displayNameMode={searchTarget} onOpenProduct={onOpenProduct} />
      </main>
    </div>
  );
}
