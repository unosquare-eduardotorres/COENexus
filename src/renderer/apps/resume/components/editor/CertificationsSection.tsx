import { StructuredResume, CertificationEntry } from '../../types';
import { EditableText, SectionHeader, OriginalBlock, EditorSharedProps } from './EditorHelpers';

interface CertificationsSectionProps extends Omit<EditorSharedProps, 'getSuggestionForSection' | 'onRequestAISuggestion' | 'onSelectSuggestion'> {
  resume: StructuredResume;
  updateCertification: (index: number, field: keyof CertificationEntry, value: string) => void;
  originalResume?: StructuredResume | null;
}

export function CertificationsSection({
  resume,
  updateCertification,
  originalResume,
  editingField,
  setEditingField,
  expandedSections,
  toggleSection,
  expandedOriginals,
  toggleOriginalExpanded,
  readOnly,
}: CertificationsSectionProps) {
  return (
    <div className="glass-card overflow-hidden">
      <SectionHeader
        title="Certifications"
        section="certifications"
        expandedSections={expandedSections}
        toggleSection={toggleSection}
        icon={
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
            />
          </svg>
        }
      />
      {expandedSections.has('certifications') && (
        <>
          <div className="p-3 space-y-2">
            {resume.certifications.map((cert, index) => (
              <div
                key={cert.id}
                className="flex items-center justify-between p-2.5 bg-white/50 dark:bg-dark-hover/30 rounded-xl"
              >
                <div>
                  <h4 className="text-sm font-medium text-primary">
                    <EditableText
                      value={cert.name}
                      fieldKey={`cert-${index}-name`}
                      onChange={(v) => updateCertification(index, 'name', v)}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      readOnly={readOnly}
                    />
                  </h4>
                  <p className="text-xs text-muted">
                    <EditableText
                      value={cert.issuer}
                      fieldKey={`cert-${index}-issuer`}
                      onChange={(v) => updateCertification(index, 'issuer', v)}
                      editingField={editingField}
                      setEditingField={setEditingField}
                      readOnly={readOnly}
                    />
                  </p>
                </div>
                <span className="text-xs text-muted">
                  <EditableText
                    value={cert.date}
                    fieldKey={`cert-${index}-date`}
                    onChange={(v) => updateCertification(index, 'date', v)}
                    editingField={editingField}
                    setEditingField={setEditingField}
                    readOnly={readOnly}
                  />
                </span>
              </div>
            ))}
            {resume.certifications.length === 0 && (
              <div className="p-4 flex items-center gap-2.5 text-muted">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs italic">No certifications were found in the original resume</span>
              </div>
            )}
          </div>
          <OriginalBlock
            section="certifications"
            hasOriginal={!!originalResume}
            expandedOriginals={expandedOriginals}
            toggleOriginalExpanded={toggleOriginalExpanded}
            content={
              <div className="space-y-2">
                {originalResume?.certifications.map((cert) => (
                  <div
                    key={cert.id}
                    className="flex items-center justify-between p-2.5 bg-amber-100/30 dark:bg-amber-500/10 rounded-xl border border-amber-200/50 dark:border-amber-500/20"
                  >
                    <div>
                      <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300">{cert.name}</h4>
                      <p className="text-xs text-amber-600 dark:text-amber-500">{cert.issuer}</p>
                    </div>
                    <span className="text-xs text-amber-600 dark:text-amber-500">{cert.date}</span>
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
