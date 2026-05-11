import { useState, useEffect, useMemo, useCallback, useRef, ChangeEvent, DragEvent } from 'react'
import { BenchEmployee, SyncedCandidateListItem, MatchToPositionsPerson } from '../../types'
import { benchBurnService } from '../../services/benchBurnService'
import { fileExtractionService } from '../../services/fileExtractionService'
import SortableHeader, { useSort, sortData } from './SortableHeader'

type TabKey = 'candidates' | 'employees' | 'upload'

type EmpSortKey = 'upstreamId' | 'name' | 'seniority' | 'mainSkill' | 'country' | 'salary' | 'lastAccount'
type CandSortKey = 'upstreamId' | 'name' | 'seniority' | 'mainSkill' | 'country' | 'candidateStatus'

function empAccessor(emp: BenchEmployee, key: string): string | number | null {
  switch (key) {
    case 'upstreamId': return emp.upstreamId
    case 'name': return emp.name
    case 'seniority': return emp.seniority
    case 'mainSkill': return emp.mainSkill
    case 'country': return emp.country
    case 'salary': return emp.grossMonthlySalary
    case 'lastAccount': return emp.lastAccount
    default: return null
  }
}

function candAccessor(c: SyncedCandidateListItem, key: string): string | number | null {
  switch (key) {
    case 'upstreamId': return c.upstreamId
    case 'name': return c.name
    case 'seniority': return c.seniority
    case 'mainSkill': return c.mainSkill
    case 'country': return c.country
    case 'candidateStatus': return c.candidateStatus
    default: return null
  }
}

interface PersonSelectorProps {
  onNext: (person: MatchToPositionsPerson) => void
}

