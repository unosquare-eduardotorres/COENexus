export const SYNC_STATUS = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  COMPLETED: 'completed',
  PAUSED: 'paused',
  ERROR: 'error',
} as const;

export const PROCESSING_STATUS = {
  IDLE: 'idle',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  ERROR: 'error',
} as const;

export const PIPELINE_STATUS = {
  NOT_PROCESSED: 'not-processed',
  SYNCED: 'synced',
  INCOMPLETE: 'incomplete',
  EXTRACTED: 'extracted',
  VECTORIZED: 'vectorized',
} as const;

export type SyncStatusValue = typeof SYNC_STATUS[keyof typeof SYNC_STATUS];
export type ProcessingStatusValue = typeof PROCESSING_STATUS[keyof typeof PROCESSING_STATUS];
export type PipelineStatusValue = typeof PIPELINE_STATUS[keyof typeof PIPELINE_STATUS];
