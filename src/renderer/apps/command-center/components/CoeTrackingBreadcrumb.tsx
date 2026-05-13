import { Link } from 'react-router-dom'

interface BreadcrumbSegment {
  label: string
  href?: string
}

interface CoeTrackingBreadcrumbProps {
  segments: BreadcrumbSegment[]
}

export default function CoeTrackingBreadcrumb({ segments }: CoeTrackingBreadcrumbProps) {
  return (
    <nav className="glass-panel-subtle flex items-center gap-2 px-4 py-2.5 rounded-lg mb-5 mt-2">
      <Link
        to="/command-center/coe-tracking"
        className="text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
        title="C.O.E. Tracking Home"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </Link>

      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1
        return (
          <span key={i} className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {isLast || !seg.href ? (
              <span className="text-sm text-primary font-semibold">{seg.label}</span>
            ) : (
              <Link
                to={seg.href}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                {seg.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
