// Small shared presentational primitives for the C.O.E. Bonus tabs.

interface SectionCardProps {
  title?: React.ReactNode
  subtitle?: string
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}

export function SectionCard({ title, subtitle, action, className = '', children }: SectionCardProps) {
  return (
    <section className={`glass-card p-4 ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 mb-3">
          <div>
            {title && <h3 className="text-sm font-semibold text-primary">{title}</h3>}
            {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

interface KpiStatProps {
  label: string
  value: string
  hint?: string
  accentClass?: string
}

export function KpiStat({ label, value, hint, accentClass = 'text-primary' }: KpiStatProps) {
  return (
    <div className="glass-panel-subtle rounded-xl px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${accentClass}`}>{value}</div>
      {hint && <div className="text-[11px] text-muted mt-0.5">{hint}</div>}
    </div>
  )
}

export function TabLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted">{label}</span>
      </div>
    </div>
  )
}

export function TabError({ message }: { message: string }) {
  return (
    <div className="glass-card p-6 text-center">
      <p className="text-sm text-red-500">{message}</p>
    </div>
  )
}
