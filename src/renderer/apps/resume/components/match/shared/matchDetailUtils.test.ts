import { describe, expect, it } from 'vitest';
import { parseSummaryVerdict } from './matchDetailUtils';

describe('parseSummaryVerdict', () => {
  it('should detect NOT A FIT followed by period', () => {
    const result = parseSummaryVerdict("NOT A FIT. The role's requirements exceed the candidate's experience.");
    expect(result.verdict).toBe('not-a-fit');
    expect(result.reasoning).toBe("The role's requirements exceed the candidate's experience.");
  });

  it('should detect NOT A FIT followed by space and continuation text', () => {
    const result = parseSummaryVerdict('NOT A FIT for a role centered on backend services.');
    expect(result.verdict).toBe('not-a-fit');
    expect(result.reasoning).toBe('for a role centered on backend services.');
  });

  it('should detect NOT A FIT followed by comma', () => {
    const result = parseSummaryVerdict('NOT A FIT, missing seniority');
    expect(result.verdict).toBe('not-a-fit');
    expect(result.reasoning).toBe('missing seniority');
  });

  it('should detect NOT A FIT followed by em dash', () => {
    const result = parseSummaryVerdict('NOT A FIT \u2014 text');
    expect(result.verdict).toBe('not-a-fit');
    expect(result.reasoning).toBe('text');
  });

  it('should not match NOT A FITness program (false-positive guard)', () => {
    const result = parseSummaryVerdict('NOT A FITness program participant');
    expect(result.verdict).toBeNull();
    expect(result.reasoning).toBe('NOT A FITness program participant');
  });

  it('should detect PARTIAL FIT', () => {
    const result = parseSummaryVerdict('PARTIAL FIT - some skills missing');
    expect(result.verdict).toBe('partial-fit');
    expect(result.reasoning).toBe('some skills missing');
  });

  it('should detect GOOD FIT', () => {
    const result = parseSummaryVerdict('GOOD FIT: strong technical alignment');
    expect(result.verdict).toBe('good-fit');
    expect(result.reasoning).toBe('strong technical alignment');
  });

  it('should detect STRONG FIT', () => {
    const result = parseSummaryVerdict('STRONG FIT. Exceeds requirements.');
    expect(result.verdict).toBe('strong-fit');
    expect(result.reasoning).toBe('Exceeds requirements.');
  });

  it('should be case-insensitive', () => {
    const result = parseSummaryVerdict('not a fit, weak alignment');
    expect(result.verdict).toBe('not-a-fit');
  });

  it('should return null verdict when no marker present', () => {
    const result = parseSummaryVerdict('The candidate has 10 years of Java experience.');
    expect(result.verdict).toBeNull();
    expect(result.reasoning).toBe('The candidate has 10 years of Java experience.');
  });

  it('should detect NOT A FIT followed by semicolon', () => {
    const result = parseSummaryVerdict('NOT A FIT; lacks required certifications');
    expect(result.verdict).toBe('not-a-fit');
    expect(result.reasoning).toBe('lacks required certifications');
  });
});
