import { useEffect, useMemo, useState } from "react";
import {
  getCompanyProductPriceHistory,
  getCompanyProductPrices,
  uploadCompanyProductPrices,
} from "../services/companyProductPriceService";

const inputClass = "min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20";
const buttonClass = "min-h-11 rounded-md bg-amber-500 px-4 text-sm font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50";
const digits = (value) => String(value || "")
  .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
  .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit))
  .replace(/\D/g, "").slice(0, 8);
const dateMask = (value) => {
  const valueDigits = digits(value);
  return `${valueDigits.slice(0, 4).padEnd(4, "_")}/${valueDigits.slice(4, 6).padEnd(2, "_")}/${valueDigits.slice(6, 8).padEnd(2, "_")}`;
};
const validDate = (value) => {
  const match = /^(1[34]\d{2})\/(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[2]);
  const day = Number(match[3]);
  return month >= 1 && month <= 12 && day >= 1 && day <= (month <= 6 ? 31 : month <= 11 ? 30 : 30);
};
const priceText = (value) => Number(value).toLocaleString("fa-IR");
const hasPrice = (value) => value != null && value !== "" && Number.isFinite(Number(value));

function ProductList({ products, emptyMessage }) {
  if (!products.length) return <p className="py-10 text-center text-sm text-slate-500">{emptyMessage}</p>;
  return (
    <div className="divide-y divide-slate-200">
      {products.map((product, index) => (
        <article key={product._id || product.id || index} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] sm:items-center">
          <div className="min-w-0">
            <h4 className="break-words text-sm font-bold text-slate-900">{product.title || product.sourceTitle || "بدون عنوان"}</h4>
            {product.companyName && <p className="mt-1 text-xs text-slate-500">{product.companyName}</p>}
          </div>
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
            {hasPrice(product.factoryPrice) && <p><span className="text-slate-500">درب کارخانه: </span><strong>{priceText(product.factoryPrice)}</strong></p>}
            {hasPrice(product.consumerPrice) && <p><span className="text-slate-500">مصرف کننده: </span><strong>{priceText(product.consumerPrice)}</strong></p>}
            {hasPrice(product.wholesalePrice) && <p><span className="text-slate-500">عمده: </span><strong>{priceText(product.wholesalePrice)}</strong></p>}
          </div>
        </article>
      ))}
    </div>
  );
}

