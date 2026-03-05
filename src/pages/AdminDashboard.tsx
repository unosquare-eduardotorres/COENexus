import { useState, useCallback } from 'react';
import {
  ResumeTemplate,
  ValidationRule,
  ContentGuideline,
  AIConfig,
} from '../types';
import {
  getDefaultTemplate,
  saveTemplate,
  resetTemplate,
} from '../data/mockTemplates';
import { aiService } from '../services/aiService';
import BatchProcessing from '../components/BatchProcessing';
import { sampleBatchJobs } from '../data/mockResumes';

interface AdminDashboardProps {
  onNavigateToResume: (resumeId: string) => void;
}

export default function AdminDashboard({ onNavigateToResume }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'template' | 'validation' | 'guidelines' | 'ai' | 'batch'>('template');
  const [template, setTemplate] = useState<ResumeTemplate>(getDefaultTemplate());
  const [aiConfig, setAiConfig] = useState<AIConfig>(aiService.getConfig());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleSaveTemplate = useCallback(() => {
    setSaveStatus('saving');
    saveTemplate(template);
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  }, [template]);

  const handleResetTemplate = useCallback(() => {
    if (confirm('Are you sure you want to reset to the default template? This cannot be undone.')) {
      const defaultTemplate = resetTemplate();
      setTemplate(defaultTemplate);
    }
  }, []);

  const updateValidationRule = useCallback(
    (ruleId: string, updates: Partial<ValidationRule>) => {
      setTemplate((prev) => ({
        ...prev,
        globalValidationRules: prev.globalValidationRules.map((rule) =>
          rule.id === ruleId ? { ...rule, ...updates } : rule
        ),
      }));
    },
    []
  );

  const updateGuideline = useCallback(
    (guidelineId: string, updates: Partial<ContentGuideline>) => {
      setTemplate((prev) => ({
        ...prev,
        contentGuidelines: prev.contentGuidelines.map((g) =>
          g.id === guidelineId ? { ...g, ...updates } : g
        ),
      }));
    },
    []
  );

  const handleSaveAIConfig = useCallback(() => {
    aiService.updateConfig(aiConfig);
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  }, [aiConfig]);

  const handleStartBatch = useCallback((files: File[], jobName: string) => {
    console.log('Starting batch:', jobName, files);
  }, []);

  const handleCancelJob = useCallback((jobId: string) => {
    console.log('Cancelling job:', jobId);
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'template':
        return (
          <div className="space-y-5">
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-primary mb-4">Template Information</h3>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={template.name}
                    onChange={(e) =>
                      setTemplate((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="glass-input w-full px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">
                    Version
                  </label>
                  <input
                    type="text"
                    value={template.version}
                    onChange={(e) =>
                      setTemplate((prev) => ({ ...prev, version: e.target.value }))
                    }
                    className="glass-input w-full px-3 py-2 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-muted mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={template.description}
                    onChange={(e) =>
                      setTemplate((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={2}
                    className="glass-input w-full px-3 py-2 text-sm resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-primary mb-4">Resume Sections</h3>
              <div className="space-y-2">
                {template.sections.map((section) => (
                  <div
                    key={section.id}
                    className="flex items-center justify-between p-3 bg-white/50 dark:bg-dark-hover/30 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-accent-100/80 dark:bg-accent-500/20 flex items-center justify-center text-accent-600 dark:text-accent-400 text-xs font-semibold">
                        {section.order}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-primary">{section.name}</h4>
                        <p className="text-xs text-muted">
                          {section.fields.length} field(s) •{' '}
                          {section.required ? 'Required' : 'Optional'}
                        </p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-secondary">
                      <input
                        type="checkbox"
                        checked={section.required}
                        onChange={(e) => {
                          setTemplate((prev) => ({
                            ...prev,
                            sections: prev.sections.map((s) =>
                              s.id === section.id
                                ? { ...s, required: e.target.checked }
                                : s
                            ),
                          }));
                        }}
                        className="w-3.5 h-3.5 text-accent-600 rounded focus:ring-accent-500"
                      />
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
            <p className="text-xs text-muted mb-5">
              Configure the validation rules that will be applied to all transformed resumes.
            </p>
            <div className="space-y-3">
              {template.globalValidationRules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-3 rounded-xl border ${
                    rule.enabled
                      ? 'border-accent-200/50 dark:border-accent-500/30 bg-accent-50/30 dark:bg-accent-500/10'
                      : 'border-gray-200/50 dark:border-dark-border/50 bg-white/50 dark:bg-dark-hover/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={(e) =>
                            updateValidationRule(rule.id, { enabled: e.target.checked })
                          }
                          className="w-4 h-4 text-accent-600 rounded focus:ring-accent-500"
                        />
                        <div>
                          <h4 className="text-sm font-medium text-primary">{rule.name}</h4>
                          <p className="text-xs text-muted mt-0.5">{rule.errorMessage}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
                          rule.severity === 'error'
                            ? 'bg-red-100/80 dark:bg-red-500/20 text-red-600 dark:text-red-400'
                            : 'bg-amber-100/80 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {rule.severity}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-100/80 dark:bg-dark-muted/30 text-gray-600 dark:text-gray-400 rounded-full">
                        {rule.type}
                      </span>
                    </div>
                  </div>
                  {rule.enabled && rule.config && (
                    <div className="mt-2.5 pl-6 grid grid-cols-2 gap-2.5 text-xs">
                      {rule.config.minLength !== undefined && (
                        <div className="flex items-center gap-2">
                          <label className="text-muted">Min:</label>
                          <input
                            type="number"
                            value={rule.config.minLength}
                            onChange={(e) =>
                              updateValidationRule(rule.id, {
                                config: { ...rule.config, minLength: parseInt(e.target.value) },
                              })
                            }
                            className="w-16 px-2 py-1 glass-input text-xs"
                          />
                        </div>
                      )}
                      {rule.config.maxLength !== undefined && (
                        <div className="flex items-center gap-2">
                          <label className="text-muted">Max:</label>
                          <input
                            type="number"
                            value={rule.config.maxLength}
                            onChange={(e) =>
                              updateValidationRule(rule.id, {
                                config: { ...rule.config, maxLength: parseInt(e.target.value) },
                              })
                            }
                            className="w-16 px-2 py-1 glass-input text-xs"
                          />
                        </div>
                      )}
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
            <p className="text-xs text-muted mb-5">
              Define content guidelines that help ensure consistency across all resumes.
            </p>
            <div className="space-y-4">
              {template.contentGuidelines.map((guideline) => (
                <div
                  key={guideline.id}
                  className={`p-3 rounded-xl border ${
                    guideline.enabled
                      ? 'border-emerald-200/50 dark:border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-500/10'
                      : 'border-gray-200/50 dark:border-dark-border/50 bg-white/50 dark:bg-dark-hover/30'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={guideline.enabled}
                      onChange={(e) =>
                        updateGuideline(guideline.id, { enabled: e.target.checked })
                      }
                      className="w-4 h-4 mt-0.5 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-primary">{guideline.name}</h4>
                        <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-100/80 dark:bg-dark-muted/30 text-muted rounded-full">
                          {guideline.category}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-0.5">{guideline.description}</p>

                      {guideline.examples.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {guideline.examples.map((example, idx) => (
                            <div
                              key={idx}
                              className="bg-white/60 dark:bg-dark-surface/60 rounded-lg p-2.5 border border-gray-100/50 dark:border-dark-border/30"
                            >
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <span className="text-[10px] font-medium text-red-500 dark:text-red-400 uppercase">
                                    Avoid
                                  </span>
                                  <p className="text-xs text-secondary mt-0.5 line-through">
                                    {example.bad}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-[10px] font-medium text-emerald-500 dark:text-emerald-400 uppercase">
                                    Preferred
                                  </span>
                                  <p className="text-xs text-secondary mt-0.5">{example.good}</p>
                                </div>
                              </div>
                              <p className="text-[10px] text-muted mt-1.5 italic">
                                {example.explanation}
                              </p>
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

      case 'ai':
        return (
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-primary mb-1">AI Configuration</h3>
            <p className="text-xs text-muted mb-5">
              Configure the Claude AI integration for resume transformation and suggestions.
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-muted mb-2">
                  Provider Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    aiConfig.provider === 'local'
                      ? 'border-accent-300/50 dark:border-accent-500/30 bg-accent-50/30 dark:bg-accent-500/10'
                      : 'border-gray-200/50 dark:border-dark-border/50 bg-white/50 dark:bg-dark-hover/30 hover:bg-white/80 dark:hover:bg-dark-hover/50'
                  }`}>
                    <input
                      type="radio"
                      name="provider"
                      value="local"
                      checked={aiConfig.provider === 'local'}
                      onChange={() => setAiConfig((prev) => ({ ...prev, provider: 'local' }))}
                      className="w-3.5 h-3.5 text-accent-600"
                    />
                    <div>
                      <span className="text-sm font-medium text-primary">Local (Claude Max)</span>
                      <p className="text-xs text-muted">Use your local instance</p>
                    </div>
                  </label>
                  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    aiConfig.provider === 'cloud'
                      ? 'border-accent-300/50 dark:border-accent-500/30 bg-accent-50/30 dark:bg-accent-500/10'
                      : 'border-gray-200/50 dark:border-dark-border/50 bg-white/50 dark:bg-dark-hover/30 hover:bg-white/80 dark:hover:bg-dark-hover/50'
                  }`}>
                    <input
                      type="radio"
                      name="provider"
                      value="cloud"
                      checked={aiConfig.provider === 'cloud'}
                      onChange={() => setAiConfig((prev) => ({ ...prev, provider: 'cloud' }))}
                      className="w-3.5 h-3.5 text-accent-600"
                    />
                    <div>
                      <span className="text-sm font-medium text-primary">Cloud API</span>
                      <p className="text-xs text-muted">Connect to Anthropic's API</p>
                    </div>
                  </label>
                </div>
              </div>

              {aiConfig.provider === 'local' && (
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">
                    Local Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={aiConfig.localEndpoint || ''}
                    onChange={(e) =>
                      setAiConfig((prev) => ({ ...prev, localEndpoint: e.target.value }))
                    }
                    placeholder="http://localhost:8080/v1"
                    className="glass-input w-full px-3 py-2 text-sm"
                  />
                </div>
              )}

              {aiConfig.provider === 'cloud' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={aiConfig.cloudApiKey || ''}
                      onChange={(e) =>
                        setAiConfig((prev) => ({ ...prev, cloudApiKey: e.target.value }))
                      }
                      placeholder="sk-ant-..."
                      className="glass-input w-full px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1.5">
                      Cloud Endpoint (Optional)
                    </label>
                    <input
                      type="text"
                      value={aiConfig.cloudEndpoint || ''}
                      onChange={(e) =>
                        setAiConfig((prev) => ({ ...prev, cloudEndpoint: e.target.value }))
                      }
                      placeholder="https://api.anthropic.com/v1"
                      className="glass-input w-full px-3 py-2 text-sm"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">Model</label>
                <select
                  value={aiConfig.model}
                  onChange={(e) => setAiConfig((prev) => ({ ...prev, model: e.target.value }))}
                  className="glass-select w-full px-3 py-2 text-sm"
                >
                  <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                  <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                  <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">
                    Temperature: {aiConfig.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={aiConfig.temperature}
                    onChange={(e) =>
                      setAiConfig((prev) => ({
                        ...prev,
                        temperature: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-accent-500"
                  />
                  <div className="flex justify-between text-[10px] text-muted mt-1">
                    <span>Precise</span>
                    <span>Creative</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">
                    Max Tokens
                  </label>
                  <input
                    type="number"
                    value={aiConfig.maxTokens}
                    onChange={(e) =>
                      setAiConfig((prev) => ({
                        ...prev,
                        maxTokens: parseInt(e.target.value),
                      }))
                    }
                    className="glass-input w-full px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveAIConfig}
                className="px-4 py-2 bg-accent-500 text-white text-sm rounded-xl font-medium hover:bg-accent-600 transition-colors"
              >
                Save AI Configuration
              </button>
            </div>
          </div>
        );

      case 'batch':
        return (
          <BatchProcessing
            onStartBatch={handleStartBatch}
            batchJobs={sampleBatchJobs}
            onViewResume={onNavigateToResume}
            onCancelJob={handleCancelJob}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen gradient-subtle">
      <header className="glass-nav sticky top-14 z-30">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-primary">Admin Dashboard</h1>
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
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex gap-5">
          <nav className="w-56 flex-shrink-0">
            <div className="glass-card overflow-hidden">
              {[
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
                { id: 'ai', label: 'AI Configuration', icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ) },
                { id: 'batch', label: 'Batch Processing', icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                ) },
              ].map((tab) => (
                <button
                  key={tab.id}
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
          </nav>

          <main className="flex-1">{renderTabContent()}</main>
        </div>
      </div>
    </div>
  );
}
