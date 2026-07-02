import { useCallback, useState } from 'react';
import { templateFillService } from '../../services/templateFillService';
import { pdfExportService } from '../../services/pdfExportService';
import { dataSyncService } from '../../services/dataSyncService';
import {
  ATSPosition,
  PresentedCandidate,
  RefinementMode,
  ResumeSourceType,
  StructuredResume,
} from '../../types';
import { createRendererLogger } from '../../../../shared/utils/rendererLogger';
import { useNexusStatus } from '../../../../contexts/NexusStatusContext';

const log = createRendererLogger('useTransformExport');


const refinementModeLabelMap: Record<RefinementMode, string> = {
  'professional-polish': 'Professional Polish',
  'job-tailoring': 'Job Description Tailoring',
};

export function useTransformExport({
  activeResume,
  sourceType,
  selectedCandidate,
  selectedPosition,
  refinementMode,
  jobDescriptionSource,
  isCandidateAlreadyPresented,
  showToast,
  setError,
  generatedDocx: externalGeneratedDocx,
  setGeneratedDocx: externalSetGeneratedDocx,
}: UseTransformExportParams) {
  const { apiTokens, requireApiToken } = useNexusStatus();
  const [internalGeneratedDocx, setInternalGeneratedDocx] = useState<Blob | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadTargetResume, setDownloadTargetResume] = useState<StructuredResume | null>(null);
  const [activeExportResume, setActiveExportResume] = useState<StructuredResume | null>(null);
  const [uploadingToATS, setUploadingToATS] = useState<Set<string>>(new Set());
  const [uploadedToATS, setUploadedToATS] = useState<Set<string>>(new Set());
  const generatedDocx = externalGeneratedDocx ?? internalGeneratedDocx;
  const setGeneratedDocx = externalSetGeneratedDocx ?? setInternalGeneratedDocx;

  const getFileName = useCallback((resume: StructuredResume, ext: string): string => {
    const mainSkill = resume.templateSkills?.[0] || '';
    const candidateName = resume.candidateName.trim();
    const base = mainSkill
      ? `Unosquare - ${mainSkill} ${candidateName}`
      : `Unosquare - ${candidateName}`;
    return `${base}.${ext}`;
  }, []);

  const handleExportDocx = useCallback(async (resume?: StructuredResume) => {
    const resumeToExport = resume ?? activeExportResume ?? activeResume;
    if (!resumeToExport) return;
    try {
      const docxBlob = await templateFillService.fillTemplate(resumeToExport);
      const url = URL.createObjectURL(docxBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getFileName(resumeToExport, 'docx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('DOCX exported successfully', 'success');
    } catch (err) {
      log.error('DOCX export error:', err);
      showToast('DOCX export failed', 'error');
    }
  }, [activeExportResume, activeResume, getFileName, showToast]);

  const handleExportPdf = useCallback((resume?: StructuredResume) => {
    const resumeToExport = resume ?? activeExportResume ?? activeResume;
    if (!resumeToExport) return;
    pdfExportService.downloadPdf(resumeToExport);
    showToast('PDF export opened', 'success');
  }, [activeExportResume, activeResume, showToast]);

  const handleDownload = useCallback((resume: StructuredResume) => {
    if (generatedDocx) {
      const url = URL.createObjectURL(generatedDocx);
      const link = document.createElement('a');
      link.href = url;
      link.download = getFileName(resume, 'docx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Resume downloaded', 'success');
      return;
    }

    const content = JSON.stringify(resume, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = getFileName(resume, 'json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Resume downloaded', 'success');
  }, [generatedDocx, getFileName, showToast]);

  const handlePresentToPosition = useCallback((resume: StructuredResume) => {
    if (selectedPosition && isCandidateAlreadyPresented(selectedPosition)) {
      showToast('This candidate was already presented for this position.', 'warning');
      return;
    }
    showToast(`Resume for ${resume.candidateName} would be presented to ${selectedPosition?.title || 'the position'}. (Demo feature)`, 'info');
  }, [isCandidateAlreadyPresented, selectedPosition, showToast]);

  const handleSyncToATS = useCallback(async (resume: StructuredResume) => {
    if (!requireApiToken('unocore')) {
      return;
    }
    const token = apiTokens.unocore.token;

    const personId = sourceType === 'ats-candidates'
      ? selectedCandidate?.upstreamId
      : undefined;

    if (!personId) {
      setError('No person ID available for upload. Please select a candidate or employee.');
      return;
    }

    setUploadingToATS((prev) => new Set([...prev, resume.id]));
    try {
      const docxBlob = await templateFillService.fillTemplate(resume);
      const fileName = `${resume.candidateName.replace(/\s+/g, '_')}_resume.docx`;
      await dataSyncService.uploadNote(token, personId, 'Resume', docxBlob, fileName);
      setUploadedToATS((prev) => new Set([...prev, resume.id]));
    } catch (err) {
      log.error('Upload to ATS failed:', err);
      setError(err instanceof Error ? err.message : 'Upload to ATS failed.');
    } finally {
      setUploadingToATS((prev) => {
        const next = new Set(prev);
        next.delete(resume.id);
        return next;
      });
    }
  }, [selectedCandidate, setError, sourceType, apiTokens.unocore.token, requireApiToken]);

  const isCandidatePresented = useCallback((position: ATSPosition) => {
    if (!selectedCandidate) return false;
    return position.candidatesPresented.some((presented) => {
      return presented.name.toLowerCase() === selectedCandidate.name.toLowerCase();
    });
  }, [selectedCandidate]);

  const canPresent = selectedPosition !== null && !isCandidatePresented(selectedPosition);
  const canUploadToATS =
    sourceType !== 'upload'
    && (
      (sourceType === 'ats-candidates' && selectedCandidate?.upstreamId != null)
      || sourceType === 'employees'
    );

  const getStatusColor = useCallback((status: PresentedCandidate['status']) => {
    switch (status) {
      case 'accepted':
        return 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400';
      case 'rejected':
        return 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400';
      case 'reviewing':
        return 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400';
      default:
        return 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300';
    }
  }, []);

  const refinementModeLabel = useCallback((mode: RefinementMode) => {
    return refinementModeLabelMap[mode];
  }, []);

  return {
    export: {
      generatedDocx,
      setGeneratedDocx,
      showDownloadModal,
      setShowDownloadModal,
      downloadTargetResume,
      setDownloadTargetResume,
      activeExportResume,
      setActiveExportResume,
      handleExportDocx,
      handleExportPdf,
      handleDownload,
      handlePresentToPosition,
    },
    ats: {
      uploadingToATS,
      setUploadingToATS,
      uploadedToATS,
      setUploadedToATS,
      canUploadToATS,
      canPresent,
      handleSyncToATS,
      isCandidateAlreadyPresented: isCandidatePresented,
      getStatusColor,
    },
    misc: {
      getFileName,
      refinementModeLabel,
    },
  };
}
