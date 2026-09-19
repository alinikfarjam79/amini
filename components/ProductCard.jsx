import { memo } from "react";
import { theme } from "../config/theme";

const formatPrice = (raw) => {
  const number = Number(raw);
  if (Number.isNaN(number)) return raw;
  return (number / 10).toLocaleString("fa-IR");
};

const formatInventory = (value) => Number(value || 0).toLocaleString("fa-IR");

const ProductCard = ({
  product,
  inventory = 0,
  isAdmin = false,
  displayNameMode = "title",
  onOpen,
}) => {
  const inventoryNumber = Number(inventory || 0);
  const inventoryBadgeClass =
    product.inventoryStatus === "critical"
      ? "border-red-500/30 bg-red-500/10 text-red-700"
      : product.inventoryStatus === "warning"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
        : product.inventoryStatus === "normal"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
          : inventoryNumber <= 0
            ? "border-red-500/30 bg-red-500/10 text-red-700"
            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
  const { "عنوان کالا": title, "بارکد کالا": barcode, "قیمت اصلی": price } = product;
  const displayTitle = isAdmin && displayNameMode === "alias" && product.alias
    ? product.alias
    : title;

  const handleKeyDown = (event) => {
    if (!onOpen) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen?.();
    }
  };

  return (
    <article
      dir="rtl"
      role={onOpen ? "link" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen || undefined}
      onKeyDown={onOpen ? handleKeyDown : undefined}
      className={`group relative flex h-full flex-col gap-5 rounded-2xl p-4 ${theme.colors.background.card} ${theme.colors.border.card} shadow-lg transition-all duration-300 ${onOpen ? "cursor-pointer hover:-translate-y-0.5 hover:border-slate-600/70 focus:outline-none focus:ring-2 focus:ring-amber-500" : ""}`}
      aria-label={onOpen ? `مشاهده جزئیات ${displayTitle || "محصول"}` : undefined}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/0 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-5" />
      <h3 className={`text-base font-semibold leading-snug ${theme.colors.text.primary}`}>
        {displayTitle}
      </h3>
      <div className="flex items-center justify-between gap-2">
        <span className={`flex max-w-[170px] items-center gap-1 truncate rounded-md px-2 py-1 font-mono text-xs ${theme.colors.badge.barcode}`}>
          <span className={`text-[10px] ${theme.colors.text.muted}`}>|||</span>
          {barcode}
        </span>
      </div>
      <div className="border-t border-slate-200/40" />
      <div className="mt-auto flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${theme.colors.text.secondary}`}>قیمت مصرف کننده:</span>
          <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-sm font-bold ${theme.colors.badge.price}`}>
            {formatPrice(price)}
            <span className="text-xs font-normal opacity-80">تومان</span>
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${theme.colors.text.secondary}`}>موجودی:</span>
          <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-sm font-bold ${inventoryBadgeClass}`}>
            {formatInventory(inventory)}
          </span>
        </div>
      </div>
    </article>
  );
};

export default memo(ProductCard);
