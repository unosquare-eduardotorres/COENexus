import FileUpload from '../FileUpload';
import { useTransformContext } from '../../contexts/TransformContext';

export default function SelectResumeStep() {
  const {
    intent: { sourceType, setSourceType, processingMode },
    selection: {
      handleFilesSelected,
      employeeSearch,
      setEmployeeSearch,
      handleEmployeeSelect,
      selectedEmployee,
      setSelectedEmployee,
      candidateSearch,
      setCandidateSearch,
      handleCandidateSelect,
      selectedCandidate,
      setSelectedCandidate,
      canProceedFromStep2,
    },
    wizard: { handleBack, handleNext },
    search: { loadingEmployees, loadingCandidates, liveEmployees, liveCandidates },
  } = useTransformContext();

  return (
    <div className="glass-card overflow-hidden mb-6">
      <div className="flex border-b border-gray-200/50 dark:border-dark-border/50">
        <button
          onClick={() => setSourceType('upload')}
          className={`flex-1 px-6 py-3.5 text-sm font-medium transition-all relative ${
            sourceType === 'upload'
              ? 'text-accent-600 dark:text-accent-400 bg-accent-50/50 dark:bg-accent-500/10'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-hover/50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Manual Upload
          </div>
          {sourceType === 'upload' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-500" />}
        </button>

        <button
          onClick={() => setSourceType('employees')}
          className={`flex-1 px-6 py-3.5 text-sm font-medium transition-all relative ${
            sourceType === 'employees'
              ? 'text-accent-600 dark:text-accent-400 bg-accent-50/50 dark:bg-accent-500/10'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-hover/50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Employees
          </div>
          {sourceType === 'employees' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-500" />}
        </button>

        <button
          onClick={() => setSourceType('ats-candidates')}
          className={`flex-1 px-6 py-3.5 text-sm font-medium transition-all relative ${
            sourceType === 'ats-candidates'
              ? 'text-accent-600 dark:text-accent-400 bg-accent-50/50 dark:bg-accent-500/10'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-hover/50'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            ATS / Candidates
          </div>
          {sourceType === 'ats-candidates' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-500" />}
        </button>
      </div>

      <div className="p-6">
        {sourceType === 'upload' && (
          <FileUpload
            onFilesSelected={handleFilesSelected}
            acceptedFormats={['.pdf', '.docx', '.doc', '.txt']}
            multiple={processingMode !== 'single'}
            maxFiles={processingMode === 'single' ? 1 : 20}
            maxSizeMB={10}
          />
        )}

        {sourceType === 'employees' && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Select Employee</label>
              <div className="relative mb-3">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search employees by name, email, skill, or country..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="glass-input w-full pl-10 pr-4 py-2.5 text-sm"
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 rounded-xl border border-gray-200/50 dark:border-dark-border/50 p-2">
                {loadingEmployees ? (
                  <p className="text-sm text-muted text-center py-4">Loading employees...</p>
                ) : liveEmployees.length === 0 ? (
                  <p className="text-sm text-muted text-center py-4">{employeeSearch.trim().length < 3 ? 'Type at least 3 characters to search employees' : 'No employees found'}</p>
                ) : (
                  liveEmployees.map((employee) => (
                    <button
                      key={employee.upstreamId}
                      onClick={() => handleEmployeeSelect(employee)}
                      disabled={!employee.isVectorized}
                      className={`w-full text-left p-3 rounded-lg transition-all ${!employee.isVectorized ? 'opacity-50 cursor-not-allowed' : ''} ${
                        selectedEmployee?.upstreamId === employee.upstreamId
                          ? 'bg-accent-50 dark:bg-accent-500/15 border-2 border-accent-500'
                          : 'bg-white/50 dark:bg-dark-hover/30 border-2 border-transparent hover:bg-white/80 dark:hover:bg-dark-hover/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent-500/10 flex items-center justify-center text-accent-600 dark:text-accent-400 font-semibold text-sm">
                          {employee.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-primary truncate" title={employee.name}>{employee.name}</h4>
                          <p className="text-xs text-muted truncate" title={employee.email}>{employee.email}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {employee.mainSkill && (
                              <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 dark:bg-dark-hover text-gray-700 dark:text-gray-300 rounded">
                                {employee.mainSkill}
                              </span>
                            )}
                            {employee.seniority && (
                              <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 dark:bg-dark-hover text-gray-700 dark:text-gray-300 rounded">
                                {employee.seniority}
                              </span>
                            )}
                            {employee.country && (
                              <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 dark:bg-dark-hover text-gray-700 dark:text-gray-300 rounded">
                                {employee.country}
                              </span>
                            )}
                            {employee.isVectorized && (
                              <span className="px-1.5 py-0.5 text-xs font-medium bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded">
                                Vectorized
                              </span>
                            )}
                            {!employee.isVectorized && (
                              <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 rounded">
                                Not Vectorized
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {selectedEmployee && (
              <div className="p-4 bg-accent-50/50 dark:bg-accent-500/10 rounded-xl border border-accent-200/50 dark:border-accent-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-accent-500/15 flex items-center justify-center text-accent-600 dark:text-accent-400 font-semibold">
                    {selectedEmployee.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-primary">{selectedEmployee.name}</h4>
                    <p className="text-xs text-muted">
                      {selectedEmployee.email} {selectedEmployee.mainSkill && `• ${selectedEmployee.mainSkill}`} {selectedEmployee.country && `• ${selectedEmployee.country}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedEmployee(null)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {sourceType === 'ats-candidates' && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Select Candidate</label>
              <div className="relative mb-3">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search candidates by name or email..."
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  className="glass-input w-full pl-10 pr-4 py-2.5 text-sm"
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 rounded-xl border border-gray-200/50 dark:border-dark-border/50 p-2">
                {loadingCandidates ? (
                  <p className="text-sm text-muted text-center py-4">Loading candidates...</p>
                ) : liveCandidates.length === 0 ? (
                  <p className="text-sm text-muted text-center py-4">{candidateSearch.trim().length < 3 ? 'Type at least 3 characters to search candidates' : 'No candidates found'}</p>
                ) : (
                  liveCandidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      onClick={() => handleCandidateSelect(candidate)}
                      disabled={!candidate.isVectorized}
                      className={`w-full text-left p-3 rounded-lg transition-all ${!candidate.isVectorized ? 'opacity-50 cursor-not-allowed' : ''} ${
                        selectedCandidate?.id === candidate.id
                          ? 'bg-accent-50 dark:bg-accent-500/15 border-2 border-accent-500'
                          : 'bg-white/50 dark:bg-dark-hover/30 border-2 border-transparent hover:bg-white/80 dark:hover:bg-dark-hover/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent-500/10 flex items-center justify-center text-accent-600 dark:text-accent-400 font-semibold text-sm">
                          {candidate.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-primary truncate" title={candidate.name}>{candidate.name}</h4>
                          <p className="text-xs text-muted truncate" title={candidate.email}>{candidate.email}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {candidate.skills.map((skill) => (
                              <span key={skill} className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 dark:bg-dark-hover text-gray-700 dark:text-gray-300 rounded">
                                {skill}
                              </span>
                            ))}
                            {!candidate.isVectorized && (
                              <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-400 rounded">
                                Not Vectorized
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-muted">
                          {candidate.positions.length} position{candidate.positions.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {selectedCandidate && (
              <div className="p-4 bg-accent-50/50 dark:bg-accent-500/10 rounded-xl border border-accent-200/50 dark:border-accent-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-accent-500/15 flex items-center justify-center text-accent-600 dark:text-accent-400 font-semibold">
                    {selectedCandidate.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-primary">{selectedCandidate.name}</h4>
                    <p className="text-xs text-muted">
                      {selectedCandidate.email} • {selectedCandidate.phone}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedCandidate(null)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-6 pb-6 flex justify-between">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-xl hover:bg-white/80 dark:hover:bg-dark-hover transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!canProceedFromStep2}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent-500 text-white text-sm font-medium rounded-xl hover:bg-accent-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
