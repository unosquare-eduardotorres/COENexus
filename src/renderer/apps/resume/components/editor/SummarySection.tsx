import { StructuredResume } from '../../types';
import { EditableText, SectionHeader, OriginalBlock, AISuggestionsBlock, AISuggestionButton, EditorSharedProps } from './EditorHelpers';

interface SummarySectionProps extends EditorSharedProps {
  resume: StructuredResume;
  updateField: (field: string, value: string) => void;
  originalResume?: StructuredResume | null;
}

export function SummarySection({
  resume,
  updateField,
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
  onRequestAISuggestion,
}: SummarySectionProps) {
  return (
    <div className="glass-card overflow-hidden">
      <SectionHeader
        title="Profile"
        section="summary"
        expandedSections={expandedSections}
        toggleSection={toggleSection}
        icon={
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        }
      />
      {expandedSections.has('summary') && (
        <>
          <div className="p-3">
            <div className="relative">
              <EditableText
                value={resume.summary}
                fieldKey="summary"
                onChange={(v) => updateField('summary', v)}
                editingField={editingField}
                setEditingField={setEditingField}
                readOnly={readOnly}
                multiline
                placeholder="Enter professional summary..."
              />
              {!readOnly && (
                <div className="absolute top-0 right-0">
                  <AISuggestionButton onClick={() => onRequestAISuggestion('summary', undefined, resume.summary)} />
                </div>
              )}
            </div>
            <AISuggestionsBlock
              suggestion={getSuggestionForSection('summary')}
              onSelectSuggestion={onSelectSuggestion}
            />
          </div>
          <OriginalBlock
            section="summary"
            hasOriginal={!!originalResume}
            expandedOriginals={expandedOriginals}
            toggleOriginalExpanded={toggleOriginalExpanded}
            content={<p className="text-sm text-secondary italic">{originalResume?.summary}</p>}
          />
        </>
      )}
    </div>
  );
}
