import {
  StructuredResume,
  ValidationResult,
  ValidationStatus,
  ValidationRule,
  ResumeTemplate,
} from '../types';
import { getDefaultTemplate } from '../data/defaultTemplateConfig';

function parseResumeDate(dateStr: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null;
  const normalized = dateStr.trim().toLowerCase();
  if (normalized === 'present' || normalized === 'today' || normalized === 'current') {
    return new Date();
  }

  const monthNames: Record<string, number> = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
    apr: 3, april: 3, may: 4, jun: 5, june: 5,
    jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8,
    oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
  };

  const monthYearMatch = normalized.match(/^([a-z]+)\s+(\d{4})$/);
  if (monthYearMatch) {
    const month = monthNames[monthYearMatch[1]];
    const year = parseInt(monthYearMatch[2], 10);
    if (month !== undefined && !isNaN(year)) return new Date(year, month, 1);
  }

  const yearOnly = normalized.match(/^(\d{4})$/);
  if (yearOnly) {
    return new Date(parseInt(yearOnly[1], 10), 0, 1);
  }

  return null;
}

const ACTION_VERBS = [
  'Achieved', 'Administered', 'Analyzed', 'Architected', 'Automated',
  'Built', 'Championed', 'Collaborated', 'Conducted', 'Consolidated',
  'Contributed', 'Coordinated', 'Created', 'Decreased', 'Delivered',
  'Designed', 'Developed', 'Directed', 'Drove', 'Eliminated',
  'Enabled', 'Engineered', 'Enhanced', 'Established', 'Executed',
  'Expanded', 'Facilitated', 'Generated', 'Grew', 'Guided',
  'Headed', 'Identified', 'Implemented', 'Improved', 'Increased',
  'Initiated', 'Innovated', 'Integrated', 'Introduced', 'Launched',
  'Led', 'Managed', 'Mentored', 'Modernized', 'Negotiated',
  'Optimized', 'Orchestrated', 'Organized', 'Oversaw', 'Partnered',
  'Pioneered', 'Planned', 'Presented', 'Prioritized', 'Produced',
  'Programmed', 'Proposed', 'Reduced', 'Refined', 'Reorganized',
  'Resolved', 'Restructured', 'Revamped', 'Reviewed', 'Scaled',
  'Secured', 'Simplified', 'Spearheaded', 'Standardized', 'Streamlined',
  'Strengthened', 'Supervised', 'Supported', 'Surpassed', 'Trained',
  'Transformed', 'Unified', 'Upgraded', 'Utilized',
];

