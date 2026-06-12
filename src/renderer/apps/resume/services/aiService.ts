import { z } from 'zod';
import { AIConfig, AISuggestion, SuggestionOption, StructuredResume, RefinementMode, ExperienceEntry, EducationEntry, SkillCategory, CertificationEntry, TokenUsage, ResumeProcessingMetrics } from '../types';
import { TECH_SKILL_SLOTS } from '../constants/resume';
import { safeJsonParse } from '../../../shared/utils/safeJsonParse';

const safeString = () => z.string().nullable().transform(v => v ?? '').default('');

const extractionResponseSchema = z.object({
  candidateName: safeString(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  linkedIn: z.string().nullable().optional(),
  summary: safeString(),
  experience: z.array(z.object({
    company: safeString(),
    title: safeString(),
    projectName: z.string().nullable().optional(),
    startDate: safeString(),
    endDate: safeString(),
    location: z.string().nullable().optional(),
    description: safeString(),
    achievements: z.array(z.string()).default([]),
    technologies: z.array(z.string()).default([]),
  })).default([]),
  education: z.array(z.object({
    institution: safeString(),
    degree: safeString(),
    field: safeString(),
    graduationDate: safeString(),
    gpa: z.string().nullable().optional(),
    honors: z.string().nullable().optional(),
  })).default([]),
  skills: z.array(z.object({
    name: safeString(),
    skills: z.array(z.string()).default([]),
  })).default([]),
  certifications: z.array(z.object({
    name: safeString(),
    issuer: safeString(),
    date: safeString(),
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

function parseAiJson<T>(raw: string, schema: z.ZodType<T>, context: string): T {
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
  "candidateName": "string — full name ONLY, no degrees, credentials, suffixes, or post-nominals (strip BSc, BA, MBA, MBCS, PhD, PMP, etc.)",
  "email": "string or null",
  "phone": "string or null",
  "location": "string or null",
  "linkedIn": "string or null",
  "summary": "string",
  "experience": [
    {
      "company": "string",
      "title": "string — concise job title only (e.g. 'Lead Software Engineer'). Strip parenthetical qualifiers like '(plus acting PM)', verbose descriptions, and technology lists. Max 5 words.",
      "projectName": "string or null — name of a specific project within this role. When a role lists multiple named projects, create separate experience entries (see MULTI-PROJECT HANDLING).",
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

NAME HANDLING: The candidateName field must contain ONLY the person's given name and surname. Remove all:
- Academic degrees: BSc, BA, BA(Hons), MSc, MBA, PhD, DPhil, MEng, BEng
- Professional certifications: MBCS, PMP, CISSP, CPA, MCSE, AWS SAA, TOGAF
- Honorifics: Mr, Mrs, Dr, Prof, Sir
- Suffixes: Jr, Sr, III, Esq
If the resume header is "Graham Parkings BSc BA(Hons) MBCS", extract candidateName as "Graham Parkings".
If the header is "Dr. Jane Smith PhD, PMP", extract candidateName as "Jane Smith".

TITLE CLEANING: The title field for each experience entry must be a concise job title (2-5 words). Remove:
- Parenthetical qualifiers: "(plus acting Product Owner and acting Delivery Manager)" → just the core title
- Technology specifics: "Lead C# .Net Developer and enterprise architect" → "Lead Developer and Architect"
- Department/team context that belongs in the description, not the title
If the title is very long or contains multiple roles separated by slashes or parentheses, pick the primary role.

TITLE HANDLING: If an experience entry does not have an explicit job title (e.g., it describes a training period, program participation, bench time, or internal department assignment without a named role), infer a professional title from the candidate's overall career profile and technology stack. Use the pattern "[Specialization] [Level]" based on the candidate's primary domain — for example:
- Software developers → "Software Engineer"
- QA/testing roles → "QA Engineer"
- DevOps/infra roles → "DevOps Engineer"
- Data roles → "Data Engineer"
- Design roles → "UX Designer"
Never default to generic low-seniority titles like "Trainee" or "Intern" unless the original resume text explicitly and unambiguously uses that exact title as the candidate's role. "Training" as an activity does not mean the title is "Trainee".

MULTI-PROJECT HANDLING: When a single company/role entry lists multiple NAMED projects
(identified by bold project names, bullet points with project headers, numbered sub-entries,
or distinct labeled sections within one role), create a SEPARATE experience entry for each project.
Each sub-entry must:
- Use the SAME company name, title, and date range as the parent entry
- Set "projectName" to the project's name (include URLs if shown, e.g. "Eroteme (eroteme.ai)")
- Have its OWN description paragraph covering only that project's work
- Have its OWN technologies array listing only technologies used in that specific project
- Have its OWN achievements array (if any achievements are specific to that project)

Example: If the resume shows:
  "Mayswill Limited — Founder & Lead Developer — 2024-Present"
  • Eroteme (eroteme.ai): Built an AI prediction market...
  • Pop the Balloon: Launched a dating app...
  • Bunnies on the Green: Developed a website...

Extract as 3 separate experience entries:
  { "company": "Mayswill Limited", "title": "Founder & Lead Developer", "projectName": "Eroteme (eroteme.ai)", "startDate": "2024", "endDate": "Present", "description": "Built an AI prediction market...", "technologies": ["Next.js", "TypeScript", "Solidity"] }
  { "company": "Mayswill Limited", "title": "Founder & Lead Developer", "projectName": "Pop the Balloon", "startDate": "2024", "endDate": "Present", "description": "Launched a dating app...", "technologies": ["React Native", "Expo", "TypeScript"] }
  { "company": "Mayswill Limited", "title": "Founder & Lead Developer", "projectName": "Bunnies on the Green", "startDate": "2024", "endDate": "Present", "description": "Developed a website...", "technologies": [...] }

Do NOT split when projects are merely mentioned in passing within a description paragraph.
Only split when the resume visually structures them as distinct, labeled sub-entries.
If the parent entry has an introductory paragraph before the project list, incorporate relevant
context from it into each sub-entry's description.

CERTIFICATION HANDLING: Only include actual professional certifications in the "certifications" array — credentials that involve a formal examination, assessment, or accreditation process from a recognized certifying body. Examples of REAL certifications:
- "ISTQB Certified Tester, Foundation Level" (ISTQB)
- "AWS Certified Solutions Architect" (Amazon)
- "MCTS — Microsoft Certified Technology Specialist" (Microsoft)
- "PMP — Project Management Professional" (PMI)
- "Certified ScrumMaster (CSM)" (Scrum Alliance)
- "GCP Certified in Big Data and ML Fundamentals" (Google)

Do NOT include these as certifications — they are training/courses:
- Online courses (Udemy, Coursera, Pluralsight, LinkedIn Learning, internal company training)
- Bootcamps (e.g. "Security Master Bootcamp", "Communication Bootcamp")
- Workshops or hands-on labs (e.g. "Docker + Kubernetes Administration", "Prompt Engineering Hands-on")
- Conference talks, webinars, or MOOCs
- Internal company training programs (unless they explicitly say "certification" with an issuing body)

If the resume has a section titled "Training", "Courses", "Training / Courses", or similar — those items are almost certainly courses, NOT certifications, unless an individual item clearly names a recognized certification credential. When in doubt, exclude it from certifications.

IMPORTANT — certification names: Always include the FULL certification title as it appears on the resume, including the certifying body prefix. For example, "GCP Certified in Big Data and ML Fundamentals" must keep "GCP Certified in" as part of the name — do NOT split it into name="Big Data and ML Fundamentals" issuer="GCP". The issuer field should be the full organization name (e.g. "Google Cloud"), while name retains the complete credential title.

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

function cleanCandidateName(raw: string): string {
  const credentialPattern = /\b(BSc|BA|BA\(Hons\)|MSc|MBA|PhD|DPhil|MEng|BEng|MBCS|PMP|CISSP|CPA|MCSE|TOGAF|CEng|MIET|MInstMC|CITP|CSM|SAFe|AWS\s+SA[A-Z]*|Jr\.?|Sr\.?|III|II|Esq\.?)\b/gi;
  const honorificPattern = /^(Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Prof\.?|Sir|Dame)\s+/i;
  let cleaned = raw.replace(credentialPattern, '').replace(honorificPattern, '');
  cleaned = cleaned.replace(/[,\s]+$/, '').replace(/\s{2,}/g, ' ').trim();
  return cleaned || raw;
}

function sanitizePlaceholder(value: string | undefined | null): string {
  if (!value) return '';
  const lower = value.trim().toLowerCase();
  const placeholders = ['unknown', 'n/a', 'not specified', 'not available', 'none', 'not provided'];
  return placeholders.includes(lower) ? '' : value;
}

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
    institution: sanitizePlaceholder(e.institution),
    degree: e.degree,
    field: e.field,
    graduationDate: sanitizePlaceholder(e.graduationDate),
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
    issuer: sanitizePlaceholder(c.issuer),
    date: sanitizePlaceholder(c.date),
  }));

  const processedSkills = splitCompoundSkills(skills);
  const expTechs = experience.flatMap(e => e.technologies || []);
  const allExtractedSkills = [...new Set([...processedSkills.flatMap(cat => cat.skills), ...expTechs])];
  const classified = classifyCloudSkills(allExtractedSkills);

  return {
    id: `resume-${now}`,
    originalFileName: fileName,
    originalFileType: fileType,
    originalContent: rawText,
    candidateName: cleanCandidateName(parsed.candidateName),
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

function buildEnhancementPrompt(resume: StructuredResume, mode: RefinementMode, jobDescription?: string): string {
  const categorySkills = resume.skills.flatMap(cat => cat.skills);
  const expTechnologies = resume.experience.flatMap(e => e.technologies || []);
  const allSkills = [...new Set([...categorySkills, ...expTechnologies])];
  const today = new Date().toISOString().split('T')[0];

  const modeBlock = mode === 'job-tailoring' && jobDescription
    ? `MODE: Job Description Tailoring

You are reshaping this resume to align with a specific role. Read the job description carefully and apply these principles:

RELEVANCE STRATEGY:
- Reorder the content within each experience description to lead with the responsibilities and accomplishments most relevant to the target role — but keep ALL the original content, just reorganize emphasis
- Mirror the terminology and priorities from the job description where the candidate's experience genuinely supports it
- In the summary, draw a clear line between the candidate's background and what the role demands
- Do not fabricate experience — only foreground what is authentically in the candidate's background

CRITICAL — PRESERVE DEPTH:
- Every experience description must remain a full paragraph (3–6 sentences). Do NOT convert paragraphs into bullet points or bullet-separated fragments
- If the original description mentions specific projects, clients, team dynamics, technologies, or methodologies, ALL of those details must appear in the enhanced version — reorganized for relevance, never deleted
- The enhanced description should be the same length or longer than the original, never shorter
- Do NOT use bullet-point characters (•, -, *) inside the description field — write flowing prose sentences

TARGET JOB DESCRIPTION:
${jobDescription}`
    : `MODE: Professional Polish

You are a senior technical recruiter refining this resume for clarity and impact. Your goal is to make each section read as though written by someone who deeply understands the candidate's work:
- Replace vague language ("worked on", "was responsible for", "helped with") with specific, active descriptions of what the candidate actually built, led, or delivered
- Preserve every concrete detail: project names, team sizes, technologies used, client-facing work, methodologies, mentorship, and outcomes
- Improve sentence flow and eliminate genuine filler, but never strip out substantive content to make things shorter
- Use professional tone without corporate jargon — clear, direct, human-readable`;

  return `${modeBlock}

Today's date is ${today}. When the summary mentions years of experience, recalculate from the earliest experience start date to today.

WRITING GUIDELINES FOR EXPERIENCE DESCRIPTIONS:
Write each experience description as a cohesive paragraph (3–6 sentences). The paragraph should read like a professional narrative that a hiring manager can scan and immediately understand: what the person did, the context they operated in, the technologies they used, and any notable outcomes or contributions. Avoid bullet-point style inside the description field — that is what the achievements array is for.

Think of the description as the "story" of what this person did in the role, and the achievements as the "highlight reel" of measurable wins.

Return ONLY valid JSON (no markdown, no explanation) matching this structure:
{
  "summary": "Enhanced professional summary (100–480 characters). Remove first-person pronouns. Focus on the candidate's core identity, domain expertise, and what makes them distinctive.",
  "experience": [
    {
      "description": "A well-crafted paragraph (3–6 sentences) covering responsibilities, context, team dynamics, methodologies, and contributions. Must preserve all specific details from the original.",
      "achievements": ["Concise achievement starting with a strong action verb — quantify where the original provides evidence"],
      "technologies": ["individual", "technology", "items"]
    }
  ],
  "templateSkills": ["top 14 technical skills"],
  "cloudSkills": ["AI/cloud-related skills"]
}

CONSTRAINTS:
- Keep the same number of experience entries in the same order.
- Each description MUST be a substantive paragraph. If the original has rich detail, the enhanced version should have comparable depth — do not summarize a detailed paragraph into a single sentence.
- Each achievement starts with an action verb. Keep achievements that are in the original; improve their phrasing. Do not invent achievements that aren't supported by the source material. If the original achievements array is empty or absent, return an empty achievements array []. Do not extract or reframe sentences from the description as achievements.
- When returning technologies, split compound entries (e.g. "Entity Framework/Dapper" → separate items).
- Do NOT use bullet-point separators (•, -, *) inside description text. Descriptions must be flowing prose paragraphs, not inline bullet lists.

Current resume data:
${JSON.stringify({
  summary: resume.summary,
  experience: resume.experience.map(e => ({
    company: e.company,
    title: e.title,
    projectName: e.projectName || null,
    startDate: e.startDate,
    endDate: e.endDate,
    description: e.description,
    achievements: e.achievements,
    technologies: e.technologies || [],
  })),
})}

Select the TOP 14 most relevant technical skills from: ${JSON.stringify(allSkills)}
IMPORTANT for templateSkills: First identify the candidate's primary technology domain from their experience (e.g., iOS/Swift, .NET/C#, React/TypeScript). Ensure at least 8 of the 14 are core technologies from that domain. Fill remaining slots with supporting tools. Do NOT prioritize generic project management tools (Jira, SCRUM) over domain-specific technologies.
Also select all AI/cloud-related skills for cloudSkills (skills matching cloud platforms like Azure, AWS, GCP, or AI tools like OpenAI, Gemini, Anthropic).
CRITICAL: templateSkills and cloudSkills MUST be mutually exclusive — never include a cloud/AI skill in templateSkills. If a skill belongs in cloudSkills, exclude it from templateSkills entirely.`;
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
    refinementMode?: RefinementMode,
    _jobDescription?: string,
    onPhaseChange?: (phase: 'extracting' | 'enhancing') => void,
  ): Promise<{ resume: StructuredResume; preEnhancementResume: StructuredResume; metrics: ResumeProcessingMetrics }> {
    onPhaseChange?.('extracting');
    const { resume, metrics } = await this.extractResumeData(rawContent, fileName);
    const preEnhancementResume = structuredClone(resume);

    const mode = refinementMode ?? 'professional-polish';
    if (mode !== 'job-tailoring' || _jobDescription) {
      onPhaseChange?.('enhancing');
      try {
        const { resume: enhanced, usage } = await this.enhanceFullResume(resume, mode, _jobDescription);
        if (usage) {
          metrics.totalTokens = {
            promptTokens: (metrics.totalTokens?.promptTokens ?? 0) + usage.promptTokens,
            completionTokens: (metrics.totalTokens?.completionTokens ?? 0) + usage.completionTokens,
            totalTokens: (metrics.totalTokens?.totalTokens ?? 0) + usage.totalTokens,
          };
        }
        return { resume: enhanced, preEnhancementResume, metrics };
      } catch (err) {
        console.warn('Auto-enhancement failed, returning extracted resume:', err);
        return { resume, preEnhancementResume, metrics };
      }
    }
    return { resume, preEnhancementResume, metrics };
  },

  async enhanceFullResume(resume: StructuredResume, mode: RefinementMode, jobDescription?: string): Promise<{ resume: StructuredResume; usage: TokenUsage | null }> {
    const config = this.getConfig();
    const prompt = buildEnhancementPrompt(resume, mode, jobDescription);
    const enhanceConfig = { ...config, maxTokens: Math.max(config.maxTokens, 8192) };
    const { content, usage } = await callClaudeLocal(enhanceConfig, prompt);
    const parsed = parseAiJson(content, enhancementResponseSchema, 'enhanceFullResume');
    const rawTemplateSkills = parsed.templateSkills || resume.templateSkills;
    const rawCloudSkills = parsed.cloudSkills || resume.cloudSkills;
    const cloudSet = new Set(rawCloudSkills || []);
    const deduplicatedTemplateSkills = (rawTemplateSkills || []).filter(s => !cloudSet.has(s));

    const enhanced = {
      ...resume,
      summary: parsed.summary || resume.summary,
      templateSkills: deduplicatedTemplateSkills,
      cloudSkills: rawCloudSkills,
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
