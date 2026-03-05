import { useState, useCallback } from 'react';
import {
  StructuredResume,
  ExperienceEntry,
  EducationEntry,
  SkillCategory,
  CertificationEntry,
  AISuggestion,
} from '../types';

interface ResumeEditorProps {
  resume: StructuredResume;
  onUpdate: (resume: StructuredResume) => void;
  onRequestAISuggestion: (sectionType: string, sectionId?: string, text?: string) => void;
  aiSuggestions: AISuggestion[];
  onSelectSuggestion: (suggestionId: string, optionIndex: number) => void;
  readOnly?: boolean;
}

export default function ResumeEditor({
  resume,
  onUpdate,
  onRequestAISuggestion,
  aiSuggestions,
  onSelectSuggestion,
  readOnly = false,
}: ResumeEditorProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['summary', 'experience', 'education', 'skills', 'certifications'])
  );

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

  const getSuggestionForSection = (sectionType: string, sectionId?: string) => {
    return aiSuggestions.find(
      (s) => s.sectionType === sectionType && (!sectionId || s.sectionId === sectionId)
    );
  };

  const renderEditableText = (
    value: string,
    fieldKey: string,
    onChange: (value: string) => void,
    multiline = false,
    placeholder = ''
  ) => {
    const isEditing = editingField === fieldKey;

    if (readOnly) {
      return <span className="text-primary">{value || placeholder}</span>;
    }

    if (isEditing) {
      return multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditingField(null)}
          autoFocus
          className="w-full p-2 glass-input text-sm resize-none min-h-[80px]"
          placeholder={placeholder}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setEditingField(null)}
          autoFocus
          className="w-full p-2 glass-input text-sm"
          placeholder={placeholder}
        />
      );
    }

    return (
      <span
        onClick={() => setEditingField(fieldKey)}
        className="cursor-pointer hover:bg-accent-50/50 dark:hover:bg-accent-500/10 px-1.5 py-0.5 rounded-lg transition-colors inline-block"
        title="Click to edit"
      >
        {value || <span className="text-muted italic">{placeholder || 'Click to add...'}</span>}
      </span>
    );
  };

  const renderSectionHeader = (title: string, section: string, icon: React.ReactNode) => (
    <div
      onClick={() => toggleSection(section)}
      className="flex items-center justify-between p-3 bg-white/50 dark:bg-dark-hover/30 rounded-t-xl cursor-pointer hover:bg-white/70 dark:hover:bg-dark-hover/50 transition-colors"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-accent-100/80 dark:bg-accent-500/20 flex items-center justify-center text-accent-600 dark:text-accent-400">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
      </div>
      <svg
        className={`w-4 h-4 text-muted transition-transform ${
          expandedSections.has(section) ? 'rotate-180' : ''
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );

  const renderAISuggestions = (suggestion: AISuggestion | undefined) => {
    if (!suggestion) return null;

    return (
      <div className="mt-2.5 p-2.5 bg-purple-50/50 dark:bg-purple-500/10 border border-purple-200/50 dark:border-purple-500/30 rounded-xl">
        <div className="flex items-center gap-1.5 mb-2">
          <svg className="w-3.5 h-3.5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z" />
            <path d="M10 5a1 1 0 011 1v3.586l2.707 2.707a1 1 0 01-1.414 1.414l-3-3A1 1 0 019 10V6a1 1 0 011-1z" />
          </svg>
          <span className="text-xs font-medium text-purple-600 dark:text-purple-400">AI Suggestions</span>
        </div>
        <div className="space-y-1.5">
          {suggestion.suggestions.map((option, index) => (
            <div
              key={option.id}
              onClick={() => onSelectSuggestion(suggestion.id, index)}
              className={`p-2 rounded-lg border cursor-pointer transition-all ${
                suggestion.selectedIndex === index
                  ? 'border-purple-400/50 bg-purple-100/50 dark:bg-purple-500/20'
                  : 'border-gray-200/50 dark:border-dark-border/50 bg-white/60 dark:bg-dark-surface/60 hover:border-purple-300/50 dark:hover:border-purple-500/30'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-secondary flex-1">{option.text}</p>
                <div className="flex items-center gap-1">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      option.type === 'rephrase'
                        ? 'bg-accent-100/80 dark:bg-accent-500/20 text-accent-600 dark:text-accent-400'
                        : option.type === 'extend'
                        ? 'bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : option.type === 'condense'
                        ? 'bg-amber-100/80 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        : 'bg-purple-100/80 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400'
                    }`}
                  >
                    {option.type}
                  </span>
                  <span className="text-[10px] text-muted">{Math.round(option.confidence * 100)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="glass-card p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent-500 to-purple-600 flex items-center justify-center text-white text-xl font-semibold">
            {resume.candidateName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-primary">
              {renderEditableText(resume.candidateName, 'candidateName', (v) =>
                updateField('candidateName', v)
              )}
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
                {renderEditableText(resume.email || '', 'email', (v) => updateField('email', v), false, 'Add email')}
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
                {renderEditableText(resume.phone || '', 'phone', (v) => updateField('phone', v), false, 'Add phone')}
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
                {renderEditableText(resume.location || '', 'location', (v) => updateField('location', v), false, 'Add location')}
              </span>
            </div>
          </div>
          {!readOnly && (
            <button
              onClick={() => onRequestAISuggestion('header')}
              className="p-2 text-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-500/10 rounded-lg transition-colors"
              title="Get AI suggestions"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {renderSectionHeader('Professional Summary', 'summary', (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        ))}
        {expandedSections.has('summary') && (
          <div className="p-3">
            <div className="relative">
              {renderEditableText(
                resume.summary,
                'summary',
                (v) => updateField('summary', v),
                true,
                'Enter professional summary...'
              )}
              {!readOnly && (
                <button
                  onClick={() => onRequestAISuggestion('summary', undefined, resume.summary)}
                  className="absolute top-0 right-0 p-1.5 text-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-500/10 rounded-lg transition-colors"
                  title="Get AI suggestions"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                  </svg>
                </button>
              )}
            </div>
            {renderAISuggestions(getSuggestionForSection('summary'))}
          </div>
        )}
      </div>

      <div className="glass-card overflow-hidden">
        {renderSectionHeader('Professional Experience', 'experience', (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        ))}
        {expandedSections.has('experience') && (
          <div className="p-3 space-y-3">
            {resume.experience.map((exp, index) => (
              <div key={exp.id} className="p-3 bg-white/50 dark:bg-dark-hover/30 rounded-xl border border-gray-100/50 dark:border-dark-border/30">
                <div className="flex justify-between items-start mb-1.5">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-primary">
                      {renderEditableText(exp.title, `exp-${index}-title`, (v) =>
                        updateExperience(index, 'title', v)
                      )}
                    </h4>
                    <p className="text-xs text-muted">
                      {renderEditableText(exp.company, `exp-${index}-company`, (v) =>
                        updateExperience(index, 'company', v)
                      )}
                      {' • '}
                      {renderEditableText(exp.location || '', `exp-${index}-location`, (v) =>
                        updateExperience(index, 'location', v)
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-muted whitespace-nowrap">
                    {renderEditableText(exp.startDate, `exp-${index}-start`, (v) =>
                      updateExperience(index, 'startDate', v)
                    )}
                    {' - '}
                    {renderEditableText(exp.endDate, `exp-${index}-end`, (v) =>
                      updateExperience(index, 'endDate', v)
                    )}
                  </span>
                </div>
                <div className="mt-1.5">
                  <p className="text-xs text-secondary">
                    {renderEditableText(
                      exp.description,
                      `exp-${index}-desc`,
                      (v) => updateExperience(index, 'description', v),
                      true
                    )}
                  </p>
                </div>
                {exp.achievements && exp.achievements.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {exp.achievements.map((achievement, achIndex) => (
                      <li key={achIndex} className="flex items-start gap-1.5 text-xs text-secondary">
                        <span className="text-accent-500 mt-0.5">•</span>
                        <span className="flex-1">
                          {readOnly ? (
                            achievement
                          ) : (
                            <span
                              onClick={() => setEditingField(`exp-${index}-ach-${achIndex}`)}
                              className="cursor-pointer hover:bg-accent-50/50 dark:hover:bg-accent-500/10 px-1 rounded transition-colors"
                            >
                              {editingField === `exp-${index}-ach-${achIndex}` ? (
                                <input
                                  type="text"
                                  value={achievement}
                                  onChange={(e) => {
                                    const newAchievements = [...exp.achievements];
                                    newAchievements[achIndex] = e.target.value;
                                    updateExperience(index, 'achievements', newAchievements);
                                  }}
                                  onBlur={() => setEditingField(null)}
                                  autoFocus
                                  className="w-full p-1 glass-input text-xs"
                                />
                              ) : (
                                achievement
                              )}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {!readOnly && (
                  <button
                    onClick={() => onRequestAISuggestion('experience', exp.id, exp.description)}
                    className="mt-2 flex items-center gap-1 text-xs text-purple-500 hover:text-purple-600 dark:hover:text-purple-400"
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                    </svg>
                    Enhance with AI
                  </button>
                )}
                {renderAISuggestions(getSuggestionForSection('experience', exp.id))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card overflow-hidden">
        {renderSectionHeader('Education', 'education', (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 14l9-5-9-5-9 5 9 5z" />
            <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"
            />
          </svg>
        ))}
        {expandedSections.has('education') && (
          <div className="p-3 space-y-3">
            {resume.education.map((edu, index) => (
              <div key={edu.id} className="p-3 bg-white/50 dark:bg-dark-hover/30 rounded-xl border border-gray-100/50 dark:border-dark-border/30">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-medium text-primary">
                      {renderEditableText(edu.degree, `edu-${index}-degree`, (v) =>
                        updateEducation(index, 'degree', v)
                      )}
                      {' in '}
                      {renderEditableText(edu.field, `edu-${index}-field`, (v) =>
                        updateEducation(index, 'field', v)
                      )}
                    </h4>
                    <p className="text-xs text-muted">
                      {renderEditableText(edu.institution, `edu-${index}-institution`, (v) =>
                        updateEducation(index, 'institution', v)
                      )}
                    </p>
                    {edu.gpa && (
                      <p className="text-xs text-muted">
                        GPA:{' '}
                        {renderEditableText(edu.gpa, `edu-${index}-gpa`, (v) =>
                          updateEducation(index, 'gpa', v)
                        )}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted">
                    {renderEditableText(edu.graduationDate, `edu-${index}-date`, (v) =>
                      updateEducation(index, 'graduationDate', v)
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card overflow-hidden">
        {renderSectionHeader('Skills', 'skills', (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        ))}
        {expandedSections.has('skills') && (
          <div className="p-3 space-y-3">
            {resume.skills.map((category, index) => (
              <div key={category.id}>
                <h4 className="text-xs font-medium text-muted mb-1.5">{category.name}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {category.skills.map((skill, skillIndex) => (
                    <span
                      key={skillIndex}
                      className="px-2.5 py-1 bg-accent-50/80 dark:bg-accent-500/15 text-accent-600 dark:text-accent-400 rounded-lg text-xs cursor-pointer hover:bg-accent-100/80 dark:hover:bg-accent-500/25 transition-colors"
                      onClick={() => {
                        if (!readOnly) {
                          const newSkill = prompt('Edit skill:', skill);
                          if (newSkill !== null) {
                            const newSkills = [...category.skills];
                            newSkills[skillIndex] = newSkill;
                            updateSkillCategory(index, newSkills);
                          }
                        }
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                  {!readOnly && (
                    <button
                      onClick={() => {
                        const newSkill = prompt('Add new skill:');
                        if (newSkill) {
                          updateSkillCategory(index, [...category.skills, newSkill]);
                        }
                      }}
                      className="px-2.5 py-1 border border-dashed border-gray-300/50 dark:border-dark-border/50 text-muted rounded-lg text-xs hover:border-accent-400/50 dark:hover:border-accent-500/50 hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
                    >
                      + Add
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card overflow-hidden">
        {renderSectionHeader('Certifications', 'certifications', (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
            />
          </svg>
        ))}
        {expandedSections.has('certifications') && (
          <div className="p-3 space-y-2">
            {resume.certifications.map((cert, index) => (
              <div
                key={cert.id}
                className="flex items-center justify-between p-2.5 bg-white/50 dark:bg-dark-hover/30 rounded-xl"
              >
                <div>
                  <h4 className="text-sm font-medium text-primary">
                    {renderEditableText(cert.name, `cert-${index}-name`, (v) =>
                      updateCertification(index, 'name', v)
                    )}
                  </h4>
                  <p className="text-xs text-muted">
                    {renderEditableText(cert.issuer, `cert-${index}-issuer`, (v) =>
                      updateCertification(index, 'issuer', v)
                    )}
                  </p>
                </div>
                <span className="text-xs text-muted">
                  {renderEditableText(cert.date, `cert-${index}-date`, (v) =>
                    updateCertification(index, 'date', v)
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
