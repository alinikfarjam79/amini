import { memo } from "react";
import { theme } from "../config/theme";

const formatPrice = (raw) => {
  let num = Number(raw);
  if (isNaN(num)) return raw;
  num = num / 10; //toman
  return num.toLocaleString("fa-IR");
};

const formatInventory = (value) => Number(value || 0).toLocaleString("fa-IR");

const ProductCard = ({ product, inventory = 0 }) => {
  const {
    "عنوان کالا": Title,
    "کد کالا": code,
    "بارکد کالا": Barcode,
    "قیمت اصلی": Price,
  } = product;

  return (
    <article
      dir="rtl"
      className={`
          relative flex flex-col gap-5 p-4 rounded-2xl
          ${theme.colors.background.card}
          ${theme.colors.border.card}
          backdrop-blur-sm
          shadow-lg
          transition-all duration-300
          hover:border-slate-600/70 
          hover:-translate-y-0.5
          group
        `}
    >
      {/* Subtle ambient glow on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/0 to-transparent opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none" />

      {/* Product title */}
      <h3
        className={`text-base font-semibold leading-snug ${theme.colors.text.primary}`}
      >
        {Title}
      </h3>

      {/* Metadata row */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-xs flex items-center gap-1 font-mono px-2 py-1 rounded-md ${theme.colors.badge.barcode} truncate max-w-[170px]`}
          >
            <span className={`text-[10px] ${theme.colors.text.muted}`}>
              |||
            </span>

            {Barcode}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-200/40" />

      {/* Price */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${theme.colors.text.secondary}`}>
            قیمت مصرف کننده:
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold ${theme.colors.badge.price}`}
          >
            {formatPrice(Price)}
            <span className="text-xs font-normal opacity-80">تومان</span>
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${theme.colors.text.secondary}`}>
            موجودی:
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-sm font-bold text-emerald-700">
            {formatInventory(inventory)}
          </span>
        </div>
      </div>
    </article>
  );
};

export default memo(ProductCard);
