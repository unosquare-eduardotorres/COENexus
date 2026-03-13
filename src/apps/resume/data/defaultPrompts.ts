import { RefinementPrompt } from '../types';

const STORAGE_KEY = 'refinement_prompts';

export const defaultPrompts: RefinementPrompt[] = [
  {
    id: 'prompt-professional-polish',
    mode: 'professional-polish',
    name: 'Professional Polish',
    description: 'Improves clarity, grammar, and professional tone while preserving all factual information.',
    promptTemplate: `You are a professional resume editor. Your task is to polish the following {{sectionType}} section of a resume.

Original text:
{{originalText}}

Instructions:
- Improve clarity, grammar, and professional tone
- Preserve ALL factual information (dates, numbers, company names, technologies)
- Use active voice and strong action verbs
- Ensure consistent tense (past tense for previous roles, present for current)
- Remove filler words and redundant phrases
- Maintain the candidate's authentic voice while elevating professionalism

Return only the polished text without explanations.`,
    variables: ['sectionType', 'originalText'],
    isDefault: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'prompt-impact-focused',
    mode: 'impact-focused',
    name: 'Impact-Focused',
    description: 'Transforms responsibility-focused language into achievement-focused language with quantifiable results.',
    promptTemplate: `You are an executive resume strategist. Transform the following resume text from responsibility-focused to achievement-focused language.

Original text:
{{originalText}}

Role: {{role}}
Company: {{company}}

Instructions:
- Convert "responsible for" language into accomplishment statements
- Add quantifiable metrics where reasonable (percentages, dollar amounts, team sizes, timeframes)
- Start each bullet with a power verb (Led, Drove, Architected, Spearheaded, Delivered, etc.)
- Follow the CAR format: Challenge → Action → Result
- Ensure each statement demonstrates measurable impact
- Keep the content truthful — infer reasonable metrics from context

Return only the transformed text without explanations.`,
    variables: ['originalText', 'role', 'company'],
    isDefault: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'prompt-ats-optimized',
    mode: 'ats-optimized',
    name: 'ATS-Optimized',
    description: 'Maximizes compatibility with Applicant Tracking Systems through strategic keyword optimization.',
    promptTemplate: `You are an ATS optimization specialist. Rewrite the following {{sectionType}} section to maximize ATS compatibility.

Original text:
{{originalText}}

Target keywords to incorporate naturally:
{{targetKeywords}}

Instructions:
- Integrate target keywords naturally into the text (do NOT keyword-stuff)
- Use standard section headers and formatting that ATS systems recognize
- Spell out acronyms on first use, then use the abbreviation
- Use standard job titles and industry-recognized terminology
- Avoid tables, columns, headers/footers, and special characters that ATS may not parse
- Include both the spelled-out and abbreviated forms of technical terms
- Maintain readability for human reviewers while optimizing for ATS parsing

Return only the optimized text without explanations.`,
    variables: ['sectionType', 'originalText', 'targetKeywords'],
    isDefault: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'prompt-job-tailoring',
    mode: 'job-tailoring',
    name: 'Job Description Tailoring',
    description: 'Reshapes the resume to emphasize experience most relevant to a specific job description.',
    promptTemplate: `You are a career strategist specializing in resume tailoring. Reshape the following {{sectionType}} section to align with the target job description.

Job Description:
{{jobDescription}}

Original text:
{{originalText}}

Candidate's technologies:
{{allTechnologies}}

Instructions:
- Prioritize experiences and skills that directly match the job requirements
- Mirror the language and terminology used in the job description
- Emphasize transferable skills that align with the role's needs
- Reorder bullet points to lead with the most relevant accomplishments
- Add context that connects past experience to the target role's requirements
- Highlight matching technologies and methodologies
- Maintain truthfulness — only emphasize what's genuinely in the candidate's background

Return only the tailored text without explanations.`,
    variables: ['jobDescription', 'sectionType', 'originalText', 'allTechnologies'],
    isDefault: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

export function getPrompts(): RefinementPrompt[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return defaultPrompts;
}

export function savePrompts(prompts: RefinementPrompt[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
}

export function savePrompt(prompt: RefinementPrompt): void {
  const prompts = getPrompts();
  const index = prompts.findIndex((p) => p.id === prompt.id);
  if (index >= 0) {
    prompts[index] = { ...prompt, updatedAt: new Date().toISOString() };
  } else {
    prompts.push(prompt);
  }
  savePrompts(prompts);
}

export function resetPrompt(promptId: string): RefinementPrompt | undefined {
  const original = defaultPrompts.find((p) => p.id === promptId);
  if (!original) return undefined;

  const prompts = getPrompts();
  const index = prompts.findIndex((p) => p.id === promptId);
  if (index >= 0) {
    prompts[index] = { ...original };
    savePrompts(prompts);
  }
  return original;
}

export function resetAllPrompts(): RefinementPrompt[] {
  localStorage.removeItem(STORAGE_KEY);
  return defaultPrompts;
}

export function getPromptByMode(mode: RefinementPrompt['mode']): RefinementPrompt | undefined {
  const prompts = getPrompts();
  return prompts.find((p) => p.mode === mode);
}
