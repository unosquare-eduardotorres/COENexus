import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
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
    hasResume: e.hasResume ?? false,
    resumeNoteId: null,
    resumeFilename: null,
    isBench: e.isBench,
  }
}

export default function PeopleSelector({ selectedPeople, onSelectionChange }: PeopleSelectorProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('candidates')
  const [candidateResults, setCandidateResults] = useState<SyncedCandidateListItem[]>([])
  const [employeeResults, setEmployeeResults] = useState<BenchEmployee[]>([])
  const [candidateCount, setCandidateCount] = useState<number | null>(null)
  const [employeeCount, setEmployeeCount] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    Promise.all([
      benchBurnService.getCandidateCount(),
      benchBurnService.getEmployeeCount(),
    ]).then(([cc, ec]) => {
      setCandidateCount(cc)
      setEmployeeCount(ec)
    })
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (searchQuery.length < 3) {
      setCandidateResults([])
      setEmployeeResults([])
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        if (activeTab === 'candidates') {
          const results = await benchBurnService.searchCandidates(searchQuery)
          setCandidateResults(results)
        } else {
          const results = await benchBurnService.searchEmployees(searchQuery)
          setEmployeeResults(results)
        }
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery, activeTab])

  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab)
    setCandidateResults([])
    setEmployeeResults([])
    if (searchQuery.length >= 3) {
      setLoading(true)
      const search = tab === 'candidates'
        ? benchBurnService.searchCandidates(searchQuery).then(setCandidateResults)
        : benchBurnService.searchEmployees(searchQuery).then(setEmployeeResults)
      search.finally(() => setLoading(false))
    }
  }, [searchQuery])

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

  const candidateLabel = candidateCount !== null ? `Candidates (${candidateCount.toLocaleString()})` : 'Candidates'
  const employeeLabel = employeeCount !== null ? `Employees (${employeeCount.toLocaleString()})` : 'Employees'

  const showEmptyPrompt = searchQuery.length < 3
  const currentResults = activeTab === 'candidates' ? candidateResults : employeeResults
  const totalCount = activeTab === 'candidates' ? candidateCount : employeeCount

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-gray-200 dark:border-dark-border">
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'candidates' ? 'border-b-2 border-accent-500 text-accent-600 dark:text-accent-400' : 'text-muted hover:text-primary'}`}
          onClick={() => handleTabChange('candidates')}
        >
          {candidateLabel}
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'employees' ? 'border-b-2 border-accent-500 text-accent-600 dark:text-accent-400' : 'text-muted hover:text-primary'}`}
          onClick={() => handleTabChange('employees')}
        >
          {employeeLabel}
        </button>
      </div>

      <input
        type="text"
        placeholder="Search by name, skill, or country (min 3 characters)..."
        className="glass-input w-full"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
      />

      {showEmptyPrompt ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted">
          <svg className="w-10 h-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <p className="text-sm">Type at least 3 characters to search…</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {currentResults.length > 0 && totalCount !== null && (
            <p className="text-xs text-muted">
              Showing {currentResults.length.toLocaleString()} of {totalCount.toLocaleString()} {activeTab}
            </p>
          )}
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
                {activeTab === 'candidates' && candidateResults.map(c => (
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
                {activeTab === 'employees' && employeeResults.map(e => (
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
                      {e.hasResume ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Has Resume</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-dark-muted dark:text-gray-400">No Resume</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {currentResults.length === 0 && (
              <div className="text-center text-muted py-6 text-sm">No results found for "{searchQuery}"</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
