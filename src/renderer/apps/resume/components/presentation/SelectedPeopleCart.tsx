import type { SelectedPerson } from '../../types'

interface SelectedPeopleCartProps {
  selectedPeople: SelectedPerson[]
  onRemove: (upstreamId: number, sourceType: 'candidate' | 'employee') => void
}

export default function SelectedPeopleCart({ selectedPeople, onRemove }: SelectedPeopleCartProps) {
  if (selectedPeople.length === 0) {
    return (
      <div className="glass-panel-subtle p-4 text-center text-muted text-sm">
        No people selected yet. Select candidates or employees from the table above.
      </div>
    )
  }

  return (
    <div className="glass-panel-subtle p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-primary">
          Selected ({selectedPeople.length})
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {selectedPeople.map(person => (
          <div
            key={`${person.sourceType}:${person.upstreamId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border"
          >
            <span className={`inline-block w-2 h-2 rounded-full ${person.sourceType === 'candidate' ? 'bg-accent-500' : 'bg-emerald-500'}`} />
            <span className="text-primary font-medium">{person.fullName}</span>
            <span className="text-muted text-xs">({person.mainSkill})</span>
            <button
              onClick={() => onRemove(person.upstreamId, person.sourceType)}
              className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
