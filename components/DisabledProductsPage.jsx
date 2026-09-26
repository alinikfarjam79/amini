import { useEffect, useState } from "react";
import { ProductGrid } from "./ProductGrid";
import { SearchBox } from "./SearchBox";
import { theme } from "../config/theme";
import { loadProductsByInventoryFilter } from "../services/dataService";
import useSearch from "../hook/useSearch";

export default function DisabledProductsPage({ onBack, onOpenProduct }) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTarget, setSearchTarget] = useState("title");
  const { query, setQuery, filteredProducts } = useSearch(products, {
    searchTarget,
  });

  useEffect(() => {
    const controller = new AbortController();

    const loadDisabledProducts = async () => {
      try {
        const result = await loadProductsByInventoryFilter({
          enable: false,
          signal: controller.signal,
        });
        setProducts(result);
      } catch (loadError) {
        if (loadError.name !== "AbortError") {
          setError(loadError.message || "دریافت محصولات غیرفعال ناموفق بود.");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    loadDisabledProducts();
    return () => controller.abort();
  }, []);

  return (
    <div dir="rtl" className={`min-h-screen ${theme.colors.background.page} font-['Vazirmatn',_'Noto_Sans_Arabic',_sans-serif]`}>
      <header className="border-b border-slate-200 bg-slate-100">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <h1 className="text-lg font-bold text-slate-900">محصولات غیرفعال</h1>
          <button type="button" onClick={onBack} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50">
            <span aria-hidden="true">→</span>
            فیلترها
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchBox query={query} onChange={setQuery} />
          <div className="flex min-h-10 overflow-hidden rounded-xl border border-slate-300 bg-white text-xs font-bold shadow-sm">
            <button type="button" onClick={() => setSearchTarget("title")} className={`flex-1 px-3 sm:flex-none ${searchTarget === "title" ? "bg-slate-800 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
              اسم اصلی
            </button>
            <button type="button" onClick={() => setSearchTarget("alias")} className={`flex-1 border-r border-slate-200 px-3 sm:flex-none ${searchTarget === "alias" ? "bg-slate-800 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
              اسم مستعار
            </button>
          </div>
        </div>

        {error && <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
        {!isLoading && !error && <p className="text-sm text-slate-500">{filteredProducts.length.toLocaleString("fa-IR")} محصول پیدا شد</p>}
        {!error && (
          <ProductGrid
            products={filteredProducts}
            isLoading={isLoading}
            searchQuery={query}
            isAdmin
            displayNameMode={searchTarget}
            onOpenProduct={onOpenProduct}
            cardVariant="inventory-alert"
          />
        )}
      </main>
    </div>
  );
}
