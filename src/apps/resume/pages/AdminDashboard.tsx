import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ResumeTemplate,
  ValidationRule,
  ContentGuideline,
  AIConfig,
  RefinementPrompt,
  RefinementMode,
  VectorizationConfig,
} from '../types';
import {
  getDefaultTemplate,
  saveTemplate,
  resetTemplate,
} from '../data/mockTemplates';
import { getPrompts, savePrompt, resetPrompt, resetAllPrompts } from '../data/defaultPrompts';
import { aiService } from '../services/aiService';
import { vectorizationConfigService } from '../services/vectorizationConfigService';

interface AdminDashboardProps {
  onNavigateToResume: (resumeId: string) => void;
}

export default function AdminDashboard({ onNavigateToResume: _onNavigateToResume }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'template' | 'validation' | 'guidelines' | 'prompts' | 'ai' | 'output-template' | 'vectorization'>('template');
  const [template, setTemplate] = useState<ResumeTemplate>(getDefaultTemplate());
  const [aiConfig, setAiConfig] = useState<AIConfig>(aiService.getConfig());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [prompts, setPrompts] = useState<RefinementPrompt[]>(getPrompts());
  const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [outputTemplateName, setOutputTemplateName] = useState<string>(
    localStorage.getItem('output_template_name') || 'USQ Resume Template.docx'
  );
  const [outputTemplateBuffer, setOutputTemplateBuffer] = useState<ArrayBuffer | null>(null);
  const templatePreviewRef = useRef<HTMLDivElement>(null);
  const [vecConfig, setVecConfig] = useState<VectorizationConfig>(vectorizationConfigService.getConfig());
  const [voyageKeyConfigured, setVoyageKeyConfigured] = useState(false);
  const [voyageKeyMasked, setVoyageKeyMasked] = useState('');
  const [voyageKeySource, setVoyageKeySource] = useState('');

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

  const handleTogglePromptExpand = useCallback((promptId: string) => {
    setExpandedPromptId((prev) => (prev === promptId ? null : promptId));
    setEditingPromptId(null);
  }, []);

  const handleEditPrompt = useCallback((promptId: string) => {
    setEditingPromptId(promptId);
  }, []);

  const handleSavePrompt = useCallback((prompt: RefinementPrompt) => {
    savePrompt(prompt);
    setPrompts(getPrompts());
    setEditingPromptId(null);
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  }, []);

  const handleResetPrompt = useCallback((promptId: string) => {
    const reset = resetPrompt(promptId);
    if (reset) {
      setPrompts(getPrompts());
      setSaveStatus('saving');
      setTimeout(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 500);
    }
  }, []);

  const handleResetAllPrompts = useCallback(() => {
    if (confirm('Are you sure you want to reset all prompts to defaults? Custom changes will be lost.')) {
      const defaults = resetAllPrompts();
      setPrompts(defaults);
      setExpandedPromptId(null);
      setEditingPromptId(null);
    }
  }, []);

  const handleTemplateUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.docx')) return;
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    localStorage.setItem('output_template_docx', base64);
    localStorage.setItem('output_template_name', file.name);
    setOutputTemplateName(file.name);
    setOutputTemplateBuffer(arrayBuffer);
  }, []);

  const handleResetOutputTemplate = useCallback(() => {
    localStorage.removeItem('output_template_docx');
    localStorage.removeItem('output_template_name');
    setOutputTemplateName('USQ Resume Template.docx');
    setOutputTemplateBuffer(null);
  }, []);

  useEffect(() => {
    if (activeTab === 'output-template' && !outputTemplateBuffer) {
      (async () => {
        try {
          const stored = localStorage.getItem('output_template_docx');
          let arrayBuffer: ArrayBuffer;
          if (stored) {
            const binary = atob(stored);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            arrayBuffer = bytes.buffer;
          } else {
            const res = await fetch('/templates/USQ Resume Template.docx');
            arrayBuffer = await res.arrayBuffer();
          }
          setOutputTemplateBuffer(arrayBuffer);
        } catch { /* silent */ }
      })();
    }
  }, [activeTab, outputTemplateBuffer]);

  useEffect(() => {
    if (outputTemplateBuffer && templatePreviewRef.current) {
      const container = templatePreviewRef.current;
      container.innerHTML = '';
      (async () => {
        const docxPreview = await import('docx-preview');
        await docxPreview.renderAsync(outputTemplateBuffer, container, undefined, {
          className: 'docx-preview',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
        });
      })();
    }
  }, [outputTemplateBuffer]);

  useEffect(() => {
    vectorizationConfigService.checkVoyageKey().then((result) => {
      setVoyageKeyConfigured(result.configured);
      if (result.maskedKey) setVoyageKeyMasked(result.maskedKey);
      if (result.source) setVoyageKeySource(result.source);
    });
  }, []);

  const handleSaveVecModel = useCallback(() => {
    vectorizationConfigService.saveModel(vecConfig.model);
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    }, 300);
  }, [vecConfig.model]);

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

      case 'prompts':
        return (
          <div className="space-y-5">
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-primary mb-1">AI Refinement Prompts</h3>
              <p className="text-xs text-muted mb-5">
                Configure the prompt templates used for each AI refinement mode. These prompts are sent to the AI model during resume enhancement.
              </p>
              <div className="space-y-3">
                {prompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className={`rounded-xl border transition-all ${
                      expandedPromptId === prompt.id
                        ? 'border-accent-200/50 dark:border-accent-500/30 bg-accent-50/30 dark:bg-accent-500/10'
                        : 'border-gray-200/50 dark:border-dark-border/50 bg-white/50 dark:bg-dark-hover/30'
                    }`}
                  >
                    <button
                      onClick={() => handleTogglePromptExpand(prompt.id)}
                      className="w-full flex items-center gap-3 p-3 text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-accent-100/80 dark:bg-accent-500/20 flex items-center justify-center text-accent-600 dark:text-accent-400 flex-shrink-0">
                        {getModeIcon(prompt.mode)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-primary">{prompt.name}</h4>
                        <p className="text-xs text-muted truncate">{prompt.description}</p>
                      </div>
                      <svg
                        className={`w-4 h-4 text-muted transition-transform ${expandedPromptId === prompt.id ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {expandedPromptId === prompt.id && (
                      <div className="px-3 pb-3 space-y-3">
                        <textarea
                          value={prompt.promptTemplate}
                          onChange={(e) => {
                            if (editingPromptId === prompt.id) {
                              setPrompts((prev) =>
                                prev.map((p) =>
                                  p.id === prompt.id ? { ...p, promptTemplate: e.target.value } : p
                                )
                              );
                            }
                          }}
                          readOnly={editingPromptId !== prompt.id}
                          rows={10}
                          className={`glass-input w-full px-3 py-2 font-mono text-xs resize-none ${
                            editingPromptId !== prompt.id ? 'opacity-75 cursor-default' : ''
                          }`}
                        />

                        <div className="flex flex-wrap gap-1.5">
                          {prompt.variables.map((variable) => (
                            <span
                              key={variable}
                              className="px-2 py-0.5 text-[10px] font-medium bg-accent-100/80 dark:bg-accent-500/20 text-accent-600 dark:text-accent-400 rounded-full"
                            >
                              {`{{${variable}}}`}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          {editingPromptId === prompt.id ? (
                            <>
                              <button
                                onClick={() => handleSavePrompt(prompt)}
                                className="px-3 py-1.5 bg-accent-500 text-white text-xs font-medium rounded-lg hover:bg-accent-600 transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingPromptId(null);
                                  setPrompts(getPrompts());
                                }}
                                className="px-3 py-1.5 text-xs text-secondary hover:text-primary hover:bg-white/50 dark:hover:bg-dark-hover/50 rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleEditPrompt(prompt.id)}
                              className="px-3 py-1.5 bg-accent-500 text-white text-xs font-medium rounded-lg hover:bg-accent-600 transition-colors"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            onClick={() => handleResetPrompt(prompt.id)}
                            className="px-3 py-1.5 text-xs text-secondary hover:text-primary hover:bg-white/50 dark:hover:bg-dark-hover/50 rounded-lg transition-colors"
                          >
                            Reset to Default
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleResetAllPrompts}
                className="px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-500/10 rounded-lg transition-colors font-medium"
              >
                Reset All to Defaults
              </button>
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
                  <label className="flex items-center gap-3 p-3 rounded-xl border transition-all border-gray-200/50 dark:border-dark-border/50 bg-white/50 dark:bg-dark-hover/30 opacity-50 cursor-not-allowed relative">
                    <input type="radio" name="provider" value="cloud" disabled className="w-3.5 h-3.5 text-gray-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-primary">Cloud API</span>
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full">In Development</span>
                      </div>
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
                    placeholder="/api/claude/v1"
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
                <label className="block text-xs font-medium text-muted mb-2">Model</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      id: 'claude-sonnet-4',
                      name: 'Sonnet 4',
                      badge: 'Balanced',
                      description: 'Best balance of quality and speed. Excellent at structured extraction and JSON output.',
                      strengths: ['Fast responses', 'Great at extraction', 'Reliable JSON'],
                      isRecommended: true,
                      selectedBorder: 'border-accent-500 bg-accent-50/40 dark:bg-accent-500/10',
                      badgeStyle: 'bg-accent-100 dark:bg-accent-500/20 text-accent-600 dark:text-accent-400',
                      iconSelectedColor: 'text-accent-500',
                      checkColor: 'text-accent-500',
                    },
                    {
                      id: 'claude-opus-4',
                      name: 'Opus 4',
                      badge: 'Premium',
                      description: 'Highest quality and deepest reasoning. Best for complex analysis tasks.',
                      strengths: ['Deepest reasoning', 'Highest accuracy', 'Complex tasks'],
                      isRecommended: false,
                      selectedBorder: 'border-purple-500 bg-purple-50/40 dark:bg-purple-500/10',
                      badgeStyle: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400',
                      iconSelectedColor: 'text-purple-500',
                      checkColor: 'text-purple-500',
                    },
                    {
                      id: 'claude-haiku-4',
                      name: 'Haiku 4',
                      badge: 'Fastest',
                      description: 'Lightweight and ultra-fast. Good for quick validation and simple checks.',
                      strengths: ['Ultra-fast', 'Lightweight', 'Cost-efficient'],
                      isRecommended: false,
                      selectedBorder: 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-500/10',
                      badgeStyle: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
                      iconSelectedColor: 'text-emerald-500',
                      checkColor: 'text-emerald-500',
                    },
                  ].map((model) => {
                    const isSelected = aiConfig.model === model.id;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => setAiConfig((prev) => ({ ...prev, model: model.id }))}
                        className={`relative text-left p-3.5 rounded-xl border-2 transition-all ${
                          isSelected
                            ? model.selectedBorder
                            : 'border-transparent bg-white/50 dark:bg-dark-hover/30 hover:bg-white/80 dark:hover:bg-dark-hover/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {model.isRecommended ? (
                            <svg className={`w-4 h-4 ${isSelected ? 'text-accent-500' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          ) : (
                            <svg className={`w-4 h-4 ${isSelected ? model.iconSelectedColor : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          )}
                          <span className="text-sm font-semibold text-primary">{model.name}</span>
                        </div>
                        <span className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded-full mb-2 ${model.badgeStyle}`}>
                          {model.badge}
                        </span>
                        <p className="text-[11px] text-muted leading-relaxed mb-2.5">{model.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {model.strengths.map((s) => (
                            <span key={s} className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-dark-hover text-gray-500 dark:text-gray-400 rounded">
                              {s}
                            </span>
                          ))}
                        </div>
                        {isSelected && (
                          <div className="absolute top-2.5 right-2.5">
                            <svg className={`w-4 h-4 ${model.checkColor}`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
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

      case 'output-template':
        return (
          <div className="space-y-6">
            <div className="glass-panel-subtle rounded-xl p-5">
              <h3 className="text-sm font-semibold text-primary mb-4">DOCX Output Template</h3>
              <p className="text-xs text-muted mb-4">
                Upload a .docx file to define the output format for enhanced resumes. The template structure
                (sections, styling, headers) will be preserved and filled with candidate data.
              </p>
              <div className="flex items-center gap-3 p-3 bg-white/50 dark:bg-dark-hover/30 rounded-xl mb-4">
                <div className="w-10 h-10 rounded-lg bg-accent-100/80 dark:bg-accent-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent-600 dark:text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary truncate">{outputTemplateName}</p>
                  <p className="text-xs text-muted">Active template</p>
                </div>
              </div>
              <label className="glass-card-hover p-4 rounded-xl cursor-pointer block text-center">
                <input type="file" accept=".docx" onChange={handleTemplateUpload} className="hidden" />
                <p className="text-sm font-medium text-accent-600 dark:text-accent-400">Upload New Template</p>
                <p className="text-xs text-muted mt-1">Only .docx files are accepted</p>
              </label>
              <button
                onClick={handleResetOutputTemplate}
                className="mt-3 w-full px-4 py-2 text-xs text-secondary hover:text-primary hover:bg-white/50 dark:hover:bg-dark-hover/50 rounded-lg transition-colors font-medium"
              >
                Reset to Default Template
              </button>
            </div>
            <div className="glass-panel-subtle rounded-xl p-5">
              <h4 className="text-xs font-semibold text-muted mb-3">Template Preview</h4>
              <div
                ref={templatePreviewRef}
                className="w-full rounded-lg border border-gray-200/30 dark:border-dark-border/30 bg-white overflow-auto"
                style={{ maxHeight: '600px' }}
              />
              {!outputTemplateBuffer && (
                <div className="flex items-center justify-center py-12 text-muted text-xs">Loading preview…</div>
              )}
            </div>
          </div>
        );

      case 'vectorization':
        return (
          <div className="space-y-5">
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-primary mb-1">Voyage AI API Key</h3>
              <p className="text-xs text-muted mb-4">
                Required for generating resume embeddings. Configured via environment variable.
              </p>

              {voyageKeyConfigured ? (
                <div className="flex items-center gap-2 p-3 bg-emerald-50/60 dark:bg-emerald-500/10 rounded-lg border border-emerald-200/50 dark:border-emerald-500/20">
                  <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      Configured: <span className="font-mono">{voyageKeyMasked}</span>
                    </span>
                    {voyageKeySource && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-200/60 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                        via {voyageKeySource}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-amber-50/60 dark:bg-amber-500/10 rounded-lg border border-amber-200/50 dark:border-amber-500/20">
                  <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Not configured</p>
                    <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-0.5">
                      Set the <code className="font-mono bg-amber-100 dark:bg-amber-500/10 px-1 rounded">Voyage__ApiKey</code> environment variable
                    </p>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-muted mt-3 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Managed securely via environment variables. Never stored in the database.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-primary mb-1">Embedding Model</h3>
                  <p className="text-xs text-muted">Select the Voyage AI model for generating resume embeddings.</p>
                </div>
                <button
                  onClick={handleSaveVecModel}
                  className="px-4 py-1.5 bg-violet-500 text-white text-xs font-medium rounded-lg hover:bg-violet-600 transition-colors"
                >
                  Save Model
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    id: 'voyage-4-large' as const,
                    name: 'Voyage 4 Large',
                    badge: 'Best Quality',
                    description: 'Highest retrieval accuracy. 1536-dim embeddings ideal for all resumes.',
                    strengths: ['Best accuracy', '1536-dim', 'Free 200M tokens'],
                    isRecommended: true,
                    selectedBorder: 'border-violet-500 bg-violet-50/40 dark:bg-violet-500/10',
                    badgeStyle: 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400',
                    iconSelectedColor: 'text-violet-500',
                    checkColor: 'text-violet-500',
                  },
                  {
                    id: 'voyage-4' as const,
                    name: 'Voyage 4',
                    badge: 'Balanced',
                    description: 'Good balance of quality and speed. Compatible embeddings.',
                    strengths: ['Balanced', 'Compatible vectors', 'General purpose'],
                    isRecommended: false,
                    selectedBorder: 'border-accent-500 bg-accent-50/40 dark:bg-accent-500/10',
                    badgeStyle: 'bg-accent-100 dark:bg-accent-500/20 text-accent-600 dark:text-accent-400',
                    iconSelectedColor: 'text-accent-500',
                    checkColor: 'text-accent-500',
                  },
                  {
                    id: 'voyage-4-lite' as const,
                    name: 'Voyage 4 Lite',
                    badge: 'Fastest',
                    description: 'Ultra-fast. Great for JD embedding at search time. Vector-compatible.',
                    strengths: ['Ultra-fast', 'Low latency', 'JD embedding'],
                    isRecommended: false,
                    selectedBorder: 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-500/10',
                    badgeStyle: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
                    iconSelectedColor: 'text-emerald-500',
                    checkColor: 'text-emerald-500',
                  },
                ].map((model) => {
                  const isSelected = vecConfig.model === model.id;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setVecConfig((prev) => ({ ...prev, model: model.id }))}
                      className={`relative text-left p-3.5 rounded-xl border-2 transition-all ${
                        isSelected
                          ? model.selectedBorder
                          : 'border-transparent bg-white/50 dark:bg-dark-hover/30 hover:bg-white/80 dark:hover:bg-dark-hover/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {model.isRecommended ? (
                          <svg className={`w-4 h-4 ${isSelected ? 'text-violet-500' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        ) : (
                          <svg className={`w-4 h-4 ${isSelected ? model.iconSelectedColor : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        )}
                        <span className="text-sm font-semibold text-primary">{model.name}</span>
                      </div>
                      <span className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded-full mb-2 ${model.badgeStyle}`}>
                        {model.badge}
                      </span>
                      <p className="text-[11px] text-muted leading-relaxed mb-2.5">{model.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {model.strengths.map((s) => (
                          <span key={s} className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-dark-hover text-gray-500 dark:text-gray-400 rounded">
                            {s}
                          </span>
                        ))}
                      </div>
                      {isSelected && (
                        <div className="absolute top-2.5 right-2.5">
                          <svg className={`w-4 h-4 ${model.checkColor}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="glass-panel-subtle rounded-xl p-4 border-l-4 border-violet-400/60">
              <div className="flex items-start gap-2.5">
                <svg className="w-4 h-4 text-violet-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[11px] text-muted leading-relaxed">
                  All Voyage 4 models produce compatible embeddings in a shared space. You can embed resumes with
                  voyage-4-large for quality, then swap JD-side to voyage-4-lite for speed — without re-embedding
                  any profiles.
                </p>
              </div>
            </div>
          </div>
        );

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
                { id: 'output-template', label: 'Output Template', icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                ) },
                { id: 'vectorization', label: 'Vectorization', icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
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
