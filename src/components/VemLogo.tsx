interface VemLogoProps {
  size?: number;
  className?: string;
}

export default function VemLogo({ size = 24, className }: VemLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="5" y1="5" x2="12" y2="8" />
      <line x1="12" y1="8" x2="19" y2="4" />
      <line x1="12" y1="8" x2="12" y2="14" />
      <line x1="5" y1="5" x2="4" y2="12" />
      <line x1="4" y1="12" x2="8" y2="18" />
      <line x1="8" y1="18" x2="12" y2="14" />
      <line x1="12" y1="14" x2="17" y2="19" />
      <line x1="19" y1="4" x2="20" y2="11" />
      <line x1="20" y1="11" x2="17" y2="19" />
      <line x1="4" y1="12" x2="12" y2="14" />
      <line x1="20" y1="11" x2="12" y2="14" />
      <circle cx="5" cy="5" r="2" fill="#3b82f6" stroke="#3b82f6" />
      <circle cx="4" cy="12" r="1.5" fill="#8b5cf6" stroke="#8b5cf6" />
      <circle cx="17" cy="19" r="2" fill="#10b981" stroke="#10b981" />
      <circle cx="19" cy="4" r="1.5" fill="currentColor" opacity="0.5" stroke="currentColor" />
      <circle cx="20" cy="11" r="1.5" fill="currentColor" opacity="0.5" stroke="currentColor" />
      <circle cx="8" cy="18" r="1.5" fill="currentColor" opacity="0.5" stroke="currentColor" />
      <circle cx="12" cy="14" r="2" fill="currentColor" opacity="0.3" stroke="currentColor" />
      <circle cx="12" cy="8" r="1.5" fill="currentColor" opacity="0.5" stroke="currentColor" />
    </svg>
  );
}
