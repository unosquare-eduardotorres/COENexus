import { describe, it, expect } from 'vitest';
import { validationService } from './validationService';
import type { StructuredResume } from '../types';

function makeResume(overrides: Partial<StructuredResume> = {}): StructuredResume {
  return {
    id: '1',
    originalFileName: 'test.pdf',
    originalFileType: 'pdf',
    originalContent: '',
    candidateName: 'John Smith',
    email: 'john@example.com',
    phone: '+1 555-0100',
    summary: 'Experienced software engineer with 10+ years building scalable web applications. Led multiple cross-functional teams. Specialized in React and Node.js development.',
    experience: [
      {
        id: 'exp-1',
        company: 'Acme Corp',
        title: 'Senior Engineer',
        startDate: '2020-01',
        endDate: 'Present',
        description: 'Led the migration of a monolithic application to microservices architecture, improving deployment frequency by 300%.',
        achievements: ['Reduced deployment time by 50%', 'Increased test coverage from 40% to 85%'],
        technologies: ['React', 'Node.js', 'PostgreSQL'],
      },
    ],
    education: [
      {
        id: 'edu-1',
        institution: 'MIT',
        degree: 'BS',
        field: 'Computer Science',
        graduationDate: '2014',
      },
    ],
    skills: [
      { id: 'sk-1', name: 'Frontend', skills: ['React', 'TypeScript', 'CSS'] },
    ],
    certifications: [],
    transformedAt: new Date().toISOString(),
    status: 'transformed',
    validationResults: [],
    overallValidationStatus: 'valid',
    ...overrides,
  };
}

describe('validationService', () => {
  describe('validateResume', () => {
    it('should return no errors for a well-formed resume', () => {
      const resume = makeResume();
      const results = validationService.validateResume(resume);
      const errors = results.filter(r => r.status === 'error');
      expect(errors.length).toBe(0);
    });

    it('should return error when summary is empty', () => {
      const resume = makeResume({ summary: '' });
      const results = validationService.validateResume(resume);
      const summaryErrors = results.filter(r => r.field === 'summary' && r.status === 'error');
      expect(summaryErrors.length).toBeGreaterThan(0);
    });

    it('should return error when experience is empty', () => {
      const resume = makeResume({ experience: [] });
      const results = validationService.validateResume(resume);
      const expErrors = results.filter(r => r.field.includes('experience') && r.status === 'error');
      expect(expErrors.length).toBeGreaterThan(0);
    });

    it('should return warning for short summary', () => {
      const resume = makeResume({ summary: 'Short summary.' });
      const results = validationService.validateResume(resume);
      const summaryIssues = results.filter(r => r.field === 'summary' && (r.status === 'warning' || r.status === 'error'));
      expect(summaryIssues.length).toBeGreaterThan(0);
    });
  });

  describe('getCompleteness', () => {
    it('should return 100% for a complete resume', () => {
      const resume = makeResume();
      const result = validationService.getCompleteness(resume);
      expect(result.percentage).toBe(100);
      expect(result.missingFields).toHaveLength(0);
    });

    it('should identify missing fields', () => {
      const resume = makeResume({ candidateName: '', experience: [], skills: [] });
      const result = validationService.getCompleteness(resume);
      expect(result.percentage).toBeLessThan(100);
      expect(result.missingFields).toContain('Candidate Name');
      expect(result.missingFields).toContain('Experience');
      expect(result.missingFields).toContain('Skills');
    });

    it('should treat summary under 50 chars as missing', () => {
      const resume = makeResume({ summary: 'Too short' });
      const result = validationService.getCompleteness(resume);
      expect(result.missingFields).toContain('Summary');
    });
  });

  describe('validateContactInfo', () => {
    it('should warn when email is missing', () => {
      const resume = makeResume({ email: undefined });
      const results = validationService.validateContactInfo(resume);
      const emailIssues = results.filter(r => r.field === 'email');
      expect(emailIssues.length).toBeGreaterThan(0);
    });

    it('should warn when phone is missing', () => {
      const resume = makeResume({ phone: undefined });
      const results = validationService.validateContactInfo(resume);
      const phoneIssues = results.filter(r => r.field === 'phone');
      expect(phoneIssues.length).toBeGreaterThan(0);
    });
  });

  describe('validateExperience', () => {
    it('should flag experience entries missing a company', () => {
      const resume = makeResume({
        experience: [{
          id: 'exp-1',
          company: '',
          title: 'Engineer',
          startDate: '2020-01',
          endDate: '2023-01',
          description: 'Developed and maintained web applications using modern JavaScript frameworks.',
          achievements: ['Shipped feature X'],
        }],
      });
      const results = validationService.validateResume(resume);
      const companyErrors = results.filter(r => r.field.includes('company') && r.status === 'error');
      expect(companyErrors.length).toBeGreaterThan(0);
    });

    it('should flag experience entries missing a title', () => {
      const resume = makeResume({
        experience: [{
          id: 'exp-1',
          company: 'Acme',
          title: '',
          startDate: '2020-01',
          endDate: '2023-01',
          description: 'Developed and maintained web applications using modern JavaScript frameworks.',
          achievements: ['Shipped feature X'],
        }],
      });
      const results = validationService.validateResume(resume);
      const titleErrors = results.filter(r => r.field.includes('title') && r.status === 'error');
      expect(titleErrors.length).toBeGreaterThan(0);
    });
  });

  describe('validateSkills', () => {
    it('should flag empty skills array', () => {
      const resume = makeResume({ skills: [] });
      const results = validationService.validateResume(resume);
      const skillErrors = results.filter(r => r.field.includes('skills') && r.status === 'error');
      expect(skillErrors.length).toBeGreaterThan(0);
    });
  });
});
