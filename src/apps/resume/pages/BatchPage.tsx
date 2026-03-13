import { useState, useCallback, useMemo, ReactNode } from 'react';
import { BatchStepKey, BatchFlowType, BatchConfig, BatchResult } from '../types';
import StepperBar from '../components/shared/StepperBar';
import FileUpload from '../components/FileUpload';
import FlowSelector from '../components/batch/FlowSelector';
import BatchConfigStep from '../components/batch/BatchConfigStep';
import BatchProgress from '../components/batch/BatchProgress';
import BatchResults from '../components/batch/BatchResults';

const STEP_LABELS: { key: BatchStepKey; title: string; icon: ReactNode }[] = [
  {
    key: 'flow',
    title: 'Select Flow',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    key: 'upload',
    title: 'Upload Resumes',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
  {
    key: 'configure',
    title: 'Configure',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    key: 'processing',
    title: 'Processing',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    key: 'results',
    title: 'Results',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
];

const FLOW_LABELS: Record<BatchFlowType, string> = {
  'resume-processing': 'Resume Processing',
  'data-extraction': 'Data Extraction',
};

export default function BatchPage() {
  const [currentStepKey, setCurrentStepKey] = useState<BatchStepKey>('flow');
  const [completedSteps, setCompletedSteps] = useState<Set<BatchStepKey>>(new Set());
  const [selectedFlow, setSelectedFlow] = useState<BatchFlowType | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [batchConfig, setBatchConfig] = useState<BatchConfig | null>(null);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);

  const completeStep = useCallback((step: BatchStepKey) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(step);
      return next;
    });
  }, []);

  const handleFlowSelect = useCallback(
    (flow: BatchFlowType) => {
      setSelectedFlow(flow);
      completeStep('flow');
      setCurrentStepKey('upload');
    },
    [completeStep]
  );

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      setUploadedFiles(files);
      if (files.length > 0) {
        completeStep('upload');
        setCurrentStepKey('configure');
      }
    },
    [completeStep]
  );

  const handleConfigNext = useCallback(
    (config: BatchConfig) => {
      setBatchConfig(config);
      completeStep('configure');
      setCurrentStepKey('processing');
    },
    [completeStep]
  );

  const handleProcessingComplete = useCallback(
    (results: BatchResult[]) => {
      setBatchResults(results);
      completeStep('processing');
      setCurrentStepKey('results');
    },
    [completeStep]
  );

  const handleReset = useCallback(() => {
    setCurrentStepKey('flow');
    setCompletedSteps(new Set());
    setSelectedFlow(null);
    setUploadedFiles([]);
    setBatchConfig(null);
    setBatchResults([]);
  }, []);

  const handleStepClick = useCallback((step: BatchStepKey) => {
    setCurrentStepKey(step);
  }, []);

  const stepSummaries = useMemo<Partial<Record<BatchStepKey, { icon: ReactNode; label: string } | null>>>(() => {
    const summaries: Partial<Record<BatchStepKey, { icon: ReactNode; label: string } | null>> = {};

    if (completedSteps.has('flow') && selectedFlow) {
      summaries['flow'] = {
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        label: FLOW_LABELS[selectedFlow],
      };
    }

    if (completedSteps.has('upload') && uploadedFiles.length > 0) {
      summaries['upload'] = {
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        ),
        label: `${uploadedFiles.length} file${uploadedFiles.length !== 1 ? 's' : ''}`,
      };
    }

    if (completedSteps.has('configure') && batchConfig) {
      const configLabel =
        batchConfig.flow === 'resume-processing'
          ? batchConfig.refinementMode?.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? 'Configured'
          : `${batchConfig.extractionFormat?.toUpperCase()} format`;
      summaries['configure'] = {
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
        ),
        label: configLabel,
      };
    }

    if (completedSteps.has('processing') && batchResults.length > 0) {
      const successCount = batchResults.filter((r) => r.status === 'success').length;
      summaries['processing'] = {
        icon: (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ),
        label: `${successCount}/${batchResults.length} succeeded`,
      };
    }

    return summaries;
  }, [completedSteps, selectedFlow, uploadedFiles.length, batchConfig, batchResults]);

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel-subtle text-xs font-medium text-muted mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse" />
            Batch Processing
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">Batch Processing</h1>
          <p className="text-base text-secondary mt-3 max-w-xl mx-auto">
            Process multiple resumes at once — enhance, validate, or extract structured data in bulk.
          </p>
        </div>

        <StepperBar
          stepLabels={STEP_LABELS}
          currentStepKey={currentStepKey}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
          stepSummaries={stepSummaries}
        />

        {currentStepKey === 'flow' && (
          <FlowSelector onSelect={handleFlowSelect} selectedFlow={selectedFlow} />
        )}

        {currentStepKey === 'upload' && (
          <div className="space-y-4">
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-primary">Upload Resumes</h2>
              </div>

              <FileUpload
                onFilesSelected={handleFilesSelected}
                multiple={true}
                maxFiles={50}
              />
            </div>
          </div>
        )}

        {currentStepKey === 'configure' && selectedFlow && (
          <BatchConfigStep flow={selectedFlow} onNext={handleConfigNext} />
        )}

        {currentStepKey === 'processing' && batchConfig && (
          <BatchProgress
            files={uploadedFiles}
            config={batchConfig}
            onComplete={handleProcessingComplete}
          />
        )}

        {currentStepKey === 'results' && (
          <BatchResults results={batchResults} onReset={handleReset} />
        )}
      </div>
    </div>
  );
}
