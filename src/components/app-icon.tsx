export function AppIcon({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="App Name Checker logo"
    >
      <rect width="32" height="32" rx="8" fill="#111827" />
      <rect x="6" y="6" width="8" height="8" rx="2" fill="white" opacity="0.92" />
      <rect x="18" y="6" width="8" height="8" rx="2" fill="white" opacity="0.92" />
      <rect x="6" y="18" width="8" height="8" rx="2" fill="white" opacity="0.92" />
      <circle cx="22" cy="22" r="5.5" fill="#16A34A" />
      <path
        d="M19.2 22l2 2 3.6-4"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
