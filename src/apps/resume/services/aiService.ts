import { AIConfig, AISuggestion, SuggestionOption, StructuredResume, RefinementMode, ExperienceEntry, EducationEntry, SkillCategory, CertificationEntry, TokenUsage, ResumeProcessingMetrics } from '../types';

const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'local',
  localEndpoint: '/api/claude/v1',
  cloudEndpoint: 'https://api.anthropic.com/v1',
  model: 'claude-sonnet-4',
  temperature: 0.1,
  maxTokens: 4096,
};

let currentConfig: AIConfig = { ...DEFAULT_AI_CONFIG };

const TECH_SKILL_SLOTS = 14;

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
  const baseUrl = config.localEndpoint || '/api/claude/v1';
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Proxy error ${response.status}: ${errorBody}`);
  }
  const data = await response.json();
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

function mapToStructuredResume(
  parsed: Record<string, unknown>,
  fileName: string,
  fileType: 'pdf' | 'docx' | 'txt',
  rawText: string
): StructuredResume {
  const now = Date.now();

  const rawExperience = Array.isArray(parsed.experience) ? parsed.experience : [];
  const rawEducation = Array.isArray(parsed.education) ? parsed.education : [];
  const rawSkills = Array.isArray(parsed.skills) ? parsed.skills : [];
  const rawCertifications = Array.isArray(parsed.certifications) ? parsed.certifications : [];

  const experience: ExperienceEntry[] = rawExperience.map((item: unknown, idx: number) => {
    const e = (item as Record<string, unknown>) || {};
    return {
      id: `exp-${now}-${idx}`,
      company: String(e.company || ''),
      title: String(e.title || ''),
      startDate: String(e.startDate || ''),
      endDate: String(e.endDate || ''),
      location: e.location ? String(e.location) : undefined,
      description: String(e.description || ''),
      achievements: Array.isArray(e.achievements) ? e.achievements.map(String) : [],
      technologies: Array.isArray(e.technologies) ? e.technologies.map(String) : [],
      projectName: e.projectName ? String(e.projectName) : undefined,
    };
  });

  const education: EducationEntry[] = rawEducation.map((item: unknown, idx: number) => {
    const e = (item as Record<string, unknown>) || {};
    return {
      id: `edu-${now}-${idx}`,
      institution: String(e.institution || ''),
      degree: String(e.degree || ''),
      field: String(e.field || ''),
      graduationDate: String(e.graduationDate || ''),
      gpa: e.gpa ? String(e.gpa) : undefined,
      honors: e.honors ? String(e.honors) : undefined,
    };
  });

  const skills: SkillCategory[] = rawSkills.map((item: unknown, idx: number) => {
    const s = (item as Record<string, unknown>) || {};
    return {
      id: `skill-cat-${now}-${idx}`,
      name: String(s.name || ''),
      skills: Array.isArray(s.skills) ? s.skills.map(String) : [],
    };
  });

  const certifications: CertificationEntry[] = rawCertifications.map((item: unknown, idx: number) => {
    const c = (item as Record<string, unknown>) || {};
    return {
      id: `cert-${now}-${idx}`,
      name: String(c.name || ''),
      issuer: String(c.issuer || ''),
      date: String(c.date || ''),
    };
  });

  const processedSkills = splitCompoundSkills(skills);
  const allExtractedSkills = processedSkills.flatMap(cat => cat.skills);
  const classified = classifyCloudSkills(allExtractedSkills);

  return {
    id: `resume-${now}`,
    originalFileName: fileName,
    originalFileType: fileType,
    originalContent: rawText,
    candidateName: String(parsed.candidateName || ''),
    email: parsed.email ? String(parsed.email) : undefined,
    phone: parsed.phone ? String(parsed.phone) : undefined,
    location: parsed.location ? String(parsed.location) : undefined,
    linkedIn: parsed.linkedIn ? String(parsed.linkedIn) : undefined,
    summary: String(parsed.summary || ''),
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

function regexFallbackParse(
  rawText: string,
  fileName: string,
  fileType: 'pdf' | 'docx' | 'txt'
): StructuredResume {
  const sectionKeywords = [
    'WORK EXPERIENCE', 'EXPERIENCE', 'EMPLOYMENT',
    'EDUCATION', 'SKILLS', 'TECHNICAL SKILLS',
    'CERTIFICATIONS', 'SUMMARY', 'PROFILE',
    'OBJECTIVE', 'ABOUT', 'TECHNOLOGIES'
  ];
  const inlineHeaderPattern = new RegExp(
    `(?<=[.!?\\s])\\s*(${sectionKeywords.join('|')})\\b`, 'gi'
  );
  const normalizedText = rawText.replace(inlineHeaderPattern, '\n$1');

  const now = Date.now();

  const headerPattern = /^\s*(?:EXPERIENCE|WORK EXPERIENCE|EMPLOYMENT|EDUCATION|SKILLS|TECHNICAL SKILLS|CERTIFICATIONS|SUMMARY|PROFILE|OBJECTIVE|ABOUT)/im;

  const lines = normalizedText.split('\n').map((l) => l.trim()).filter(Boolean);
  const firstHeaderIdx = lines.findIndex((l) => headerPattern.test(l));
  const candidateNameRaw = firstHeaderIdx > 0
    ? lines.slice(0, firstHeaderIdx).find((l) => l.length > 1 && l.length < 80) || lines[0] || ''
    : lines[0] || '';
  const candidateName = candidateNameRaw.length > 60
    ? candidateNameRaw.substring(0, (candidateNameRaw.indexOf(' ', 25) + 1) || 60).trim()
    : candidateNameRaw;

  const emailMatch = rawText.match(/[\w.-]+@[\w.-]+\.\w+/);
  const email = emailMatch?.[0];

  const phoneMatch = rawText.match(/(?:\+?\d[\d\s().-]{8,}\d)/);
  const phone = phoneMatch?.[0]?.trim();

  const sectionSplitter = /\n\s*(?=(?:EXPERIENCE|WORK EXPERIENCE|EMPLOYMENT|EDUCATION|SKILLS|TECHNICAL SKILLS|CERTIFICATIONS|SUMMARY|PROFILE|OBJECTIVE|ABOUT)\b)/im;
  const sections = normalizedText.split(sectionSplitter);

  const findSection = (...keywords: string[]): string => {
    const pattern = new RegExp(`^\\s*(?:${keywords.join('|')})`, 'im');
    return sections.find((s) => pattern.test(s)) || '';
  };

  const summarySection = findSection('SUMMARY', 'PROFILE', 'OBJECTIVE', 'ABOUT');
  const summaryText = summarySection
    .replace(/^[^\n]*\n/, '')
    .trim()
    .split('\n')
    .filter(Boolean)
    .join(' ')
    .substring(0, 600);

  const experienceSection = findSection('EXPERIENCE', 'WORK EXPERIENCE', 'EMPLOYMENT');
  const experienceLines = experienceSection.replace(/^[^\n]*\n/, '').trim().split('\n').filter(Boolean);
  const dateRangePattern = /(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}|\d{4})\s*[-–—]\s*(?:Present|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}|\d{4})/i;

  const experience: ExperienceEntry[] = [];
  let currentExpLines: string[] = [];
  let expIdx = 0;

  const flushExperience = () => {
    if (currentExpLines.length === 0) return;
    const block = currentExpLines.join('\n');
    const dateMatch = block.match(dateRangePattern);
    const parts = dateMatch ? dateMatch[0].split(/[-–—]/).map((s) => s.trim()) : ['', ''];
    const descLines = currentExpLines.filter((l) => !dateRangePattern.test(l));
    experience.push({
      id: `exp-${now}-${expIdx++}`,
      company: descLines[0] || '',
      title: descLines[1] || '',
      startDate: parts[0] || '',
      endDate: parts[1] || '',
      description: descLines.slice(2).join(' ').substring(0, 500),
      achievements: [],
      technologies: [],
      projectName: undefined,
    });
    currentExpLines = [];
  };

  for (const line of experienceLines) {
    if (dateRangePattern.test(line) && currentExpLines.length > 0) {
      currentExpLines.push(line);
    } else if (line.length > 2 && line.length < 100 && /^[A-Z]/.test(line) && currentExpLines.length > 1) {
      flushExperience();
      currentExpLines.push(line);
    } else {
      currentExpLines.push(line);
    }
  }
  flushExperience();

  const educationSection = findSection('EDUCATION');
  const educationLines = educationSection.replace(/^[^\n]*\n/, '').trim().split('\n').filter(Boolean);
  const degreePattern = /\b(?:Bachelor|Master|PhD|Doctor|BS|MS|BA|MA|B\.S\.|M\.S\.|B\.A\.|M\.A\.|Associate|Diploma)\b/i;
  const education: EducationEntry[] = [];
  let eduIdx = 0;

  for (let i = 0; i < educationLines.length; i++) {
    const line = educationLines[i];
    if (degreePattern.test(line) || (i === 0 && line.length > 2)) {
      const degreeMatch = line.match(/\b(?:Bachelor[^\n,]*|Master[^\n,]*|PhD[^\n,]*|Doctor[^\n,]*|BS|MS|BA|MA|B\.S\.|M\.S\.|B\.A\.|M\.A\.|Associate[^\n,]*|Diploma[^\n,]*)/i);
      const dateMatch = line.match(/\d{4}/);
      education.push({
        id: `edu-${now}-${eduIdx++}`,
        institution: educationLines[i - 1] || line,
        degree: degreeMatch?.[0] || '',
        field: line.replace(degreeMatch?.[0] || '', '').replace(/[,\-]/g, '').trim().substring(0, 80),
        graduationDate: dateMatch?.[0] || '',
      });
    }
  }

  const skillsSection = findSection('SKILLS', 'TECHNICAL SKILLS');
  const skillsBody = skillsSection.replace(/^[^\n]*\n/, '').trim();
  const rawSkillItems = skillsBody.split(/[,|;•\n]+/).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 60);
  const skills: SkillCategory[] = rawSkillItems.length > 0
    ? [{ id: `skill-cat-${now}-0`, name: 'Skills', skills: rawSkillItems }]
    : [];

  const processedSkills = splitCompoundSkills(skills);

  const certSection = findSection('CERTIFICATIONS');
  const certLines = certSection.replace(/^[^\n]*\n/, '').trim().split('\n').filter(Boolean);
  const certKeywordPattern = /certif(?:ied|ication|icate)/i;
  const certifications: CertificationEntry[] = certLines
    .filter((l) => certKeywordPattern.test(l) || l.length > 5)
    .slice(0, 10)
    .map((l, idx) => {
      const dateMatch = l.match(/\d{4}/);
      return {
        id: `cert-${now}-${idx}`,
        name: l.replace(/\d{4}.*$/, '').trim(),
        issuer: '',
        date: dateMatch?.[0] || '',
      };
    });

  const allProcessedSkills = processedSkills.flatMap(cat => cat.skills);
  const classified = classifyCloudSkills(allProcessedSkills);

  return {
    id: `resume-${now}`,
    originalFileName: fileName,
    originalFileType: fileType,
    originalContent: rawText,
    candidateName,
    email,
    phone,
    summary: summaryText || '',
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

function buildEnhancementPrompt(resume: StructuredResume, mode: RefinementMode): string {
  const modeInstructions: Record<RefinementMode, string> = {
    'professional-polish': 'Refine the language to be more professional and polished. Use strong action verbs, eliminate filler words, and improve clarity.',
    'impact-focused': 'Rewrite to emphasize measurable impact and achievements. Add quantified results where possible (percentages, dollar amounts, team sizes).',
    'ats-optimized': 'Optimize for Applicant Tracking Systems. Use industry-standard keywords, remove creative formatting, and ensure keyword density.',
    'job-tailoring': 'Enhance the content to be more compelling and tailored for the target role.',
  };

  const allSkills = resume.skills.flatMap(cat => cat.skills);

  return `Enhance this resume content. Mode: ${mode}. Instructions: ${modeInstructions[mode]}

