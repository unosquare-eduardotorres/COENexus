// Warning banner for practices missing leads + C.A.T. link

import { useNavigate } from 'react-router-dom'

interface UnassignedPracticesBannerProps {
  count: number
}

export function UnassignedPracticesBanner({ count }: UnassignedPracticesBannerProps) {
  const navigate = useNavigate()

  if (count <= 0) return null

  return (
    <div className="glass-panel-subtle rounded-xl p-3 border border-amber-500/20 bg-amber-500/5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 flex-shrink-0">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="text-sm text-amber-300">
            {count} practice{count > 1 ? 's have' : ' has'} no assigned lead. Assign leads in Catalog Administration.
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate('/catalogs/practices')}
          className="text-xs text-amber-400 hover:text-amber-300 underline whitespace-nowrap"
        >
          Go to C.A.T.
        </button>
      </div>
    </div>
  )
}
