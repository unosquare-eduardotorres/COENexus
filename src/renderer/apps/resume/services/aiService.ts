import { z } from 'zod';
import { AIConfig, AISuggestion, SuggestionOption, StructuredResume, RefinementMode, ExperienceEntry, EducationEntry, SkillCategory, CertificationEntry, TokenUsage, ResumeProcessingMetrics } from '../types';
import { TECH_SKILL_SLOTS } from '../constants/resume';
import { safeJsonParse } from '../../../shared/utils/safeJsonParse';

const extractionResponseSchema = z.object({
  candidateName: z.string().default(''),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  linkedIn: z.string().nullable().optional(),
  summary: z.string().default(''),
  experience: z.array(z.object({
    company: z.string().default(''),
    title: z.string().default(''),
    projectName: z.string().nullable().optional(),
    startDate: z.string().default(''),
    endDate: z.string().default(''),
    location: z.string().nullable().optional(),
    description: z.string().default(''),
    achievements: z.array(z.string()).default([]),
    technologies: z.array(z.string()).default([]),
  })).default([]),
  education: z.array(z.object({
    institution: z.string().default(''),
    degree: z.string().default(''),
    field: z.string().default(''),
    graduationDate: z.string().default(''),
    gpa: z.string().nullable().optional(),
    honors: z.string().nullable().optional(),
  })).default([]),
  skills: z.array(z.object({
    name: z.string().default(''),
    skills: z.array(z.string()).default([]),
  })).default([]),
  certifications: z.array(z.object({
    name: z.string().default(''),
    issuer: z.string().default(''),
    date: z.string().default(''),
  })).default([]),
});

const enhancementResponseSchema = z.object({
  summary: z.string().optional(),
  experience: z.array(z.object({
    description: z.string().optional(),
    achievements: z.array(z.string()).optional(),
    technologies: z.array(z.string()).optional(),
  })).default([]),
  templateSkills: z.array(z.string()).optional(),
  cloudSkills: z.array(z.string()).optional(),
});

function parseAiJson<T>(raw: string, schema: z.ZodSchema<T>, context: string): T {
  try {
    const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const result = schema.safeParse(parsed);
    if (!result.success) {
      throw new Error(result.error.issues.map(i => i.message).join(', '));
    }
    return result.data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`AI response parse failed (${context}):`, msg);
    throw new Error(`AI response parse failed (${context}): ${msg}`);
  }
}

const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'local',
  localEndpoint: '/api/claude/v1',
  cloudEndpoint: 'https://api.anthropic.com/v1',
  model: 'claude-sonnet-4-20250514',
  temperature: 0.1,
  maxTokens: 4096,
};


function buildExtractionPrompt(rawText: string): string {
  return `Extract the resume information from the text below and return ONLY valid JSON matching this exact schema. Do not rewrite or improve the content — extract it as-is from the source. Return no markdown code blocks, no explanations, just the raw JSON object.

Schema:
{
  "candidateName": "string",
  "email": "string or null",
  "phone": "string or null",
  "location": "string or null",
  "linkedIn": "string or null",
  "summary": "string",
  "experience": [
    {
      "company": "string",
      "title": "string",
      "projectName": "string or null",
      "startDate": "string",
      "endDate": "string",
      "location": "string or null",
      "description": "3-5 line paragraph describing the work, team, methodologies, and responsibilities",
      "achievements": ["string"],
      "technologies": ["string — each individual technology or tool used in this role"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "field": "string",
      "graduationDate": "string",
      "gpa": "string or omit if not present",
      "honors": "string or omit if not present"
    }
  ],
  "skills": [
    {
      "name": "string (category name, e.g. Technical Skills)",
      "skills": ["string"]
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuer": "string",
      "date": "string"
    }
  ]
}

IMPORTANT: For skills and technologies, split compound entries. E.g. 'Entity Framework/Dapper/ADO.NET' should become three separate items: 'Entity Framework', 'Dapper', 'ADO.NET'. Same for 'CI/CD (Jenkins, Git, JIRA)' → 'CI/CD', 'Jenkins', 'Git', 'JIRA'. Each skill/technology must be a single, atomic item.
For cloudSkills, classify skills related to AI, cloud platforms, or cloud-native tools. E.g. 'Azure CosmosDB', 'Azure Functions', 'AWS Lambda', 'OpenAI' are cloud/AI skills. Standard frameworks like 'React', '.NET', 'Entity Framework' are NOT cloud skills.
For each work experience entry, extract a 'technologies' array listing the individual technologies, frameworks, tools, and platforms mentioned. Split compound entries. Also extract 'projectName' if the resume mentions a specific project name for that role.

Resume text:
${rawText}`;
}

