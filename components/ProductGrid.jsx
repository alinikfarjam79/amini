import { memo } from "react";
import { theme } from "../config/theme";
import ProductCard from "./ProductCard";
import useInfiniteScroll from "../hook/useInfiniteScroll";

// ── Static sub-components ────────────────────────────────────────────────────

const EmptyState = () => (
  <div className="col-span-full flex flex-col items-center justify-center py-20 gap-3">
    <div className={`text-5xl opacity-20`}>📦</div>
    <p className={`text-sm ${theme.colors.text.muted}`}>
      محصولی برای نمایش وجود ندارد
    </p>
  </div>
);

const NoSearchResults = ({ query }) => (
  <div className="col-span-full flex flex-col items-center justify-center py-20 gap-3">
    <div className="text-5xl opacity-20">🔍</div>
    <p className={`text-sm ${theme.colors.text.muted}`}>
      نتیجه‌ای برای «<span className={theme.colors.text.accent}>{query}</span>»
      یافت نشد
    </p>
    <p className={`text-xs ${theme.colors.text.muted}`}>
      جستجو بر اساس عنوان یا بارکد انجام می‌شود
    </p>
  </div>
);

const SkeletonCard = () => (
  <div
    className={`flex flex-col gap-3 p-4 rounded-2xl ${theme.colors.background.card} ${theme.colors.border.card} animate-pulse`}
  >
    <div className="h-4 bg-slate-700/60 rounded-lg w-3/4" />
    <div className="h-3 bg-slate-700/40 rounded w-full" />
    <div className="h-3 bg-slate-700/40 rounded w-5/6" />
    <div className="border-t border-slate-700/40 my-1" />
    <div className="h-6 bg-slate-700/50 rounded-lg w-1/2 self-end" />
  </div>
);

// Loading spinner shown at the bottom while fetching the next page
const LoadingMore = () => (
  <div className="col-span-full flex justify-center py-6">
    <div className="w-6 h-6 rounded-full border-2 border-slate-600 border-t-amber-400 animate-spin" />
  </div>
);

// Memoized card — prevents re-rendering cards that haven't changed
const MemoProductCard = memo(ProductCard);

// ── Main component ───────────────────────────────────────────────────────────

export const ProductGrid = ({
  products,
  isLoading,
  searchQuery = "",
  inventoryByCode = {},
}) => {
  const { visibleProducts, hasMore, sentinelRef, total } =
    useInfiniteScroll(products);

  const getProductInventory = (product) => {
    const code = String(product["کد کالا"] || "").trim();

    return inventoryByCode[code] ?? product.quantity ?? 0;
  };

  const totalInventory = products.reduce((sum, product) => {
    return sum + Number(getProductInventory(product) || 0);
  }, 0);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.length === 0 ? (
          searchQuery ? (
            <NoSearchResults query={searchQuery} />
          ) : (
            <EmptyState />
          )
        ) : (
          visibleProducts.map((product, index) => (
            <MemoProductCard
              key={`${product["کد کالا"] || product["بارکد کالا"]}-${index}`}
              product={product}
              inventory={getProductInventory(product)}
            />
          ))
        )}

        {/* Show spinner row while more items will load */}
        {hasMore && <LoadingMore />}
      </div>

      {/* Invisible sentinel — triggers next page when scrolled into view */}
      <div ref={sentinelRef} className="h-4" aria-hidden="true" />

      {/* End-of-list message */}
      {!hasMore && products.length > 0 && (
        <div className="space-y-2 py-6 text-center">
          <p className={`text-xs ${theme.colors.text.muted}`}>
            همه {products.length.toLocaleString("fa-IR")} محصول نمایش داده شد
          </p>
          <p className={`text-sm font-bold ${theme.colors.text.primary}`}>
            مجموع موجودی ها: {totalInventory.toLocaleString("fa-IR")}
          </p>
        </div>
      )}
    </>
  );
};
