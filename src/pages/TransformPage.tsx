import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '../components/FileUpload';
import { aiService } from '../services/aiService';
import { StructuredResume, ATSCandidate, ATSPosition, TransformSource, TechSkill, AVAILABLE_SKILLS, PresentedCandidate } from '../types';
import { mockATSCandidates } from '../data/mockATSCandidates';

function PositionDetailsModal({
  position,
  onClose,
}: {
  position: ATSPosition;
  onClose: () => void;
}) {
  const getStatusColor = (status: PresentedCandidate['status']) => {
    switch (status) {
      case 'accepted':
        return 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400';
      case 'rejected':
        return 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400';
      case 'reviewing':
        return 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400';
      default:
        return 'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200/50 dark:border-dark-border/50">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-primary">{position.title}</h2>
              <p className="text-sm text-muted mt-0.5">{position.accountName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Position ID</label>
              <p className="text-sm text-primary font-mono">{position.id}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Status</label>
              <span
                className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                  position.status === 'interviewing'
                    ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                    : position.status === 'active'
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                    : 'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400'
                }`}
              >
                {position.status.charAt(0).toUpperCase() + position.status.slice(1)}
              </span>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Account Name</label>
              <p className="text-sm text-primary">{position.accountName}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Stakeholder</label>
              <p className="text-sm text-primary">{position.stakeholder}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Vertical</label>
              <p className="text-sm text-primary">{position.vertical}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Rate Range</label>
              <p className="text-sm text-primary">${position.minRate}/hr - ${position.maxRate}/hr</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-2">Seniorities</label>
            <div className="flex flex-wrap gap-1.5">
              {position.seniorities.map((seniority) => (
                <span
                  key={seniority}
                  className="px-2 py-1 text-xs font-medium bg-accent-100 dark:bg-accent-500/20 text-accent-700 dark:text-accent-400 rounded-lg"
                >
                  {seniority}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-2">Required Skills</label>
            <div className="flex flex-wrap gap-1.5">
              {position.requiredSkills.map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-dark-hover text-gray-600 dark:text-gray-400 rounded-lg"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-3">
              Candidates Presented ({position.candidatesPresented.length})
            </label>
            {position.candidatesPresented.length === 0 ? (
              <p className="text-sm text-muted italic">No candidates presented yet</p>
            ) : (
              <div className="space-y-2">
                {position.candidatesPresented.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="flex items-center justify-between p-3 bg-white/50 dark:bg-dark-hover/30 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent-500/10 flex items-center justify-center text-accent-600 dark:text-accent-400 font-semibold text-xs">
                        {candidate.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-primary">{candidate.name}</p>
                        <p className="text-xs text-muted">
                          Presented {new Date(candidate.presentedDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-primary">${candidate.rate}/hr</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(candidate.status)}`}>
                        {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200/50 dark:border-dark-border/50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-dark-hover rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TransformPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TransformSource>('ats');
  const [selectedCandidate, setSelectedCandidate] = useState<ATSCandidate | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<TechSkill[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<ATSPosition | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformProgress, setTransformProgress] = useState<{
    current: number;
    total: number;
    currentFile: string;
  } | null>(null);
  const [transformedResumes, setTransformedResumes] = useState<StructuredResume[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [modalPosition, setModalPosition] = useState<ATSPosition | null>(null);

  const filteredCandidates = mockATSCandidates.filter(
    (candidate) =>
      candidate.name.toLowerCase().includes(candidateSearch.toLowerCase()) ||
      candidate.email?.toLowerCase().includes(candidateSearch.toLowerCase())
  );

  const filteredPositions = useMemo(() => {
    if (!selectedCandidate) return [];
    if (selectedSkills.length === 0) return selectedCandidate.positions;
    return selectedCandidate.positions.filter((position) =>
      position.requiredSkills.some((skill) => selectedSkills.includes(skill))
    );
  }, [selectedCandidate, selectedSkills]);

  const isCandidateAlreadyPresented = useCallback(
    (position: ATSPosition) => {
      if (!selectedCandidate) return false;
      return position.candidatesPresented.some(
        (presented) => presented.name.toLowerCase() === selectedCandidate.name.toLowerCase()
      );
    },
    [selectedCandidate]
  );

  const handleFilesSelected = useCallback((files: File[]) => {
    setSelectedFiles(files);
    setError(null);
    setTransformedResumes([]);
  }, []);

  const handleCandidateSelect = useCallback((candidate: ATSCandidate) => {
    setSelectedCandidate(candidate);
    setSelectedSkills([]);
    setSelectedPosition(null);
    setError(null);
    setTransformedResumes([]);
  }, []);

  const handleSkillToggle = useCallback((skill: TechSkill) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
    setSelectedPosition(null);
  }, []);

  const handlePositionSelect = useCallback((position: ATSPosition) => {
    setSelectedPosition(position);
  }, []);

  const handleTransform = useCallback(async () => {
    if (activeTab === 'ats' && !selectedCandidate) return;
    if (activeTab === 'upload' && selectedFiles.length === 0) return;

    setIsTransforming(true);
    setError(null);
    setTransformedResumes([]);

    const results: StructuredResume[] = [];

    if (activeTab === 'ats' && selectedCandidate) {
      setTransformProgress({
        current: 1,
        total: 1,
        currentFile: `${selectedCandidate.name}'s resume`,
      });

      try {
        const mockContent = `Resume for ${selectedCandidate.name}\nEmail: ${selectedCandidate.email}\nPhone: ${selectedCandidate.phone}`;
        const resume = await aiService.transformResume(
          mockContent,
          `${selectedCandidate.name.replace(/\s+/g, '_')}_resume.pdf`
        );

        if (selectedPosition) {
          resume.summary = `${resume.summary} Targeting position: ${selectedPosition.title}`;
        }

        results.push(resume);
      } catch (err) {
        console.error(`Error transforming resume:`, err);
        setError('Failed to transform resume. Please try again.');
      }
    } else {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setTransformProgress({
          current: i + 1,
          total: selectedFiles.length,
          currentFile: file.name,
        });

        try {
          const content = await readFileContent(file);
          const resume = await aiService.transformResume(content, file.name);
          results.push(resume);
        } catch (err) {
          console.error(`Error transforming ${file.name}:`, err);
        }
      }
    }

    setTransformedResumes(results);
    setTransformProgress(null);
    setIsTransforming(false);
  }, [activeTab, selectedCandidate, selectedPosition, selectedFiles]);

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          resolve('');
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleReviewResumes = useCallback(() => {
    navigate('/review');
  }, [navigate]);

  const handleDownload = useCallback((resume: StructuredResume) => {
    const content = JSON.stringify(resume, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${resume.candidateName.replace(/\s+/g, '_')}_transformed.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const handlePresentToPosition = useCallback((resume: StructuredResume) => {
    if (selectedPosition && isCandidateAlreadyPresented(selectedPosition)) {
      alert('This candidate was already presented for this position.');
      return;
    }
    alert(`Resume for ${resume.candidateName} would be presented to ${selectedPosition?.title || 'the position'}. (Demo feature)`);
  }, [selectedPosition, isCandidateAlreadyPresented]);

  const handleSyncToATS = useCallback((resume: StructuredResume) => {
    alert(`Resume for ${resume.candidateName} would be synced/uploaded to the ATS. (Demo feature)`);
  }, []);

  const handleReset = useCallback(() => {
    setSelectedFiles([]);
    setSelectedCandidate(null);
    setSelectedSkills([]);
    setSelectedPosition(null);
    setTransformedResumes([]);
    setError(null);
    setCandidateSearch('');
  }, []);

  const canTransform =
    (activeTab === 'ats' && selectedCandidate) ||
    (activeTab === 'upload' && selectedFiles.length > 0);

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-primary tracking-tight">
            Transform Resumes
          </h1>
          <p className="text-sm text-muted mt-1 max-w-xl">
            Select a candidate from your ATS or upload resumes manually. AI will transform them into your standardized format.
          </p>
        </div>

        <div className="glass-card overflow-hidden mb-6">
          <div className="flex border-b border-gray-200/50 dark:border-dark-border/50">
            <button
              onClick={() => setActiveTab('ats')}
              className={`flex-1 px-6 py-3.5 text-sm font-medium transition-all relative ${
                activeTab === 'ats'
                  ? 'text-accent-600 dark:text-accent-400 bg-accent-50/50 dark:bg-accent-500/10'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-hover/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                ATS Selection
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-accent-100 dark:bg-accent-500/20 text-accent-600 dark:text-accent-400 rounded">
                  Default
                </span>
              </div>
              {activeTab === 'ats' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-500" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 px-6 py-3.5 text-sm font-medium transition-all relative ${
                activeTab === 'upload'
                  ? 'text-accent-600 dark:text-accent-400 bg-accent-50/50 dark:bg-accent-500/10'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-hover/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                Manual Upload
              </div>
              {activeTab === 'upload' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-500" />
              )}
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'ats' ? (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    Select Candidate
                  </label>
                  <div className="relative mb-3">
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
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
                    {filteredCandidates.length === 0 ? (
                      <p className="text-sm text-muted text-center py-4">
                        No candidates found
                      </p>
                    ) : (
                      filteredCandidates.map((candidate) => (
                        <button
                          key={candidate.id}
                          onClick={() => handleCandidateSelect(candidate)}
                          className={`w-full text-left p-3 rounded-lg transition-all ${
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
                              <h4 className="text-sm font-medium text-primary truncate">
                                {candidate.name}
                              </h4>
                              <p className="text-xs text-muted truncate">
                                {candidate.email}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {candidate.skills.map((skill) => (
                                  <span
                                    key={skill}
                                    className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-dark-hover text-gray-600 dark:text-gray-400 rounded"
                                  >
                                    {skill}
                                  </span>
                                ))}
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
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      Filter by Skills
                    </label>
                    <p className="text-xs text-muted mb-3">
                      Select one or more skills to filter available positions
                    </p>
                    <div className="flex flex-wrap gap-2 mb-5">
                      {AVAILABLE_SKILLS.map((skill) => {
                        const isSelected = selectedSkills.includes(skill);
                        const candidateHasSkill = selectedCandidate.skills.includes(skill);
                        return (
                          <button
                            key={skill}
                            onClick={() => handleSkillToggle(skill)}
                            disabled={!candidateHasSkill}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                              isSelected
                                ? 'bg-accent-500 text-white'
                                : candidateHasSkill
                                ? 'bg-white/60 dark:bg-dark-hover/50 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-dark-border hover:bg-accent-50 dark:hover:bg-accent-500/10 hover:border-accent-300 dark:hover:border-accent-500/30'
                                : 'bg-gray-50 dark:bg-dark-hover/20 text-gray-300 dark:text-gray-600 border border-gray-100 dark:border-dark-border/50 cursor-not-allowed'
                            }`}
                          >
                            {skill}
                            {candidateHasSkill && (
                              <span className="ml-1.5 text-[10px] opacity-60">
                                {isSelected ? '✓' : ''}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <label className="block text-sm font-medium text-primary mb-2">
                      Target Position{' '}
                      <span className="text-muted font-normal">(optional)</span>
                      {selectedSkills.length > 0 && (
                        <span className="ml-2 text-xs text-accent-600 dark:text-accent-400">
                          Filtered by: {selectedSkills.join(', ')}
                        </span>
                      )}
                    </label>
                    <p className="text-xs text-muted mb-3">
                      Select a position to highlight relevant strengths in the resume
                    </p>

                    {filteredPositions.length === 0 ? (
                      <div className="p-4 text-center bg-gray-50 dark:bg-dark-hover/30 rounded-xl">
                        <p className="text-sm text-muted">
                          No positions match the selected skills
                        </p>
                        <button
                          onClick={() => setSelectedSkills([])}
                          className="mt-2 text-xs text-accent-600 dark:text-accent-400 hover:underline"
                        >
                          Clear skill filters
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredPositions.map((position) => {
                          const alreadyPresented = isCandidateAlreadyPresented(position);
                          return (
                            <div key={position.id} className="relative">
                              {alreadyPresented && (
                                <div className="absolute -top-2 right-2 z-10 px-2 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-semibold rounded-full border border-amber-200 dark:border-amber-500/30">
                                  Already Presented
                                </div>
                              )}
                              <button
                                onClick={() => handlePositionSelect(position)}
                                className={`w-full text-left p-3 rounded-lg transition-all ${
                                  selectedPosition?.id === position.id
                                    ? 'bg-accent-50 dark:bg-accent-500/15 border-2 border-accent-500'
                                    : alreadyPresented
                                    ? 'bg-amber-50/50 dark:bg-amber-500/5 border-2 border-amber-200 dark:border-amber-500/20'
                                    : 'bg-white/50 dark:bg-dark-hover/30 border-2 border-transparent hover:bg-white/80 dark:hover:bg-dark-hover/50'
                                }`}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-sm font-medium text-primary">
                                        {position.title}
                                      </h4>
                                      <span className="text-[10px] font-mono text-muted">
                                        {position.id}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted mt-0.5">
                                      {position.accountName} • {position.stakeholder}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                        position.status === 'interviewing'
                                          ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                          : position.status === 'active'
                                          ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                                          : 'bg-gray-100 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400'
                                      }`}
                                    >
                                      {position.status.charAt(0).toUpperCase() + position.status.slice(1)}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setModalPosition(position);
                                      }}
                                      className="p-1 text-gray-400 hover:text-accent-600 dark:hover:text-accent-400 rounded transition-colors"
                                      title="View details"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="flex flex-wrap gap-1">
                                    {position.seniorities.map((seniority) => (
                                      <span
                                        key={seniority}
                                        className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 rounded"
                                      >
                                        {seniority}
                                      </span>
                                    ))}
                                  </div>
                                  <span className="text-[10px] text-muted">
                                    ${position.minRate}-${position.maxRate}/hr
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {position.requiredSkills.map((skill) => (
                                    <span
                                      key={skill}
                                      className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                                        selectedSkills.includes(skill)
                                          ? 'bg-accent-100 dark:bg-accent-500/20 text-accent-700 dark:text-accent-400'
                                          : 'bg-gray-100 dark:bg-dark-hover text-gray-500 dark:text-gray-400'
                                      }`}
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

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
                        <h4 className="text-sm font-semibold text-primary">
                          {selectedCandidate.name}
                        </h4>
                        <p className="text-xs text-muted">
                          {selectedCandidate.email} • {selectedCandidate.phone}
                        </p>
                        {selectedSkills.length > 0 && (
                          <p className="text-xs text-accent-600 dark:text-accent-400 mt-1">
                            Skills: {selectedSkills.join(', ')}
                          </p>
                        )}
                        {selectedPosition && (
                          <p className="text-xs text-accent-600 dark:text-accent-400 mt-0.5">
                            Targeting: {selectedPosition.title}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedCandidate(null);
                          setSelectedSkills([]);
                          setSelectedPosition(null);
                        }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <FileUpload
                onFilesSelected={handleFilesSelected}
                acceptedFormats={['.pdf', '.docx', '.doc', '.txt']}
                multiple={true}
                maxFiles={20}
                maxSizeMB={10}
              />
            )}

            {canTransform && !isTransforming && transformedResumes.length === 0 && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleTransform}
                  className="flex items-center gap-2 px-6 py-2.5 bg-accent-500 text-white rounded-xl text-sm font-medium hover:bg-accent-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  {activeTab === 'ats'
                    ? `Transform ${selectedCandidate?.name}'s Resume`
                    : `Transform ${selectedFiles.length} Resume${selectedFiles.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            )}
          </div>
        </div>

        {isTransforming && transformProgress && (
          <div className="glass-card p-8">
            <div className="text-center">
              <div className="relative w-16 h-16 mx-auto mb-6">
                <svg
                  className="w-16 h-16 animate-spin text-accent-500"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-semibold text-accent-600 dark:text-accent-400">
                    {transformProgress.current}/{transformProgress.total}
                  </span>
                </div>
              </div>

              <h3 className="text-base font-semibold text-primary mb-1">
                Transforming...
              </h3>
              <p className="text-sm text-muted mb-4">
                {transformProgress.currentFile}
              </p>

              <div className="w-full h-1.5 bg-gray-100 dark:bg-dark-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-500 transition-all duration-500"
                  style={{
                    width: `${(transformProgress.current / transformProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="glass-card bg-red-50/50 dark:bg-red-900/10 border-red-200/50 dark:border-red-800/30 p-4 mb-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        {transformedResumes.length > 0 && (
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-primary">
                  Transformation Complete
                </h3>
                <p className="text-xs text-muted">
                  {transformedResumes.length} resume{transformedResumes.length !== 1 ? 's' : ''} processed
                </p>
              </div>
            </div>

            {selectedPosition && isCandidateAlreadyPresented(selectedPosition) && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium">
                    This candidate was already presented for "{selectedPosition.title}"
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3 mb-5">
              {transformedResumes.map((resume) => {
                const canPresent = !selectedPosition || !isCandidateAlreadyPresented(selectedPosition);
                return (
                  <div
                    key={resume.id}
                    className="p-4 bg-white/50 dark:bg-dark-hover/30 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent-500/10 flex items-center justify-center text-accent-600 dark:text-accent-400 font-semibold text-sm">
                          {resume.candidateName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)}
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-primary">{resume.candidateName}</h4>
                          <p className="text-xs text-muted">{resume.originalFileName}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full">
                        Ready
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate('/review')}
                        className="flex-1 px-3 py-2 text-xs font-medium text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-500/10 rounded-lg hover:bg-accent-100 dark:hover:bg-accent-500/20 transition-colors"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Preview
                        </div>
                      </button>
                      <button
                        onClick={() => handleDownload(resume)}
                        className="flex-1 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-dark-hover rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border transition-colors"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </div>
                      </button>
                      <button
                        onClick={() => handleSyncToATS(resume)}
                        className="flex-1 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-dark-hover rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border transition-colors"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Sync to ATS
                        </div>
                      </button>
                      <button
                        onClick={() => handlePresentToPosition(resume)}
                        disabled={!canPresent}
                        className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                          canPresent
                            ? 'text-white bg-accent-500 hover:bg-accent-600'
                            : 'text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-dark-border cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Present to Position
                        </div>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm text-secondary bg-white/50 dark:bg-dark-hover/50 rounded-xl font-medium hover:bg-white/80 dark:hover:bg-dark-hover transition-colors"
              >
                Transform More
              </button>
              <button
                onClick={handleReviewResumes}
                className="px-4 py-2 bg-accent-500 text-white text-sm rounded-xl font-medium hover:bg-accent-600 transition-colors"
              >
                Review All Resumes
              </button>
            </div>
          </div>
        )}

        <div className="mt-12">
          <h2 className="text-sm font-semibold text-primary mb-5 text-center">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                step: '1',
                title: 'Select or Upload',
                description: 'Choose from ATS or drop resumes manually',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                ),
              },
              {
                step: '2',
                title: 'Transform',
                description: 'AI extracts and maps to your template',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                ),
              },
              {
                step: '3',
                title: 'Preview & Share',
                description: 'Review, download, or send to team',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ),
              },
            ].map((item) => (
              <div
                key={item.step}
                className="glass-card-hover p-5 text-center"
              >
                <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-600 dark:text-accent-400">
                  {item.icon}
                </div>
                <h3 className="text-sm font-semibold text-primary mb-1">{item.title}</h3>
                <p className="text-xs text-muted">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {modalPosition && (
        <PositionDetailsModal
          position={modalPosition}
          onClose={() => setModalPosition(null)}
        />
      )}
    </div>
  );
}