export const validationService = {
  validateResume(resume: StructuredResume, template?: ResumeTemplate): ValidationResult[] {
    const activeTemplate = template || getDefaultTemplate();
    const results: ValidationResult[] = [];

    results.push(...this.validateSummary(resume.summary, activeTemplate));
    results.push(...this.validateExperience(resume.experience, activeTemplate));
    results.push(...this.validateEducation(resume.education, activeTemplate));
    results.push(...this.validateSkills(resume.skills, activeTemplate));
    results.push(...this.validateCertifications(resume.certifications, activeTemplate));
    results.push(...this.validateContactInfo(resume));
    results.push(...this.validateExperienceTimeline(resume.experience, resume.education));

    return results;
  },

  validateSummary(summary: string, template: ResumeTemplate): ValidationResult[] {
    const results: ValidationResult[] = [];
    const summarySection = template.sections.find((s) => s.type === 'summary');

    if (!summary || summary.trim().length === 0) {
      results.push({
        field: 'summary',
        status: 'error',
        message: 'Professional summary is required',
        rule: 'presence',
        category: 'warning',
      });
      return results;
    }

    if (summary.length < 100) {
      results.push({
        field: 'summary',
        status: 'warning',
        message: 'Summary should be at least 100 characters for better impact',
        rule: 'min-length',
        category: 'improvement',
      });
    }

    if (summary.length > 500) {
      results.push({
        field: 'summary',
        status: 'warning',
        message: 'Summary exceeds 500 characters. Consider making it more concise.',
        rule: 'max-length',
        category: 'improvement',
      });
    }

    const pronounPattern = /\b(I|me|my|myself)\b/gi;
    if (pronounPattern.test(summary)) {
      results.push({
        field: 'summary',
        status: 'warning',
        message: 'Avoid first-person pronouns in professional summary',
        rule: 'no-pronouns',
        category: 'improvement',
      });
    }

    if (results.length === 0) {
      results.push({
        field: 'summary',
        status: 'valid',
        message: 'Summary meets all requirements',
        rule: 'complete',
        category: 'warning',
      });
    }

    return results;
  },

  validateExperience(
    experience: StructuredResume['experience'],
    template: ResumeTemplate
  ): ValidationResult[] {
    const results: ValidationResult[] = [];

    if (!experience || experience.length === 0) {
      results.push({
        field: 'experience',
        status: 'error',
        message: 'At least one experience entry is required',
        rule: 'presence',
        category: 'warning',
      });
      return results;
    }

    experience.forEach((exp, index) => {
      const prefix = `experience[${index}]`;

      if (!exp.title || exp.title.trim().length === 0) {
        results.push({
          field: `${prefix}.title`,
          status: 'error',
          message: `Job title is required for experience #${index + 1}`,
          rule: 'presence',
          category: 'warning',
        });
      }

      if (!exp.company || exp.company.trim().length === 0) {
        results.push({
          field: `${prefix}.company`,
          status: 'error',
          message: `Company name is required for experience #${index + 1}`,
          rule: 'presence',
          category: 'warning',
        });
      }

      if (!exp.startDate) {
        results.push({
          field: `${prefix}.dates`,
          status: 'error',
          message: `Start date is required for experience #${index + 1}`,
          rule: 'presence',
          category: 'warning',
        });
      }

      if (exp.achievements && exp.achievements.length > 0) {
        exp.achievements.forEach((achievement, achIndex) => {
          const firstWord = achievement.trim().split(' ')[0];
          const isActionVerb = ACTION_VERBS.some(
            (verb) => verb.toLowerCase() === firstWord.toLowerCase()
          );

          if (!isActionVerb && achievement.length > 10) {
            results.push({
              field: `${prefix}.achievements[${achIndex}]`,
              status: 'warning',
              message: `Achievement should start with an action verb (e.g., Led, Developed, Achieved)`,
              rule: 'action-verbs',
              category: 'improvement',
            });
          }

          const hasMetrics = /\d+%|\$\d+|\d+\+|\d+x|\d+ (team|people|users|customers)/i.test(
            achievement
          );
          if (!hasMetrics && achievement.length > 20) {
            results.push({
              field: `${prefix}.achievements[${achIndex}]`,
              status: 'warning',
              message: 'Consider adding quantified metrics to this achievement',
              rule: 'quantify',
              category: 'improvement',
            });
          }
        });
      } else if (!exp.description || exp.description.length < 50) {
        results.push({
          field: `${prefix}.description`,
          status: 'warning',
          message: `Add achievements or a more detailed description for experience #${index + 1}`,
          rule: 'content-quality',
          category: 'improvement',
        });
      }
    });

    const sortedExps = [...experience]
      .map(exp => ({
        company: exp.company,
        title: exp.title,
        start: parseResumeDate(exp.startDate),
        end: parseResumeDate(exp.endDate),
      }))
      .filter(e => e.start !== null)
      .sort((a, b) => (b.start!.getTime()) - (a.start!.getTime()));

    const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

    if (sortedExps.length > 0) {
      const mostRecent = sortedExps[0];
      const mostRecentEnd = mostRecent.end || mostRecent.start!;
      const now = new Date();
      if (now.getTime() - mostRecentEnd.getTime() > SIX_MONTHS_MS) {
        const gapMonths = Math.round((now.getTime() - mostRecentEnd.getTime()) / (30 * 24 * 60 * 60 * 1000));
        results.push({
          field: 'experience.gap',
          status: 'warning',
          message: `Employment gap of ~${gapMonths} months between last role (${mostRecent.company}) and today`,
          rule: 'employment-gap',
          category: 'warning',
        });
      }

      for (let i = 0; i < sortedExps.length - 1; i++) {
        const current = sortedExps[i];
        const previous = sortedExps[i + 1];
        const currentStart = current.start!;
        const previousEnd = previous.end || previous.start!;

        if (currentStart.getTime() - previousEnd.getTime() > SIX_MONTHS_MS) {
          const gapMonths = Math.round((currentStart.getTime() - previousEnd.getTime()) / (30 * 24 * 60 * 60 * 1000));
          results.push({
            field: 'experience.gap',
            status: 'warning',
            message: `Employment gap of ~${gapMonths} months between ${previous.company} and ${current.company}`,
            rule: 'employment-gap',
            category: 'warning',
          });
        }
      }
    }

    const hasNoErrors = !results.some(
      (r) => r.field.startsWith('experience') && r.status === 'error'
    );
    if (hasNoErrors && experience.length > 0) {
      results.push({
        field: 'experience',
        status: 'valid',
        message: 'Experience section is complete',
        rule: 'complete',
        category: 'warning',
      });
    }

    return results;
  },

  validateEducation(
    education: StructuredResume['education'],
    template: ResumeTemplate
  ): ValidationResult[] {
    const results: ValidationResult[] = [];
    const eduSection = template.sections.find((s) => s.type === 'education');

    if (eduSection?.required && (!education || education.length === 0)) {
      results.push({
        field: 'education',
        status: 'error',
        message: 'At least one education entry is required',
        rule: 'presence',
        category: 'warning',
      });
      return results;
    }

    education?.forEach((edu, index) => {
      const prefix = `education[${index}]`;

      if (!edu.institution || edu.institution.trim().length === 0) {
        results.push({
          field: `${prefix}.institution`,
          status: 'error',
          message: `Institution is required for education #${index + 1}`,
          rule: 'presence',
          category: 'warning',
        });
      }

      if (!edu.degree || edu.degree.trim().length === 0) {
        results.push({
          field: `${prefix}.degree`,
          status: 'error',
          message: `Degree is required for education #${index + 1}`,
          rule: 'presence',
          category: 'warning',
        });
      }
    });

    const hasNoErrors = !results.some(
      (r) => r.field.startsWith('education') && r.status === 'error'
    );
    if (hasNoErrors && education && education.length > 0) {
      results.push({
        field: 'education',
        status: 'valid',
        message: 'Education section is complete',
        rule: 'complete',
        category: 'warning',
      });
    }

    return results;
  },

  validateSkills(
    skills: StructuredResume['skills'],
    template: ResumeTemplate
  ): ValidationResult[] {
    const results: ValidationResult[] = [];

    if (!skills || skills.length === 0) {
      results.push({
        field: 'skills',
        status: 'error',
        message: 'Skills section is required',
        rule: 'presence',
        category: 'warning',
      });
      return results;
    }

    const totalSkills = skills.reduce((sum, cat) => sum + cat.skills.length, 0);

    if (totalSkills < 5) {
      results.push({
        field: 'skills',
        status: 'warning',
        message: 'Consider adding more skills (recommended: 8-15)',
        rule: 'content-quality',
        category: 'improvement',
      });
    }

    if (totalSkills > 30) {
      results.push({
        field: 'skills',
        status: 'warning',
        message: 'Too many skills listed. Focus on the most relevant ones (recommended: 15-25)',
        rule: 'content-quality',
        category: 'improvement',
      });
    }

    if (results.filter((r) => r.field === 'skills' && r.status !== 'valid').length === 0) {
      results.push({
        field: 'skills',
        status: 'valid',
        message: 'Skills section is complete',
        rule: 'complete',
        category: 'warning',
      });
    }

    return results;
  },

  validateCertifications(
    certifications: StructuredResume['certifications'],
    template: ResumeTemplate
  ): ValidationResult[] {
    const results: ValidationResult[] = [];
    const certSection = template.sections.find((s) => s.type === 'certifications');

    if (certSection?.required && (!certifications || certifications.length === 0)) {
      results.push({
        field: 'certifications',
        status: 'warning',
        message: 'Consider adding relevant certifications if available',
        rule: 'presence',
        category: 'warning',
      });
    }

    certifications?.forEach((cert, index) => {
      const prefix = `certifications[${index}]`;

      if (!cert.name || cert.name.trim().length === 0) {
        results.push({
          field: `${prefix}.name`,
          status: 'error',
          message: `Certification name is required for entry #${index + 1}`,
          rule: 'presence',
          category: 'warning',
        });
      }

      if (!cert.issuer || cert.issuer.trim().length === 0) {
        results.push({
          field: `${prefix}.issuer`,
          status: 'warning',
          message: `Issuing organization recommended for certification #${index + 1}`,
          rule: 'content-quality',
          category: 'improvement',
        });
      }
    });

    return results;
  },

  validateContactInfo(resume: StructuredResume): ValidationResult[] {
    const results: ValidationResult[] = [];

    if (!resume.candidateName || resume.candidateName.trim().length === 0) {
      results.push({
        field: 'candidateName',
        status: 'error',
        message: 'Candidate name is required',
        rule: 'presence',
        category: 'warning',
      });
    }

    if (!resume.email) {
      results.push({
        field: 'email',
        status: 'warning',
        message: 'Email address is recommended',
        rule: 'presence',
        category: 'warning',
      });
    } else {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(resume.email)) {
        results.push({
          field: 'email',
          status: 'error',
          message: 'Invalid email format',
          rule: 'format',
          category: 'warning',
        });
      }
    }

    if (!resume.phone) {
      results.push({
        field: 'phone',
        status: 'warning',
        message: 'Phone number is recommended',
        rule: 'presence',
        category: 'warning',
      });
    }

    return results;
  },

  validateExperienceTimeline(
    experience: StructuredResume['experience'],
    education: StructuredResume['education']
  ): ValidationResult[] {
    const results: ValidationResult[] = [];
    if (!experience || !education || education.length === 0) return results;

    const graduationDates = education
      .map(edu => ({
        institution: edu.institution,
        degree: edu.degree,
        graduationDate: edu.graduationDate,
        date: parseResumeDate(edu.graduationDate),
      }))
      .filter(e => e.date !== null);

    if (graduationDates.length === 0) return results;

    const latestGraduation = graduationDates.reduce((latest, curr) =>
      curr.date!.getTime() > latest.date!.getTime() ? curr : latest
    );

    for (const exp of experience) {
      const expStart = parseResumeDate(exp.startDate);
      if (!expStart || !latestGraduation.date) continue;

      if (expStart.getTime() < latestGraduation.date.getTime()) {
        results.push({
          field: 'experience.timeline',
          status: 'warning',
          message: `${exp.company} (${exp.startDate}) started before graduation from ${latestGraduation.institution} (${latestGraduation.degree}, ${latestGraduation.graduationDate})`,
          rule: 'pre-graduation-experience',
          category: 'warning',
        });
      }
    }

    return results;
  },

  getOverallStatus(results: ValidationResult[]): ValidationStatus {
    if (results.some((r) => r.status === 'error')) {
      return 'error';
    }
    if (results.some((r) => r.status === 'warning')) {
      return 'warning';
    }
    if (results.some((r) => r.status === 'valid')) {
      return 'valid';
    }
    return 'pending';
  },

  getCompleteness(resume: StructuredResume): {
    percentage: number;
    filledFields: number;
    totalFields: number;
    missingFields: string[];
  } {
    const fields = [
      { name: 'Candidate Name', filled: !!resume.candidateName },
      { name: 'Email', filled: !!resume.email },
      { name: 'Phone', filled: !!resume.phone },
      { name: 'Location', filled: !!resume.location },
      { name: 'Summary', filled: !!resume.summary && resume.summary.length > 50 },
      { name: 'Experience', filled: resume.experience && resume.experience.length > 0 },
      { name: 'Education', filled: resume.education && resume.education.length > 0 },
      { name: 'Skills', filled: resume.skills && resume.skills.length > 0 },
    ];

    const filledFields = fields.filter((f) => f.filled).length;
    const totalFields = fields.length;
    const missingFields = fields.filter((f) => !f.filled).map((f) => f.name);

    return {
      percentage: Math.round((filledFields / totalFields) * 100),
      filledFields,
      totalFields,
      missingFields,
    };
  },

  getValidationSummary(results: ValidationResult[]): {
    errors: number;
    warnings: number;
    valid: number;
    bySection: Record<string, { errors: number; warnings: number }>;
  } {
    const bySection: Record<string, { errors: number; warnings: number }> = {};

    results.forEach((result) => {
      const section = result.field.split('[')[0].split('.')[0];
      if (!bySection[section]) {
        bySection[section] = { errors: 0, warnings: 0 };
      }
      if (result.status === 'error') bySection[section].errors++;
      if (result.status === 'warning') bySection[section].warnings++;
    });

    return {
      errors: results.filter((r) => r.status === 'error').length,
      warnings: results.filter((r) => r.status === 'warning').length,
      valid: results.filter((r) => r.status === 'valid').length,
      bySection,
    };
  },
};

export default validationService;
