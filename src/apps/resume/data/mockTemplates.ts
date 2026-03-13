import { ResumeTemplate, ContentGuideline, ValidationRule } from '../types';

export const defaultValidationRules: ValidationRule[] = [
  {
    id: 'rule-action-verbs',
    name: 'Action Verbs Required',
    type: 'content',
    enabled: true,
    config: {
      mustStartWithActionVerb: true,
      requiredWords: [],
    },
    errorMessage: 'Experience descriptions should start with strong action verbs',
    severity: 'warning',
  },
  {
    id: 'rule-date-format',
    name: 'Date Format',
    type: 'format',
    enabled: true,
    config: {
      dateFormat: 'MMM YYYY',
      pattern: '^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s\\d{4}$|^Present$',
    },
    errorMessage: 'Dates should be in "MMM YYYY" format (e.g., Jan 2024)',
    severity: 'warning',
  },
  {
    id: 'rule-min-summary-length',
    name: 'Summary Minimum Length',
    type: 'length',
    enabled: true,
    config: {
      minLength: 100,
    },
    errorMessage: 'Summary should be at least 100 characters',
    severity: 'error',
  },
  {
    id: 'rule-max-summary-length',
    name: 'Summary Maximum Length',
    type: 'length',
    enabled: true,
    config: {
      maxLength: 500,
    },
    errorMessage: 'Summary should not exceed 500 characters',
    severity: 'warning',
  },
  {
    id: 'rule-no-pronouns',
    name: 'No First Person Pronouns',
    type: 'content',
    enabled: true,
    config: {
      forbiddenWords: ['I ', 'me ', 'my ', 'myself'],
    },
    errorMessage: 'Avoid first-person pronouns (I, me, my)',
    severity: 'warning',
  },
  {
    id: 'rule-quantify-achievements',
    name: 'Quantified Achievements',
    type: 'custom',
    enabled: true,
    config: {
      pattern: '\\d+%|\\$\\d+|\\d+\\+|\\d+x',
    },
    errorMessage: 'Consider adding quantified achievements (percentages, dollar amounts, etc.)',
    severity: 'warning',
  },
];

export const defaultContentGuidelines: ContentGuideline[] = [
  {
    id: 'guideline-action-verbs',
    name: 'Use Strong Action Verbs',
    description: 'Begin each achievement with a powerful action verb to demonstrate impact',
    category: 'Experience',
    enabled: true,
    examples: [
      {
        bad: 'Was responsible for managing a team',
        good: 'Led and mentored a team of 8 engineers',
        explanation: 'Active voice with specific numbers shows leadership impact',
      },
      {
        bad: 'Helped with the development of new features',
        good: 'Architected and delivered 5 customer-facing features',
        explanation: 'Specific action verb with quantified outcome',
      },
    ],
  },
  {
    id: 'guideline-quantify',
    name: 'Quantify Achievements',
    description: 'Include metrics, percentages, or numbers to demonstrate measurable impact',
    category: 'Experience',
    enabled: true,
    examples: [
      {
        bad: 'Improved system performance',
        good: 'Improved system performance by 40%, reducing page load time from 3s to 1.8s',
        explanation: 'Specific metrics make achievements concrete and verifiable',
      },
      {
        bad: 'Managed a large budget',
        good: 'Managed $2.5M annual budget, delivering projects 15% under budget',
        explanation: 'Dollar amounts and percentages provide context',
      },
    ],
  },
  {
    id: 'guideline-concise-summary',
    name: 'Concise Professional Summary',
    description: 'Summary should be 2-4 sentences highlighting key qualifications',
    category: 'Summary',
    enabled: true,
    examples: [
      {
        bad: 'I am a hardworking professional who has experience in many areas and wants to grow',
        good: 'Senior Software Engineer with 8+ years building scalable cloud applications. Expert in microservices architecture, leading teams of 5-10 engineers. Proven track record of delivering $1M+ revenue features.',
        explanation: 'Specific, metrics-driven, and focused on value proposition',
      },
    ],
  },
  {
    id: 'guideline-skills-grouping',
    name: 'Organized Skills Categories',
    description: 'Group skills into logical categories for better readability',
    category: 'Skills',
    enabled: true,
    examples: [
      {
        bad: 'JavaScript, Leadership, Python, Communication, AWS, Problem Solving',
        good: 'Technical: JavaScript, Python, AWS | Leadership: Team Management, Mentoring | Communication: Stakeholder Management',
        explanation: 'Categorized skills are easier to scan and evaluate',
      },
    ],
  },
];

