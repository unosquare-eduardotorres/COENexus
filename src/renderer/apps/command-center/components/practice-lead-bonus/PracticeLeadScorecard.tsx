// Overview summary table with per-lead rows + totals

import type { PLBOverview } from '../../../../../shared/ipc-types'

interface PracticeLeadScorecardProps {
  overview: PLBOverview
}

function fmtCurrency(v: number): string {
  return `$${v.toLocaleString()}`
}

export function PracticeLeadScorecard({ overview }: PracticeLeadScorecardProps) {
  const { rows, totals } = overview

  if (rows.length === 0) {
    return (
      <div className="glass-panel-subtle rounded-xl p-6 text-center">
        <p className="text-sm text-muted">No data available for this period.</p>
      </div>
    )
  }

  return (
    <div className="glass-panel-subtle rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5">
            <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Lead</th>
            <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Practice</th>
            <th className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted">COE</th>
            <th className="text-right px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Plcmts</th>
            <th className="text-right px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Offb</th>
            <th className="text-right px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Gross</th>
            <th className="text-right px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Penalty</th>
            <th className="text-right px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Net</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.practiceName}-${i}`} className="border-b border-white/5 hover:bg-white/[0.02]">
              <td className={`px-4 py-2 ${row.practiceLeadName === 'Unassigned' ? 'text-amber-400 italic' : 'text-primary'}`}>
                {row.practiceLeadName}
              </td>
              <td className="px-4 py-2 text-secondary">{row.practiceName}</td>
              <td className="px-4 py-2 text-secondary">{row.coeName}</td>
              <td className="px-4 py-2 text-right text-primary">{row.placementCount}</td>
              <td className="px-4 py-2 text-right text-primary">{row.offboardingCount}</td>
              <td className="px-4 py-2 text-right text-emerald-400">{fmtCurrency(row.grossBonus)}</td>
              <td className="px-4 py-2 text-right text-red-400">
                {row.penalties > 0 ? `-${fmtCurrency(row.penalties)}` : fmtCurrency(0)}
              </td>
              <td className={`px-4 py-2 text-right font-semibold ${row.netBonus >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmtCurrency(row.netBonus)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-white/10 bg-white/[0.02]">
            <td className="px-4 py-2.5 font-semibold text-primary" colSpan={3}>TOTAL</td>
            <td className="px-4 py-2.5 text-right font-semibold text-primary">{totals.placements}</td>
            <td className="px-4 py-2.5 text-right font-semibold text-primary">{totals.offboardings}</td>
            <td className="px-4 py-2.5 text-right font-semibold text-emerald-400">{fmtCurrency(totals.grossBonus)}</td>
            <td className="px-4 py-2.5 text-right font-semibold text-red-400">
              {totals.penalties > 0 ? `-${fmtCurrency(totals.penalties)}` : fmtCurrency(0)}
            </td>
            <td className={`px-4 py-2.5 text-right font-bold ${totals.netBonus >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {fmtCurrency(totals.netBonus)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
