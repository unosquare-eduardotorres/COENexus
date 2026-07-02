import { memo } from 'react';
import { AIConfig } from '../../types';

interface AITabProps {
  aiConfig: AIConfig;
  setAiConfig: React.Dispatch<React.SetStateAction<AIConfig>>;
  handleSaveAIConfig: () => void;
}

const AITab = memo(function AITab({ aiConfig, setAiConfig, handleSaveAIConfig }: AITabProps) {
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
                  <span className="px-1.5 py-0.5 text-xs font-semibold bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full">In Development</span>
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
                id: 'claude-sonnet-4-6',
                name: 'Sonnet 4.6',
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
                id: 'claude-opus-4-8',
                name: 'Opus 4.8',
                badge: 'Premium',
                description: 'Highest quality and deepest reasoning. Best for complex analysis tasks.',
                strengths: ['Deepest reasoning', 'Highest accuracy', 'Complex tasks'],
                isRecommended: false,
                selectedBorder: 'border-violet-500 bg-violet-50/40 dark:bg-violet-500/10',
                badgeStyle: 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400',
                iconSelectedColor: 'text-violet-500',
                checkColor: 'text-violet-500',
              },
              {
                id: 'claude-haiku-4-5',
                name: 'Haiku 4.5',
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
                  <span className={`inline-block px-1.5 py-0.5 text-xs font-semibold rounded-full mb-2 ${model.badgeStyle}`}>
                    {model.badge}
                  </span>
                  <p className="text-xs text-muted leading-relaxed mb-2.5">{model.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {model.strengths.map((s) => (
                      <span key={s} className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 dark:bg-dark-hover text-gray-500 dark:text-gray-400 rounded">
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
            <div className="flex justify-between text-xs text-muted mt-1">
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
});

export default AITab;
