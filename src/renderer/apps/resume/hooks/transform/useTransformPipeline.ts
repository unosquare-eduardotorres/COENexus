import { useCallback, useMemo, useState } from 'react';
import { aiService } from '../../services/aiService';
import { benchBurnService } from '../../services/benchBurnService';
import { fileExtractionService } from '../../services/fileExtractionService';
import { templateFillService } from '../../services/templateFillService';
import {
  ATSCandidate,
  ATSPosition,
  BenchEmployee,
  RefinementMode,
  ResumeProcessingMetrics,
  ResumeSourceType,
  StructuredResume,
} from '../../types';
import { createRendererLogger } from '../../../../shared/utils/rendererLogger';

const log = createRendererLogger('useTransformPipeline');

const getResumeWarnings = (resume: StructuredResume): string[] => {
  const warnings: string[] = [];
  if (!resume.summary?.trim()) warnings.push('No profile summary found');
  if (!resume.experience[0]?.title?.trim()) warnings.push('No role found in work experience');
  if (resume.experience.some((e) => !e.company?.trim())) warnings.push('Missing company name in work experience');
  if (resume.experience.some((e) => !e.description?.trim())) warnings.push('Missing work experience description');
  if (resume.skills.flatMap((c) => c.skills).length === 0) warnings.push('No technical skills found');
  if (!resume.cloudSkills?.length && !resume.templateSkills?.some((s) => /azure|aws|gcp|cloud/i.test(s))) warnings.push('No AI cloud skills or tools found');
  if (resume.education.length === 0) warnings.push('No academic background found');
  if (resume.education.some((e) => !e.graduationDate?.trim() || e.graduationDate.toLowerCase() === 'unknown')) warnings.push('Missing graduation year in academic background');
  if (resume.certifications.some((c) => !c.date?.trim() || c.date.toLowerCase() === 'unknown')) warnings.push('Missing year in certifications');
  return warnings;
};

