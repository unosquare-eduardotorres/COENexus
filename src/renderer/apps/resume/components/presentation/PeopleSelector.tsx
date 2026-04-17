import { useState, useEffect, useCallback, useMemo } from 'react'
import type { SelectedPerson, BenchEmployee, SyncedCandidateListItem } from '../../types'
import { benchBurnService } from '../../services/benchBurnService'

interface PeopleSelectorProps {
  selectedPeople: SelectedPerson[]
  onSelectionChange: (people: SelectedPerson[]) => void
}

type TabKey = 'candidates' | 'employees'

function candidateToSelectedPerson(c: SyncedCandidateListItem): SelectedPerson {
  return {
    sourceType: 'candidate',
    upstreamId: c.upstreamId,
    fullName: c.name,
    mainSkill: c.mainSkill,
    seniority: c.seniority,
    country: c.country,
    hasResume: c.hasResume,
    resumeNoteId: null,
    resumeFilename: null,
    candidateStatus: c.candidateStatus,
  }
}

function employeeToSelectedPerson(e: BenchEmployee): SelectedPerson {
  return {
    sourceType: 'employee',
    upstreamId: e.upstreamId,
    fullName: e.name,
    mainSkill: e.mainSkill,
    seniority: e.seniority,
    country: e.country,
    hasResume: false,
    resumeNoteId: null,
    resumeFilename: null,
    isBench: e.isBench,
  }
}

export default function PeopleSelector({ selectedPeople, onSelectionChange }: PeopleSelectorProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('candidates')
  const [candidates, setCandidates] = useState<SyncedCandidateListItem[]>([])
  const [employees, setEmployees] = useState<BenchEmployee[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      benchBurnService.getAllCandidates(),
      benchBurnService.getAllEmployees(),
    ]).then(([c, e]) => {
      setCandidates(c)
      setEmployees(e)
    }).finally(() => setLoading(false))
  }, [])

  const selectedSet = useMemo(() => {
    const s = new Set<string>()
    selectedPeople.forEach(p => s.add(`${p.sourceType}:${p.upstreamId}`))
    return s
  }, [selectedPeople])

  const isSelected = useCallback((sourceType: string, upstreamId: number) => {
    return selectedSet.has(`${sourceType}:${upstreamId}`)
  }, [selectedSet])

  const togglePerson = useCallback((person: SelectedPerson) => {
    const key = `${person.sourceType}:${person.upstreamId}`
    if (selectedSet.has(key)) {
      onSelectionChange(selectedPeople.filter(p => `${p.sourceType}:${p.upstreamId}` !== key))
    } else {
      onSelectionChange([...selectedPeople, person])
    }
  }, [selectedPeople, selectedSet, onSelectionChange])

  const query = searchQuery.toLowerCase()

  const filteredCandidates = useMemo(() => {
    if (!query) return candidates
    return candidates.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.mainSkill.toLowerCase().includes(query) ||
      c.country.toLowerCase().includes(query)
    )
  }, [candidates, query])

  const filteredEmployees = useMemo(() => {
    if (!query) return employees
    return employees.filter(e =>
      e.name.toLowerCase().includes(query) ||
      e.mainSkill.toLowerCase().includes(query) ||
      e.country.toLowerCase().includes(query)
    )
  }, [employees, query])

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-gray-200 dark:border-dark-border">
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'candidates' ? 'border-b-2 border-accent-500 text-accent-600 dark:text-accent-400' : 'text-muted hover:text-primary'}`}
          onClick={() => setActiveTab('candidates')}
        >
          Candidates ({candidates.length})
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'employees' ? 'border-b-2 border-accent-500 text-accent-600 dark:text-accent-400' : 'text-muted hover:text-primary'}`}
          onClick={() => setActiveTab('employees')}
        >
          Employees ({employees.length})
        </button>
      </div>

      <input
        type="text"
        placeholder="Search by name, skill, or country..."
        className="glass-input w-full"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white dark:bg-dark-surface">
              <tr className="text-left text-muted">
                <th className="p-2 w-8"></th>
                <th className="p-2">Name</th>
                <th className="p-2">Seniority</th>
                <th className="p-2">Main Skill</th>
                <th className="p-2">Country</th>
                <th className="p-2">Resume</th>
              </tr>
            </thead>
            <tbody>
              {activeTab === 'candidates' && filteredCandidates.map(c => (
                <tr
                  key={`c-${c.upstreamId}`}
                  className="border-t border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-hover cursor-pointer"
                  onClick={() => togglePerson(candidateToSelectedPerson(c))}
                >
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={isSelected('candidate', c.upstreamId)}
                      onChange={() => togglePerson(candidateToSelectedPerson(c))}
                      className="rounded border-gray-300 dark:border-dark-border"
                    />
                  </td>
                  <td className="p-2 font-medium text-primary">{c.name}</td>
                  <td className="p-2 text-muted">{c.seniority}</td>
                  <td className="p-2 text-muted">{c.mainSkill}</td>
                  <td className="p-2 text-muted">{c.country}</td>
                  <td className="p-2">
                    {c.hasResume ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Has Resume</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-dark-muted dark:text-gray-400">No Resume</span>
                    )}
                  </td>
                </tr>
              ))}
              {activeTab === 'employees' && filteredEmployees.map(e => (
                <tr
                  key={`e-${e.upstreamId}`}
                  className="border-t border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-hover cursor-pointer"
                  onClick={() => togglePerson(employeeToSelectedPerson(e))}
                >
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={isSelected('employee', e.upstreamId)}
                      onChange={() => togglePerson(employeeToSelectedPerson(e))}
                      className="rounded border-gray-300 dark:border-dark-border"
                    />
                  </td>
                  <td className="p-2 font-medium text-primary">
                    {e.name}
                    {e.isBench && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Bench</span>
                    )}
                  </td>
                  <td className="p-2 text-muted">{e.seniority}</td>
                  <td className="p-2 text-muted">{e.mainSkill}</td>
                  <td className="p-2 text-muted">{e.country}</td>
                  <td className="p-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-dark-muted dark:text-gray-400">—</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
