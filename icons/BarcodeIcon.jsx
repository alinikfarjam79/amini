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
      <path d="M3 5v14M7 5v14M11 5v14M15 5v14M19 5v14" strokeWidth="1.5" />
      <path d="M3 5h2M3 19h2M19 5h2M19 19h2" strokeWidth="2" />
    </svg>
  );
}
