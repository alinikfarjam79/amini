export function BarcodeIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="15" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="15" width="6" height="6" rx="1" />
      <path d="M12 4h1M12 8h1M16 12h1M20 12h1M12 16h1M16 16h1M20 16h1M12 20h1M16 20h5" />
      <path d="M16 20v-1M20 16v1M12 12h1v1h-1z" />
    </svg>
  );
}
