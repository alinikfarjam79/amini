import { useEffect, useMemo, useRef, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Banner } from "./components/Banner";
import BarcodeScannerModal from "./components/BarcodeScannerModal";
import DashboardPage from "./components/DashboardPage";
import { Header } from "./components/Header";
import LoginPage from "./components/LoginPage";
import { ProductGrid } from "./components/ProductGrid";
import { SearchBox } from "./components/SearchBox";
import { SyncButton } from "./components/SyncButton";
import PriceChangesPage from "./components/PriceChangesPage";
import { theme } from "./config/theme";
import useBarcodeScanner from "./hook/useBarcodeScanner";
import useProductData from "./hook/useProductData";
import useSearch from "./hook/useSearch";
import usePriceChanges from "./hook/usePriceChanges";
import { BarcodeIcon } from "./icons/BarcodeIcon";
import { readExcelFile } from "./utilities/function";
import {
  writeSnapshot,
} from "./lib/priceHistoryService";
import { cacheService } from "./lib/cacheService";
import { CACHE_KEY } from "./config/constants";

const USER_STORAGE_KEY = "amini_xls_user";
const LAST_USER_STORAGE_KEY = "amini_xls_last_user";
const TOKEN_COOKIE_NAME = "amini_xls_token";
const INVENTORY_STORAGE_KEY = "amini_xls_warehouse_inventory";

const normalizeNumericText = (value) =>
  String(value ?? "")
    .trim()
    .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
    .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit))
    .replace(/,/g, "")
    .replace(/٬/g, "");

const toInventoryNumber = (value) => {
  const normalizedValue = normalizeNumericText(value);
  const numberValue = Number(normalizedValue);

  return Number.isFinite(numberValue) ? numberValue : 0;
};

const readInventoryByCode = () => {
  try {
    const inventories = JSON.parse(localStorage.getItem(INVENTORY_STORAGE_KEY));

    if (!inventories || typeof inventories !== "object") {
      return {};
    }

    return Object.values(inventories).reduce((inventoryByCode, warehouse) => {
      const items = Array.isArray(warehouse?.items) ? warehouse.items : [];

      items.forEach((item) => {
        const code = String(item?.code ?? "").trim();
        if (!code) return;

        inventoryByCode[code] =
          (inventoryByCode[code] || 0) + toInventoryNumber(item.quantity);
      });

      return inventoryByCode;
    }, {});
  } catch {
    return {};
  }
};

const getCookie = (name) => {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : "";
};

