import { useState, useCallback, useEffect, useRef } from 'react';
import {
  AIConfig,
  RefinementPrompt,
  MatchEnginePromptConfig,
  VectorizationConfig,
} from '../types';
import { getPrompts, savePrompt, resetPrompt, resetAllPrompts } from '../data/defaultPrompts';
import { getMatchPrompts, saveMatchPrompt, resetMatchPrompt, resetAllMatchPrompts } from '../data/defaultMatchPrompts';
import { aiService } from '../services/aiService';
import { vectorizationConfigService } from '../services/vectorizationConfigService';
import { useIpcQuery, useInvalidateQueries } from '../../../shared/hooks/useIpcQuery';
import { createRendererLogger } from '../../../shared/utils/rendererLogger';

const log = createRendererLogger('useAdminDashboard');

export type AdminTab = 'validation' | 'guidelines' | 'prompts' | 'ai' | 'output-template' | 'data-maintenance' | 'vectorization';

export function useAdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('validation');
  const [aiConfig, setAiConfig] = useState<AIConfig>(aiService.getConfig());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [prompts, setPrompts] = useState<RefinementPrompt[]>(getPrompts());
  const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [matchPrompts, setMatchPrompts] = useState<MatchEnginePromptConfig[]>(getMatchPrompts());
  const [expandedMatchPromptId, setExpandedMatchPromptId] = useState<string | null>(null);
  const [editingMatchPromptId, setEditingMatchPromptId] = useState<string | null>(null);
  const [activeContextTab, setActiveContextTab] = useState<'matchEngine' | 'benchBurn'>('matchEngine');
  const [outputTemplateName, setOutputTemplateName] = useState<string>(
    localStorage.getItem('output_template_name') || 'USQ Resume Template.docx'
  );
  const [outputTemplateBuffer, setOutputTemplateBuffer] = useState<ArrayBuffer | null>(null);
  const templatePreviewRef = useRef<HTMLDivElement>(null);
  const [confirmAction, setConfirmAction] = useState<'reset-prompts' | null>(null);

  const handleConfirmAction = useCallback(() => {
    if (confirmAction === 'reset-prompts') {
      const defaults = resetAllPrompts();
      setPrompts(defaults);
      setExpandedPromptId(null);
      setEditingPromptId(null);
      const defaultMatchPrompts = resetAllMatchPrompts();
      setMatchPrompts(defaultMatchPrompts);
      setExpandedMatchPromptId(null);
      setEditingMatchPromptId(null);
    }
    setConfirmAction(null);
  }, [confirmAction]);

  const handleSaveAIConfig = useCallback(() => {
    aiService.updateConfig(aiConfig);
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  }, [aiConfig]);

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
    setConfirmAction('reset-prompts');
  }, []);

  const handleToggleMatchPromptExpand = useCallback((promptId: string) => {
    setExpandedMatchPromptId((prev) => (prev === promptId ? null : promptId));
    setEditingMatchPromptId(null);
  }, []);

  const handleEditMatchPrompt = useCallback((promptId: string) => {
    setEditingMatchPromptId(promptId);
  }, []);

  const handleSaveMatchPrompt = useCallback((prompt: MatchEnginePromptConfig) => {
    saveMatchPrompt(prompt);
    setMatchPrompts(getMatchPrompts());
    setEditingMatchPromptId(null);
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  }, []);

  const handleResetMatchPrompt = useCallback((promptId: string) => {
    const reset = resetMatchPrompt(promptId);
    if (reset) {
      setMatchPrompts(getMatchPrompts());
      setSaveStatus('saving');
      setTimeout(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 500);
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
            const response = await fetch('./templates/USQ Resume Template.docx');
            if (!response.ok) throw new Error(`Template load failed: ${response.status}`);
            arrayBuffer = await response.arrayBuffer();
          }
          setOutputTemplateBuffer(arrayBuffer);
        } catch (err) {
          log.warn('Template preview load failed:', err);
          setOutputTemplateBuffer(null);
        }
      })();
    }
  }, [activeTab, outputTemplateBuffer]);

  useEffect(() => {
    if (outputTemplateBuffer && templatePreviewRef.current) {
      const container = templatePreviewRef.current;
      container.innerHTML = '';
      (async () => {
        try {
          if (outputTemplateBuffer.byteLength === 0) {
            log.warn('Template buffer is empty, skipping preview');
            return;
          }
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
        } catch (err) {
          log.warn('Template preview render failed:', err);
          container.innerHTML = '<p class="text-sm text-muted p-4">Unable to preview template. The file may be missing or invalid.</p>';
        }
      })();
    }
  }, [outputTemplateBuffer]);


  const [vecConfig, setVecConfig] = useState<VectorizationConfig>(vectorizationConfigService.getConfig());

  const { data: voyageKeyStatus } = useIpcQuery(
    ['resume', 'voyage-key-status'],
    () => vectorizationConfigService.checkVoyageKey()
  );

  const invalidateQueries = useInvalidateQueries();

  const voyageKeyConfigured = voyageKeyStatus?.configured ?? false;
  const voyageMaskedKeys = voyageKeyStatus?.maskedKeys ?? [];
  const voyageKeySource = voyageKeyStatus?.source ?? '';

  const handleSaveVecModel = useCallback(() => {
    vectorizationConfigService.saveModel(vecConfig.model);
  }, [vecConfig.model]);

  const handleAddVoyageKey = useCallback(async (apiKey: string) => {
    await vectorizationConfigService.addVoyageKey(apiKey);
    invalidateQueries(['resume', 'voyage-key-status']);
  }, [invalidateQueries]);

  const handleRemoveVoyageKey = useCallback(async (index: number) => {
    await vectorizationConfigService.removeVoyageKey(index);
    invalidateQueries(['resume', 'voyage-key-status']);
  }, [invalidateQueries]);

  return {
    tabs: { activeTab, setActiveTab },
    ai: { aiConfig, setAiConfig, handleSaveAIConfig },
    prompts: {
      prompts, setPrompts, expandedPromptId, editingPromptId, setEditingPromptId,
      handleTogglePromptExpand, handleEditPrompt,
      handleSavePrompt, handleResetPrompt, handleResetAllPrompts,
    },
    matchPrompts: {
      matchPrompts, setMatchPrompts, expandedMatchPromptId, editingMatchPromptId, setEditingMatchPromptId,
      activeContextTab, setActiveContextTab,
      handleToggleMatchPromptExpand, handleEditMatchPrompt,
      handleSaveMatchPrompt, handleResetMatchPrompt,
    },
    outputTemplate: {
      outputTemplateName, outputTemplateBuffer, templatePreviewRef,
      handleTemplateUpload, handleResetOutputTemplate,
    },
    confirm: { confirmAction, setConfirmAction, handleConfirmAction },
    vectorization: {
      vecConfig, setVecConfig, handleSaveVecModel,
      voyageKeyConfigured, voyageMaskedKeys, voyageKeySource,
      handleAddVoyageKey, handleRemoveVoyageKey,
    },
    saveStatus,
  };
}
