import { describe, it, expect } from 'vitest';
import { SyncRecord } from './index';

describe('SyncRecord type', () => {
  it('should accept resumeNoteId and resumeFilename fields', () => {
    const record: SyncRecord = {
      id: 'emp-1',
      upstreamId: 1,
      name: 'Type Test',
      source: 'employees',
      pipelineStatus: 'synced',
      failed: false,
      hasResume: true,
      syncedAt: '2026-01-01T00:00:00Z',
      resumeNoteId: 42,
      resumeFilename: 'cv.pdf',
    };

    expect(record.resumeNoteId).toBe(42);
    expect(record.resumeFilename).toBe('cv.pdf');
  });
});
