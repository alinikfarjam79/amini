import { memo, useEffect, useState } from "react";
import { theme } from "../config/theme";

const formatPrice = (raw) => {
  let num = Number(raw);
  if (isNaN(num)) return raw;
  num = num / 10; //toman
  return num.toLocaleString("fa-IR");
};

const formatInventory = (value) => Number(value || 0).toLocaleString("fa-IR");

const ProductCard = ({
  product,
  inventory = 0,
  isAdmin = false,
  onUpdateAlias,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAliasPopupOpen, setIsAliasPopupOpen] = useState(false);
  const [aliasValue, setAliasValue] = useState(product.alias || "");
  const [aliasError, setAliasError] = useState("");
  const [isAliasSaving, setIsAliasSaving] = useState(false);

  const inventoryNumber = Number(inventory || 0);
  const inventoryBadgeClass =
    inventoryNumber <= 0
      ? "border-red-500/30 bg-red-500/10 text-red-700"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
  const {
    "عنوان کالا": Title,
    "بارکد کالا": Barcode,
    "قیمت اصلی": Price,
  } = product;
  const productId = product._id || product.id;

  useEffect(() => {
    setAliasValue(product.alias || "");
  }, [product.alias]);

  const openAliasEditor = () => {
    setAliasValue(product.alias || "");
    setAliasError("");
    setIsMenuOpen(false);
    setIsAliasPopupOpen(true);
  };

  const handleAliasSubmit = async (event) => {
    event.preventDefault();

    if (!productId) {
      setAliasError("شناسه محصول برای ویرایش پیدا نشد.");
      return;
    }

    setIsAliasSaving(true);
    setAliasError("");

    try {
      await onUpdateAlias?.(productId, aliasValue.trim());
      setIsAliasPopupOpen(false);
    } catch (error) {
      setAliasError(error.message || "ویرایش اسم مستعار ناموفق بود.");
    } finally {
      setIsAliasSaving(false);
    }
  };

  return (
    <article
      dir="rtl"
      className={`
          relative flex h-full flex-col gap-5 p-4 rounded-2xl
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
      {isAdmin && (
        <div className="absolute left-3 top-3 z-20">
          <button
            type="button"
            onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
            aria-label="ویرایش محصول"
            aria-expanded={isMenuOpen}
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M13.586 3.586a2 2 0 0 1 2.828 2.828l-.793.793-2.828-2.828.793-.793Z" />
              <path d="m11.379 5.793 2.828 2.828-7.5 7.5H3.879v-2.828l7.5-7.5Z" />
            </svg>
          </button>

          {isMenuOpen && (
            <div className="absolute left-0 top-10 w-44 overflow-hidden rounded-md border border-slate-200 bg-white py-1 text-right shadow-xl">
              <button
                type="button"
                onClick={openAliasEditor}
                className="block w-full px-3 py-2 text-right text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100"
              >
                ویرایش اسم مستعار
              </button>
            </div>
          )}
        </div>
      )}

      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/0 to-transparent opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none" />

      <h3
        className={`pl-10 text-base font-semibold leading-snug ${theme.colors.text.primary}`}
      >
        {Title}
      </h3>

      {isAdmin && (
        <div className="rounded-md border border-slate-200 bg-white/70 px-3 py-2 text-sm">
          <span className={`text-xs ${theme.colors.text.secondary}`}>
            اسم مستعار:
          </span>
          <span className="mr-2 font-bold text-slate-800">
            {product.alias || "-"}
          </span>
        </div>
      )}

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

      <div className="border-t border-slate-200/40" />

      <div className="mt-auto flex flex-col gap-3">
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
          <span
            className={`inline-flex items-center px-3 py-1 rounded-lg border text-sm font-bold ${inventoryBadgeClass}`}
          >
            {formatInventory(inventory)}
          </span>
        </div>
      </div>

      {isAliasPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <button
            type="button"
            aria-label="بستن پنجره ویرایش اسم مستعار"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setIsAliasPopupOpen(false)}
          />
          <form
            onSubmit={handleAliasSubmit}
            className="relative w-full max-w-md rounded-md border border-slate-200 bg-white p-5 text-right shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className={`text-base font-bold ${theme.colors.text.primary}`}>
                ویرایش اسم مستعار
              </h3>
              <button
                type="button"
                onClick={() => setIsAliasPopupOpen(false)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                بستن
              </button>
            </div>

            <p className={`mb-3 text-sm leading-7 ${theme.colors.text.muted}`}>
              {Title}
            </p>

            {aliasError && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                {aliasError}
              </div>
            )}

            <label className="block">
              <span className={`text-sm font-bold ${theme.colors.text.primary}`}>
                اسم مستعار
              </span>
              <input
                type="text"
                value={aliasValue}
                onChange={(event) => setAliasValue(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-right text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
            </label>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={isAliasSaving}
                className="min-h-10 rounded-md bg-amber-500 px-5 text-sm font-bold text-slate-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAliasSaving ? "در حال ذخیره..." : "ذخیره"}
              </button>
            </div>
          </form>
        </div>
      )}
    </article>
  );
};

export default memo(ProductCard);
