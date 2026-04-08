import { memo } from 'react';
import { RefinementMode, RefinementPrompt, MatchEnginePromptConfig } from '../../types';
import { getPrompts } from '../../data/defaultPrompts';
import { getMatchPrompts } from '../../data/defaultMatchPrompts';
import { ChevronIcon } from '../shared/icons';

interface PromptsTabProps {
  prompts: RefinementPrompt[];
  setPrompts: React.Dispatch<React.SetStateAction<RefinementPrompt[]>>;
  expandedPromptId: string | null;
  editingPromptId: string | null;
  setEditingPromptId: (id: string | null) => void;
  handleTogglePromptExpand: (id: string) => void;
  handleEditPrompt: (id: string) => void;
  handleSavePrompt: (prompt: RefinementPrompt) => void;
  handleResetPrompt: (id: string) => void;
  handleResetAllPrompts: () => void;
  matchPrompts: MatchEnginePromptConfig[];
  setMatchPrompts: React.Dispatch<React.SetStateAction<MatchEnginePromptConfig[]>>;
  expandedMatchPromptId: string | null;
  editingMatchPromptId: string | null;
  setEditingMatchPromptId: (id: string | null) => void;
  activeContextTab: 'matchEngine' | 'benchBurn';
  setActiveContextTab: (tab: 'matchEngine' | 'benchBurn') => void;
  handleToggleMatchPromptExpand: (id: string) => void;
  handleEditMatchPrompt: (id: string) => void;
  handleSaveMatchPrompt: (prompt: MatchEnginePromptConfig) => void;
  handleResetMatchPrompt: (id: string) => void;
  getModeIcon: (mode: RefinementMode) => JSX.Element;
}

