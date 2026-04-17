import type { PresentationMode } from '../../types'

interface PresentationModeToggleProps {
  mode: PresentationMode
  onModeChange: (mode: PresentationMode) => void
}

export default function PresentationModeToggle({ mode, onModeChange }: PresentationModeToggleProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <button
        className={`glass-card p-4 text-left transition-all cursor-pointer ${mode === 'combined' ? 'ring-2 ring-accent-500' : ''}`}
        onClick={() => onModeChange('combined')}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${mode === 'combined' ? 'border-accent-500' : 'border-gray-300 dark:border-dark-border'}`}>
            {mode === 'combined' && <div className="w-2 h-2 rounded-full bg-accent-500" />}
          </div>
          <span className="font-medium text-primary">Combined</span>
        </div>
        <p className="text-sm text-muted">
          Single presentation with all candidates grouped together. Best for presenting multiple candidates for the same role.
        </p>
      </button>
      <button
        className={`glass-card p-4 text-left transition-all cursor-pointer ${mode === 'individual' ? 'ring-2 ring-accent-500' : ''}`}
        onClick={() => onModeChange('individual')}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${mode === 'individual' ? 'border-accent-500' : 'border-gray-300 dark:border-dark-border'}`}>
            {mode === 'individual' && <div className="w-2 h-2 rounded-full bg-accent-500" />}
          </div>
          <span className="font-medium text-primary">Individual</span>
        </div>
        <p className="text-sm text-muted">
          Separate presentation per candidate. Each produces its own email-ready content with individual titles.
        </p>
      </button>
    </div>
  )
}
