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
          </div>

          <dl className="grid gap-5 py-6 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold text-slate-500">قیمت مصرف‌کننده</dt>
              <dd className="mt-2 text-lg font-bold text-slate-900">
                {formatPrice(product["قیمت اصلی"])} <span className="text-sm font-normal">تومان</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-slate-500">موجودی</dt>
              <dd className={`mt-2 text-lg font-bold ${product.inventoryStatus === "critical" ? "text-red-700" : product.inventoryStatus === "warning" ? "text-amber-600" : product.inventoryStatus === "normal" ? "text-emerald-700" : inventoryNumber <= 0 ? "text-red-700" : "text-emerald-700"}`}>
                {inventoryNumber.toLocaleString("fa-IR")}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-slate-500">کد محصول</dt>
              <dd className="mt-2 font-mono text-sm text-slate-800">{product["کد کالا"] || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-slate-500">بارکد</dt>
              <dd className="mt-2 font-mono text-sm text-slate-800">{product["بارکد کالا"] || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-slate-500">حد هشدار موجودی</dt>
              <dd className="mt-2 text-sm font-bold text-slate-800">
                {formatThreshold(product.warningThreshold)}
              </dd>
              {isAdmin && (
                <button type="button" onClick={openThresholdEditor} className="mt-3 min-h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 hover:bg-slate-50">
                  ویرایش آستانه‌ها
                </button>
              )}
            </div>
            <div>
              <dt className="text-xs font-bold text-slate-500">حد بحرانی موجودی</dt>
              <dd className="mt-2 text-sm font-bold text-slate-800">
                {formatThreshold(product.criticalThreshold)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold text-slate-500">کنترل آستانه موجودی</dt>
              <dd className="mt-2 flex flex-wrap items-center gap-3">
                <span className={`inline-flex rounded-md border px-2.5 py-1 text-sm font-bold ${product.thresholdEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                  {product.thresholdEnabled ? "فعال" : "غیرفعال"}
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleThresholdToggle}
                    disabled={isThresholdSaving}
                    className={`min-h-9 rounded-md px-3 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${product.thresholdEnabled ? "bg-red-600 hover:bg-red-500" : "bg-emerald-600 hover:bg-emerald-500"}`}
                  >
                    {isThresholdSaving
                      ? "در حال ذخیره..."
                      : product.thresholdEnabled
                        ? "غیرفعال کردن"
                        : "فعال کردن"}
                  </button>
                )}
              </dd>
              {thresholdError && (
                <p className="mt-2 text-xs font-bold text-red-700">
                  {thresholdError}
                </p>
              )}
            </div>
            <div>
              <dt className="text-xs font-bold text-slate-500">وضعیت موجودی</dt>
              <dd className={`mt-2 inline-flex rounded-md border px-2.5 py-1 text-sm font-bold ${inventoryStatus.className}`}>
                {inventoryStatus.label}
              </dd>
            </div>
          </dl>

          {isAdmin && (
            <form onSubmit={handleSubmit} className="border-t border-slate-200 pt-6">
              <label className="block max-w-xl">
                <span className="text-sm font-bold text-slate-900">اسم مستعار</span>
                <input type="text" value={aliasValue} onChange={(event) => setAliasValue(event.target.value)} className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-right text-sm text-slate-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" placeholder="اسم مستعار محصول را وارد کنید" />
              </label>
              {error && <p className="mt-3 text-sm font-bold text-red-700">{error}</p>}
              {message && <p className="mt-3 text-sm font-bold text-emerald-700">{message}</p>}
              <button type="submit" disabled={isSaving} className="mt-4 min-h-10 rounded-md bg-amber-500 px-5 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50">
                {isSaving ? "در حال ذخیره..." : "ذخیره اسم مستعار"}
              </button>
            </form>
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
