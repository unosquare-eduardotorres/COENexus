import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIpcQuery } from '../../../../shared/hooks/useIpcQuery';
import { benchBurnService } from '../../services/benchBurnService';
import { ATSCandidate, BenchEmployee, ResumeSourceType, SyncedCandidateListItem } from '../../types';
import { createRendererLogger } from '../../../../shared/utils/rendererLogger';

const log = createRendererLogger('useTransformSearch');

export function useTransformSearch({ sourceType, onSelectionChange }: { sourceType: ResumeSourceType; onSelectionChange?: () => void }) {
  const [candidateSearch, setCandidateSearch] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [debouncedCandidateSearch, setDebouncedCandidateSearch] = useState('');
  const [debouncedEmployeeSearch, setDebouncedEmployeeSearch] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<ATSCandidate | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<BenchEmployee | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedCandidateSearch(candidateSearch.trim());
    }, 300);
    return () => clearTimeout(timeout);
  }, [candidateSearch]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedEmployeeSearch(employeeSearch.trim());
    }, 300);
    return () => clearTimeout(timeout);
  }, [employeeSearch]);

  const canQueryCandidates = debouncedCandidateSearch.length >= 3;
  const canQueryEmployees = debouncedEmployeeSearch.length >= 3;

  const {
    data: candidateResults,
    error: candidateSearchError,
    isLoading: loadingCandidatesQuery,
  } = useIpcQuery(
    ['transform-search', 'candidates', debouncedCandidateSearch],
    () => benchBurnService.searchCandidates(debouncedCandidateSearch),
    { enabled: canQueryCandidates },
  );

  const {
    data: employeeResults,
    error: employeeSearchError,
    isLoading: loadingEmployeesQuery,
  } = useIpcQuery(
    ['transform-search', 'employees', debouncedEmployeeSearch],
    () => benchBurnService.searchEmployees(debouncedEmployeeSearch),
    { enabled: canQueryEmployees },
  );

  useEffect(() => {
    if (candidateSearchError) {
      log.error('[TransformPage] Failed to search candidates', candidateSearchError);
    }
  }, [candidateSearchError]);

  useEffect(() => {
    if (employeeSearchError) {
      log.error('[TransformPage] Failed to search employees', employeeSearchError);
    }
  }, [employeeSearchError]);

  const liveCandidates = useMemo<SyncedCandidateListItem[]>(
    () => (canQueryCandidates ? (candidateResults ?? []) : []),
    [canQueryCandidates, candidateResults],
  );

  const liveEmployees = useMemo<BenchEmployee[]>(
    () => (canQueryEmployees ? (employeeResults ?? []) : []),
    [canQueryEmployees, employeeResults],
  );

  const loadingCandidates = canQueryCandidates && loadingCandidatesQuery;
  const loadingEmployees = canQueryEmployees && loadingEmployeesQuery;

  const filteredCandidates = useMemo(() => {
    return liveCandidates.map((c) => ({
      id: String(c.upstreamId),
      upstreamId: c.upstreamId,
      name: c.name,
      email: c.email,
      phone: '',
      skills: [c.mainSkill, c.seniority].filter(Boolean),
      positions: [],
      resumeUrl: '',
      hasResume: c.hasResume,
      isVectorized: c.isVectorized,
    }));
  }, [liveCandidates]);

  const filteredEmployees = useMemo(() => liveEmployees, [liveEmployees]);

  const canProceedFromStep2 = useMemo(() => {
    return (sourceType === 'upload' && selectedFiles.length > 0)
      || (sourceType === 'ats-candidates' && selectedCandidate !== null)
      || (sourceType === 'employees' && selectedEmployee !== null);
  }, [sourceType, selectedFiles.length, selectedCandidate, selectedEmployee]);

  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFiles(files);
    onSelectionChange?.();
  }, [onSelectionChange]);

  const handleCandidateSelect = useCallback((candidate: ATSCandidate) => {
    setSelectedCandidate(candidate);
    onSelectionChange?.();
  }, [onSelectionChange]);

  const handleEmployeeSelect = useCallback((employee: BenchEmployee) => {
    setSelectedEmployee(employee);
    onSelectionChange?.();
  }, [onSelectionChange]);

  return {
    selection: {
      selectedCandidate,
      setSelectedCandidate,
      selectedEmployee,
      setSelectedEmployee,
      selectedFiles,
      setSelectedFiles,
      candidateSearch,
      setCandidateSearch,
      employeeSearch,
      setEmployeeSearch,
      filteredCandidates,
      filteredEmployees,
      handleFilesSelected,
      handleCandidateSelect,
      handleEmployeeSelect,
      canProceedFromStep2,
    },
    search: {
      liveEmployees,
      liveCandidates,
      loadingEmployees,
      loadingCandidates,
    },
  };
}