const setAuthCookie = (token) => {
  const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${TOKEN_COOKIE_NAME}=${encodeURIComponent(
    token,
  )}; Max-Age=604800; Path=/; SameSite=Lax${secureFlag}`;
};

const clearAuthCookie = () => {
  document.cookie = `${TOKEN_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
};

const getStoredUser = () => {
  if (!getCookie(TOKEN_COOKIE_NAME)) {
    return null;
  }

  try {
    return JSON.parse(localStorage.getItem(USER_STORAGE_KEY));
  } catch {
    return null;
  }
};

const getStoredUserWithoutToken = () => {
  try {
    return (
      JSON.parse(localStorage.getItem(USER_STORAGE_KEY)) ||
      JSON.parse(localStorage.getItem(LAST_USER_STORAGE_KEY))
    );
  } catch {
    return null;
  }
};

const hasCachedProducts = () => {
  const cachedProducts = cacheService.read(CACHE_KEY);

  if (Array.isArray(cachedProducts)) return cachedProducts.length > 0;
  if (Array.isArray(cachedProducts?.products)) {
    return cachedProducts.products.length > 0;
  }

  return false;
};

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    status,
    products,
    isUsingCache,
    sync,
    STATUS,
    replaceProducts,
  } =
    useProductData();
  const { query, setQuery, filteredProducts } = useSearch(products);
  const { priceChanges, computeChanges, dismissProduct } = usePriceChanges();
  const [barcode, setBarcode] = useState("");
  const [page, setPage] = useState("main"); // "main" | "priceChanges"
  const [currentUser, setCurrentUser] = useState(getStoredUser);
  const [importError, setImportError] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef(null);

  const { isOpen, openScanner, closeScanner } = useBarcodeScanner((code) => {
    setBarcode(code);
  });

  // ── Android back button ─────────────────────────────────────────────────────
  const isOpenRef = useRef(isOpen);
  const closeScannerRef = useRef(closeScanner);
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);
  useEffect(() => {
    closeScannerRef.current = closeScanner;
  }, [closeScanner]);

  useEffect(() => {
    const handleBack = (e) => {
      e.preventDefault();
      if (isOpenRef.current) {
        closeScannerRef.current();
      } else if (location.pathname === "/dashboard") {
        navigate("/");
      } else if (page === "priceChanges") {
        setPage("main");
      } else {
        if (navigator.app && navigator.app.exitApp) navigator.app.exitApp();
      }
    };
    document.addEventListener("backbutton", handleBack, false);
    return () => document.removeEventListener("backbutton", handleBack, false);
  }, [location.pathname, navigate, page]);

  // ── save after each changing─────────────────
  const prevStatusRef = useRef(status);
  useEffect(() => {
    const wasLoading =
      prevStatusRef.current === STATUS.LOADING ||
      prevStatusRef.current === STATUS.IDLE;
    const isNowSuccess = status === STATUS.SUCCESS;

    if (wasLoading && isNowSuccess && products.length > 0) {
      const changes = computeChanges(products);
      writeSnapshot(products);
    }
    prevStatusRef.current = status;
  }, [status, products, computeChanges, STATUS]);

  // ── Import  XLS ────────────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    if (!file) return;

    setImportError(null);
    setImportLoading(true);

    try {
      const records = await readExcelFile(file, [
        "عنوان کالا",
        "کد کالا",
        "بارکد کالا",
        "قیمت اصلی",
      ]);

      if (!records || records.length === 0) {
        throw new Error(
          "فایل انتخابی خالی است یا ستون‌های مورد نیاز را ندارد.",
        );
      }

      replaceProducts(records);

      // compare to pervious changing
      const changes = computeChanges(records);
      writeSnapshot(records);

      if (changes.length > 0) {
      } else {
        setImportError("فایل با موفقیت وارد شد. هیچ تغییر قیمتی یافت نشد.");
      }
    } catch (err) {
      setImportError(err.message || "خطا در خواندن فایل.");
    } finally {
      setImportLoading(false);
    }
  };

  // ── Derived UI state ────────────────────────────────────────────────────────
  const isLoading = status === STATUS.LOADING || status === STATUS.IDLE;
  const showNetworkWarning =
    status === STATUS.NETWORK_ERROR && products.length > 0;
  const showNetworkBlocking =
    status === STATUS.NETWORK_ERROR && products.length === 0;
  const showParseError = status === STATUS.PARSE_ERROR;
  const inventoryByCode = useMemo(
    () => readInventoryByCode(),
    [location.pathname, page, products],
  );

  const handleLogin = (user, token) => {
    if (!token || !user) {
      return { ok: false, message: "اطلاعات ورود معتبر نیست." };
    }

    const nextUser = {
      id: user.id,
      phoneNumber: user.phoneNumber,
      loginMethod: user.loginMethod,
      role: user.role,
    };

    setAuthCookie(token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
    localStorage.setItem(LAST_USER_STORAGE_KEY, JSON.stringify(nextUser));
    setCurrentUser(nextUser);
    setPage("main");

    return { ok: true };
  };

  const handleOfflineLogin = (phoneNumber) => {
    const storedUser = getStoredUserWithoutToken();
    const normalizedPhone = String(phoneNumber || "").trim();

    if (
      normalizedPhone &&
      storedUser?.phoneNumber &&
      storedUser.phoneNumber !== normalizedPhone
    ) {
      return {
        ok: false,
        message: "برای این شماره موبایل اطلاعات لوکال ذخیره نشده است.",
      };
    }

    if (!hasCachedProducts()) {
      return {
        ok: false,
        message: "اطلاعات لوکال محصولات روی این دستگاه وجود ندارد.",
      };
    }

    const offlineUser = storedUser || {
      id: "offline-user",
      phoneNumber: normalizedPhone || "offline-user",
      loginMethod: "offline",
      role: "user",
    };

    setCurrentUser({ ...offlineUser, isOffline: true });
    setPage("main");
    navigate("/");

    return { ok: true };
  };

  const handleLogout = () => {
    localStorage.removeItem(USER_STORAGE_KEY);
    clearAuthCookie();
    setCurrentUser(null);
    setPage("main");
    closeScanner();
    navigate("/");
  };

  if (!currentUser) {
    return (
      <LoginPage onLogin={handleLogin} onOfflineLogin={handleOfflineLogin} />
    );
  }

  // ──price change─────────────────────────────────────────────────────
  if (page === "priceChanges") {
    return (
      <PriceChangesPage
        changes={priceChanges}
        onDismiss={dismissProduct}
        onBack={() => setPage("main")}
      />
    );
  }

  // ── main page ──────────────────────────────────────────────────────────────
  const mainPage = (
    <div
      dir="rtl"
      className={`min-h-screen ${theme.colors.background.page} font-['Vazirmatn',_'Noto_Sans_Arabic',_sans-serif]`}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>

      <Header
        productCount={products.length}
        isUsingCache={isUsingCache}
        currentUser={currentUser}
        onDashboard={() => navigate("/dashboard")}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* ── Banners ── */}
        {showNetworkWarning && (
          <Banner
            variant="warning"
            message="داده جدیدی از سرور دریافت نشد. اطلاعات از کش دستگاه خوانده می‌شود."
          />
        )}
        {isUsingCache && !showNetworkWarning && (
          <Banner
            variant="warning"
            message="اطلاعات از لوکال دستگاه خوانده می‌شود."
          />
        )}
        {showNetworkBlocking && (
          <Banner
            variant="danger"
            message="هشدار: برقراری ارتباط با سرور ممکن نبود. در حال نمایش اطلاعات ذخیره‌شده (احتمالاً قدیمی)."
          />
        )}
        {currentUser?.isOffline && (
          <Banner
            variant="warning"
            message="شما به صورت آفلاین وارد شده‌اید و اطلاعات ذخیره‌شده روی همین دستگاه نمایش داده می‌شود."
          />
        )}
        {showParseError && (
          <Banner
            variant="danger"
            message="خطا: قالب یا محتوای فایل‌های دریافتی از سرور صحیح نیست."
          />
        )}
        {importError && (
          <Banner
            variant={
              importError.startsWith("فایل با موفقیت") ? "success" : "danger"
            }
            message={importError}
          />
        )}

        {/* ── Controls ── */}
        <div
          dir="rtl"
          className="flex items-center sticky top-2 z-10 justify-start gap-3 flex-wrap"
        >
          <SearchBox query={query} onChange={setQuery} />
          <button onClick={openScanner} className="border rounded-md p-1">
            <BarcodeIcon />
          </button>
        </div>

        {/* ── Action bar ── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/**/}
          <div className="flex items-center gap-3">
            <div className={`text-sm ${theme.colors.text.secondary}`}>
              {!isLoading && status === STATUS.SUCCESS && (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  اطلاعات به‌روز است
                </span>
              )}
            </div>

            {/* button for showing changing page*/}
            {priceChanges.length > 0 && (
              <button
                onClick={() => setPage("priceChanges")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-500/10 text-red-500 border border-red-400/30 hover:bg-red-500/20 transition-colors"
              >
                <span className="inline-block w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                {priceChanges.length.toLocaleString("fa-IR")} تغییر قیمت
              </button>
            )}
          </div>

          {/* button Import ,Sync */}
          <div className="flex items-center gap-2">
            {/* ── Import ── */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xls,.xlsx"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importLoading}
              className={`
                inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                text-sm font-bold tracking-wide border transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed active:scale-95
                border-slate-300 text-slate-700 hover:bg-slate-100
              `}
            >
              {importLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  در حال خواندن...
                </>
              ) : (
                <>
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  وارد کردن XLS
                </>
              )}
            </button>

            {/* ── Sync ── */}
            <SyncButton onSync={sync} isLoading={isLoading} />
          </div>
        </div>

        {/* ── Result count ── */}
        {query && !isLoading && (
          <p className={`text-xs ${theme.colors.text.muted}`}>
            {filteredProducts.length.toLocaleString("fa-IR")} نتیجه از{" "}
            {products.length.toLocaleString("fa-IR")} محصول
          </p>
        )}

        {/* ── Product Grid ── */}
        <ProductGrid
          products={filteredProducts}
          isLoading={isLoading}
          searchQuery={query}
          inventoryByCode={inventoryByCode}
        />
      </main>

      <footer
        dir="rtl"
        className={`mt-12 py-6 border-t border-slate-200 text-center text-xs ${theme.colors.text.muted}`}
      >
        کاتالوگ محصولات — داده‌ها از دو منبع مستقل ادغام شده‌اند
      </footer>

      <BarcodeScannerModal
        isOpen={isOpen}
        onClose={closeScanner}
        onDetected={(code) => {
          setBarcode(code);
          setQuery(code);
        }}
      />
    </div>
  );

  return (
    <Routes>
      <Route
        path="/dashboard"
        element={
          <DashboardPage
            currentUser={currentUser}
            onBack={() => navigate("/")}
            onLogout={handleLogout}
          />
        }
      />
      <Route path="*" element={mainPage} />
    </Routes>
  );
}
