import { theme } from "../config/theme";

export const SearchBox = ({ query, onChange }) => (
  <div className="relative w-full sm:w-80">
    <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
      🔍
    </span>
    <input
      dir="rtl"
      type="text"
      value={query}
      onChange={(e) => onChange(e.target.value)}
      placeholder="جستجو بر اساس نام کالا یا بارکد..."
      className={`
                w-full pr-9 pl-4 py-2 rounded-xl text-sm text-white
                ${theme.colors.background.input}
                ${theme.colors.border.surface}
                ${theme.colors.border.focus}
                placeholder:${theme.colors.text.muted}
                outline-none transition-all duration-200
            `}
    />
    {query && (
      <button
        onClick={() => onChange("")}
        className="absolute inset-y-0 left-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
        aria-label="پاک کردن جستجو"
      >
        ✕
      </button>
    )}
  </div>
);
