import { useState, useCallback } from 'react';
import { StructuredResume, ExperienceEntry } from '../../types';
import { EditableText, SectionHeader, OriginalBlock, AISuggestionsBlock, EditorSharedProps } from './EditorHelpers';

interface TechnologyAddState {
  experienceIndex: number;
  value: string;
}

interface ExperienceSectionProps extends EditorSharedProps {
  resume: StructuredResume;
  updateExperience: (index: number, field: keyof ExperienceEntry, value: string | string[]) => void;
  originalResume?: StructuredResume | null;
}

export function ExperienceSection({
  resume,
  updateExperience,
  originalResume,
  editingField,
  setEditingField,
  expandedSections,
  toggleSection,
  expandedOriginals,
  toggleOriginalExpanded,
  readOnly,
  onSelectSuggestion,
  getSuggestionForSection,
}: ExperienceSectionProps) {
  const [addingTechnology, setAddingTechnology] = useState<TechnologyAddState | null>(null);

  const saveAddedTechnology = useCallback(() => {
    if (!addingTechnology) return;
    if (addingTechnology.value) {
      const experience = resume.experience[addingTechnology.experienceIndex];
      if (experience) {
        updateExperience(
          addingTechnology.experienceIndex,
          'technologies',
          [...(experience.technologies || []), addingTechnology.value]
        );
      }
    }
    setAddingTechnology(null);
  }, [addingTechnology, resume.experience, updateExperience]);

  return (
    <div className="glass-card overflow-hidden">
      <SectionHeader
        title="Work Experience"
        section="experience"
        expandedSections={expandedSections}
        toggleSection={toggleSection}
        icon={
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        }
      />
      {expandedSections.has('experience') && (
        <>
          <div className="p-3 space-y-3">
            {resume.experience.map((exp, index) => (
              <div key={exp.id} className="p-3 bg-white/50 dark:bg-dark-hover/30 rounded-xl border border-gray-100/50 dark:border-dark-border/30">
                <div className="flex justify-between items-start mb-0.5">
                  <h4 className="text-sm font-semibold text-accent-600 dark:text-accent-400">
                    <EditableText
                      value={exp.company}
                      fieldKey={`exp-${index}-company`}
                      onChange={(v) => updateExperience(index, 'company', v)}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      readOnly={readOnly}
                    />
                  </h4>
                  <span className="text-sm text-muted whitespace-nowrap ml-3">
                    <EditableText
                      value={exp.startDate}
                      fieldKey={`exp-${index}-start`}
                      onChange={(v) => updateExperience(index, 'startDate', v)}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      readOnly={readOnly}
                    />
                    {' - '}
                    <EditableText
                      value={exp.endDate}
                      fieldKey={`exp-${index}-end`}
                      onChange={(v) => updateExperience(index, 'endDate', v)}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      readOnly={readOnly}
                    />
                  </span>
                </div>

                <p className="text-sm font-medium text-primary mb-1.5">
                  <EditableText
                    value={exp.title}
                    fieldKey={`exp-${index}-title`}
                    onChange={(v) => updateExperience(index, 'title', v)}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    readOnly={readOnly}
                  />
                  {exp.projectName && (
                    <>{' — '}<EditableText
                      value={exp.projectName}
                      fieldKey={`exp-${index}-project`}
                      onChange={(v) => updateExperience(index, 'projectName', v)}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      readOnly={readOnly}
                    /></>
                  )}
                </p>

                <div className="mb-2">
                  <p className="text-sm text-secondary leading-relaxed">
                    <EditableText
                      value={exp.description}
                      fieldKey={`exp-${index}-desc`}
                      onChange={(v) => updateExperience(index, 'description', v)}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      readOnly={readOnly}
                      multiline
                    />
                  </p>
                </div>

                {(exp.technologies && exp.technologies.length > 0) && (
                  <div className="flex items-start gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-primary whitespace-nowrap mt-0.5">
                      Technologies & Tools:
                    </span>
                    {exp.technologies.map((tech, techIdx) => (
                      <span key={techIdx} className="px-2 py-0.5 text-xs bg-gray-100/80 dark:bg-dark-hover/50 text-muted rounded-md">
                        {tech}
                      </span>
                    ))}
                    {!readOnly && (
                      <>
                        {addingTechnology?.experienceIndex === index ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={addingTechnology.value}
                              onChange={(e) => setAddingTechnology({ ...addingTechnology, value: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  saveAddedTechnology();
                                }
                                if (e.key === 'Escape') {
                                  setAddingTechnology(null);
                                }
                              }}
                              autoFocus
                              className="px-2 py-0.5 text-xs glass-input rounded-md min-w-[140px]"
                              placeholder="Add technology..."
                            />
                            <button
                              onClick={saveAddedTechnology}
                              className="px-2 py-0.5 text-xs rounded-md bg-accent-100/80 dark:bg-accent-500/20 text-accent-600 dark:text-accent-400 hover:bg-accent-200/80 dark:hover:bg-accent-500/30 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setAddingTechnology(null)}
                              className="px-2 py-0.5 text-xs rounded-md text-muted hover:text-secondary transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAddingTechnology({ experienceIndex: index, value: '' })}
                            className="px-2 py-0.5 text-xs border border-dashed border-gray-300/50 dark:border-dark-border/50 text-muted rounded-md hover:border-accent-400/50 hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
                          >
                            + Add
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
                <AISuggestionsBlock
                  suggestion={getSuggestionForSection('experience', exp.id)}
                  onSelectSuggestion={onSelectSuggestion}
                />
              </div>
            ))}
          </div>
          <OriginalBlock
            section="experience"
            hasOriginal={!!originalResume}
            expandedOriginals={expandedOriginals}
            toggleOriginalExpanded={toggleOriginalExpanded}
            content={
              <div className="space-y-3">
                {originalResume?.experience.map((exp) => (
                  <div key={exp.id} className="p-3 bg-amber-100/30 dark:bg-amber-500/10 rounded-xl border border-amber-200/50 dark:border-amber-500/20">
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300">{exp.title}</h4>
                        <p className="text-xs text-amber-600 dark:text-amber-500">
                          {exp.company}{exp.location ? ` • ${exp.location}` : ''}
                        </p>
                      </div>
                      <span className="text-xs text-amber-600 dark:text-amber-500 whitespace-nowrap">
                        {exp.startDate} - {exp.endDate}
                      </span>
                    </div>
                    {(!exp.achievements || exp.achievements.length === 0) && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 italic">{exp.description}</p>
                    )}
                    {exp.achievements && exp.achievements.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {exp.achievements.map((achievement, achIndex) => (
                          <li key={achIndex} className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                            <span className="text-amber-500 mt-0.5">•</span>
                            <span className="flex-1 italic">{achievement}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            }
          />
        </>
      )}
    </div>
  );
}
