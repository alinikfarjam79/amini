import { useEffect, useState } from "react";
import { theme } from "../config/theme";

const formatPrice = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return value || "-";
  return (number / 10).toLocaleString("fa-IR");
};

const INVENTORY_STATUS = {
  critical: {
    label: "بحرانی",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  warning: {
    label: "هشدار",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  normal: {
    label: "عادی",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
};

const formatThreshold = (value) =>
  value === null || value === undefined || value === ""
    ? "تعیین نشده"
    : Number(value).toLocaleString("fa-IR");

export default function ProductDetailsPage({ product, inventory = 0, isAdmin = false, onBack, onUpdateAlias, onUpdateThresholdStatus }) {
  const [aliasValue, setAliasValue] = useState(product?.alias || "");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAliasEditorOpen, setIsAliasEditorOpen] = useState(false);
  const [thresholdError, setThresholdError] = useState("");
  const [isThresholdSaving, setIsThresholdSaving] = useState(false);
  const [isThresholdEditorOpen, setIsThresholdEditorOpen] = useState(false);
  const [warningThresholdValue, setWarningThresholdValue] = useState("");
  const [criticalThresholdValue, setCriticalThresholdValue] = useState("");

  useEffect(() => setAliasValue(product?.alias || ""), [product?.alias]);

  if (!product) {
    return (
      <main dir="rtl" className={`flex min-h-screen items-center justify-center px-4 ${theme.colors.background.page}`}>
        <div className="w-full max-w-md rounded-md border border-slate-200 bg-white p-6 text-center shadow-lg">
          <h1 className="text-lg font-bold text-slate-900">محصول پیدا نشد</h1>
          <button type="button" onClick={onBack} className="mt-5 min-h-10 rounded-md bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800">
            بازگشت به محصولات
          </button>
        </div>
      </main>
    );
  }

  const productId = product._id || product.id;
  const title = product["عنوان کالا"] || "بدون عنوان";
  const inventoryNumber = Number(inventory || 0);
  const inventoryStatus = INVENTORY_STATUS[product.inventoryStatus] || {
    label: product.inventoryStatus || "نامشخص",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!productId) {
      setError("شناسه محصول برای ویرایش پیدا نشد.");
      return;
    }
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      await onUpdateAlias(productId, aliasValue.trim());
      setMessage("اسم مستعار با موفقیت ذخیره شد.");
      setIsAliasEditorOpen(false);
    } catch (saveError) {
      setError(saveError.message || "ویرایش اسم مستعار ناموفق بود.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleThresholdToggle = async () => {
    setIsThresholdSaving(true);
    setThresholdError("");
    try {
      await onUpdateThresholdStatus(productId, {
        thresholdEnabled: !product.thresholdEnabled,
      });
    } catch (updateError) {
      setThresholdError(
        updateError.message || "تغییر وضعیت آستانه موجودی ناموفق بود.",
      );
    } finally {
      setIsThresholdSaving(false);
    }
  };

  const openThresholdEditor = () => {
    setWarningThresholdValue(product.warningThreshold ?? "");
    setCriticalThresholdValue(product.criticalThreshold ?? "");
    setThresholdError("");
    setIsThresholdEditorOpen(true);
  };

  const handleThresholdSubmit = async (event) => {
    event.preventDefault();
    const warningThreshold = Number(warningThresholdValue);
    const criticalThreshold = Number(criticalThresholdValue);

    if (
      warningThresholdValue === "" ||
      criticalThresholdValue === "" ||
      !Number.isInteger(warningThreshold) ||
      !Number.isInteger(criticalThreshold) ||
      warningThreshold < 0 ||
      criticalThreshold < 0
    ) {
      setThresholdError("حد هشدار و حد بحرانی باید عدد صحیح صفر یا بیشتر باشند.");
      return;
    }

    if (criticalThreshold > warningThreshold) {
      setThresholdError("حد بحرانی نمی‌تواند از حد هشدار بیشتر باشد.");
      return;
    }

    setIsThresholdSaving(true);
    setThresholdError("");
    try {
      await onUpdateThresholdStatus(productId, {
        warningThreshold,
        criticalThreshold,
      });
      setIsThresholdEditorOpen(false);
    } catch (updateError) {
      setThresholdError(
        updateError.message || "ویرایش مقدار آستانه‌ها ناموفق بود.",
      );
    } finally {
      setIsThresholdSaving(false);
    }
  };

  return (
    <div dir="rtl" className={`min-h-screen ${theme.colors.background.page} font-['Vazirmatn',_'Noto_Sans_Arabic',_sans-serif]`}>
      <header className="border-b border-slate-200 bg-slate-100">
        <div className="mx-auto flex min-h-20 max-w-5xl items-center px-4 sm:px-6">
          <button type="button" onClick={onBack} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm hover:bg-slate-50">
            <span aria-hidden="true">→</span>
            بازگشت به محصولات
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="border-b border-slate-200 pb-5">
            <p className="mb-2 text-xs font-bold text-slate-500">نام اصلی محصول</p>
            <h1 className="text-xl font-bold leading-9 text-slate-900 sm:text-2xl">{title}</h1>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">
                {product.alias || "اسم مستعار تعیین نشده"}
              </span>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setAliasValue(product.alias || "");
                    setError("");
                    setMessage("");
                    setIsAliasEditorOpen(true);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  aria-label="ویرایش اسم مستعار"
                  title="ویرایش اسم مستعار"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path d="M13.586 3.586a2 2 0 0 1 2.828 2.828l-.793.793-2.828-2.828.793-.793Z" />
                    <path d="m11.379 5.793 2.828 2.828-7.5 7.5H3.879v-2.828l7.5-7.5Z" />
                  </svg>
                </button>
              )}
            </div>
            {message && <p className="mt-2 text-xs font-bold text-emerald-700">{message}</p>}
          </div>

          <dl className="py-4">
            <div className="flex items-center justify-between gap-6 py-3">
              <dt className="text-sm font-bold text-slate-500">قیمت مصرف‌کننده</dt>
              <dd className="text-left text-base font-bold text-slate-900">
                {formatPrice(product["قیمت اصلی"])} <span className="text-xs font-normal">تومان</span>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-6 py-3">
              <dt className="text-sm font-bold text-slate-500">موجودی</dt>
              <dd className={`text-left text-base font-bold ${product.inventoryStatus === "critical" ? "text-red-700" : product.inventoryStatus === "warning" ? "text-amber-600" : product.inventoryStatus === "normal" ? "text-emerald-700" : inventoryNumber <= 0 ? "text-red-700" : "text-emerald-700"}`}>
                {inventoryNumber.toLocaleString("fa-IR")}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-6 py-3">
              <dt className="text-sm font-bold text-slate-500">کد محصول</dt>
              <dd className="text-left font-mono text-sm text-slate-800">{product["کد کالا"] || "-"}</dd>
            </div>
            <div className="flex items-center justify-between gap-6 py-3">
              <dt className="text-sm font-bold text-slate-500">بارکد</dt>
              <dd className="text-left font-mono text-sm text-slate-800">{product["بارکد کالا"] || "-"}</dd>
            </div>
            <div className="flex items-center justify-between gap-6 py-3">
              <dt className="text-sm font-bold text-slate-500">وضعیت موجودی</dt>
              <dd className={`inline-flex rounded-md border px-2.5 py-1 text-sm font-bold ${inventoryStatus.className}`}>
                {inventoryStatus.label}
              </dd>
            </div>

            <div className="my-3 border-t border-slate-200" />

            <div className="flex items-center justify-between gap-6 py-3">
              <dt className="text-sm font-bold text-slate-500">حد هشدار موجودی</dt>
              <dd className="text-left text-sm font-bold text-slate-800">{formatThreshold(product.warningThreshold)}</dd>
            </div>
            <div className="flex items-center justify-between gap-6 py-3">
              <dt className="text-sm font-bold text-slate-500">حد بحرانی موجودی</dt>
              <dd className="text-left text-sm font-bold text-slate-800">{formatThreshold(product.criticalThreshold)}</dd>
            </div>
            {isAdmin && (
              <div className="flex items-center justify-between gap-6 py-3">
                <dt className="text-sm font-bold text-slate-500">تنظیم مقادیر آستانه</dt>
                <dd>
                  <button type="button" onClick={openThresholdEditor} className="min-h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 hover:bg-slate-50">
                    ویرایش آستانه‌ها
                  </button>
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-6 py-3">
              <dt className="text-sm font-bold text-slate-500">کنترل آستانه موجودی</dt>
              <dd className="flex items-center gap-3">
                <span className={`text-xs font-bold ${product.thresholdEnabled ? "text-emerald-700" : "text-slate-500"}`}>
                  {product.thresholdEnabled ? "فعال" : "غیرفعال"}
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={product.thresholdEnabled}
                    aria-label="تغییر وضعیت کنترل آستانه موجودی"
                    onClick={handleThresholdToggle}
                    disabled={isThresholdSaving}
                    className={`relative h-7 w-12 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/40 disabled:cursor-not-allowed disabled:opacity-50 ${product.thresholdEnabled ? "bg-emerald-600" : "bg-slate-300"}`}
                  >
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${product.thresholdEnabled ? "left-1" : "right-1"}`} />
                  </button>
                )}
              </dd>
            </div>
            {thresholdError && (
              <p className="py-2 text-left text-xs font-bold text-red-700">{thresholdError}</p>
            )}
          </dl>

          {isAdmin && isAliasEditorOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
              <button type="button" aria-label="بستن پنجره ویرایش اسم مستعار" className="absolute inset-0 bg-slate-950/45" onClick={() => !isSaving && setIsAliasEditorOpen(false)} />
              <form onSubmit={handleSubmit} className="relative w-full max-w-md rounded-md border border-slate-200 bg-white p-5 text-right shadow-2xl">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-slate-900">ویرایش اسم مستعار</h2>
                  <button type="button" disabled={isSaving} onClick={() => setIsAliasEditorOpen(false)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50">
                    بستن
                  </button>
                </div>
                <p className="mb-4 text-sm leading-7 text-slate-500">{title}</p>
                <label className="block">
                  <span className="text-sm font-bold text-slate-800">اسم مستعار</span>
                  <input type="text" value={aliasValue} onChange={(event) => setAliasValue(event.target.value)} autoFocus className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-right text-sm text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" placeholder="اسم مستعار محصول را وارد کنید" />
                </label>
                {error && <p className="mt-3 text-sm font-bold text-red-700">{error}</p>}
                <button type="submit" disabled={isSaving} className="mt-5 min-h-10 rounded-md bg-amber-500 px-5 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50">
                  {isSaving ? "در حال ذخیره..." : "ذخیره اسم مستعار"}
                </button>
              </form>
            </div>
          )}

          {isAdmin && isThresholdEditorOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
              <button type="button" aria-label="بستن پنجره ویرایش آستانه‌ها" className="absolute inset-0 bg-slate-950/45" onClick={() => !isThresholdSaving && setIsThresholdEditorOpen(false)} />
              <form onSubmit={handleThresholdSubmit} className="relative w-full max-w-md rounded-md border border-slate-200 bg-white p-5 text-right shadow-2xl">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-slate-900">ویرایش آستانه‌های موجودی</h2>
                  <button type="button" disabled={isThresholdSaving} onClick={() => setIsThresholdEditorOpen(false)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50">
                    بستن
                  </button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-bold text-slate-800">حد هشدار</span>
                    <input type="number" min="0" step="1" inputMode="numeric" required value={warningThresholdValue} onChange={(event) => setWarningThresholdValue(event.target.value)} className="mt-2 min-h-11 w-full rounded-md border border-slate-300 px-3 text-right outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-bold text-slate-800">حد بحرانی</span>
                    <input type="number" min="0" step="1" inputMode="numeric" required value={criticalThresholdValue} onChange={(event) => setCriticalThresholdValue(event.target.value)} className="mt-2 min-h-11 w-full rounded-md border border-slate-300 px-3 text-right outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" />
                  </label>
                </div>
                {thresholdError && <p className="mt-3 text-sm font-bold text-red-700">{thresholdError}</p>}
                <button type="submit" disabled={isThresholdSaving} className="mt-5 min-h-10 rounded-md bg-amber-500 px-5 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50">
                  {isThresholdSaving ? "در حال ذخیره..." : "ذخیره آستانه‌ها"}
                </button>
              </form>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
