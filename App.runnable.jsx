// ════════════════════════════════════════════════════════════════════════════
//  CSV CATALOGUE — Full modular architecture in one runnable file
//  Each section maps 1:1 to a real module in the folder structure.
//  In a real project, every ── Section ── heading is its own file.
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from "react";
import Papa from "papaparse";

// ── constants/app.constants.js ───────────────────────────────────────────────
const CACHE_KEYS = {
  PRODUCTS: "csvmerger_products_cache",
  PRICES: "csvmerger_prices_cache",
  TIMESTAMP: "csvmerger_cache_timestamp",
};
const PRODUCTS_REQUIRED_COLUMNS = ["Title", "Product Code", "Barcode"];
const PRICES_REQUIRED_COLUMNS = ["Product Code", "Price"];
const ERROR_TYPE = { NETWORK: "network", FORMAT: "format" };
const SIMULATE_NETWORK_ERROR = false;
const SIMULATE_CORRUPT_DATA = false;

// ── constants/mock-data.constants.js ────────────────────────────────────────
const MOCK_PRODUCTS_CSV = `Title,Product Code,Barcode
Wireless Ergonomic Keyboard,PRD-001,5901234123457
Mechanical Gaming Mouse,PRD-002,5901234123458
27" 4K Monitor,PRD-003,5901234123459
USB-C Docking Station,PRD-004,5901234123460
Noise Cancelling Headset,PRD-005,5901234123461
Webcam HD 1080p,PRD-006,5901234123462
Portable SSD 1TB,PRD-007,5901234123463
LED Desk Lamp,PRD-008,5901234123464
Smart Power Strip,PRD-009,5901234123465
Laptop Stand Adjustable,PRD-010,5901234123466`;

const MOCK_PRICES_CSV = `Product Code,Price
PRD-001,89.99
PRD-002,54.99
PRD-003,399.00
PRD-004,149.99
PRD-005,129.99
PRD-006,79.99
PRD-007,109.99
PRD-008,44.99
PRD-009,39.99
PRD-010,34.99`;

// ── services/product-fetch.service.js ───────────────────────────────────────
// OCP: to use real URLs, replace these two function bodies only.
async function fetchProductsCsv() {
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 300));
  if (SIMULATE_NETWORK_ERROR)
    throw new Error("Network unreachable: GET /products.csv");
  return SIMULATE_CORRUPT_DATA ? "INVALID;;CORRUPT\n%%###" : MOCK_PRODUCTS_CSV;
}
async function fetchPricesCsv() {
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 300));
  if (SIMULATE_NETWORK_ERROR)
    throw new Error("Network unreachable: GET /prices.csv");
  return SIMULATE_CORRUPT_DATA ? "CORRUPT DATA\n!@#$%" : MOCK_PRICES_CSV;
}

// ── services/cache.service.js ────────────────────────────────────────────────
// DIP: the store depends on these functions, never on localStorage directly.
function saveToCache(productsRaw, pricesRaw) {
  try {
    const ts = new Date().toISOString();
    localStorage.setItem(CACHE_KEYS.PRODUCTS, productsRaw);
    localStorage.setItem(CACHE_KEYS.PRICES, pricesRaw);
    localStorage.setItem(CACHE_KEYS.TIMESTAMP, ts);
    return ts;
  } catch {
    return null;
  }
}
function loadFromCache() {
  return {
    products: localStorage.getItem(CACHE_KEYS.PRODUCTS),
    prices: localStorage.getItem(CACHE_KEYS.PRICES),
    timestamp: localStorage.getItem(CACHE_KEYS.TIMESTAMP),
  };
}

// ── lib/csv-parser.lib.js ────────────────────────────────────────────────────
// Pure function — SRP: parse + validate only, no state or side effects.
function parseAndValidateCsv(rawText, requiredColumns) {
  if (!rawText || typeof rawText !== "string" || rawText.trim() === "") {
    return { data: null, error: "Received empty or non-string CSV content." };
  }
  const result = Papa.parse(rawText.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform: (v) => v.trim(),
  });
  if (result.errors.length > 0)
    return { data: null, error: `Parse error: ${result.errors[0].message}` };
  if (!result.data || result.data.length === 0)
    return { data: null, error: "File contains no data rows." };

  const actualHeaders = Object.keys(result.data[0]);
  const missing = requiredColumns.filter((col) => !actualHeaders.includes(col));
  if (missing.length > 0)
    return {
      data: null,
      error: `Missing required column(s): ${missing.join(", ")}`,
    };

  return { data: result.data, error: null };
}

