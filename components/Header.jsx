import { useState } from "react";
import { theme } from "../config/theme";

export const Header = ({
  productCount,
  isUsingCache,
  currentUser,
  onDashboard,
  onBack,
  onLogout,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleDashboardClick = () => {
    setIsMenuOpen(false);
    onDashboard?.();
  };

  const handleLogoutClick = () => {
    setIsMenuOpen(false);
    onLogout?.();
  };

  return (
    <header
      dir="rtl"
      className={`px-6 py-5 ${theme.colors.background.surface} border-b border-slate-800`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">
              🛍
            </span>
            <h1 className={`text-xl font-bold ${theme.colors.text.primary}`}>
              کاتالوگ محصولات
            </h1>
            {isUsingCache && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                حافظه پنهان
              </span>
            )}
          </div>
          <p className={`text-xs ${theme.colors.text.muted}`}>
            {productCount > 0
              ? `${productCount.toLocaleString("fa-IR")} محصول در پایگاه داده`
              : ""}
          </p>
        </div>

        {currentUser && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${theme.colors.text.primary}`}>
              {currentUser.phoneNumber || currentUser.username}
            </span>

            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors"
              >
                بازگشت
              </button>
            )}

            <div className="relative">
              <button
                type="button"
                aria-label="باز کردن منوی کاربری"
                aria-expanded={isMenuOpen}
                onClick={() => setIsMenuOpen((current) => !current)}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition-colors hover:bg-slate-200"
              >
                <span className="flex flex-col gap-1" aria-hidden="true">
                  <span className="block h-0.5 w-5 rounded-full bg-current" />
                  <span className="block h-0.5 w-5 rounded-full bg-current" />
                  <span className="block h-0.5 w-5 rounded-full bg-current" />
                </span>
              </button>

              {isMenuOpen && (
                <div className="absolute left-0 top-full z-40 mt-2 w-48 overflow-hidden rounded-md border border-slate-200 bg-white py-1 text-right shadow-xl">
                  {onDashboard && (
                    <button
                      type="button"
                      onClick={handleDashboardClick}
                      className="block w-full px-4 py-3 text-right text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      داشبورد مدیریت
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleLogoutClick}
                    className="block w-full px-4 py-3 text-right text-sm font-bold text-red-600 transition-colors hover:bg-red-50"
                  >
                    خروج
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
