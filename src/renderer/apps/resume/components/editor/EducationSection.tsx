import { StructuredResume, EducationEntry } from '../../types';
import { EditableText, SectionHeader, OriginalBlock, EditorSharedProps } from './EditorHelpers';

interface EducationSectionProps extends Omit<EditorSharedProps, 'getSuggestionForSection' | 'onRequestAISuggestion' | 'onSelectSuggestion'> {
  resume: StructuredResume;
  updateEducation: (index: number, field: keyof EducationEntry, value: string) => void;
  originalResume?: StructuredResume | null;
}

export function EducationSection({
  resume,
  updateEducation,
  originalResume,
  editingField,
  setEditingField,
  expandedSections,
  toggleSection,
  expandedOriginals,
  toggleOriginalExpanded,
  readOnly,
}: EducationSectionProps) {
  return (
    <div className="glass-card overflow-hidden">
      <SectionHeader
        title="Academic Background"
        section="education"
        expandedSections={expandedSections}
        toggleSection={toggleSection}
        icon={
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
        }
      />
      {expandedSections.has('education') && (
        <>
          <div className="p-3 space-y-3">
            {resume.education.map((edu, index) => (
              <div key={edu.id} className="p-3 bg-white/50 dark:bg-dark-hover/30 rounded-xl border border-gray-100/50 dark:border-dark-border/30">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-medium text-primary">
                      <EditableText
                        value={edu.degree}
                        fieldKey={`edu-${index}-degree`}
                        onChange={(v) => updateEducation(index, 'degree', v)}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        readOnly={readOnly}
                      />
                      {' in '}
                      <EditableText
                        value={edu.field}
                        fieldKey={`edu-${index}-field`}
                        onChange={(v) => updateEducation(index, 'field', v)}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        readOnly={readOnly}
                      />
                    </h4>
                    <p className="text-xs text-muted">
                      <EditableText
                        value={edu.institution}
                        fieldKey={`edu-${index}-institution`}
                        onChange={(v) => updateEducation(index, 'institution', v)}
                        editingField={editingField}
                        setEditingField={setEditingField}
                        readOnly={readOnly}
                      />
                    </p>
                    {edu.gpa && (
                      <p className="text-xs text-muted">
                        GPA:{' '}
                        <EditableText
                          value={edu.gpa}
                          fieldKey={`edu-${index}-gpa`}
                          onChange={(v) => updateEducation(index, 'gpa', v)}
                          editingField={editingField}
                          setEditingField={setEditingField}
                          readOnly={readOnly}
                        />
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted">
                    <EditableText
                      value={edu.graduationDate}
                      fieldKey={`edu-${index}-date`}
                      onChange={(v) => updateEducation(index, 'graduationDate', v)}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      readOnly={readOnly}
                    />
                  </span>
                </div>
              </div>
            ))}
            {resume.education.length === 0 && (
              <div className="p-4 flex items-center gap-2.5 text-muted">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs italic">No academic background was found in the original resume</span>
              </div>
            )}
          </div>
          <OriginalBlock
            section="education"
            hasOriginal={!!originalResume}
            expandedOriginals={expandedOriginals}
            toggleOriginalExpanded={toggleOriginalExpanded}
            content={
              <div className="space-y-3">
                {originalResume?.education.map((edu) => (
                  <div key={edu.id} className="p-3 bg-amber-100/30 dark:bg-amber-500/10 rounded-xl border border-amber-200/50 dark:border-amber-500/20">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300">
                          {edu.degree} in {edu.field}
                        </h4>
                        <p className="text-xs text-amber-600 dark:text-amber-500">{edu.institution}</p>
                        {edu.gpa && (
                          <p className="text-xs text-amber-600 dark:text-amber-500">GPA: {edu.gpa}</p>
                        )}
                      </div>
                      <span className="text-xs text-amber-600 dark:text-amber-500">{edu.graduationDate}</span>
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