async function callClaudeLocal(config: AIConfig, prompt: string): Promise<{ content: string; usage: TokenUsage | null }> {
  const messages = [{ role: 'user', content: prompt }];
  const data = await window.api.ai.chat(config.model, messages, config.maxTokens) as {
    choices: { message: { content: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };
  const content = data.choices[0].message.content;
  const rawUsage = data.usage;
  const usage: TokenUsage | null = rawUsage
    ? {
        promptTokens: rawUsage.prompt_tokens ?? 0,
        completionTokens: rawUsage.completion_tokens ?? 0,
        totalTokens: rawUsage.total_tokens ?? 0,
      }
    : null;
  return { content, usage };
}

type ExtractionResult = z.infer<typeof extractionResponseSchema>;

function mapToStructuredResume(
  parsed: ExtractionResult,
  fileName: string,
  fileType: 'pdf' | 'docx' | 'txt',
  rawText: string
): StructuredResume {
  const now = Date.now();

  const experience: ExperienceEntry[] = parsed.experience.map((e, idx) => ({
    id: `exp-${now}-${idx}`,
    company: e.company,
    title: e.title,
    startDate: e.startDate,
    endDate: e.endDate,
    location: e.location ?? undefined,
    description: e.description,
    achievements: e.achievements,
    technologies: e.technologies,
    projectName: e.projectName ?? undefined,
  }));

  const education: EducationEntry[] = parsed.education.map((e, idx) => ({
    id: `edu-${now}-${idx}`,
    institution: e.institution,
    degree: e.degree,
    field: e.field,
    graduationDate: e.graduationDate.toLowerCase() === 'unknown' ? '' : e.graduationDate,
    gpa: e.gpa ?? undefined,
    honors: e.honors ?? undefined,
  }));

  const skills: SkillCategory[] = parsed.skills.map((s, idx) => ({
    id: `skill-cat-${now}-${idx}`,
    name: s.name,
    skills: s.skills,
  }));

  const certifications: CertificationEntry[] = parsed.certifications.map((c, idx) => ({
    id: `cert-${now}-${idx}`,
    name: c.name,
    issuer: c.issuer,
    date: c.date.toLowerCase() === 'unknown' ? '' : c.date,
  }));

  const processedSkills = splitCompoundSkills(skills);
  const allExtractedSkills = processedSkills.flatMap(cat => cat.skills);
  const classified = classifyCloudSkills(allExtractedSkills);

  return {
    id: `resume-${now}`,
    originalFileName: fileName,
    originalFileType: fileType,
    originalContent: rawText,
    candidateName: parsed.candidateName,
    email: parsed.email ?? undefined,
    phone: parsed.phone ?? undefined,
    location: parsed.location ?? undefined,
    linkedIn: parsed.linkedIn ?? undefined,
    summary: parsed.summary,
    experience,
    education,
    skills: processedSkills,
    certifications,
    templateSkills: classified.techSkills,
    cloudSkills: classified.cloudSkills,
    status: 'transformed',
    transformedAt: new Date().toISOString(),
    validationResults: [],
    overallValidationStatus: 'pending',
  };
}

function splitCompoundSkills(skills: SkillCategory[]): SkillCategory[] {
  return skills.map(cat => ({
    ...cat,
    skills: cat.skills.flatMap(skill => {
      let parts = [skill];
      if (skill.includes('/') && !skill.match(/^\.NET|^Node\.js|^CI\/CD/i)) {
        parts = skill.split('/').map(s => s.trim()).filter(Boolean);
      }
      return parts.flatMap(part => {
        const match = part.match(/^(.+?)\s*\(([^)]+)\)$/);
        if (match) {
          const base = match[1].trim();
          const inner = match[2].split(',').map(s => s.trim()).filter(Boolean);
          return [base, ...inner];
        }
        return [part];
      });
    }),
  }));
}

function classifyCloudSkills(allSkills: string[]): { techSkills: string[]; cloudSkills: string[] } {
  const cloudPatterns = /azure|aws|gcp|cloud|lambda|cosmos|openai|gemini|anthropic|vertex|sagemaker|bedrock|devops/i;
  const genericExclusions = /^azure\s*hosting$/i;

  const cloudSkills = allSkills.filter(s => cloudPatterns.test(s) && !genericExclusions.test(s));
  const cloudSet = new Set(cloudSkills);
  const techSkills = allSkills.filter(s => !cloudSet.has(s)).slice(0, TECH_SKILL_SLOTS);
  return { techSkills, cloudSkills };
}

function buildEnhancementPrompt(resume: StructuredResume, mode: RefinementMode): string {
  const modeInstructions: Record<RefinementMode, string> = {
    'professional-polish': 'Refine the language to be more professional and polished. Use strong action verbs, eliminate filler words, and improve clarity.',
    'impact-focused': 'Rewrite to emphasize measurable impact and achievements. Add quantified results where possible (percentages, dollar amounts, team sizes).',
    'ats-optimized': 'Optimize for Applicant Tracking Systems. Use industry-standard keywords, remove creative formatting, and ensure keyword density.',
    'job-tailoring': 'Enhance the content to be more compelling and tailored for the target role.',
  };

  const allSkills = resume.skills.flatMap(cat => cat.skills);
  const today = new Date().toISOString().split('T')[0];

  return `Enhance this resume content. Mode: ${mode}. Instructions: ${modeInstructions[mode]}

Today's date is ${today}. When the summary mentions years of experience, recalculate from the earliest experience start date to today and use the correct number.

Return ONLY valid JSON (no markdown, no explanation) with this structure:
{
  "summary": "enhanced summary text",
  "experience": [
    { "description": "enhanced description", "achievements": ["enhanced achievement 1"], "technologies": ["technology1", "technology2"] }
  ],
  "templateSkills": ["top 14 technical skills — prioritize the candidate's primary tech domain"],
  "cloudSkills": ["all AI/cloud-related skills"]
}

Keep the same number of experience entries in the same order. Only enhance summary and experience descriptions/achievements/technologies. When returning technologies, split compound entries (e.g. 'Entity Framework/Dapper' → separate items).

Current resume data:
${JSON.stringify({ summary: resume.summary, experience: resume.experience.map(e => ({ startDate: e.startDate, endDate: e.endDate, description: e.description, achievements: e.achievements, technologies: e.technologies || [] })) })}
Select the TOP 14 most relevant technical skills from: ${JSON.stringify(allSkills)}
IMPORTANT for templateSkills selection: First identify the candidate's primary technology domain from their experience entries (e.g., iOS/Swift, .NET/C#, React/TypeScript, Java/Android, Python/ML). Ensure at least 8 of the 14 skills are core technologies from that domain (languages, frameworks, SDKs, testing tools). Fill the remaining slots with supporting tools. Do NOT prioritize generic project management tools (Jira, SCRUM, Confluence) over domain-specific technologies.
Also select all AI/cloud-related skills for cloudSkills.`;
}

export const aiService = {
  getConfig(): AIConfig {
    return safeJsonParse(localStorage.getItem('ai_config'), DEFAULT_AI_CONFIG);
  },

  async checkConnection(): Promise<boolean> {
    try {
      const result = await window.api.ai.checkConnection() as { available: boolean };
      return result.available;
    } catch {
      return false;
    }
  },

  updateConfig(config: Partial<AIConfig>): AIConfig {
    const current = this.getConfig();
    const updated = { ...current, ...config };
    localStorage.setItem('ai_config', JSON.stringify(updated));
    return updated;
  },

  async extractResumeData(rawText: string, fileName: string): Promise<{ resume: StructuredResume; metrics: ResumeProcessingMetrics }> {
    const config = this.getConfig();
    const fileType = (fileName.split('.').pop()?.toLowerCase() || 'txt') as 'pdf' | 'docx' | 'txt';
    const startTime = performance.now();

    try {
      const prompt = buildExtractionPrompt(rawText);
      const { content: response, usage } = await callClaudeLocal(config, prompt);
      const parsed = parseAiJson(response, extractionResponseSchema, 'extractResumeData');
      const resume = mapToStructuredResume(parsed, fileName, fileType, rawText);
      const processingTimeMs = Math.round(performance.now() - startTime);
      return { resume, metrics: { extractionTokens: usage, totalTokens: usage, processingTimeMs, modelUsed: config.model, wasAiExtraction: true } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'AI extraction failed';
      throw new Error(`Resume extraction failed: ${msg}`);
    }
  },

  async generateSuggestions(
    _text: string,
    _sectionType: string,
    _context?: string
  ): Promise<SuggestionOption[]> {
    // TODO: Implement AI-powered suggestions when backend endpoint is available
    return [];
  },

  async transformResume(
    rawContent: string,
    fileName: string,
    _refinementMode?: RefinementMode,
    _jobDescription?: string
  ): Promise<{ resume: StructuredResume; metrics: ResumeProcessingMetrics }> {
    return this.extractResumeData(rawContent, fileName);
  },

  async enhanceFullResume(resume: StructuredResume, mode: RefinementMode): Promise<{ resume: StructuredResume; usage: TokenUsage | null }> {
    const config = this.getConfig();
    const prompt = buildEnhancementPrompt(resume, mode);
    const { content, usage } = await callClaudeLocal(config, prompt);
    const parsed = parseAiJson(content, enhancementResponseSchema, 'enhanceFullResume');
    const enhanced = {
      ...resume,
      summary: parsed.summary || resume.summary,
      templateSkills: parsed.templateSkills || resume.templateSkills,
      cloudSkills: parsed.cloudSkills || resume.cloudSkills,
      experience: resume.experience.map((exp, i) => ({
        ...exp,
        description: parsed.experience?.[i]?.description || exp.description,
        achievements: parsed.experience?.[i]?.achievements || exp.achievements,
        technologies: parsed.experience?.[i]?.technologies || exp.technologies || [],
      })),
    };
    return { resume: enhanced, usage };
  },

};

export default aiService;
