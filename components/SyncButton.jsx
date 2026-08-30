import { theme } from "../config/theme";

export const SyncButton = ({ onSync, isLoading }) => (
  <button
    onClick={onSync}
    disabled={isLoading}
    aria-busy={isLoading}
    className={`
        inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
        text-sm font-bold tracking-wide
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${theme.colors.primary.button}
        ${theme.colors.primary.buttonFocus}
        ${isLoading ? "" : "active:scale-95"}
      `}
  >
    <span
      className={`inline-block w-4 h-4 border-2 border-current rounded-full transition-all ${
        isLoading ? "border-t-transparent animate-spin" : "border-transparent"
      }`}
      aria-hidden="true"
    >
      {!isLoading && (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-4 h-4"
        >
          <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5" strokeLinecap="round" />
          <path
            d="M8 2.5 10 .5M8 2.5 10 4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
    {isLoading ? "در حال به‌روزرسانی..." : "به‌روزرسانی اطلاعات"}
  </button>
);
