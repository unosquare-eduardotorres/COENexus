import { useCallback, useEffect, useMemo, useState } from 'react';
import { aiService } from '../../services/aiService';
import { validationService } from '../../services/validationService';
import { AISuggestion, StructuredResume, ValidationResult } from '../../types';

export function useTransformValidation({ activeResume, currentStepKey, onUpdateResume }: { activeResume: StructuredResume | null; currentStepKey: string; onUpdateResume: (resume: StructuredResume) => void }) {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [validationCollapsed, setValidationCollapsed] = useState(false);
  const [validationFilter, setValidationFilter] = useState<'warning' | 'improvement' | 'valid' | null>(null);
  const [showValidationNotice, setShowValidationNotice] = useState(false);
  const [validationHighlight, setValidationHighlight] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

  const getResumeWarnings = useCallback((resume: StructuredResume): string[] => {
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
  }, []);

  const resumeWarnings = useMemo(() => (activeResume ? getResumeWarnings(activeResume) : []), [activeResume, getResumeWarnings]);

  const completeness = useMemo(() => {
    if (!activeResume) return { percentage: 0, filledFields: 0, totalFields: 0, missingFields: [] };
    return validationService.getCompleteness(activeResume);
  }, [activeResume]);

  useEffect(() => {
    if (currentStepKey === 'review' && activeResume) {
      const results = validationService.validateResume(activeResume);
      setValidationResults(results);
      if (results.some((r) => r.status !== 'valid')) {
        setShowValidationNotice(true);
        setValidationHighlight(true);
      }
    }
  }, [currentStepKey, activeResume]);

  useEffect(() => {
    if (!validationHighlight) return;
    const timer = setTimeout(() => setValidationHighlight(false), 5000);
    return () => clearTimeout(timer);
  }, [validationHighlight]);

  const handleRequestAISuggestion = useCallback(async (sectionType: string, sectionId?: string, text?: string) => {
    if (!text) return;
    setIsGeneratingSuggestions(true);
    try {
      const suggestions = await aiService.generateSuggestions(text, sectionType);
      const newSuggestion: AISuggestion = {
        id: `sug-${Date.now()}`,
        sectionType,
        sectionId,
        originalText: text,
        suggestions,
      };
      setAiSuggestions((prev) => [...prev.filter((s) => !(s.sectionType === sectionType && s.sectionId === sectionId)), newSuggestion]);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  }, []);

  const handleSelectSuggestion = useCallback((suggestionId: string, optionIndex: number) => {
    setAiSuggestions((prev) => prev.map((s) => (s.id === suggestionId ? { ...s, selectedIndex: optionIndex } : s)));
    const suggestion = aiSuggestions.find((s) => s.id === suggestionId);
    if (suggestion && activeResume) {
      const selectedOption = suggestion.suggestions[optionIndex];
      if (selectedOption) {
        const updatedResume = { ...activeResume };
        if (suggestion.sectionType === 'summary') updatedResume.summary = selectedOption.text;
        else if (suggestion.sectionType === 'experience' && suggestion.sectionId) {
          updatedResume.experience = updatedResume.experience.map((exp) => (
            exp.id === suggestion.sectionId ? { ...exp, description: selectedOption.text } : exp
          ));
        }
        onUpdateResume(updatedResume);
      }
    }
  }, [aiSuggestions, activeResume, onUpdateResume]);

  return {
    review: {
      handleRequestAISuggestion,
      handleSelectSuggestion,
      completeness,
      resumeWarnings,
    },
    validation: {
      validationResults,
      validationCollapsed,
      setValidationCollapsed,
      validationFilter,
      setValidationFilter,
      showValidationNotice,
      setShowValidationNotice,
      validationHighlight,
    },
    suggestions: {
      aiSuggestions,
      setAiSuggestions,
      isGeneratingSuggestions,
    },
  };
}
