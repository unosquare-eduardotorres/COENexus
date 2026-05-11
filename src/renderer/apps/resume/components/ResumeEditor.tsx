import { useState, useCallback, memo } from 'react';
import {
  StructuredResume,
  ExperienceEntry,
  EducationEntry,
  CertificationEntry,
  AISuggestion,
} from '../types';
import { EditableText, AISuggestionButton } from './editor/EditorHelpers';
import { SummarySection } from './editor/SummarySection';
import { ExperienceSection } from './editor/ExperienceSection';
import { SkillsSection } from './editor/SkillsSection';
import { CertificationsSection } from './editor/CertificationsSection';
import { EducationSection } from './editor/EducationSection';

interface ResumeEditorProps {
  resume: StructuredResume;
  onUpdate: (resume: StructuredResume) => void;
  onRequestAISuggestion: (sectionType: string, sectionId?: string, text?: string) => void;
  aiSuggestions: AISuggestion[];
  onSelectSuggestion: (suggestionId: string, optionIndex: number) => void;
  readOnly?: boolean;
  originalResume?: StructuredResume | null;
}

const ResumeEditor = memo(function ResumeEditor({
  resume,
  onUpdate,
  onRequestAISuggestion,
  aiSuggestions,
  onSelectSuggestion,
  readOnly = false,
  originalResume,
}: ResumeEditorProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const ALL_SECTIONS = ['summary', 'experience', 'education', 'skills', 'certifications'];
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedOriginals, setExpandedOriginals] = useState<Set<string>>(new Set());

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  }, []);

  const toggleOriginalExpanded = useCallback((section: string) => {
    setExpandedOriginals(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);

  const updateField = useCallback(
    (field: string, value: string) => {
      const updated = { ...resume, [field]: value };
      onUpdate(updated);
    },
    [resume, onUpdate]
  );

  const updateExperience = useCallback(
    (index: number, field: keyof ExperienceEntry, value: string | string[]) => {
      const updated = { ...resume };
      updated.experience = [...resume.experience];
      updated.experience[index] = { ...updated.experience[index], [field]: value };
      onUpdate(updated);
    },
    [resume, onUpdate]
  );

  const updateEducation = useCallback(
    (index: number, field: keyof EducationEntry, value: string) => {
      const updated = { ...resume };
      updated.education = [...resume.education];
      updated.education[index] = { ...updated.education[index], [field]: value };
      onUpdate(updated);
    },
    [resume, onUpdate]
  );

  const updateSkillCategory = useCallback(
    (index: number, skills: string[]) => {
      const updated = { ...resume };
      updated.skills = [...resume.skills];
      updated.skills[index] = { ...updated.skills[index], skills };
      onUpdate(updated);
    },
    [resume, onUpdate]
  );

  const updateCertification = useCallback(
    (index: number, field: keyof CertificationEntry, value: string) => {
      const updated = { ...resume };
      updated.certifications = [...resume.certifications];
      updated.certifications[index] = { ...updated.certifications[index], [field]: value };
      onUpdate(updated);
    },
    [resume, onUpdate]
  );

  const getSuggestionForSection = useCallback((sectionType: string, sectionId?: string) => {
    return aiSuggestions.find(
      (s) => s.sectionType === sectionType && (!sectionId || s.sectionId === sectionId)
    );
  }, [aiSuggestions]);

  const sharedProps = {
    editingField,
    setEditingField,
    expandedSections,
    toggleSection,
    expandedOriginals,
    toggleOriginalExpanded,
    readOnly,
    onSelectSuggestion,
    getSuggestionForSection,
    onRequestAISuggestion,
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-xs text-muted">{expandedSections.size} of {ALL_SECTIONS.length} sections expanded</span>
        <button
          onClick={() => {
            if (expandedSections.size === ALL_SECTIONS.length) {
              setExpandedSections(new Set());
            } else {
              setExpandedSections(new Set(ALL_SECTIONS));
            }
          }}
          className="text-xs text-accent-500 hover:text-accent-600 dark:hover:text-accent-400 font-medium transition-colors"
        >
          {expandedSections.size === ALL_SECTIONS.length ? 'Collapse All' : 'Expand All'}
        </button>
      </div>
      <div className="glass-card p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent-500 to-violet-600 flex items-center justify-center text-white text-xl font-semibold">
            {resume.candidateName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-primary">
              <EditableText
                value={resume.candidateName}
                fieldKey="candidateName"
                onChange={(v) => updateField('candidateName', v)}
                editingField={editingField}
                setEditingField={setEditingField}
                readOnly={readOnly}
              />
            </h2>
            <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <EditableText
                  value={resume.email || ''}
                  fieldKey="email"
                  onChange={(v) => updateField('email', v)}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  readOnly={readOnly}
                  placeholder="Add email"
                />
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                <EditableText
                  value={resume.phone || ''}
                  fieldKey="phone"
                  onChange={(v) => updateField('phone', v)}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  readOnly={readOnly}
                  placeholder="Add phone"
                />
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <EditableText
                  value={resume.location || ''}
                  fieldKey="location"
                  onChange={(v) => updateField('location', v)}
                  editingField={editingField}
                  setEditingField={setEditingField}
                  readOnly={readOnly}
                  placeholder="Add location"
                />
              </span>
            </div>
          </div>
          {!readOnly && (
            <AISuggestionButton onClick={() => onRequestAISuggestion('header')} />
          )}
        </div>
      </div>

      <SummarySection
        resume={resume}
        updateField={updateField}
        originalResume={originalResume}
        {...sharedProps}
      />

      <ExperienceSection
        resume={resume}
        updateExperience={updateExperience}
        originalResume={originalResume}
        {...sharedProps}
      />

      <SkillsSection
        resume={resume}
        onUpdate={onUpdate}
        updateSkillCategory={updateSkillCategory}
        originalResume={originalResume}
        editingField={editingField}
        setEditingField={setEditingField}
        expandedSections={expandedSections}
        toggleSection={toggleSection}
        expandedOriginals={expandedOriginals}
        toggleOriginalExpanded={toggleOriginalExpanded}
        readOnly={readOnly}
      />

      <CertificationsSection
        resume={resume}
        updateCertification={updateCertification}
        originalResume={originalResume}
        editingField={editingField}
        setEditingField={setEditingField}
        expandedSections={expandedSections}
        toggleSection={toggleSection}
        expandedOriginals={expandedOriginals}
        toggleOriginalExpanded={toggleOriginalExpanded}
        readOnly={readOnly}
      />

      <EducationSection
        resume={resume}
        updateEducation={updateEducation}
        originalResume={originalResume}
        editingField={editingField}
        setEditingField={setEditingField}
        expandedSections={expandedSections}
        toggleSection={toggleSection}
        expandedOriginals={expandedOriginals}
        toggleOriginalExpanded={toggleOriginalExpanded}
        readOnly={readOnly}
      />
    </div>
  );
});

export default ResumeEditor;
