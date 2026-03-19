import { MatchEnginePromptConfig } from '../types';

const STORAGE_KEY = 'match_engine_prompts';

export const defaultMatchPrompts: MatchEnginePromptConfig[] = [
  {
    id: 'match-haiku-triage',
    key: 'haiku-triage',
    name: 'Haiku Triage',
    description: 'Fast relevance triage to keep only the strongest profiles before deeper analysis.',
    promptTemplate: `You are a technical recruiter AI. Given this job description and resume, assess relevance.

Job Description:
{{jobDescription}}

Resume:
{{resume}}

Respond in JSON only: {"relevant": true/false, "score": 0-100, "reason": "brief explanation"}`,
    variables: ['jobDescription', 'resume'],
    maxTokens: 256,
    temperature: 0.1,
    isDefault: true,
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'match-opus-analysis',
    key: 'opus-analysis',
    name: 'Opus Analysis',
    description: 'Deep structured candidate analysis with detailed scoring and executive-quality fit rationale.',
    promptTemplate: `You are a senior technical recruiter AI performing deep candidate analysis.

Job Description:
{{jobDescription}}

Candidate Name: {{candidateName}}
Current Title: {{jobTitle}}
Seniority: {{seniority}}
Main Skill: {{mainSkill}}
Country: {{country}}
Rate: {{rate}} {{currency}}
On Bench: {{isBench}}
Source: {{sourceType}}

Resume:
{{resume}}

Analyze this candidate's fit for the role. Return a JSON object with this exact structure:
{
  "matchScore": <0-100>,
  "role": "<candidate's best-fit role title>",
  "years": <total years of experience>,
  "location": "{{country}}",
  "salary": "{{salaryDisplay}}",
  "availability": "{{availabilityDisplay}}",
  "scores": { "technical": <0-100>, "domain": <0-100>, "leadership": <0-100>, "softSkills": <0-100>, "availability": <0-100> },
  "summary": "<2-3 sentence executive summary of fit>",
  "skills": [{ "name": "<skill>", "status": "match|partial|missing", "years": <years> }],
  "domains": [{ "name": "<domain>", "confidence": <0-100>, "evidence": "<brief evidence>" }],
  "gaps": [{ "skill": "<gap area>", "severity": "high|medium|low", "note": "<explanation>" }],
  "leadership": ["<leadership quality or achievement>"],
  "softSkills": ["<soft skill>"],
  "analysis": {
    "whyRightFit": "<detailed narrative on why this candidate fits>",
    "immediateValue": "<what value they bring day one>",
    "rampUpEstimate": "<realistic ramp-up time and what they need to learn>",
    "riskFactors": "<risks and how to mitigate them>",
    "beyondJd": "<hidden strengths beyond the JD requirements>",
    "leadershipDynamics": "<leadership style and team dynamics>",
    "industryDepth": "<industry and domain knowledge depth>",
    "trackRecord": "<proof points and track record>",
    "culturalFit": "<cultural and work style compatibility>",
    "retentionPotential": "<long-term retention potential and growth path>"
  }
}

Return ONLY valid JSON, no markdown or explanation.`,
    variables: [
      'jobDescription',
      'candidateName',
      'jobTitle',
      'seniority',
      'mainSkill',
      'country',
      'rate',
      'currency',
      'isBench',
      'sourceType',
      'resume',
      'salaryDisplay',
      'availabilityDisplay',
    ],
    maxTokens: 4096,
    temperature: 0.2,
    isDefault: true,
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

export function getMatchPrompts(): MatchEnginePromptConfig[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return defaultMatchPrompts;
}

export function saveMatchPrompts(prompts: MatchEnginePromptConfig[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
}

export function saveMatchPrompt(prompt: MatchEnginePromptConfig): void {
  const prompts = getMatchPrompts();
  const index = prompts.findIndex((p) => p.id === prompt.id);
  if (index >= 0) {
    prompts[index] = { ...prompt, updatedAt: new Date().toISOString() };
  } else {
    prompts.push(prompt);
  }
  saveMatchPrompts(prompts);
}

export function resetMatchPrompt(promptId: string): MatchEnginePromptConfig | undefined {
  const original = defaultMatchPrompts.find((p) => p.id === promptId);
  if (!original) return undefined;

  const prompts = getMatchPrompts();
  const index = prompts.findIndex((p) => p.id === promptId);
  if (index >= 0) {
    prompts[index] = { ...original };
    saveMatchPrompts(prompts);
  }
  return original;
}

export function resetAllMatchPrompts(): MatchEnginePromptConfig[] {
  localStorage.removeItem(STORAGE_KEY);
  return defaultMatchPrompts;
}
