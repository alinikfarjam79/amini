/**
 * priceHistoryService
 * ─────────────────────────────────────────────────────────────
 * localStorage keys:
 *   persian_catalog_price_snapshot  → { [کد کالا]: قیمت اصلی }
 *   persian_catalog_dismissed       → Set<کد کالا>  (serialized as array)
 */

const SNAPSHOT_KEY = "persian_catalog_price_snapshot";
const DISMISSED_KEY = "persian_catalog_dismissed";

// ── snapshot (قیمت‌های آخرین sync) ──────────────────────────────────────────

export const readSnapshot = () => {
    try {
        const raw = localStorage.getItem(SNAPSHOT_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};

export const writeSnapshot = (products) => {
    try {
        const map = {};
        products.forEach((p) => {
            const code = String(p["کد کالا"] || p["بارکد کالا"] || "").trim();
            if (code) map[code] = p["قیمت اصلی"];
        });
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(map));
    } catch { }
};

// ── dismissed (محصولاتی که کاربر از لیست تغییر قیمت حذف کرده) ──────────────

export const readDismissed = () => {
    try {
        const raw = localStorage.getItem(DISMISSED_KEY);
        return new Set(raw ? JSON.parse(raw) : []);
    } catch {
        return new Set();
    }
};

export const addDismissed = (code) => {
    try {
        const set = readDismissed();
        set.add(String(code));
        localStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]));
    } catch { }
};

export const clearDismissed = () => {
    try {
        localStorage.removeItem(DISMISSED_KEY);
    } catch { }
};

// ── مقایسه قیمت‌ها ────────────────────────────────────────────────────────────

/**
 * مقایسه محصولات جدید با snapshot قبلی
 * @param {Array} newProducts
 * @returns {Array} لیست محصولاتی که قیمتشان تغییر کرده
 */
export const detectPriceChanges = (newProducts) => {
    const snapshot = readSnapshot();
    const dismissed = readDismissed();

    if (Object.keys(snapshot).length === 0) return [];

    const changed = [];
    newProducts.forEach((p) => {
        const code = String(p["کد کالا"] || p["بارکد کالا"] || "").trim();
        if (!code || dismissed.has(code)) return;

        const oldPrice = snapshot[code];
        const newPrice = p["قیمت اصلی"];

        //if the price existed and diff
        if (oldPrice !== undefined && String(oldPrice) !== String(newPrice)) {
            changed.push({
                ...p,
                _oldPrice: oldPrice,
                _newPrice: newPrice,
                _code: code,
            });
        }
    });

    return changed;
};