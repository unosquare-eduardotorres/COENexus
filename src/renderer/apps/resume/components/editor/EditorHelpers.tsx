import { AISuggestion } from '../../types';

interface EditableTextProps {
  value: string;
  fieldKey: string;
  onChange: (value: string) => void;
  editingField: string | null;
  setEditingField: (field: string | null) => void;
  readOnly: boolean;
  multiline?: boolean;
  placeholder?: string;
}

export function EditableText({
  value,
  fieldKey,
  onChange,
  editingField,
  setEditingField,
  readOnly,
  multiline = false,
  placeholder = '',
}: EditableTextProps) {
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
      className="cursor-pointer text-sm text-secondary hover:bg-accent-50/50 dark:hover:bg-accent-500/10 px-1.5 py-0.5 rounded-lg transition-colors inline-block"
      title="Click to edit"
    >
      {value || <span className="text-muted italic">{placeholder || 'Click to add...'}</span>}
    </span>
  );
}

interface SectionHeaderProps {
  title: string;
  section: string;
  icon: React.ReactNode;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
}

export function SectionHeader({ title, section, icon, expandedSections, toggleSection }: SectionHeaderProps) {
  return (
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
      <div className="flex items-center gap-2">
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
    </div>
  );
}

interface OriginalBlockProps {
  section: string;
  content: React.ReactNode;
  expandedOriginals: Set<string>;
  toggleOriginalExpanded: (section: string) => void;
  hasOriginal: boolean;
}

export function OriginalBlock({ section, content, expandedOriginals, toggleOriginalExpanded, hasOriginal }: OriginalBlockProps) {
  if (!hasOriginal) return null;
  const isExpanded = expandedOriginals.has(section);

  return (
    <div className="mx-3 mb-3 rounded-xl border border-amber-200/40 dark:border-amber-500/20 overflow-hidden">
      <button
        onClick={() => toggleOriginalExpanded(section)}
        className="w-full flex items-center justify-between px-3 py-2 bg-amber-50/60 dark:bg-amber-500/10 hover:bg-amber-50/80 dark:hover:bg-amber-500/15 transition-colors"
      >
        <span className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Original Version
        </span>
        <svg
          className={`w-3.5 h-3.5 text-amber-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="p-3 bg-amber-50/30 dark:bg-amber-500/5">
          {content}
        </div>
      )}
    </div>
  );
}

interface AISuggestionsBlockProps {
  suggestion: AISuggestion | undefined;
  onSelectSuggestion: (suggestionId: string, optionIndex: number) => void;
}

export function AISuggestionsBlock({ suggestion, onSelectSuggestion }: AISuggestionsBlockProps) {
  if (!suggestion) return null;

  return (
    <div className="mt-2.5 p-2.5 bg-violet-50/50 dark:bg-violet-500/10 border border-violet-200/50 dark:border-violet-500/30 rounded-xl">
      <div className="flex items-center gap-1.5 mb-2">
        <svg className="w-3.5 h-3.5 text-violet-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z" />
          <path d="M10 5a1 1 0 011 1v3.586l2.707 2.707a1 1 0 01-1.414 1.414l-3-3A1 1 0 019 10V6a1 1 0 011-1z" />
        </svg>
        <span className="text-xs font-medium text-violet-600 dark:text-violet-400">AI Suggestions</span>
      </div>
      <div className="space-y-1.5">
        {suggestion.suggestions.map((option, index) => (
          <div
            key={option.id}
            onClick={() => onSelectSuggestion(suggestion.id, index)}
            className={`p-2 rounded-lg border cursor-pointer transition-all ${
              suggestion.selectedIndex === index
                ? 'border-violet-400/50 bg-violet-100/50 dark:bg-violet-500/20'
                : 'border-gray-200/50 dark:border-dark-border/50 bg-white/60 dark:bg-dark-surface/60 hover:border-violet-300/50 dark:hover:border-violet-500/30'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-secondary flex-1">{option.text}</p>
              <div className="flex items-center gap-1">
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    option.type === 'rephrase'
                      ? 'bg-accent-100/80 dark:bg-accent-500/20 text-accent-600 dark:text-accent-400'
                      : option.type === 'extend'
                      ? 'bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : option.type === 'condense'
                      ? 'bg-amber-100/80 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      : 'bg-violet-100/80 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400'
                  }`}
                >
                  {option.type}
                </span>
                <span className="text-xs text-muted">{Math.round(option.confidence * 100)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const AISuggestionButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="p-1.5 text-violet-500 hover:bg-violet-50/50 dark:hover:bg-violet-500/10 rounded-lg transition-colors"
    title="Get AI suggestions"
  >
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
    </svg>
  </button>
);

export interface EditorSharedProps {
  editingField: string | null;
  setEditingField: (field: string | null) => void;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  expandedOriginals: Set<string>;
  toggleOriginalExpanded: (section: string) => void;
  readOnly: boolean;
  onSelectSuggestion: (suggestionId: string, optionIndex: number) => void;
  getSuggestionForSection: (sectionType: string, sectionId?: string) => AISuggestion | undefined;
  onRequestAISuggestion: (sectionType: string, sectionId?: string, text?: string) => void;
}
