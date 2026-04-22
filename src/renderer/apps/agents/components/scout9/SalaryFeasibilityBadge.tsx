interface SalaryFeasibilityBadgeProps {
  verdict: 'feasible' | 'marginal' | 'not-feasible' | 'unknown'
  amount?: string
  margin?: string
}

export default function SalaryFeasibilityBadge({ verdict, amount, margin }: SalaryFeasibilityBadgeProps) {
  switch (verdict) {
    case 'feasible':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300">
          ✓ Feasible
          {amount && <span className="font-normal">— {amount}</span>}
          {margin && <span className="font-normal">({margin} margin)</span>}
        </span>
      )

    case 'marginal':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
          ⚠ Marginal
          {amount && <span className="font-normal">— {amount}</span>}
          {margin && <span className="font-normal">({margin})</span>}
        </span>
      )

    case 'not-feasible':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300">
          ✗ Over budget
          {amount && <span className="font-normal">— {amount}</span>}
          {margin && <span className="font-normal">(+{margin})</span>}
        </span>
      )

    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-dark-muted/30 dark:text-gray-400">
          ? No salary data
        </span>
      )
  }
}