const PromptsTab = memo(function PromptsTab(props: PromptsTabProps) {
  const {
    prompts, setPrompts, expandedPromptId, editingPromptId, setEditingPromptId,
    handleTogglePromptExpand, handleEditPrompt, handleSavePrompt, handleResetPrompt, handleResetAllPrompts,
    matchPrompts, setMatchPrompts, expandedMatchPromptId, editingMatchPromptId, setEditingMatchPromptId,
    activeContextTab, setActiveContextTab,
    handleToggleMatchPromptExpand, handleEditMatchPrompt, handleSaveMatchPrompt, handleResetMatchPrompt,
    getModeIcon,
  } = props;

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
                  <p className="text-xs text-muted truncate" title={prompt.description}>{prompt.description}</p>
                </div>
                <ChevronIcon
                  size="sm"
                  direction={expandedPromptId === prompt.id ? 'up' : 'down'}
                  className="text-muted transition-transform"
                />
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
                        className="px-2 py-0.5 text-xs font-medium bg-accent-100/80 dark:bg-accent-500/20 text-accent-600 dark:text-accent-400 rounded-full"
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

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-primary mb-1">Match Engine Prompts</h3>
        <p className="text-xs text-muted mb-5">
          Configure Match Engine prompt templates used for fast triage and deep analysis of candidate fit.
        </p>
        <div className="space-y-3">
          {matchPrompts.map((prompt) => (
            <div
              key={prompt.id}
              className={`rounded-xl border transition-all ${
                expandedMatchPromptId === prompt.id
                  ? 'border-violet-200/50 dark:border-violet-500/30 bg-violet-50/30 dark:bg-violet-500/10'
                  : 'border-gray-200/50 dark:border-dark-border/50 bg-white/50 dark:bg-dark-hover/30'
              }`}
            >
              <button
                onClick={() => handleToggleMatchPromptExpand(prompt.id)}
                className="w-full flex items-center gap-3 p-3 text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-violet-100/80 dark:bg-violet-500/20 flex items-center justify-center text-sm flex-shrink-0">
                  {prompt.key === 'haiku-triage' ? '🎯' : '🔬'}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-primary">{prompt.name}</h4>
                  <p className="text-xs text-muted truncate" title={prompt.description}>{prompt.description}</p>
                </div>
                <span className="px-2 py-0.5 text-xs font-medium bg-violet-100/80 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-full">
                  {`${prompt.maxTokens} tok • ${prompt.temperature} temp`}
                </span>
                <ChevronIcon
                  size="sm"
                  direction={expandedMatchPromptId === prompt.id ? 'up' : 'down'}
                  className="text-muted transition-transform"
                />
              </button>

              {expandedMatchPromptId === prompt.id && (
                <div className="px-3 pb-3 space-y-3">
                  {prompt.key === 'opus-analysis' && prompt.contextBlocks ? (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1 uppercase">Base Prompt</label>
                        <textarea
                          value={prompt.promptTemplate}
                          onChange={(e) => {
                            if (editingMatchPromptId === prompt.id) {
                              setMatchPrompts((prev) =>
                                prev.map((p) =>
                                  p.id === prompt.id ? { ...p, promptTemplate: e.target.value } : p
                                )
                              );
                            }
                          }}
                          readOnly={editingMatchPromptId !== prompt.id}
                          rows={10}
                          className={`glass-input w-full px-3 py-2 font-mono text-xs resize-none ${
                            editingMatchPromptId !== prompt.id ? 'opacity-75 cursor-default' : ''
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-muted mb-2 uppercase">Context Blocks</label>
                        <div className="flex gap-1 mb-2">
                          <button
                            onClick={() => setActiveContextTab('matchEngine')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                              activeContextTab === 'matchEngine'
                                ? 'bg-violet-500 text-white'
                                : 'text-secondary bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 hover:text-primary hover:bg-white/10 dark:hover:bg-white/10'
                            }`}
                          >
                            🎯 Match Engine
                          </button>
                          <button
                            onClick={() => setActiveContextTab('benchBurn')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                              activeContextTab === 'benchBurn'
                                ? 'bg-violet-500 text-white'
                                : 'text-secondary bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 hover:text-primary hover:bg-white/10 dark:hover:bg-white/10'
                            }`}
                          >
                            🔥 Bench Burn
                          </button>
                        </div>
                        <textarea
                          value={prompt.contextBlocks[activeContextTab]}
                          onChange={(e) => {
                            if (editingMatchPromptId === prompt.id) {
                              setMatchPrompts((prev) =>
                                prev.map((p) =>
                                  p.id === prompt.id && p.contextBlocks
                                    ? { ...p, contextBlocks: { ...p.contextBlocks, [activeContextTab]: e.target.value } }
                                    : p
                                )
                              );
                            }
                          }}
                          readOnly={editingMatchPromptId !== prompt.id}
                          rows={6}
                          className={`glass-input w-full px-3 py-2 font-mono text-xs resize-none ${
                            editingMatchPromptId !== prompt.id ? 'opacity-75 cursor-default' : ''
                          }`}
                        />
                      </div>
                    </>
                  ) : (
                    <textarea
                      value={prompt.promptTemplate}
                      onChange={(e) => {
                        if (editingMatchPromptId === prompt.id) {
                          setMatchPrompts((prev) =>
                            prev.map((p) =>
                              p.id === prompt.id ? { ...p, promptTemplate: e.target.value } : p
                            )
                          );
                        }
                      }}
                      readOnly={editingMatchPromptId !== prompt.id}
                      rows={10}
                      className={`glass-input w-full px-3 py-2 font-mono text-xs resize-none ${
                        editingMatchPromptId !== prompt.id ? 'opacity-75 cursor-default' : ''
                      }`}
                    />
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1 uppercase">Max Tokens</label>
                      <input
                        type="number"
                        value={prompt.maxTokens}
                        onChange={(e) => {
                          if (editingMatchPromptId === prompt.id) {
                            setMatchPrompts((prev) =>
                              prev.map((p) =>
                                p.id === prompt.id ? { ...p, maxTokens: Number(e.target.value) } : p
                              )
                            );
                          }
                        }}
                        readOnly={editingMatchPromptId !== prompt.id}
                        min={64}
                        max={8192}
                        className={`glass-input w-full px-3 py-2 text-xs ${
                          editingMatchPromptId !== prompt.id ? 'opacity-75 cursor-default' : ''
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1 uppercase">Temperature</label>
                      <input
                        type="number"
                        value={prompt.temperature}
                        onChange={(e) => {
                          if (editingMatchPromptId === prompt.id) {
                            setMatchPrompts((prev) =>
                              prev.map((p) =>
                                p.id === prompt.id ? { ...p, temperature: Number(e.target.value) } : p
                              )
                            );
                          }
                        }}
                        readOnly={editingMatchPromptId !== prompt.id}
                        min={0}
                        max={1}
                        step={0.05}
                        className={`glass-input w-full px-3 py-2 text-xs ${
                          editingMatchPromptId !== prompt.id ? 'opacity-75 cursor-default' : ''
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(prompt.key === 'opus-analysis' && prompt.contextBlocks
                      ? [...new Set(
                          (prompt.contextBlocks[activeContextTab].match(/\{\{(\w+)\}\}/g) || [])
                            .map(m => m.replace(/\{\{|\}\}/g, ''))
                        )]
                      : prompt.variables
                    ).map((variable) => (
                      <span
                        key={variable}
                        className="px-2 py-0.5 text-xs font-medium bg-violet-100/80 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-full"
                      >
                        {`{{${variable}}}`}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {editingMatchPromptId === prompt.id ? (
                      <>
                        <button
                          onClick={() => handleSaveMatchPrompt(prompt)}
                          className="px-3 py-1.5 bg-violet-500 text-white text-xs font-medium rounded-lg hover:bg-violet-600 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingMatchPromptId(null);
                            setMatchPrompts(getMatchPrompts());
                          }}
                          className="px-3 py-1.5 text-xs text-secondary hover:text-primary hover:bg-white/50 dark:hover:bg-dark-hover/50 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleEditMatchPrompt(prompt.id)}
                        className="px-3 py-1.5 bg-violet-500 text-white text-xs font-medium rounded-lg hover:bg-violet-600 transition-colors"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => handleResetMatchPrompt(prompt.id)}
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
});

export default PromptsTab;
