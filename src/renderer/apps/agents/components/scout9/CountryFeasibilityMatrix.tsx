import { useMemo } from 'react'

interface MatrixEntry {
  country: string
  seniority: string
  verdict: string
}

interface CountryFeasibilityMatrixProps {
  entries: MatrixEntry[]
}

function verdictCell(verdict: string) {
  switch (verdict.toLowerCase()) {
    case 'feasible':
      return (
        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
          <span className="text-xs">✅</span>
          <span className="text-[10px]">feasible</span>
        </span>
      )
    case 'marginal':
      return (
        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
          <span className="text-xs">⚠️</span>
          <span className="text-[10px]">marginal</span>
        </span>
      )
    case 'not-feasible':
      return (
        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
          <span className="text-xs">❌</span>
          <span className="text-[10px]">over</span>
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 text-gray-400 dark:text-gray-500">
          <span className="text-xs">—</span>
          <span className="text-[10px]">unknown</span>
        </span>
      )
  }
}

export default function CountryFeasibilityMatrix({ entries }: CountryFeasibilityMatrixProps) {
  const { countries, seniorities, grid } = useMemo(() => {
    const countrySet = new Set<string>()
    const senioritySet = new Set<string>()
    const gridMap = new Map<string, string>()

    for (const entry of entries) {
      countrySet.add(entry.country)
      senioritySet.add(entry.seniority)
      gridMap.set(`${entry.country}|${entry.seniority}`, entry.verdict)
    }

    return {
      countries: Array.from(countrySet),
      seniorities: Array.from(senioritySet),
      grid: gridMap,
    }
  }, [entries])

  if (countries.length === 0 || seniorities.length === 0) {
    return null
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50/50 dark:bg-dark-surface/50">
            <th className="px-3 py-2 text-left font-semibold text-primary">Country</th>
            {seniorities.map(s => (
              <th key={s} className="px-3 py-2 text-center font-semibold text-primary">{s}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {countries.map(country => (
            <tr key={country} className="border-t border-gray-100 dark:border-dark-border/20">
              <td className="px-3 py-2 font-medium text-secondary">{country}</td>
              {seniorities.map(seniority => (
                <td key={seniority} className="px-3 py-2 text-center">
                  {verdictCell(grid.get(`${country}|${seniority}`) ?? 'unknown')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
