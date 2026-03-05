import { AIConfig, AISuggestion, SuggestionOption, StructuredResume } from '../types';

const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'local',
  localEndpoint: 'http://localhost:8080/v1',
  cloudEndpoint: 'https://api.anthropic.com/v1',
  model: 'claude-3-sonnet-20240229',
  temperature: 0.7,
  maxTokens: 4096,
};

let currentConfig: AIConfig = { ...DEFAULT_AI_CONFIG };

export const aiService = {
  getConfig(): AIConfig {
    const stored = localStorage.getItem('ai_config');
    if (stored) {
      currentConfig = JSON.parse(stored);
    }
    return currentConfig;
  },

  updateConfig(config: Partial<AIConfig>): AIConfig {
    currentConfig = { ...currentConfig, ...config };
    localStorage.setItem('ai_config', JSON.stringify(currentConfig));
    return currentConfig;
  },

  async generateSuggestions(
    text: string,
    sectionType: string,
    context?: string
  ): Promise<SuggestionOption[]> {
    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 400));

    const suggestions = generateMockSuggestions(text, sectionType);
    return suggestions;
  },

  async transformResume(rawContent: string, fileName: string): Promise<StructuredResume> {
    await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));

    return parseMockResume(rawContent, fileName);
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

function parseMockResume(rawContent: string, fileName: string): StructuredResume {
  const fileType = fileName.split('.').pop()?.toLowerCase() as 'pdf' | 'docx' | 'txt';

  return {
    id: `resume-${Date.now()}`,
    originalFileName: fileName,
    originalFileType: fileType || 'txt',
    originalContent: rawContent,
    candidateName: extractName(rawContent) || 'Candidate Name',
    email: extractEmail(rawContent),
    phone: extractPhone(rawContent),
    location: 'Location to be verified',
    summary: extractSummary(rawContent),
    experience: extractExperience(rawContent),
    education: extractEducation(rawContent),
    skills: extractSkills(rawContent),
    certifications: extractCertifications(rawContent),
    transformedAt: new Date().toISOString(),
    status: 'transformed',
    validationResults: [],
    overallValidationStatus: 'pending',
  };
}

function extractName(content: string): string {
  const lines = content.split('\n').filter((l) => l.trim());
  return lines[0]?.trim() || 'Unknown Candidate';
}

function extractEmail(content: string): string | undefined {
  const emailMatch = content.match(/[\w.-]+@[\w.-]+\.\w+/);
  return emailMatch?.[0];
}

function extractPhone(content: string): string | undefined {
  const phoneMatch = content.match(/[\d\s()-]{10,}/);
  return phoneMatch?.[0]?.trim();
}

function extractSummary(content: string): string {
  const summaryPatterns = [
    /(?:summary|profile|objective)[:\s]*(.{50,500}?)(?=experience|education|skills|$)/i,
    /(?:about me)[:\s]*(.{50,500}?)(?=experience|education|skills|$)/i,
  ];

  for (const pattern of summaryPatterns) {
    const match = content.match(pattern);
    if (match) return match[1].trim();
  }

  return 'Professional summary to be extracted from original document.';
}

function extractExperience(content: string): import('../types').ExperienceEntry[] {
  return [
    {
      id: `exp-${Date.now()}-1`,
      company: 'Company Name',
      title: 'Job Title',
      startDate: '2020-01',
      endDate: 'Present',
      location: 'City, State',
      description: 'Experience details extracted from original document.',
      achievements: ['Achievement 1', 'Achievement 2'],
    },
  ];
}

function extractEducation(content: string): import('../types').EducationEntry[] {
  return [
    {
      id: `edu-${Date.now()}-1`,
      institution: 'University Name',
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      graduationDate: '2018-05',
    },
  ];
}

function extractSkills(content: string): import('../types').SkillCategory[] {
  return [
    {
      id: `skill-cat-${Date.now()}-1`,
      name: 'Technical Skills',
      skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
    },
    {
      id: `skill-cat-${Date.now()}-2`,
      name: 'Soft Skills',
      skills: ['Leadership', 'Communication', 'Problem Solving'],
    },
  ];
}

function extractCertifications(content: string): import('../types').CertificationEntry[] {
  return [
    {
      id: `cert-${Date.now()}-1`,
      name: 'AWS Certified Solutions Architect',
      issuer: 'Amazon Web Services',
      date: '2023-06',
    },
  ];
}

export default aiService;
