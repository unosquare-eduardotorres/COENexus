import { type RefinementMode } from '../types';
import { getPrompts } from '../data/defaultPrompts';
import { getMatchPrompts } from '../data/defaultMatchPrompts';
import DatabaseSharingPanel from '../components/settings/DatabaseSharingPanel';
import ConfirmModal from '../components/datasync/ConfirmModal';
import { ChevronIcon } from '../components/shared/icons';
import { useAdminDashboard, type AdminTab } from '../hooks/useAdminDashboard';
import PromptsTab from '../components/settings/PromptsTab';
import AITab from '../components/settings/AITab';
import VectorizationTab from '../components/settings/VectorizationTab';

interface AdminDashboardProps {
  onNavigateToResume: (resumeId: string) => void;
}

export default function AdminDashboard({ onNavigateToResume: _onNavigateToResume }: AdminDashboardProps) {
  const {
    tabs: { activeTab, setActiveTab },
    template: { template, setTemplate, handleSaveTemplate, handleResetTemplate, updateValidationRule, updateGuideline },
    ai: { aiConfig, setAiConfig, handleSaveAIConfig },
    prompts: { prompts, setPrompts, expandedPromptId, editingPromptId, setEditingPromptId, handleTogglePromptExpand, handleEditPrompt, handleSavePrompt, handleResetPrompt, handleResetAllPrompts },
    matchPrompts: { matchPrompts, setMatchPrompts, expandedMatchPromptId, editingMatchPromptId, setEditingMatchPromptId, activeContextTab, setActiveContextTab, handleToggleMatchPromptExpand, handleEditMatchPrompt, handleSaveMatchPrompt, handleResetMatchPrompt },
    outputTemplate: { outputTemplateName, templatePreviewRef, handleTemplateUpload, handleResetOutputTemplate },
    vectorization: { vecConfig, setVecConfig, handleSaveVecModel, voyageKeyConfigured, voyageKeyMasked, voyageKeySource },
    confirm: { confirmAction, setConfirmAction, handleConfirmAction },
    saveStatus,
  } = useAdminDashboard();

  const getModeIcon = (mode: RefinementMode) => {
    if (mode === 'professional-polish') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      );
    }
    if (mode === 'impact-focused') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      );
    }
    if (mode === 'ats-optimized') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'template':
        return (
          <div className="space-y-5">
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-primary mb-4">Template Information</h3>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">Template Name</label>
                  <input type="text" value={template.name} onChange={(e) => setTemplate((prev) => ({ ...prev, name: e.target.value }))} className="glass-input w-full px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">Version</label>
                  <input type="text" value={template.version} onChange={(e) => setTemplate((prev) => ({ ...prev, version: e.target.value }))} className="glass-input w-full px-3 py-2 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted mb-1.5">Description</label>
                  <textarea value={template.description} onChange={(e) => setTemplate((prev) => ({ ...prev, description: e.target.value }))} rows={2} className="glass-input w-full px-3 py-2 text-sm resize-none" />
                </div>
              </div>
            </div>
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-primary mb-4">Resume Sections</h3>
              <div className="space-y-2">
                {template.sections.map((section) => (
                  <div key={section.id} className="flex items-center justify-between p-3 bg-white/50 dark:bg-dark-hover/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-accent-100/80 dark:bg-accent-500/20 flex items-center justify-center text-accent-600 dark:text-accent-400 text-xs font-semibold">{section.order}</div>
                      <div>
                        <h4 className="text-sm font-medium text-primary">{section.name}</h4>
                        <p className="text-xs text-muted">{section.fields.length} field(s) • {section.required ? 'Required' : 'Optional'}</p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-secondary">
                      <input type="checkbox" checked={section.required} onChange={(e) => { setTemplate((prev) => ({ ...prev, sections: prev.sections.map((s) => s.id === section.id ? { ...s, required: e.target.checked } : s) })); }} className="w-3.5 h-3.5 text-accent-600 rounded focus:ring-accent-500" />
                      Required
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'validation':
        return (
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-primary mb-1">Validation Rules</h3>
            <p className="text-xs text-muted mb-5">Configure the validation rules that will be applied to all transformed resumes.</p>
            <div className="space-y-3">
              {template.globalValidationRules.map((rule) => (
                <div key={rule.id} className={`p-3 rounded-xl border ${rule.enabled ? 'border-accent-200/50 dark:border-accent-500/30 bg-accent-50/30 dark:bg-accent-500/10' : 'border-gray-200/50 dark:border-dark-border/50 bg-white/50 dark:bg-dark-hover/30'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5">
                        <input type="checkbox" checked={rule.enabled} onChange={(e) => updateValidationRule(rule.id, { enabled: e.target.checked })} className="w-4 h-4 text-accent-600 rounded focus:ring-accent-500" />
                        <div>
                          <h4 className="text-sm font-medium text-primary">{rule.name}</h4>
                          <p className="text-xs text-muted mt-0.5">{rule.errorMessage}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${rule.severity === 'error' ? 'bg-red-100/80 dark:bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-amber-100/80 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'}`}>{rule.severity}</span>
                      <span className="px-2 py-0.5 text-xs font-medium bg-gray-100/80 dark:bg-dark-muted/30 text-gray-700 dark:text-gray-300 rounded-full">{rule.type}</span>
                    </div>
                  </div>
                  {rule.enabled && rule.config && (
                    <div className="mt-2.5 pl-6 grid grid-cols-2 gap-2.5 text-xs">
                      {rule.config.minLength !== undefined && (<div className="flex items-center gap-2"><label className="text-muted">Min:</label><input type="number" value={rule.config.minLength} onChange={(e) => updateValidationRule(rule.id, { config: { ...rule.config, minLength: parseInt(e.target.value) } })} className="w-16 px-2 py-1 glass-input text-xs" /></div>)}
                      {rule.config.maxLength !== undefined && (<div className="flex items-center gap-2"><label className="text-muted">Max:</label><input type="number" value={rule.config.maxLength} onChange={(e) => updateValidationRule(rule.id, { config: { ...rule.config, maxLength: parseInt(e.target.value) } })} className="w-16 px-2 py-1 glass-input text-xs" /></div>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      case 'guidelines':
        return (
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-primary mb-1">Content Guidelines</h3>
            <p className="text-xs text-muted mb-5">Define content guidelines that help ensure consistency across all resumes.</p>
            <div className="space-y-4">
              {template.contentGuidelines.map((guideline) => (
                <div key={guideline.id} className={`p-3 rounded-xl border ${guideline.enabled ? 'border-emerald-200/50 dark:border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-500/10' : 'border-gray-200/50 dark:border-dark-border/50 bg-white/50 dark:bg-dark-hover/30'}`}>
                  <div className="flex items-start gap-2.5">
                    <input type="checkbox" checked={guideline.enabled} onChange={(e) => updateGuideline(guideline.id, { enabled: e.target.checked })} className="w-4 h-4 mt-0.5 text-emerald-600 rounded focus:ring-emerald-500" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-primary">{guideline.name}</h4>
                        <span className="px-2 py-0.5 text-xs font-medium bg-gray-100/80 dark:bg-dark-muted/30 text-muted rounded-full">{guideline.category}</span>
                      </div>
                      <p className="text-xs text-muted mt-0.5">{guideline.description}</p>
                      {guideline.examples.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {guideline.examples.map((example, idx) => (
                            <div key={idx} className="bg-white/60 dark:bg-dark-surface/60 rounded-lg p-2.5 border border-gray-100/50 dark:border-dark-border/30">
                              <div className="grid grid-cols-2 gap-3">
                                <div><span className="text-xs font-medium text-red-500 dark:text-red-400 uppercase">Avoid</span><p className="text-xs text-secondary mt-0.5 line-through">{example.bad}</p></div>
                                <div><span className="text-xs font-medium text-emerald-500 dark:text-emerald-400 uppercase">Preferred</span><p className="text-xs text-secondary mt-0.5">{example.good}</p></div>
                              </div>
                              <p className="text-xs text-muted mt-1.5 italic">{example.explanation}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'prompts':
        return (
          <PromptsTab
            prompts={prompts} setPrompts={setPrompts}
            expandedPromptId={expandedPromptId} editingPromptId={editingPromptId} setEditingPromptId={setEditingPromptId}
            handleTogglePromptExpand={handleTogglePromptExpand} handleEditPrompt={handleEditPrompt}
            handleSavePrompt={handleSavePrompt} handleResetPrompt={handleResetPrompt} handleResetAllPrompts={handleResetAllPrompts}
            matchPrompts={matchPrompts} setMatchPrompts={setMatchPrompts}
            expandedMatchPromptId={expandedMatchPromptId} editingMatchPromptId={editingMatchPromptId} setEditingMatchPromptId={setEditingMatchPromptId}
            activeContextTab={activeContextTab} setActiveContextTab={setActiveContextTab}
            handleToggleMatchPromptExpand={handleToggleMatchPromptExpand} handleEditMatchPrompt={handleEditMatchPrompt}
            handleSaveMatchPrompt={handleSaveMatchPrompt} handleResetMatchPrompt={handleResetMatchPrompt}
            getModeIcon={getModeIcon}
          />
        );
      case 'ai':
        return (
          <AITab aiConfig={aiConfig} setAiConfig={setAiConfig} handleSaveAIConfig={handleSaveAIConfig} />
        );
      case 'output-template':
        return (
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-primary mb-1">Output Template</h3>
            <p className="text-xs text-muted mb-5">Upload a custom DOCX template to use as the base for generated resumes.</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-white/50 dark:bg-dark-hover/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-100/80 dark:bg-accent-500/20 flex items-center justify-center text-accent-600 dark:text-accent-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  </div>
                  <div><h4 className="text-sm font-medium text-primary">{outputTemplateName}</h4><p className="text-xs text-muted">Current output template</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 text-xs font-medium text-accent-600 dark:text-accent-400 bg-accent-50/80 dark:bg-accent-500/10 rounded-lg cursor-pointer hover:bg-accent-100 dark:hover:bg-accent-500/20 transition-colors">
                    Upload New <input type="file" accept=".docx" onChange={handleTemplateUpload} className="hidden" />
                  </label>
                  <button onClick={handleResetOutputTemplate} className="px-3 py-1.5 text-xs text-secondary hover:text-primary hover:bg-white/50 dark:hover:bg-dark-hover/50 rounded-lg transition-colors">Reset</button>
                </div>
              </div>
              <div ref={templatePreviewRef} className="glass-panel-subtle rounded-xl overflow-auto max-h-[600px] p-4" />
            </div>
          </div>
        );
      case 'vectorization':
        return (
          <VectorizationTab
            vecConfig={vecConfig} setVecConfig={setVecConfig} handleSaveVecModel={handleSaveVecModel}
            voyageKeyConfigured={voyageKeyConfigured} voyageKeyMasked={voyageKeyMasked} voyageKeySource={voyageKeySource}
          />
        );
      case 'database-sharing':
        return <DatabaseSharingPanel />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen gradient-subtle">
      <header className="glass-nav sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-primary">Settings</h1>
              <p className="text-xs text-muted">
                Configure templates, validation rules, and AI settings
              </p>
            </div>
            <div className="flex items-center gap-2">
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Saved
                </span>
              )}
              <button
                onClick={handleResetTemplate}
                className="px-3 py-1.5 text-xs text-secondary hover:text-primary hover:bg-white/50 dark:hover:bg-dark-hover/50 rounded-lg transition-colors"
              >
                Reset
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={saveStatus === 'saving'}
                className="px-4 py-1.5 bg-accent-500 text-white text-xs font-medium rounded-lg hover:bg-accent-600 transition-colors disabled:opacity-50"
              >
                {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {saveStatus === 'saving'
              ? 'Saving settings.'
              : saveStatus === 'saved'
              ? 'Settings saved.'
              : `Viewing ${activeTab.replace('-', ' ')} settings.`}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex gap-5">
          <nav className="w-56 flex-shrink-0" aria-label="Settings sections">
            <div className="glass-card overflow-hidden" role="tablist" aria-orientation="vertical">
              {[
                { group: 'Content', items: [
                  { id: 'template', label: 'Template Structure', icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  ) },
                  { id: 'validation', label: 'Validation Rules', icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) },
                  { id: 'guidelines', label: 'Content Guidelines', icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  ) },
                  { id: 'output-template', label: 'Output Template', icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  ) },
                ]},
                { group: 'AI', items: [
                  { id: 'prompts', label: 'Prompts', icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  ) },
                  { id: 'ai', label: 'AI Configuration', icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  ) },
                  { id: 'vectorization', label: 'Vectorization', icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  ) },
                ]},
                { group: 'System', items: [
                  { id: 'database-sharing', label: 'Database Sharing', icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                    </svg>
                  ) },
                ]},
              ].map((group, groupIndex) => (
                <div key={group.group}>
                  {groupIndex > 0 && <div className="minimal-divider mx-3" />}
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold text-muted uppercase tracking-wider">{group.group}</p>
                  {group.items.map((tab) => (
                    <button
                      key={tab.id}
                      id={`admin-tab-${tab.id}`}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      aria-controls={`admin-tabpanel-${tab.id}`}
                      tabIndex={0}
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-all text-sm ${
                        activeTab === tab.id
                          ? 'bg-accent-50/80 dark:bg-accent-500/20 text-accent-700 dark:text-accent-400 border-l-2 border-accent-500'
                          : 'text-secondary hover:bg-white/50 dark:hover:bg-dark-hover/50'
                      }`}
                    >
                      {tab.icon}
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </nav>

          <main
            className="flex-1"
            id={`admin-tabpanel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`admin-tab-${activeTab}`}
          >
            {renderTabContent()}
          </main>
        </div>
      </div>
      {confirmAction === 'reset-template' && (
        <ConfirmModal
          title="Reset Template?"
          message="Are you sure you want to reset to the default template? This cannot be undone."
          confirmLabel="Reset Template"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}
      {confirmAction === 'reset-prompts' && (
        <ConfirmModal
          title="Reset All Prompts?"
          message="Are you sure you want to reset all prompts to defaults? Custom changes will be lost."
          confirmLabel="Reset Prompts"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={handleConfirmAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