export default function CompanyProductPricesPage() {
  const [view, setView] = useState("current");
  const [search, setSearch] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyProducts, setHistoryProducts] = useState([]);
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCompany, setUploadCompany] = useState("");
  const [uploadDate, setUploadDate] = useState("");
  const [file, setFile] = useState(null);
  const [fileKey, setFileKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadResult, setUploadResult] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    Promise.allSettled([
      getCompanyProductPrices({}, controller.signal),
      getCompanyProductPriceHistory({}, controller.signal),
    ]).then((results) => {
      if (controller.signal.aborted) return;
      const records = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
      setCompanies([...new Set(records.map((item) => item.companyName).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fa")));
    });
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    if (view !== "current") return undefined;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const result = await getCompanyProductPrices({ search, companyName }, controller.signal);
        if (!controller.signal.aborted) setProducts(result);
      } catch (requestError) {
        if (!controller.signal.aborted) setError(requestError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, search ? 350 : 0);
    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, [view, search, companyName, reload]);

  useEffect(() => {
    if (view !== "history" || selectedUpload) return undefined;
    const controller = new AbortController();
    setHistoryLoading(true);
    setHistoryError("");
    getCompanyProductPriceHistory({ companyName, search }, controller.signal)
      .then((items) => { if (!controller.signal.aborted) setHistory(items); })
      .catch((requestError) => { if (!controller.signal.aborted) setHistoryError(requestError.message); })
      .finally(() => { if (!controller.signal.aborted) setHistoryLoading(false); });
    return () => controller.abort();
  }, [view, companyName, search, selectedUpload, reload]);

  useEffect(() => {
    if (!selectedUpload || view !== "history") return undefined;
    const controller = new AbortController();
    setHistoryLoading(true);
    setHistoryError("");
    getCompanyProductPriceHistory({ ...selectedUpload, search }, controller.signal)
      .then((items) => { if (!controller.signal.aborted) setHistoryProducts(items); })
      .catch((requestError) => { if (!controller.signal.aborted) setHistoryError(requestError.message); })
      .finally(() => { if (!controller.signal.aborted) setHistoryLoading(false); });
    return () => controller.abort();
  }, [selectedUpload, view, search, reload]);

  const uploads = useMemo(() => {
    const groups = new Map();
    history.forEach((item) => {
      if (!item.companyName || !item.uploadDate) return;
      const key = JSON.stringify([item.companyName, item.uploadDate]);
      const previous = groups.get(key);
      groups.set(key, { companyName: item.companyName, uploadDate: item.uploadDate, count: (previous?.count || 0) + Number(item.count ?? 1) });
    });
    return [...groups.values()].sort((a, b) => b.uploadDate.localeCompare(a.uploadDate) || a.companyName.localeCompare(b.companyName, "fa"));
  }, [history]);

  const closeUpload = () => { if (!uploading) setUploadOpen(false); };
  const submitUpload = async (event) => {
    event.preventDefault();
    if (!uploadCompany.trim() || !file || !validDate(uploadDate)) {
      setUploadError("نام شرکت، فایل اکسل و تاریخ معتبر به صورت سال/ماه/روز الزامی هستند.");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const result = await uploadCompanyProductPrices({ companyName: uploadCompany, uploadDate, file });
      setUploadResult(result);
      setUploadOpen(false);
      setFile(null);
      setFileKey((key) => key + 1);
      setReload((value) => value + 1);
    } catch (requestError) {
      setUploadError(requestError.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-md border border-slate-300 bg-white p-1" role="tablist" aria-label="نمای لیست قیمت">
          <button type="button" role="tab" aria-selected={view === "current"} onClick={() => { setView("current"); setSelectedUpload(null); }} className={`rounded px-4 py-2 text-sm font-bold ${view === "current" ? "bg-slate-800 text-white" : "text-slate-700"}`}>محصولات فعلی</button>
          <button type="button" role="tab" aria-selected={view === "history"} onClick={() => setView("history")} className={`rounded px-4 py-2 text-sm font-bold ${view === "history" ? "bg-slate-800 text-white" : "text-slate-700"}`}>تاریخچه آپلود</button>
        </div>
        <button type="button" className={buttonClass} onClick={() => { setUploadError(""); setUploadOpen(true); }}>آپلود لیست قیمت</button>
      </div>

      {uploadResult && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-bold">فایل لیست قیمت آپلود شد.</p>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
          {[ ["کل ردیف‌ها", uploadResult.totalRows], ["معتبر", uploadResult.validRows], ["نامعتبر", uploadResult.invalidRows], ["ذخیره‌شده", uploadResult.savedProducts], ["محصول جدید", uploadResult.newProducts], ["به‌روزشده", uploadResult.updatedProducts] ].filter(([, value]) => value != null).map(([label, value]) => <span key={label}>{label}: {Number(value).toLocaleString("fa-IR")}</span>)}
        </div>
        {Array.isArray(uploadResult.errors) && uploadResult.errors.length > 0 && <ul className="mt-2 list-inside list-disc text-red-700">{uploadResult.errors.map((item, index) => <li key={index}>ردیف {item.row || index + 1}: {item.message || String(item)}</li>)}</ul>}
      </div>}

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(180px,260px)]">
        <label className="block"><span className="mb-1 block text-sm font-bold text-slate-700">جست‌وجوی محصولات</span><input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="عنوان یا کد محصول..." /></label>
        <label className="block"><span className="mb-1 block text-sm font-bold text-slate-700">شرکت</span><select className={inputClass} value={companyName} onChange={(event) => { setCompanyName(event.target.value); setSelectedUpload(null); }}><option value="">همه شرکت‌ها</option>{companies.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
      </div>

      {view === "current" ? <div className="rounded-md border border-slate-200 bg-white px-4">
        {error ? <p className="py-8 text-center text-sm text-red-700">{error}</p> : loading ? <p className="py-8 text-center text-sm text-slate-500">در حال دریافت محصولات...</p> : <ProductList products={products} emptyMessage="محصولی پیدا نشد." />}
      </div> : selectedUpload ? <div className="rounded-md border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3"><h3 className="text-sm font-bold text-slate-800">{selectedUpload.companyName}، {selectedUpload.uploadDate}</h3><button type="button" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700" onClick={() => setSelectedUpload(null)}>بازگشت به تاریخچه</button></div>
        {historyError ? <p className="py-8 text-center text-sm text-red-700">{historyError}</p> : historyLoading ? <p className="py-8 text-center text-sm text-slate-500">در حال دریافت محصولات...</p> : <ProductList products={historyProducts} emptyMessage="محصولی برای این تاریخ پیدا نشد." />}
      </div> : <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        {historyError ? <p className="p-5 text-sm text-red-700">{historyError}</p> : historyLoading ? <p className="p-5 text-sm text-slate-500">در حال دریافت تاریخچه...</p> : uploads.length === 0 ? <p className="p-5 text-sm text-slate-500">تاریخچه‌ای پیدا نشد.</p> : uploads.map((upload) => <button type="button" key={JSON.stringify([upload.companyName, upload.uploadDate])} onClick={() => { setHistoryProducts([]); setSelectedUpload({ companyName: upload.companyName, uploadDate: upload.uploadDate }); }} className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 text-right text-sm hover:bg-slate-50"><span className="font-bold text-slate-800">{upload.companyName}</span><span className="text-slate-600" dir="ltr">{upload.uploadDate}</span><span className="text-slate-500">{upload.count.toLocaleString("fa-IR")} محصول</span></button>)}
      </div>}

      {uploadOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><button type="button" aria-label="بستن پنجره" onClick={closeUpload} className="absolute inset-0 bg-slate-950/50" /><form onSubmit={submitUpload} className="relative max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-md bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between"><h3 className="text-base font-bold text-slate-900">آپلود لیست قیمت شرکت</h3><button type="button" onClick={closeUpload} className="rounded-md border border-slate-300 px-3 py-2 text-sm">بستن</button></div>
        <label className="block"><span className="mb-1 block text-sm font-bold text-slate-700">نام شرکت</span><input className={inputClass} value={uploadCompany} onChange={(event) => setUploadCompany(event.target.value)} list="company-product-price-names" required /><datalist id="company-product-price-names">{companies.map((name) => <option key={name} value={name} />)}</datalist></label>
        <label className="block"><span className="mb-1 block text-sm font-bold text-slate-700">تاریخ آپلود</span><input className={`${inputClass} text-center font-mono`} dir="ltr" inputMode="numeric" autoComplete="off" value={dateMask(uploadDate)} onChange={(event) => setUploadDate(dateMask(event.target.value))} onKeyDown={(event) => { if (event.ctrlKey || event.metaKey || event.altKey) return; if (event.key === "Backspace" || event.key === "Delete") { event.preventDefault(); setUploadDate(dateMask(digits(uploadDate).slice(0, -1))); } else if (/^[0-9۰-۹٠-٩]$/.test(event.key)) { event.preventDefault(); setUploadDate(dateMask(`${digits(uploadDate)}${digits(event.key)}`)); } }} maxLength={10} required /></label>
        <label className="block"><span className="mb-1 block text-sm font-bold text-slate-700">فایل اکسل</span><input key={fileKey} type="file" accept=".xls,.xlsx" required className={`${inputClass} py-2 file:ml-3 file:rounded file:border-0 file:bg-slate-800 file:px-3 file:py-1 file:text-white`} onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
        {uploadError && <p className="text-sm font-bold text-red-700">{uploadError}</p>}
        <button type="submit" disabled={uploading} className={buttonClass}>{uploading ? "در حال آپلود..." : "آپلود"}</button>
      </form></div>}
    </section>
  );
}