export const defaultTemplate: ResumeTemplate = {
  id: 'template-001',
  name: 'Standard Company Resume Format',
  description: 'Default company resume template with all required sections and validation rules',
  version: '1.0.0',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
  createdBy: 'admin-001',
  isActive: true,
  sections: [
    {
      id: 'section-summary',
      name: 'Professional Summary',
      type: 'summary',
      required: true,
      order: 1,
      fields: [
        {
          id: 'field-summary-text',
          name: 'Summary',
          type: 'textarea',
          required: true,
          maxLength: 500,
          placeholder: 'Enter a concise professional summary (2-4 sentences)',
          helpText: 'Highlight your key qualifications, years of experience, and main areas of expertise',
          validationRules: [
            {
              id: 'rule-summary-length',
              name: 'Summary Length',
              type: 'length',
              enabled: true,
              config: { minLength: 100, maxLength: 500 },
              errorMessage: 'Summary should be 100-500 characters',
              severity: 'error',
            },
          ],
        },
      ],
      sectionValidationRules: [],
    },
    {
      id: 'section-experience',
      name: 'Professional Experience',
      type: 'experience',
      required: true,
      order: 2,
      fields: [
        {
          id: 'field-exp-title',
          name: 'Job Title',
          type: 'text',
          required: true,
          placeholder: 'e.g., Senior Software Engineer',
          helpText: 'Your official job title',
          validationRules: [],
        },
        {
          id: 'field-exp-company',
          name: 'Company',
          type: 'text',
          required: true,
          placeholder: 'e.g., TechCorp Inc.',
          helpText: 'Company or organization name',
          validationRules: [],
        },
        {
          id: 'field-exp-dates',
          name: 'Employment Period',
          type: 'text',
          required: true,
          placeholder: 'Jan 2020 - Present',
          helpText: 'Start and end dates in MMM YYYY format',
          validationRules: [],
        },
        {
          id: 'field-exp-description',
          name: 'Description & Achievements',
          type: 'textarea',
          required: true,
          placeholder: 'Describe your responsibilities and achievements',
          helpText: 'Use bullet points starting with action verbs. Include metrics when possible.',
          validationRules: [],
        },
      ],
      sectionValidationRules: [
        {
          id: 'rule-exp-min-entries',
          name: 'Minimum Experience Entries',
          type: 'custom',
          enabled: true,
          config: { minLength: 1 },
          errorMessage: 'At least one experience entry is required',
          severity: 'error',
        },
      ],
    },
    {
      id: 'section-education',
      name: 'Education',
      type: 'education',
      required: true,
      order: 3,
      fields: [
        {
          id: 'field-edu-institution',
          name: 'Institution',
          type: 'text',
          required: true,
          placeholder: 'e.g., University of California, Berkeley',
          helpText: 'Name of the educational institution',
          validationRules: [],
        },
        {
          id: 'field-edu-degree',
          name: 'Degree',
          type: 'text',
          required: true,
          placeholder: 'e.g., Bachelor of Science',
          helpText: 'Type of degree earned',
          validationRules: [],
        },
        {
          id: 'field-edu-field',
          name: 'Field of Study',
          type: 'text',
          required: true,
          placeholder: 'e.g., Computer Science',
          helpText: 'Major or field of study',
          validationRules: [],
        },
        {
          id: 'field-edu-date',
          name: 'Graduation Date',
          type: 'text',
          required: true,
          placeholder: 'May 2020',
          helpText: 'Month and year of graduation',
          validationRules: [],
        },
      ],
      sectionValidationRules: [],
    },
    {
      id: 'section-skills',
      name: 'Skills',
      type: 'skills',
      required: true,
      order: 4,
      fields: [
        {
          id: 'field-skills-list',
          name: 'Skills',
          type: 'list',
          required: true,
          placeholder: 'Enter skills separated by commas',
          helpText: 'List your technical and professional skills',
          validationRules: [],
        },
      ],
      sectionValidationRules: [],
    },
    {
      id: 'section-certifications',
      name: 'Certifications',
      type: 'certifications',
      required: false,
      order: 5,
      fields: [
        {
          id: 'field-cert-name',
          name: 'Certification Name',
          type: 'text',
          required: true,
          placeholder: 'e.g., AWS Certified Solutions Architect',
          helpText: 'Full name of the certification',
          validationRules: [],
        },
        {
          id: 'field-cert-issuer',
          name: 'Issuing Organization',
          type: 'text',
          required: true,
          placeholder: 'e.g., Amazon Web Services',
          helpText: 'Organization that issued the certification',
          validationRules: [],
        },
        {
          id: 'field-cert-date',
          name: 'Date Obtained',
          type: 'text',
          required: true,
          placeholder: 'Jun 2023',
          helpText: 'Month and year certification was obtained',
          validationRules: [],
        },
      ],
      sectionValidationRules: [],
    },
  ],
  globalValidationRules: defaultValidationRules,
  contentGuidelines: defaultContentGuidelines,
};

export function getDefaultTemplate(): ResumeTemplate {
  const stored = localStorage.getItem('resume_template');
  if (stored) {
    return JSON.parse(stored);
  }
  return defaultTemplate;
}

export function saveTemplate(template: ResumeTemplate): void {
  localStorage.setItem('resume_template', JSON.stringify(template));
}

export function resetTemplate(): ResumeTemplate {
  localStorage.removeItem('resume_template');
  return defaultTemplate;
}

export function getContentGuidelines(): ContentGuideline[] {
  const template = getDefaultTemplate();
  return template.contentGuidelines;
}

export function updateContentGuidelines(guidelines: ContentGuideline[]): void {
  const template = getDefaultTemplate();
  template.contentGuidelines = guidelines;
  template.updatedAt = new Date().toISOString();
  saveTemplate(template);
}

export function getValidationRules(): ValidationRule[] {
  const template = getDefaultTemplate();
  return template.globalValidationRules;
}

export function updateValidationRules(rules: ValidationRule[]): void {
  const template = getDefaultTemplate();
  template.globalValidationRules = rules;
  template.updatedAt = new Date().toISOString();
  saveTemplate(template);
}