// ── lib/product-merger.lib.js ────────────────────────────────────────────────
// Pure function — O(n) map build + O(m) join. SRP: merging only.
function mergeProductsWithPrices(products, prices) {
  const priceMap = Object.fromEntries(
    prices.map((r) => [r["Product Code"], r["Price"]])
  );
  return products.map((p) => ({
    title: p["Title"],
    code: p["Product Code"],
    barcode: p["Barcode"],
    price: priceMap[p["Product Code"]] ?? null,
  }));
}

// ── lib/formatters.lib.js ────────────────────────────────────────────────────
function formatPrice(value) {
  const n = parseFloat(value);
  return isNaN(n) ? "—" : `€${n.toFixed(2)}`;
}
function formatCacheAge(isoString) {
  if (!isoString) return "";
  const s = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
function buildSyncSubtitle(lastSynced, cacheTimestamp) {
  if (lastSynced)
    return `Last synced ${formatCacheAge(lastSynced.toISOString())}`;
  if (cacheTimestamp)
    return `Cached data from ${formatCacheAge(cacheTimestamp)}`;
  return "Loading data…";
}

// ── store/useProductStore.js ─────────────────────────────────────────────────
// Single source of truth. Orchestrates services + libs. DIP + SRP.
function useProductStore() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorType, setErrorType] = useState(null);
  const [errorDetail, setErrorDetail] = useState("");
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [cacheTimestamp, setCacheTimestamp] = useState(null);
  const [lastSynced, setLastSynced] = useState(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setErrorType(null);
    setErrorDetail("");
    setIsUsingCache(false);

    let productsRaw,
      pricesRaw,
      fetchedFromNetwork = true;

    try {
      [productsRaw, pricesRaw] = await Promise.all([
        fetchProductsCsv(),
        fetchPricesCsv(),
      ]);
    } catch {
      // Scenario 1 — Network error: fall back to cache
      const cached = loadFromCache();
      if (cached.products && cached.prices) {
        productsRaw = cached.products;
        pricesRaw = cached.prices;
        fetchedFromNetwork = false;
        setIsUsingCache(true);
        setCacheTimestamp(cached.timestamp);
        setErrorType(ERROR_TYPE.NETWORK);
      } else {
        setErrorType(ERROR_TYPE.NETWORK);
        setErrorDetail(
          "No cached data available. Please check your connection."
        );
        setIsLoading(false);
        return;
      }
    }

    const { data: parsedProducts, error: productError } = parseAndValidateCsv(
      productsRaw,
      PRODUCTS_REQUIRED_COLUMNS
    );
    const { data: parsedPrices, error: priceError } = parseAndValidateCsv(
      pricesRaw,
      PRICES_REQUIRED_COLUMNS
    );

    if (productError || priceError) {
      // Scenario 2 — Format/corruption error
      setErrorType(ERROR_TYPE.FORMAT);
      setErrorDetail(productError || priceError);
      setIsLoading(false);
      return;
    }

    setProducts(mergeProductsWithPrices(parsedProducts, parsedPrices));

    if (fetchedFromNetwork) {
      const ts = saveToCache(productsRaw, pricesRaw);
      if (ts) setCacheTimestamp(ts);
      setLastSynced(new Date());
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    products,
    isLoading,
    errorType,
    errorDetail,
    isUsingCache,
    cacheTimestamp,
    lastSynced,
    refresh,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  UI LAYER — components/ui/ (dumb presentational primitives)
// ════════════════════════════════════════════════════════════════════════════

// ── components/ui/StatusBanner.jsx ───────────────────────────────────────────
// OCP: new banner types → add one entry to BANNER_CONFIG only.
const BANNER_CONFIG = {
  [ERROR_TYPE.NETWORK]: {
    wrapper: "bg-amber-50 border-amber-300 text-amber-900",
    iconBg: "bg-amber-100 text-amber-600",
    icon: "⚠",
  },
  [ERROR_TYPE.FORMAT]: {
    wrapper: "bg-red-50 border-red-300 text-red-900",
    iconBg: "bg-red-100 text-red-600",
    icon: "✕",
  },
  success: {
    wrapper: "bg-emerald-50 border-emerald-200 text-emerald-900",
    iconBg: "bg-emerald-100 text-emerald-600",
    icon: "✓",
  },
};
function StatusBanner({ type, message, sub }) {
  const c = BANNER_CONFIG[type];
  if (!c) return null;
  return (
    <div
      className={`flex items-start gap-3 border rounded-xl px-4 py-3 ${c.wrapper}`}
      role="alert"
    >
      <span
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm ${c.iconBg}`}
        aria-hidden="true"
      >
        {c.icon}
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-sm leading-5">{message}</p>
        {sub && <p className="text-xs mt-0.5 opacity-70">{sub}</p>}
      </div>
    </div>
  );
}

// ── components/ui/RefreshButton.jsx ──────────────────────────────────────────
function RefreshButton({ isLoading, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      aria-busy={isLoading}
      className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all duration-150 select-none"
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          Syncing…
        </>
      ) : (
        <>
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Update Data
        </>
      )}
    </button>
  );
}

// ── components/ui/SearchInput.jsx ────────────────────────────────────────────
function SearchInput({ value, onChange }) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
      </svg>
      <input
        type="search"
        placeholder="Search by title, code, or barcode…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search products"
        className="w-full pl-9 pr-10 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 placeholder:text-slate-400 transition-shadow duration-150"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── components/ui/StatCard.jsx ───────────────────────────────────────────────
function StatCard({ label, value, accent }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
        {label}
      </p>
      <p className={`text-2xl font-bold mt-0.5 ${accent ?? "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  FEATURE LAYER — components/catalogue/ (smart, feature-scoped components)
// ════════════════════════════════════════════════════════════════════════════

// ── components/catalogue/CatalogueHeader.jsx ─────────────────────────────────
function CatalogueHeader({ lastSynced, cacheTimestamp, isLoading, onRefresh }) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Product Catalogue
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {buildSyncSubtitle(lastSynced, cacheTimestamp)}
          </p>
        </div>
        <RefreshButton isLoading={isLoading} onClick={onRefresh} />
      </div>
    </header>
  );
}

// ── components/catalogue/CatalogueStatusBanners.jsx ──────────────────────────
// SRP: decides which banners to show — banner logic lives here, nowhere else.
function CatalogueStatusBanners({
  errorType,
  errorDetail,
  cacheTimestamp,
  isLoading,
  productCount,
  lastSynced,
}) {
  return (
    <div className="space-y-3" aria-live="polite">
      {errorType === ERROR_TYPE.NETWORK && (
        <StatusBanner
          type={ERROR_TYPE.NETWORK}
          message="Warning: Could not sync with the server. Displaying cached data which may be outdated."
          sub={errorDetail || `Cache from ${formatCacheAge(cacheTimestamp)}`}
        />
      )}
      {errorType === ERROR_TYPE.FORMAT && (
        <StatusBanner
          type={ERROR_TYPE.FORMAT}
          message="Error: The data retrieved from the server is corrupted or has an invalid format."
          sub={errorDetail}
        />
      )}
      {!isLoading && !errorType && productCount > 0 && lastSynced && (
        <StatusBanner
          type="success"
          message={`Catalogue synced — ${productCount} products loaded.`}
          sub="Products and prices merged on Product Code"
        />
      )}
    </div>
  );
}

// ── components/catalogue/CatalogueStats.jsx ──────────────────────────────────
// Derives summary metrics here, passes primitives to StatCard (ISP).
function CatalogueStats({ products }) {
  if (!products.length) return null;
  const matched = products.filter((p) => p.price !== null).length;
  const missing = products.length - matched;
  return (
    <div className="grid grid-cols-3 gap-3">
      <StatCard label="Total Products" value={products.length} />
      <StatCard
        label="Matched Prices"
        value={matched}
        accent="text-emerald-600"
      />
      <StatCard
        label="Missing Prices"
        value={missing}
        accent={missing > 0 ? "text-amber-500" : undefined}
      />
    </div>
  );
}

// ── components/catalogue/ProductTableRow.jsx ─────────────────────────────────
// ISP: receives one normalised product record — nothing extra.
function ProductTableRow({ product }) {
  const { title, code, barcode, price } = product;
  return (
    <tr className="hover:bg-slate-50 transition-colors duration-75">
      <td className="px-4 py-3 font-medium text-slate-800">{title}</td>
      <td className="px-4 py-3">
        <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
          {code}
        </span>
      </td>
      <td className="px-4 py-3 font-mono text-xs text-slate-500">{barcode}</td>
      <td className="px-4 py-3">
        {price !== null ? (
          <span className="font-semibold text-emerald-700">
            {formatPrice(price)}
          </span>
        ) : (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
            No price
          </span>
        )}
      </td>
    </tr>
  );
}

// ── components/catalogue/ProductTableBody.jsx ────────────────────────────────
// tbody state machine: loading | format-error | empty | data.
function SkeletonRow() {
  return (
    <tr className="animate-pulse" aria-hidden="true">
      {[55, 22, 30, 18].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div
            className="h-3 bg-slate-200 rounded-full"
            style={{ width: `${w}%` }}
          />
        </td>
      ))}
    </tr>
  );
}
function ProductTableBody({ products, isLoading, errorType, searchQuery }) {
  if (isLoading) {
    return (
      <tbody className="divide-y divide-slate-50">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </tbody>
    );
  }
  if (errorType === ERROR_TYPE.FORMAT) {
    return (
      <tbody>
        <tr>
          <td colSpan={4} className="px-4 py-16 text-center text-red-400">
            <p className="text-sm font-medium">
              Cannot display data due to a format error.
            </p>
            <p className="text-xs mt-1 opacity-75">
              Check the server files and try again.
            </p>
          </td>
        </tr>
      </tbody>
    );
  }
  if (!products.length) {
    return (
      <tbody>
        <tr>
          <td colSpan={4} className="px-4 py-16 text-center text-slate-400">
            <svg
              className="mx-auto h-10 w-10 mb-3 opacity-30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
              />
            </svg>
            <p className="text-sm font-medium">
              {searchQuery
                ? `No products match "${searchQuery}"`
                : "No products loaded yet."}
            </p>
            {!searchQuery && (
              <p className="text-xs mt-1">
                Press "Update Data" to fetch the catalogue.
              </p>
            )}
          </td>
        </tr>
      </tbody>
    );
  }
  return (
    <tbody className="divide-y divide-slate-50">
      {products.map((p) => (
        <ProductTableRow key={p.code} product={p} />
      ))}
    </tbody>
  );
}

// ── components/catalogue/ProductTable.jsx ────────────────────────────────────
// Owns table chrome + footer. Delegates tbody to ProductTableBody.
const COLUMNS = ["Product Title", "Code", "Barcode", "Price"];
function ProductTable({
  products,
  isLoading,
  errorType,
  searchQuery,
  isUsingCache,
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Product catalogue">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {COLUMNS.map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <ProductTableBody
            products={products}
            isLoading={isLoading}
            errorType={errorType}
            searchQuery={searchQuery}
          />
        </table>
      </div>
      {!isLoading && products.length > 0 && (
        <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </p>
          {isUsingCache && (
            <span className="text-xs text-amber-600 font-medium">
              ● Cached data
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── components/catalogue/CataloguePage.jsx ───────────────────────────────────
// Thin orchestration layer. Connects store to UI. No business logic.
function CataloguePage() {
  const {
    products,
    isLoading,
    errorType,
    errorDetail,
    isUsingCache,
    cacheTimestamp,
    lastSynced,
    refresh,
  } = useProductStore();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.title?.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50">
      <CatalogueHeader
        lastSynced={lastSynced}
        cacheTimestamp={cacheTimestamp}
        isLoading={isLoading}
        onRefresh={refresh}
      />
      <main className="max-w-5xl mx-auto px-6 py-6 space-y-4">
        <CatalogueStatusBanners
          errorType={errorType}
          errorDetail={errorDetail}
          cacheTimestamp={cacheTimestamp}
          isLoading={isLoading}
          productCount={products.length}
          lastSynced={lastSynced}
        />
        <CatalogueStats products={products} />
        {products.length > 0 && (
          <SearchInput value={searchQuery} onChange={setSearchQuery} />
        )}
        <ProductTable
          products={filteredProducts}
          isLoading={isLoading}
          errorType={errorType}
          searchQuery={searchQuery}
          isUsingCache={isUsingCache}
        />
      </main>
    </div>
  );
}

// ── App.jsx ───────────────────────────────────────────────────────────────────
export default function App() {
  return <CataloguePage />;
}
