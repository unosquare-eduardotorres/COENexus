import { useState, useCallback, useMemo } from 'react';
import { StructuredResume, AISuggestion, ValidationResult } from '../types';
import { validationService } from '../services/validationService';
import { aiService } from '../services/aiService';
import { pdfExportService } from '../services/pdfExportService';
import { useToast } from '../../../shared/components/ToastContext';

export function useRecruiterDashboard() {
  const { showToast } = useToast();
  const [resumes] = useState<StructuredResume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [editedResumes, setEditedResumes] = useState<Map<string, StructuredResume>>(new Map());
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [validationFilter, setValidationFilter] = useState<'warning' | 'improvement' | 'valid' | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const selectedResume = useMemo(() => {
    if (!selectedResumeId) return null;
    return editedResumes.get(selectedResumeId) || resumes.find((r) => r.id === selectedResumeId);
  }, [selectedResumeId, resumes, editedResumes]);

  const filteredResumes = useMemo(() => {
    return resumes.filter((resume) => {
      const matchesStatus = filterStatus === 'all' || resume.status === filterStatus;
      const matchesSearch =
        !searchQuery ||
        resume.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        resume.originalFileName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [resumes, filterStatus, searchQuery]);

  const completeness = useMemo(() => {
    if (!selectedResume) return { percentage: 0, filledFields: 0, totalFields: 0, missingFields: [] as string[] };
    return validationService.getCompleteness(selectedResume);
  }, [selectedResume]);

  const handleUpdateResume = useCallback((updatedResume: StructuredResume) => {
    setEditedResumes((prev) => {
      const newMap = new Map(prev);
      newMap.set(updatedResume.id, updatedResume);
      return newMap;
    });
  }, []);

  const handleRequestAISuggestion = useCallback(async (sectionType: string, sectionId?: string, text?: string) => {
    if (!text) return;
    setIsGeneratingSuggestions(true);
    try {
      const suggestions = await aiService.generateSuggestions(text, sectionType);
      const newSuggestion: AISuggestion = {
        id: `sug-${Date.now()}`, sectionType, sectionId, originalText: text, suggestions,
      };
      setAiSuggestions((prev) => [...prev.filter((s) => !(s.sectionType === sectionType && s.sectionId === sectionId)), newSuggestion]);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  }, []);

  const handleSelectSuggestion = useCallback((suggestionId: string, optionIndex: number) => {
    setAiSuggestions((prev) => prev.map((s) => s.id === suggestionId ? { ...s, selectedIndex: optionIndex } : s));
    const suggestion = aiSuggestions.find((s) => s.id === suggestionId);
    if (suggestion && selectedResume) {
      const selectedOption = suggestion.suggestions[optionIndex];
      if (selectedOption) {
        const updatedResume = { ...selectedResume };
        if (suggestion.sectionType === 'summary') updatedResume.summary = selectedOption.text;
        else if (suggestion.sectionType === 'experience' && suggestion.sectionId) {
          updatedResume.experience = updatedResume.experience.map((exp) =>
            exp.id === suggestion.sectionId ? { ...exp, description: selectedOption.text } : exp
          );
        }
        handleUpdateResume(updatedResume);
      }
    }
  }, [aiSuggestions, selectedResume, handleUpdateResume]);

  const handleValidate = useCallback(async () => {
    if (!selectedResume) return;
    setIsValidating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const results = validationService.validateResume(selectedResume);
      setValidationResults(results);
    } finally {
      setIsValidating(false);
    }
  }, [selectedResume]);

  const handleExportPdf = useCallback(async () => {
    if (!selectedResume) return;
    await pdfExportService.downloadPdf(selectedResume, `${selectedResume.candidateName}_Resume.pdf`);
    showToast('PDF export opened', 'success');
  }, [selectedResume, showToast]);

  const handleApprove = useCallback(() => {
    if (!selectedResume) return;
    handleUpdateResume({ ...selectedResume, status: 'approved' as const });
    showToast('Resume approved successfully!', 'success');
  }, [selectedResume, handleUpdateResume, showToast]);

  const handleReject = useCallback(() => {
    if (!selectedResume) return;
    setRejectReason('');
    setShowRejectModal(true);
  }, [selectedResume]);

  const handleConfirmReject = useCallback(() => {
    if (!selectedResume || !rejectReason.trim()) return;
    handleUpdateResume({ ...selectedResume, status: 'rejected' as const });
    setShowRejectModal(false);
    setRejectReason('');
    showToast('Resume rejected.', 'warning');
  }, [selectedResume, rejectReason, handleUpdateResume, showToast]);

  return {
    resumes: { resumes, filteredResumes, selectedResumeId, setSelectedResumeId, selectedResume, editedResumes },
    filter: { filterStatus, setFilterStatus, searchQuery, setSearchQuery },
    review: { handleUpdateResume, handleRequestAISuggestion, handleSelectSuggestion, aiSuggestions, isGeneratingSuggestions },
    validation: { validationResults, validationFilter, setValidationFilter, handleValidate, isValidating, completeness },
    actions: { handleExportPdf, handleApprove, handleReject },
    ui: { isDrawerOpen, setIsDrawerOpen, showPreview, setShowPreview },
    reject: { showRejectModal, setShowRejectModal, rejectReason, setRejectReason, handleConfirmReject },
  };
}
