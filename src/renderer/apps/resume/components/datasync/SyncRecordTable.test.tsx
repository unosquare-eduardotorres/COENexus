import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SyncRecordTable from './SyncRecordTable';
import { SyncRecord } from '../../types';

function buildRecord(overrides: Partial<SyncRecord> = {}): SyncRecord {
  return {
    id: 'emp-1',
    upstreamId: 1,
    name: 'Test User',
    email: 'test@example.com',
    source: 'employees',
    pipelineStatus: 'synced',
    failed: false,
    hasResume: false,
    syncedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function renderTable(records: SyncRecord[]) {
  return render(
    <SyncRecordTable
      records={records}
      source="employees"
      statusFilter="all"
    />
  );
}

describe('SyncRecordTable', () => {
  it('should display seniority value when present', () => {
    renderTable([buildRecord({ seniority: 'Intermediate' })]);
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
  });

  it('should display dash when seniority is empty', () => {
    renderTable([buildRecord({ seniority: undefined })]);
    const cells = screen.getAllByText('—');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('should display salary with currency', () => {
    renderTable([buildRecord({ grossMonthlySalary: 5000, currency: 'USD' })]);
    expect(screen.getByText('USD 5,000')).toBeInTheDocument();
  });

  it('should display dash when salary is null', () => {
    renderTable([buildRecord({ grossMonthlySalary: undefined, currency: undefined })]);
    const cells = screen.getAllByText('—');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('should display resume filename when hasResume and resumeFilename present', () => {
    renderTable([buildRecord({ hasResume: true, resumeFilename: 'john_cv.pdf' })]);

    expect(screen.getByText('john_cv.pdf')).toBeInTheDocument();

    const checkIcons = document.querySelectorAll('svg path[d="M5 13l4 4L19 7"]');
    expect(checkIcons.length).toBeGreaterThan(0);
  });

  it('should display X when hasResume is false', () => {
    renderTable([buildRecord({ hasResume: false })]);

    expect(screen.queryByText('john_cv.pdf')).not.toBeInTheDocument();

    const xIcons = document.querySelectorAll('svg path[d="M6 18L18 6M6 6l12 12"]');
    expect(xIcons.length).toBeGreaterThan(0);
  });

  it('should display full reason text with title tooltip', () => {
    const reason = 'Response status code does not indicate success: 401 (Unauthorized)';
    renderTable([buildRecord({ pipelineStatus: 'not-processed', reason })]);

    const reasonSpan = screen.getByText(reason);
    expect(reasonSpan).toBeInTheDocument();
    expect(reasonSpan).toHaveAttribute('title', reason);
  });

  it('should display dash when reason is empty', () => {
    renderTable([buildRecord({ reason: undefined })]);
    const cells = screen.getAllByText('—');
    expect(cells.length).toBeGreaterThan(0);
  });
});