export default function PersonSelector({ onNext }: PersonSelectorProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('candidates')
  const [search, setSearch] = useState('')

  const [candidateResults, setCandidateResults] = useState<SyncedCandidateListItem[]>([])
  const [employeeResults, setEmployeeResults] = useState<BenchEmployee[]>([])
  const [candidateCount, setCandidateCount] = useState<number | null>(null)
  const [employeeCount, setEmployeeCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [selectedPerson, setSelectedPerson] = useState<MatchToPositionsPerson | null>(null)

  const [uploadStatus, setUploadStatus] = useState<'idle' | 'parsing' | 'parsed' | 'error'>('idle')
  const [uploadFileName, setUploadFileName] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const candSort = useSort<CandSortKey>('name')
  const empSort = useSort<EmpSortKey>('name')

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

    if (search.length < 3) {
      setCandidateResults([])
      setEmployeeResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        if (activeTab === 'candidates') {
          const results = await benchBurnService.searchCandidates(search)
          setCandidateResults(results)
        } else if (activeTab === 'employees') {
          const results = await benchBurnService.searchEmployees(search)
          setEmployeeResults(results)
        }
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search, activeTab])

  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab)
    setCandidateResults([])
    setEmployeeResults([])
    if (tab !== 'upload' && search.length >= 3) {
      setLoading(true)
      const searchFn = tab === 'candidates'
        ? benchBurnService.searchCandidates(search).then(setCandidateResults)
        : benchBurnService.searchEmployees(search).then(setEmployeeResults)
      searchFn.finally(() => setLoading(false))
    }
  }, [search])

  const sortedCandidates = useMemo(
    () => sortData(candidateResults, candSort.sortKey, candSort.sortDir, candAccessor),
    [candidateResults, candSort.sortKey, candSort.sortDir]
  )

  const sortedEmployees = useMemo(
    () => sortData(employeeResults, empSort.sortKey, empSort.sortDir, empAccessor),
    [employeeResults, empSort.sortKey, empSort.sortDir]
  )

  const handleSelectCandidate = useCallback((c: SyncedCandidateListItem) => {
    if (!c.isVectorized) return
    setSelectedPerson(prev =>
      prev?.upstreamId === c.upstreamId && prev?.sourceType === 'candidate'
        ? null
        : {
            sourceType: 'candidate',
            upstreamId: c.upstreamId,
            name: c.name,
            seniority: c.seniority,
            mainSkill: c.mainSkill,
            country: c.country,
            candidateStatus: c.candidateStatus,
          }
    )
  }, [])

  const handleSelectEmployee = useCallback((e: BenchEmployee) => {
    if (!e.isVectorized) return
    setSelectedPerson(prev =>
      prev?.upstreamId === e.upstreamId && prev?.sourceType === 'employee'
        ? null
        : {
            sourceType: 'employee',
            upstreamId: e.upstreamId,
            name: e.name,
            seniority: e.seniority,
            mainSkill: e.mainSkill,
            country: e.country,
            isBench: e.isBench,
          }
    )
  }, [])

  const handleFileUpload = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!['pdf', 'docx'].includes(ext)) {
      setUploadError('Only PDF and DOCX files are supported')
      return
    }
    setUploadStatus('parsing')
    setUploadFileName(file.name)
    setUploadError(null)
    try {
      const text = await fileExtractionService.extractText(file)
      if (!text || text.trim().length < 50) {
        setUploadError('Could not extract meaningful text from this file')
        setUploadStatus('error')
        return
      }
      setUploadStatus('parsed')
      setSelectedPerson({
        sourceType: 'external',
        upstreamId: 0,
        name: file.name.replace(/\.[^/.]+$/, ''),
        seniority: '',
        mainSkill: '',
        country: '',
        resumeText: text,
      })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to parse file')
      setUploadStatus('error')
    }
  }, [])

  const handleFileInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [handleFileUpload])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileUpload(file)
  }, [handleFileUpload])

  const canProceed = selectedPerson !== null && (selectedPerson.sourceType !== 'external' || !!selectedPerson.resumeText)

  const showEmptyPrompt = search.length < 3
  const totalCount = activeTab === 'candidates' ? candidateCount : employeeCount
  const tabLabel = activeTab === 'candidates' ? 'candidates' : 'employees'

  const candidateTabLabel = candidateCount !== null ? `Candidates (${candidateCount.toLocaleString()})` : 'Candidates'
  const employeeTabLabel = employeeCount !== null ? `Employees (${employeeCount.toLocaleString()})` : 'Employees'

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'candidates', label: candidateTabLabel },
    { key: 'employees', label: employeeTabLabel },
    { key: 'upload', label: 'Upload Resume' },
  ]

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-lg font-semibold text-primary">Select a Person to Match</h2>
        <p className="text-sm text-muted mt-1">Choose a candidate, employee, or upload a resume to find matching positions</p>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center gap-1 mb-4 border-b border-gray-200/30 dark:border-dark-border/30">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-muted hover:text-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab !== 'upload' && (
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl glass-input text-sm text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                placeholder="Search by name, skill, seniority, country (min 3 characters)..."
              />
            </div>
            {selectedPerson && activeTab !== 'upload' && (
              <button
                onClick={() => setSelectedPerson(null)}
                className="px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {activeTab === 'candidates' && (
          showEmptyPrompt ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted">
              <svg className="w-10 h-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <p className="text-sm">Type at least 3 characters to search…</p>
              {candidateCount !== null && (
                <p className="text-xs mt-1">{candidateCount.toLocaleString()} candidates available</p>
              )}
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {sortedCandidates.length > 0 && candidateCount !== null && (
                <p className="text-xs text-muted mb-2">
                  Showing {sortedCandidates.length.toLocaleString()} of {candidateCount.toLocaleString()} candidates
                </p>
              )}
              <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-sm z-10">
                    <tr className="border-b border-gray-200/30 dark:border-dark-border/30">
                      <th className="text-left py-2 px-2 text-xs font-medium text-muted w-8" />
                      <SortableHeader<CandSortKey> label="ID" sortKey="upstreamId" currentSortKey={candSort.sortKey} currentDirection={candSort.sortDir} onSort={candSort.handleSort} />
                      <SortableHeader<CandSortKey> label="Name" sortKey="name" currentSortKey={candSort.sortKey} currentDirection={candSort.sortDir} onSort={candSort.handleSort} />
                      <SortableHeader<CandSortKey> label="Seniority" sortKey="seniority" currentSortKey={candSort.sortKey} currentDirection={candSort.sortDir} onSort={candSort.handleSort} />
                      <SortableHeader<CandSortKey> label="Main Skill" sortKey="mainSkill" currentSortKey={candSort.sortKey} currentDirection={candSort.sortDir} onSort={candSort.handleSort} />
                      <SortableHeader<CandSortKey> label="Country" sortKey="country" currentSortKey={candSort.sortKey} currentDirection={candSort.sortDir} onSort={candSort.handleSort} />
                      <SortableHeader<CandSortKey> label="Status" sortKey="candidateStatus" currentSortKey={candSort.sortKey} currentDirection={candSort.sortDir} onSort={candSort.handleSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCandidates.map(c => {
                      const isSelected = selectedPerson?.upstreamId === c.upstreamId && selectedPerson?.sourceType === 'candidate'
                      const disabled = !c.isVectorized
                      return (
                        <tr
                          key={c.upstreamId}
                          onClick={() => handleSelectCandidate(c)}
                          className={`border-b border-gray-100/20 dark:border-dark-border/20 transition-colors ${
                            disabled ? 'opacity-40 cursor-not-allowed'
                              : isSelected ? 'bg-indigo-500/5 cursor-pointer'
                              : 'hover:bg-white/5 cursor-pointer'
                          }`}
                          title={disabled ? 'Not vectorized — run processing first' : undefined}
                        >
                          <td className="py-2 px-2">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 dark:border-gray-600'
                            }`}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </td>
                          <td className="py-2 px-2 font-mono text-xs text-muted">{c.upstreamId}</td>
                          <td className="py-2 px-2 font-medium text-primary">
                            {c.name}
                            {disabled && (
                              <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">Not vectorized</span>
                            )}
                            {!disabled && c.coeCertified && (
                              <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">COE</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-secondary">{c.seniority}</td>
                          <td className="py-2 px-2">
                            <span className="px-2 py-0.5 text-xs rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">{c.mainSkill}</span>
                          </td>
                          <td className="py-2 px-2 text-secondary">{c.country}</td>
                          <td className="py-2 px-2 text-muted text-xs">{c.candidateStatus}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {sortedCandidates.length === 0 && (
                  <p className="text-center text-sm text-muted py-6">No candidates match "{search}"</p>
                )}
              </div>
            </>
          )
        )}

        {activeTab === 'employees' && (
          showEmptyPrompt ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted">
              <svg className="w-10 h-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <p className="text-sm">Type at least 3 characters to search…</p>
              {employeeCount !== null && (
                <p className="text-xs mt-1">{employeeCount.toLocaleString()} employees available</p>
              )}
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {sortedEmployees.length > 0 && employeeCount !== null && (
                <p className="text-xs text-muted mb-2">
                  Showing {sortedEmployees.length.toLocaleString()} of {employeeCount.toLocaleString()} employees
                </p>
              )}
              <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-sm z-10">
                    <tr className="border-b border-gray-200/30 dark:border-dark-border/30">
                      <th className="text-left py-2 px-2 text-xs font-medium text-muted w-8" />
                      <SortableHeader<EmpSortKey> label="ID" sortKey="upstreamId" currentSortKey={empSort.sortKey} currentDirection={empSort.sortDir} onSort={empSort.handleSort} />
                      <SortableHeader<EmpSortKey> label="Name" sortKey="name" currentSortKey={empSort.sortKey} currentDirection={empSort.sortDir} onSort={empSort.handleSort} />
                      <SortableHeader<EmpSortKey> label="Seniority" sortKey="seniority" currentSortKey={empSort.sortKey} currentDirection={empSort.sortDir} onSort={empSort.handleSort} />
                      <SortableHeader<EmpSortKey> label="Main Skill" sortKey="mainSkill" currentSortKey={empSort.sortKey} currentDirection={empSort.sortDir} onSort={empSort.handleSort} />
                      <SortableHeader<EmpSortKey> label="Country" sortKey="country" currentSortKey={empSort.sortKey} currentDirection={empSort.sortDir} onSort={empSort.handleSort} />
                      <SortableHeader<EmpSortKey> label="Salary" sortKey="salary" currentSortKey={empSort.sortKey} currentDirection={empSort.sortDir} onSort={empSort.handleSort} align="right" />
                      <SortableHeader<EmpSortKey> label="Last Account" sortKey="lastAccount" currentSortKey={empSort.sortKey} currentDirection={empSort.sortDir} onSort={empSort.handleSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedEmployees.map(emp => {
                      const isSelected = selectedPerson?.upstreamId === emp.upstreamId && selectedPerson?.sourceType === 'employee'
                      const disabled = !emp.isVectorized
                      return (
                        <tr
                          key={emp.upstreamId}
                          onClick={() => handleSelectEmployee(emp)}
                          className={`border-b border-gray-100/20 dark:border-dark-border/20 transition-colors ${
                            disabled ? 'opacity-40 cursor-not-allowed'
                              : isSelected ? 'bg-indigo-500/5 cursor-pointer'
                              : 'hover:bg-white/5 cursor-pointer'
                          }`}
                          title={disabled ? 'Not vectorized — run processing first' : undefined}
                        >
                          <td className="py-2 px-2">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 dark:border-gray-600'
                            }`}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </td>
                          <td className="py-2 px-2 font-mono text-xs text-muted">{emp.upstreamId}</td>
                          <td className="py-2 px-2 font-medium text-primary">
                            {emp.name}
                            {disabled && (
                              <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">Not vectorized</span>
                            )}
                            {!disabled && emp.isBench && (
                              <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">Bench</span>
                            )}
                            {!disabled && emp.isBench === false && (
                              <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Active</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-secondary">{emp.seniority}</td>
                          <td className="py-2 px-2">
                            <span className="px-2 py-0.5 text-xs rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">{emp.mainSkill}</span>
                          </td>
                          <td className="py-2 px-2 text-secondary">{emp.country}</td>
                          <td className="py-2 px-2 text-right font-mono text-xs text-secondary">
                            {emp.grossMonthlySalary != null ? `${emp.salaryCurrency ?? ''} ${emp.grossMonthlySalary.toLocaleString()}` : '—'}
                          </td>
                          <td className="py-2 px-2 text-muted text-xs">{emp.lastAccount ?? '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {sortedEmployees.length === 0 && (
                  <p className="text-center text-sm text-muted py-6">No employees match "{search}"</p>
                )}
              </div>
            </>
          )
        )}

        {activeTab === 'upload' && (
          <div className="py-4">
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-gray-300 dark:border-dark-border rounded-2xl p-8 text-center hover:border-indigo-500/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileInputChange}
                className="hidden"
              />
              {uploadStatus === 'idle' && (
                <>
                  <svg className="w-12 h-12 text-muted mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242M12 12v9m-4-4l4-4 4 4" />
                  </svg>
                  <p className="text-sm font-medium text-primary">Drop a resume file here or click to browse</p>
                  <p className="text-xs text-muted mt-1">PDF or DOCX · Single file</p>
                </>
              )}
              {uploadStatus === 'parsing' && (
                <>
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm text-muted">Parsing {uploadFileName}...</p>
                </>
              )}
              {uploadStatus === 'parsed' && (
                <>
                  <svg className="w-12 h-12 text-emerald-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium text-primary">{uploadFileName}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Resume parsed successfully</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setUploadStatus('idle')
                      setUploadFileName('')
                      if (selectedPerson?.sourceType === 'external') setSelectedPerson(null)
                    }}
                    className="mt-2 text-xs text-red-500 hover:text-red-600 transition-colors"
                  >
                    Remove & upload different file
                  </button>
                </>
              )}
              {uploadStatus === 'error' && (
                <>
                  <svg className="w-12 h-12 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-sm text-red-500">{uploadError}</p>
                  <p className="text-xs text-muted mt-1">Click to try a different file</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between glass-card p-4">
        <div className="text-sm text-secondary">
          {selectedPerson ? (
            <span>
              Selected: <span className="font-semibold text-primary">{selectedPerson.name}</span>
              <span className="text-muted ml-2">
                ({selectedPerson.seniority || 'N/A'} · {selectedPerson.mainSkill || 'N/A'})
              </span>
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                selectedPerson.sourceType === 'candidate' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                  : selectedPerson.sourceType === 'employee' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
              }`}>
                {selectedPerson.sourceType === 'candidate' ? 'Candidate'
                  : selectedPerson.sourceType === 'employee' ? 'Employee'
                  : 'External Upload'}
              </span>
            </span>
          ) : (
            <span className="text-muted">No person selected</span>
          )}
        </div>
        <button
          onClick={() => selectedPerson && onNext(selectedPerson)}
          disabled={!canProceed}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue with {selectedPerson?.name ?? 'Person'}
        </button>
      </div>
    </div>
  )
}
