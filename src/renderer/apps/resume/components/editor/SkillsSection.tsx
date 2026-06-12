import { useState, useCallback } from 'react';
import { StructuredResume } from '../../types';
import { TECH_SKILL_SLOTS } from '../../constants/resume';
import { SectionHeader, OriginalBlock, EditorSharedProps } from './EditorHelpers';

interface SkillEditState {
  categoryIndex: number;
  skillIndex: number;
  value: string;
}

interface SkillAddState {
  categoryIndex: number;
  value: string;
}

interface SkillsSectionProps extends Omit<EditorSharedProps, 'getSuggestionForSection' | 'onRequestAISuggestion' | 'onSelectSuggestion'> {
  resume: StructuredResume;
  onUpdate: (resume: StructuredResume) => void;
  updateSkillCategory: (index: number, skills: string[]) => void;
  originalResume?: StructuredResume | null;
}

export function SkillsSection({
  resume,
  onUpdate,
  updateSkillCategory,
  originalResume,
  expandedSections,
  toggleSection,
  expandedOriginals,
  toggleOriginalExpanded,
  readOnly,
}: SkillsSectionProps) {
  const [skillView, setSkillView] = useState<'template' | 'all'>('template');
  const [editingSkill, setEditingSkill] = useState<SkillEditState | null>(null);
  const [addingSkill, setAddingSkill] = useState<SkillAddState | null>(null);

  const assignSkillToNextSlot = (skill: string) => {
    const currentTemplate = resume.templateSkills || [];
    const currentCloud = resume.cloudSkills || [];
    if (currentTemplate.length < TECH_SKILL_SLOTS && !currentTemplate.includes(skill)) {
      onUpdate({ ...resume, templateSkills: [...currentTemplate, skill] });
    } else if (!currentCloud.includes(skill)) {
      onUpdate({ ...resume, cloudSkills: [...currentCloud, skill] });
    }
  };

  const removeTemplateSkill = (index: number) => {
    const newSkills = [...(resume.templateSkills || [])];
    newSkills.splice(index, 1);
    onUpdate({ ...resume, templateSkills: newSkills });
  };

  const removeCloudSkill = (index: number) => {
    const newSkills = [...(resume.cloudSkills || [])];
    newSkills.splice(index, 1);
    onUpdate({ ...resume, cloudSkills: newSkills });
  };

  const saveEditedSkill = useCallback(() => {
    if (!editingSkill) return;
    const { categoryIndex, skillIndex, value } = editingSkill;
    const category = resume.skills[categoryIndex];
    if (!category) {
      setEditingSkill(null);
      return;
    }
    const newSkills = [...category.skills];
    newSkills[skillIndex] = value;
    updateSkillCategory(categoryIndex, newSkills);
    setEditingSkill(null);
  }, [editingSkill, resume.skills, updateSkillCategory]);

  const saveAddedSkill = useCallback(() => {
    if (!addingSkill) return;
    if (addingSkill.value) {
      const category = resume.skills[addingSkill.categoryIndex];
      if (category) {
        updateSkillCategory(addingSkill.categoryIndex, [...category.skills, addingSkill.value]);
      }
    }
    setAddingSkill(null);
  }, [addingSkill, resume.skills, updateSkillCategory]);

  return (
    <div className="glass-card overflow-hidden">
      <SectionHeader
        title="Technical Skills"
        section="skills"
        expandedSections={expandedSections}
        toggleSection={toggleSection}
        icon={
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        }
      />
      {expandedSections.has('skills') && (
        <>
          <div className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setSkillView('template')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  skillView === 'template'
                    ? 'bg-accent-100/80 dark:bg-accent-500/20 text-accent-600 dark:text-accent-400'
                    : 'text-muted hover:text-secondary'
                }`}
              >
                Template Slots
              </button>
              <button
                onClick={() => setSkillView('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                  skillView === 'all'
                    ? 'bg-accent-100/80 dark:bg-accent-500/20 text-accent-600 dark:text-accent-400'
                    : 'text-muted hover:text-secondary'
                }`}
              >
                All Skills
              </button>
            </div>

            {skillView === 'template' ? (
              <>
                <div className="p-3 bg-white/30 dark:bg-dark-hover/20 rounded-xl border border-gray-100/50 dark:border-dark-border/30">
                  <h4 className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-500" />
                    Technical Skills
                    <span className="text-xs font-normal text-gray-400">{(resume.templateSkills || []).filter(Boolean).length}/{TECH_SKILL_SLOTS}</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: TECH_SKILL_SLOTS }, (_, i) => {
                      const skill = resume.templateSkills?.[i] || '';
                      return skill ? (
                        <div
                          key={i}
                          className="px-2.5 py-1.5 rounded-lg border border-accent-300/50 bg-accent-50/80 dark:bg-accent-500/15 text-accent-700 dark:text-accent-400 text-xs cursor-pointer hover:border-red-300 hover:bg-red-50/50 transition-all flex items-center gap-1.5"
                          onClick={() => !readOnly && removeTemplateSkill(i)}
                          title={readOnly ? skill : 'Click to remove'}
                        >
                          {skill}
                          {!readOnly && <span className="text-xs opacity-50">×</span>}
                        </div>
                      ) : null;
                    })}
                    {(resume.templateSkills || []).filter(Boolean).length < TECH_SKILL_SLOTS && (
                      <span className="px-2.5 py-1.5 text-xs text-muted border border-dashed border-gray-300/50 dark:border-dark-border/50 rounded-lg">
                        +{TECH_SKILL_SLOTS - (resume.templateSkills || []).filter(Boolean).length} slots available
                      </span>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-200/50 dark:border-dark-border/30 my-1" />

                <div className="p-3 bg-violet-50/30 dark:bg-violet-500/5 rounded-xl border border-violet-200/30 dark:border-violet-500/10">
                  <h4 className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                    AI & Cloud - Skills and Tools
                    <span className="text-xs font-normal text-gray-400">{(resume.cloudSkills || []).filter(Boolean).length}</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {[...(resume.cloudSkills || [])].sort((a, b) =>
                      a.localeCompare(b, undefined, { sensitivity: 'base' })
                    ).map((skill, i) => (
                      <div
                        key={i}
                        className="px-2.5 py-1.5 rounded-lg border border-violet-300/50 bg-violet-50/80 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 text-xs cursor-pointer hover:border-red-300 hover:bg-red-50/50 transition-all flex items-center gap-1.5"
                        onClick={() => !readOnly && removeCloudSkill(i)}
                        title={readOnly ? skill : 'Click to remove'}
                      >
                        {skill}
                        {!readOnly && <span className="text-xs opacity-50">×</span>}
                      </div>
                    ))}
                    {(resume.cloudSkills || []).length === 0 && (
                      <span className="px-2.5 py-1.5 text-xs text-muted italic">
                        No cloud skills assigned
                      </span>
                    )}
                  </div>
                </div>

                {!readOnly && (
                  <div>
                    <h4 className="text-xs font-medium text-muted mb-1.5">Available Skills (click to assign)</h4>
                    <div className="flex flex-wrap gap-1">
                      {resume.skills.flatMap(cat => cat.skills).map((skill, idx) => {
                        const isAssigned = resume.templateSkills?.includes(skill) || resume.cloudSkills?.includes(skill);
                        return (
                          <button
                            key={idx}
                            disabled={isAssigned}
                            onClick={() => assignSkillToNextSlot(skill)}
                            className={`px-2 py-1 text-xs rounded-md transition-all ${
                              isAssigned
                                ? 'opacity-40 line-through text-muted cursor-not-allowed'
                                : 'text-secondary hover:bg-accent-100/80 dark:hover:bg-accent-500/15 hover:text-accent-600 dark:hover:text-accent-400 cursor-pointer'
                            }`}
                          >
                            {skill}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                {resume.skills.map((category, index) => (
                  <div key={category.id}>
                    <h4 className="text-xs font-medium text-muted mb-1.5">{category.name}</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {category.skills.map((skill, skillIndex) => (
                        editingSkill?.categoryIndex === index &&
                        editingSkill.skillIndex === skillIndex ? (
                          <div key={skillIndex} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={editingSkill.value}
                              onChange={(e) => setEditingSkill({ ...editingSkill, value: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  saveEditedSkill();
                                }
                                if (e.key === 'Escape') {
                                  setEditingSkill(null);
                                }
                              }}
                              autoFocus
                              className="px-2.5 py-1 text-xs glass-input rounded-lg min-w-[140px]"
                            />
                            <button
                              onClick={saveEditedSkill}
                              className="px-2 py-1 text-xs rounded-md bg-accent-100/80 dark:bg-accent-500/20 text-accent-600 dark:text-accent-400 hover:bg-accent-200/80 dark:hover:bg-accent-500/30 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingSkill(null)}
                              className="px-2 py-1 text-xs rounded-md text-muted hover:text-secondary transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span
                            key={skillIndex}
                            className="px-2.5 py-1 bg-accent-50/80 dark:bg-accent-500/15 text-accent-600 dark:text-accent-400 rounded-lg text-xs cursor-pointer hover:bg-accent-100/80 dark:hover:bg-accent-500/25 transition-colors"
                            onClick={() => {
                              if (!readOnly) {
                                setEditingSkill({ categoryIndex: index, skillIndex, value: skill });
                                setAddingSkill(null);
                              }
                            }}
                          >
                            {skill}
                          </span>
                        )
                      ))}
                      {!readOnly && (
                        <>
                          {addingSkill?.categoryIndex === index ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={addingSkill.value}
                                onChange={(e) => setAddingSkill({ ...addingSkill, value: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    saveAddedSkill();
                                  }
                                  if (e.key === 'Escape') {
                                    setAddingSkill(null);
                                  }
                                }}
                                autoFocus
                                className="px-2.5 py-1 text-xs glass-input rounded-lg min-w-[140px]"
                                placeholder="Add new skill..."
                              />
                              <button
                                onClick={saveAddedSkill}
                                className="px-2 py-1 text-xs rounded-md bg-accent-100/80 dark:bg-accent-500/20 text-accent-600 dark:text-accent-400 hover:bg-accent-200/80 dark:hover:bg-accent-500/30 transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setAddingSkill(null)}
                                className="px-2 py-1 text-xs rounded-md text-muted hover:text-secondary transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setAddingSkill({ categoryIndex: index, value: '' });
                                setEditingSkill(null);
                              }}
                              className="px-2.5 py-1 border border-dashed border-gray-300/50 dark:border-dark-border/50 text-muted rounded-lg text-xs hover:border-accent-400/50 dark:hover:border-accent-500/50 hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
                            >
                              + Add
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <OriginalBlock
            section="skills"
            hasOriginal={!!originalResume}
            expandedOriginals={expandedOriginals}
            toggleOriginalExpanded={toggleOriginalExpanded}
            content={
              <div>
                {originalResume?.skills.map((category) => (
                  <div key={category.id} className="mb-2">
                    <h4 className="text-xs font-medium text-muted mb-1.5">{category.name}</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {category.skills.map((skill, i) => (
                        <span key={i} className="px-2.5 py-1 bg-amber-100/50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg text-xs">
                          {skill}
                        </span>
                      ))}
                    </div>
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