Return ONLY valid JSON (no markdown, no explanation) with this structure:
{
  "summary": "enhanced summary text",
  "experience": [
    { "description": "enhanced description", "achievements": ["enhanced achievement 1"], "technologies": ["technology1", "technology2"] }
  ],
  "templateSkills": ["top 14 most relevant technical skills"],
  "cloudSkills": ["all AI/cloud-related skills"]
}

Keep the same number of experience entries in the same order. Only enhance summary and experience descriptions/achievements/technologies. When returning technologies, split compound entries (e.g. 'Entity Framework/Dapper' → separate items).

Current resume data:
${JSON.stringify({ summary: resume.summary, experience: resume.experience.map(e => ({ description: e.description, achievements: e.achievements, technologies: e.technologies || [] })) })}
Also select the TOP 14 most relevant technical skills and all AI/cloud tools from: ${JSON.stringify(allSkills)}`;
}

export const aiService = {
  getConfig(): AIConfig {
    const stored = localStorage.getItem('ai_config');
    if (stored) {
      currentConfig = JSON.parse(stored);
    }
    return currentConfig;
  },

  async checkConnection(): Promise<boolean> {
    const config = this.getConfig();
    const baseUrl = config.localEndpoint || '/api/claude/v1';
    try {
      const response = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  updateConfig(config: Partial<AIConfig>): AIConfig {
    currentConfig = { ...currentConfig, ...config };
    localStorage.setItem('ai_config', JSON.stringify(currentConfig));
    return currentConfig;
  },

  async extractResumeData(rawText: string, fileName: string): Promise<{ resume: StructuredResume; metrics: ResumeProcessingMetrics }> {
    const config = this.getConfig();
    const fileType = (fileName.split('.').pop()?.toLowerCase() || 'txt') as 'pdf' | 'docx' | 'txt';
    const startTime = performance.now();

    try {
      const prompt = buildExtractionPrompt(rawText);
      const { content: response, usage } = await callClaudeLocal(config, prompt);
      let cleanJson = response.trim();
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/```$/, '').trim();
      }
      const parsed = JSON.parse(cleanJson);
      const resume = mapToStructuredResume(parsed, fileName, fileType, rawText);
      const processingTimeMs = Math.round(performance.now() - startTime);
      return { resume, metrics: { extractionTokens: usage, totalTokens: usage, processingTimeMs, modelUsed: config.model, wasAiExtraction: true } };
    } catch (error) {
      console.warn('AI extraction failed, using regex fallback:', error);
      return { resume: regexFallbackParse(rawText, fileName, fileType), metrics: { extractionTokens: null, totalTokens: null, processingTimeMs: Math.round(performance.now() - startTime), modelUsed: config.model, wasAiExtraction: false } };
    }
  },

  async generateSuggestions(
    text: string,
    sectionType: string,
    _context?: string
  ): Promise<SuggestionOption[]> {
    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 400));

    const suggestions = generateMockSuggestions(text, sectionType);
    return suggestions;
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
    let cleanJson = content.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/```$/, '').trim();
    }
    const parsed = JSON.parse(cleanJson);
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

  async rephraseText(text: string, style: 'professional' | 'concise' | 'detailed'): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 600));

    const styleAdjustments: Record<string, (t: string) => string> = {
      professional: (t) => t.replace(/helped/gi, 'facilitated').replace(/made/gi, 'developed'),
      concise: (t) => t.split('.').slice(0, 2).join('.') + '.',
      detailed: (t) => t + ' This initiative demonstrated strong leadership capabilities.',
    };

    return styleAdjustments[style]?.(text) || text;
  },

  async extendContent(text: string): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, 700));

    const extensions = [
      ' Implemented best practices that improved overall efficiency.',
      ' Collaborated with cross-functional teams to achieve objectives.',
      ' Delivered measurable results aligned with organizational goals.',
    ];

    return text + extensions[Math.floor(Math.random() * extensions.length)];
  },

  async validateWithAI(resume: StructuredResume): Promise<AISuggestion[]> {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const suggestions: AISuggestion[] = [];

    if (resume.summary && resume.summary.length > 0) {
      suggestions.push({
        id: `ai-sug-${Date.now()}-summary`,
        sectionType: 'summary',
        originalText: resume.summary,
        suggestions: generateMockSuggestions(resume.summary, 'summary'),
      });
    }

    resume.experience.forEach((exp, idx) => {
      if (exp.description) {
        suggestions.push({
          id: `ai-sug-${Date.now()}-exp-${idx}`,
          sectionType: 'experience',
          sectionId: exp.id,
          originalText: exp.description,
          suggestions: generateMockSuggestions(exp.description, 'experience'),
        });
      }
    });

    return suggestions;
  },
};

function generateMockSuggestions(text: string, sectionType: string): SuggestionOption[] {
  const actionVerbs = ['Spearheaded', 'Orchestrated', 'Pioneered', 'Championed', 'Architected'];
  const metrics = ['resulting in 25% improvement', 'achieving 30% cost reduction', 'increasing efficiency by 40%'];

  const baseVariations: SuggestionOption[] = [
    {
      id: `sug-${Date.now()}-1`,
      text: text.replace(/^[A-Z][a-z]+/, actionVerbs[Math.floor(Math.random() * actionVerbs.length)]),
      confidence: 0.92,
      type: 'rephrase',
    },
    {
      id: `sug-${Date.now()}-2`,
      text: text + ', ' + metrics[Math.floor(Math.random() * metrics.length)],
      confidence: 0.88,
      type: 'extend',
    },
    {
      id: `sug-${Date.now()}-3`,
      text: text.split('.')[0] + '.',
      confidence: 0.85,
      type: 'condense',
    },
  ];

  if (sectionType === 'summary') {
    baseVariations.push({
      id: `sug-${Date.now()}-4`,
      text: `Results-driven professional with expertise in ${text.toLowerCase().includes('software') ? 'software development' : 'delivering strategic initiatives'}. ${text}`,
      confidence: 0.9,
      type: 'enhance',
    });
  }

  return baseVariations;
}

export default aiService;
