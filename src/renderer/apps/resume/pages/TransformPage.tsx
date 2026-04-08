import { useNavigate } from 'react-router-dom';
import StepperBar from '../components/shared/StepperBar';
import IntentStep from '../components/transform/IntentStep';
import SelectResumeStep from '../components/transform/SelectResumeStep';
import RefinementStep from '../components/transform/RefinementStep';
import JobDescriptionStep from '../components/transform/JobDescriptionStep';
import ReviewStep from '../components/transform/ReviewStep';
import SaveExportStep from '../components/transform/SaveExportStep';
import SaveSessionModal from '../components/SaveSessionModal';
import { useToast } from '../components/shared/ToastContext';
import { TransformProvider } from '../contexts/TransformContext';
import { useTransformWizard } from '../hooks/useTransformWizard';
import { aiService } from '../services/aiService';
import PdfPreviewPanel from '../components/PdfPreviewPanel';

export default function TransformPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const wizard = useTransformWizard(navigate, showToast);

  const {
    wizard: { currentStepKey, completedSteps, stepLabels, stepSummaries, handleStepClick },
    session: { savedSessionId, savingSession, showSaveSessionModal, setShowSaveSessionModal, isSavingSession, defaultSessionName, handleSaveSession },
    claude: { claudeConnected, setClaudeConnected },
    modals: { showPreviewModal, setShowPreviewModal },
    transform: { transformedResumes },
    review: { editedResumes },
  } = wizard;

  return (
    <TransformProvider value={wizard}>
      <div className="min-h-screen py-8">
        <div className={`${currentStepKey === 'review' ? 'max-w-7xl' : 'max-w-4xl'} mx-auto px-6 transition-all duration-300`}>
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-primary tracking-tight">Enhance Resumes</h1>
            <p className="text-sm text-muted mt-1 max-w-xl">
              Upload resumes or select a candidate from your ATS. AI will enhance them into your standardized format.
            </p>
          </div>

          {claudeConnected !== null && (
            <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl mb-5 text-xs font-medium ${
              claudeConnected
                ? 'bg-emerald-50/60 dark:bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/30'
                : 'bg-amber-50/80 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20'
            }`}>
              <span className={`w-2 h-2 rounded-full ${claudeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {claudeConnected
                ? 'Claude Max connected — AI-powered extraction active'
                : 'Claude Max not detected — fallback extraction will be used'}
              {!claudeConnected && (
                <button onClick={() => aiService.checkConnection().then(setClaudeConnected)} className="ml-auto underline hover:no-underline">
                  Retry
                </button>
              )}
            </div>
          )}

          {currentStepKey !== 'intent' && (
            <StepperBar
              stepLabels={stepLabels}
              currentStepKey={currentStepKey}
              completedSteps={completedSteps}
              onStepClick={handleStepClick}
              stepSummaries={stepSummaries}
            />
          )}

          {currentStepKey === 'intent' && (
            <IntentStep />
          )}

          {currentStepKey === 'select' && (
            <SelectResumeStep />
          )}

          {currentStepKey === 'refinement' && (
            <RefinementStep />
          )}

          {currentStepKey === 'job-description' && (
            <JobDescriptionStep />
          )}

          {currentStepKey === 'review' && (
            <ReviewStep />
          )}

          {currentStepKey === 'save' && (
            <SaveExportStep />
          )}
        </div>

        {showSaveSessionModal && (
          <SaveSessionModal
            isOpen={showSaveSessionModal}
            onClose={() => setShowSaveSessionModal(false)}
            onSave={handleSaveSession}
            defaultName={defaultSessionName}
            isSaving={isSavingSession}
          />
        )}

        {showPreviewModal && transformedResumes.length > 0 && (() => {
          const baseResume = transformedResumes[0];
          const activeResume = editedResumes.get(baseResume.id) || baseResume;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-dark-card rounded-2xl w-[90vw] h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-dark-border/50">
                  <h2 className="text-lg font-semibold text-primary">Resume Preview</h2>
                  <button
                    onClick={() => setShowPreviewModal(false)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <PdfPreviewPanel resume={activeResume} />
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </TransformProvider>
  );
}
