import { CheckIcon } from '../Icons'

interface ColumnDef {
  key: string
  label: string
  defaultVisible: boolean
}

interface ColumnConfigPanelProps {
  columnConfig: { visible: string[]; order: string[] }
  columnDefs: ColumnDef[]
  onToggle: (key: string) => void
  onMove: (key: string, direction: 'up' | 'down') => void
  onReset: () => void
}

export default function ColumnConfigPanel({ columnConfig, columnDefs, onToggle, onMove, onReset }: ColumnConfigPanelProps) {
  return (
    <div className="absolute top-full right-0 mt-1 z-40 w-72 glass-panel border border-white/10 rounded-xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <p className="text-xs font-medium text-primary uppercase tracking-wider">Configure Columns</p>
        <button onClick={onReset} className="text-[10px] text-red-400 hover:text-red-300">
          Reset
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto p-1.5 space-y-0.5">
        {columnConfig.order.map((key, idx) => {
          const def = columnDefs.find(c => c.key === key)
          if (!def) return null
          const isVisible = columnConfig.visible.includes(key)
          return (
            <div key={key} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${isVisible ? 'bg-white/[0.03]' : ''}`}>
              <button
                onClick={() => onToggle(key)}
                className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                  isVisible
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'border-white/10 text-transparent hover:border-white/20'
                }`}
              >
                {isVisible && <CheckIcon />}
              </button>
              <span className={`flex-1 text-xs ${isVisible ? 'text-primary' : 'text-muted'}`}>
                {def.label}
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => onMove(key, 'up')}
                  disabled={idx === 0}
                  className="p-0.5 rounded text-muted hover:text-primary disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </button>
                <button
                  onClick={() => onMove(key, 'down')}
                  disabled={idx === columnConfig.order.length - 1}
                  className="p-0.5 rounded text-muted hover:text-primary disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