export function useTransformPipeline({
  sourceType,
  selectedCandidate,
  selectedEmployee,
  selectedPosition,
  selectedFiles,
  liveCandidates,
  refinementMode,
  jobDescriptionSource,
  customJobDescription,
  onDocxGenerated,
}: TransformPipelineDeps) {
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformProgress, setTransformProgress] = useState<{ current: number; total: number; currentFile: string } | null>(null);
  const [transformedResumes, setTransformedResumes] = useState<StructuredResume[]>([]);
  const [processingMetrics, setProcessingMetrics] = useState<ResumeProcessingMetrics[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [editedResumes, setEditedResumes] = useState<Map<string, StructuredResume>>(new Map());
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null);

  const [isEnhancing, setIsEnhancing] = useState(false);
  const [transformPhase, setTransformPhase] = useState<'extracting' | 'enhancing' | null>(null);
  const [enhancerMode, setEnhancerMode] = useState<RefinementMode>('professional-polish');
  const [originalResume, setOriginalResume] = useState<StructuredResume | null>(null);
  const [showEnhanceWarningModal, setShowEnhanceWarningModal] = useState(false);
  const [showReEnhanceConfirm, setShowReEnhanceConfirm] = useState(false);

  const activeResume = useMemo((): StructuredResume | null => {
    const targetId = activeResumeId || transformedResumes[0]?.id || null;
    if (!targetId) return null;
    return editedResumes.get(targetId) || transformedResumes.find((r) => r.id === targetId) || null;
  }, [activeResumeId, editedResumes, transformedResumes]);

  const resumeWarnings = useMemo(() => (activeResume ? getResumeWarnings(activeResume) : []), [activeResume]);

  const handleUpdateResume = useCallback(async (updatedResume: StructuredResume) => {
    setEditedResumes((prev) => {
      const next = new Map(prev);
      next.set(updatedResume.id, updatedResume);
      return next;
    });
    try {
      const docxBlob = await templateFillService.fillTemplate(updatedResume);
      onDocxGenerated?.(docxBlob);
    } catch (err) {
      log.error('[TransformPipeline] Failed to regenerate DOCX after resume update', err);
    }
  }, [onDocxGenerated]);

  const executeTransform = useCallback(async () => {
    if (sourceType === 'ats-candidates' && !selectedCandidate) return;
    if (sourceType === 'employees' && !selectedEmployee) return;
    if (sourceType === 'upload' && selectedFiles.length === 0) return;

    setIsTransforming(true);
    setError(null);
    setTransformedResumes([]);
    setEditedResumes(new Map());
    setActiveResumeId(null);
    onDocxGenerated?.(null);

    const results: StructuredResume[] = [];
    const allMetrics: ResumeProcessingMetrics[] = [];
    const preEnhancementSnapshots: StructuredResume[] = [];
    const jobDescription =
      refinementMode === 'job-tailoring'
        ? customJobDescription || undefined
        : undefined;

    if (sourceType === 'ats-candidates' && selectedCandidate) {
      const liveCandidate = liveCandidates.find((c) => c.upstreamId === selectedCandidate.upstreamId);
      if (liveCandidate && !liveCandidate.isVectorized) {
        setError(`${selectedCandidate.name}'s resume has not been vectorized yet. Please vectorize their resume from the Data Sync page first.`);
        setIsTransforming(false);
        return;
      }
      setTransformProgress({ current: 1, total: 1, currentFile: `${selectedCandidate.name}'s resume` });
      try {
        const resumeText = await benchBurnService.getResumeText('candidates', selectedCandidate.upstreamId!);
        const result = await aiService.transformResume(
          resumeText,
          `${selectedCandidate.name.replace(/\s+/g, '_')}_resume.pdf`,
          refinementMode,
          jobDescription,
          setTransformPhase,
        );
        allMetrics.push(result.metrics);
        preEnhancementSnapshots.push(result.preEnhancementResume);
        if (selectedPosition && refinementMode === 'job-tailoring') {
          result.resume.summary = `${result.resume.summary} Targeting position: ${selectedPosition.title}`;
        }
        results.push(result.resume);
      } catch (err) {
        log.error('[TransformPipeline] Failed to transform ATS candidate resume', err);
        setError('Resume text not available for this candidate. Ensure their resume has been synced and vectorized.');
      }
    } else if (sourceType === 'employees' && selectedEmployee) {
      if (!selectedEmployee.isVectorized) {
        setError(`${selectedEmployee.name}'s resume has not been vectorized yet. Please vectorize their resume from the Data Sync page first.`);
        setIsTransforming(false);
        return;
      }
      setTransformProgress({ current: 1, total: 1, currentFile: `${selectedEmployee.name}'s resume` });
      try {
        const resumeText = await benchBurnService.getResumeText('employees', selectedEmployee.upstreamId);
        const result = await aiService.transformResume(
          resumeText,
          `${selectedEmployee.name.replace(/\s+/g, '_')}_resume.pdf`,
          refinementMode,
          jobDescription,
          setTransformPhase,
        );
        allMetrics.push(result.metrics);
        preEnhancementSnapshots.push(result.preEnhancementResume);
        results.push(result.resume);
      } catch (err) {
        log.error('[TransformPipeline] Failed to transform employee resume', err);
        setError('Resume text not available for this employee. Ensure their resume has been synced and vectorized.');
      }
    } else {
      for (let i = 0; i < selectedFiles.length; i += 1) {
        const file = selectedFiles[i];
        setTransformProgress({ current: i + 1, total: selectedFiles.length, currentFile: file.name });
        try {
          const content = await fileExtractionService.extractText(file);
          const result = await aiService.transformResume(content, file.name, refinementMode, jobDescription, setTransformPhase);
          result.resume.originalFileBuffer = await file.arrayBuffer();
          result.resume.originalFileUrl = URL.createObjectURL(file);
          results.push(result.resume);
          allMetrics.push(result.metrics);
          preEnhancementSnapshots.push(result.preEnhancementResume);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          setError(`Failed to process ${file.name}: ${message}`);
        }
      }
    }

    setTransformedResumes(results);
    setProcessingMetrics(allMetrics);
    if (results.length > 0) {
      setOriginalResume(preEnhancementSnapshots[0] ?? structuredClone(results[0]));
      setActiveResumeId(results[0].id);
      try {
        const docxBlob = await templateFillService.fillTemplate(results[0]);
        onDocxGenerated?.(docxBlob);
      } catch (err) {
        log.error('[TransformPipeline] Failed to generate DOCX after transform', err);
      }
    }
    setTransformProgress(null);
    setTransformPhase(null);
    setIsTransforming(false);
  }, [
    sourceType,
    selectedCandidate,
    selectedEmployee,
    selectedPosition,
    selectedFiles,
    liveCandidates,
    refinementMode,
    jobDescriptionSource,
    customJobDescription,
    onDocxGenerated,
  ]);

  const handleEnhanceResume = useCallback(async () => {
    if (!activeResume) return;
    if (!originalResume) setOriginalResume(structuredClone(activeResume));
    setIsEnhancing(true);
    try {
      const { resume: enhanced, usage } = await aiService.enhanceFullResume(activeResume, enhancerMode);
      await handleUpdateResume(enhanced);
      if (usage) {
        setProcessingMetrics((prev) => {
          if (prev.length === 0) return prev;
          const updated = [...prev];
          const last = { ...updated[updated.length - 1] };
          last.totalTokens = {
            promptTokens: (last.totalTokens?.promptTokens ?? 0) + usage.promptTokens,
            completionTokens: (last.totalTokens?.completionTokens ?? 0) + usage.completionTokens,
            totalTokens: (last.totalTokens?.totalTokens ?? 0) + usage.totalTokens,
          };
          updated[updated.length - 1] = last;
          return updated;
        });
      }
    } catch (err) {
      log.error('[TransformPipeline] Enhancement failed', err);
      setError('AI enhancement failed. You can still edit manually.');
    } finally {
      setIsEnhancing(false);
    }
  }, [activeResume, originalResume, enhancerMode, handleUpdateResume]);

  const handleEnhanceClick = useCallback(() => {
    if (originalResume) {
      setShowReEnhanceConfirm(true);
      return;
    }
    if (resumeWarnings.length > 0) {
      setShowEnhanceWarningModal(true);
      return;
    }
    void handleEnhanceResume();
  }, [originalResume, resumeWarnings, handleEnhanceResume]);

  const confirmReEnhance = useCallback(() => {
    setShowReEnhanceConfirm(false);
    if (resumeWarnings.length > 0) {
      setShowEnhanceWarningModal(true);
      return;
    }
    void handleEnhanceResume();
  }, [resumeWarnings, handleEnhanceResume]);

  return {
    isTransforming,
    setIsTransforming,
    transformProgress,
    setTransformProgress,
    transformPhase,
    setTransformPhase,
    transformedResumes,
    setTransformedResumes,
    processingMetrics,
    setProcessingMetrics,
    error,
    setError,
    editedResumes,
    setEditedResumes,
    activeResumeId,
    setActiveResumeId,
    activeResume,
    handleUpdateResume,
    executeTransform,
    isEnhancing,
    setIsEnhancing,
    enhancerMode,
    setEnhancerMode,
    originalResume,
    setOriginalResume,
    resumeWarnings,
    handleEnhanceResume,
    handleEnhanceClick,
    confirmReEnhance,
    showEnhanceWarningModal,
    setShowEnhanceWarningModal,
    showReEnhanceConfirm,
    setShowReEnhanceConfirm,
  };
}
