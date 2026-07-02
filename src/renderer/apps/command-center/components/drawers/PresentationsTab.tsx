import { formatDate } from '../../utils/dateFormatters'

interface Presentation {
  openPositionId: number
  account: string | null
  openPositionStatus: string | null
  location: string | null
  presentedOn: string | null
  candidateStatus: string | null
}

interface PresentationsTabProps {
  presentations: Presentation[]
}

export default function PresentationsTab({ presentations }: PresentationsTabProps) {
  if (presentations.length === 0) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-muted">No presentations found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            {['Open Position ID', 'Client', 'Position Status', 'Location', 'Presented On', 'Candidate Status'].map(col => (
              <th key={col} className="py-2 px-3 text-xs uppercase tracking-wider text-muted font-medium text-left">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {presentations.map((presentation, index) => (
            <tr key={`${presentation.openPositionId}-${index}`} className="hover:bg-white/[0.03]">
              <td className="py-2.5 px-3 text-primary font-mono">#{presentation.openPositionId}</td>
              <td className="py-2.5 px-3 text-primary">{presentation.account || '—'}</td>
              <td className="py-2.5 px-3 text-secondary">{presentation.openPositionStatus || '—'}</td>
              <td className="py-2.5 px-3 text-secondary">{presentation.location || '—'}</td>
              <td className="py-2.5 px-3 text-secondary font-mono">{formatDate(presentation.presentedOn)}</td>
              <td className="py-2.5 px-3 text-secondary">{presentation.candidateStatus || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
