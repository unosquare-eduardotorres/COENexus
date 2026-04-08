import { BatchConfig, BatchResult } from '../types';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateId(): string {
  return `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const batchService = {
  async processFiles(
    files: File[],
    config: BatchConfig,
    onProgress: (current: number, total: number, fileName: string) => void
  ): Promise<BatchResult[]> {
    const results: BatchResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      onProgress(i + 1, files.length, file.name);

      const processingTime = 800 + Math.random() * 1200;
      await delay(processingTime);

      const isError = Math.random() < 0.08;

      if (isError) {
        results.push({
          id: generateId(),
          fileName: file.name,
          status: 'error',
          flow: config.flow,
          error: 'Failed to parse document structure. The file may be corrupted or password-protected.',
        });
      } else {
        results.push({
          id: generateId(),
          fileName: file.name,
          status: 'success',
          flow: config.flow,
          resumeId: `resume-${generateId()}`,
        });
      }
    }

    return results;
  },
};
