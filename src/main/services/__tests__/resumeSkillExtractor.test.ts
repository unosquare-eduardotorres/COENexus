import { describe, expect, it, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

let nexusDb: Database.Database

vi.mock('../../db/connection', () => ({
  getDatabase: () => nexusDb,
}))

vi.mock('../../config', () => ({
  getConfig: () => ({
    claude: {
      haikuModel: 'claude-haiku-4-20250414',
    },
  }),
}))

const mockChatAsync = vi.fn()
vi.mock('../claudeService', () => ({
  claudeService: {
    chatAsync: (...args: unknown[]) => mockChatAsync(...args),
  },
}))

import { resumeSkillExtractor } from '../resumeSkillExtractor'

function setupDb(db: Database.Database): void {
  db.exec(`
    CREATE TABLE resume_embeddings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_type TEXT NOT NULL,
      source_id INTEGER NOT NULL,
      upstream_id INTEGER NOT NULL,
      embedding BLOB,
      resume_text TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      is_bench INTEGER NOT NULL DEFAULT 0,
      extracted_skills_json TEXT,
      skills_extracted_at TEXT,
      skills_extractor_model TEXT,
      UNIQUE(source_type, source_id)
    );
  `)
}

const VALID_SKILLS_JSON = JSON.stringify({
  primary_tech_stack: ['C#', '.NET 8', 'ASP.NET Core'],
  secondary_tech_stack: ['SQL Server', 'Docker'],
  roles: ['Backend Developer'],
  domains: ['Financial Services'],
  years_experience: 8,
  seniority_signals: ['Lead'],
  certifications: ['AZ-204'],
  languages: ['English (B2)', 'Spanish (native)'],
  summary: 'Senior .NET backend engineer with fintech experience',
})

describe('ResumeSkillExtractor', () => {
  beforeEach(() => {
    nexusDb = new Database(':memory:')
    setupDb(nexusDb)
    mockChatAsync.mockReset()
  })

  describe('extractOne', () => {
    it('should extract skills from a resume and persist them', async () => {
      nexusDb.prepare(`
        INSERT INTO resume_embeddings (source_type, source_id, upstream_id, resume_text)
        VALUES ('employees', 1, 100, 'John Doe - Senior C# Developer with 8 years of .NET experience')
      `).run()

      mockChatAsync.mockResolvedValueOnce({ text: VALID_SKILLS_JSON, usage: { inputTokens: 0, outputTokens: 0 } })

      const result = await resumeSkillExtractor.extractOne(1)
      expect(result).toBe(true)

      const row = nexusDb.prepare('SELECT extracted_skills_json, skills_extractor_model FROM resume_embeddings WHERE id = 1').get() as {
        extracted_skills_json: string; skills_extractor_model: string
      }
      expect(row.extracted_skills_json).toBeTruthy()
      expect(row.skills_extractor_model).toBe('claude-haiku-4-20250414')

      const parsed = JSON.parse(row.extracted_skills_json)
      expect(parsed.primary_tech_stack).toContain('C#')
      expect(parsed.years_experience).toBe(8)
    })

    it('should skip already-extracted unless force=true', async () => {
      nexusDb.prepare(`
        INSERT INTO resume_embeddings (source_type, source_id, upstream_id, resume_text, extracted_skills_json, skills_extracted_at)
        VALUES ('employees', 1, 100, 'Some resume', '{"primary_tech_stack":["Java"]}', datetime('now'))
      `).run()

      const skipped = await resumeSkillExtractor.extractOne(1)
      expect(skipped).toBe(false)
      expect(mockChatAsync).not.toHaveBeenCalled()

      mockChatAsync.mockResolvedValueOnce({ text: VALID_SKILLS_JSON, usage: { inputTokens: 0, outputTokens: 0 } })
      const forced = await resumeSkillExtractor.extractOne(1, true)
      expect(forced).toBe(true)
      expect(mockChatAsync).toHaveBeenCalledOnce()
    })

    it('should handle malformed LLM output gracefully', async () => {
      nexusDb.prepare(`
        INSERT INTO resume_embeddings (source_type, source_id, upstream_id, resume_text)
        VALUES ('candidates', 1, 200, 'Alice - React developer')
      `).run()

      mockChatAsync.mockResolvedValueOnce({ text: 'This is not valid JSON at all!!!', usage: { inputTokens: 0, outputTokens: 0 } })

      const result = await resumeSkillExtractor.extractOne(1)
      expect(result).toBe(false)

      const row = nexusDb.prepare('SELECT extracted_skills_json FROM resume_embeddings WHERE id = 1').get() as { extracted_skills_json: string | null }
      expect(row.extracted_skills_json).toBeNull()
    })

    it('should return false for non-existent embedding', async () => {
      const result = await resumeSkillExtractor.extractOne(999)
      expect(result).toBe(false)
    })

    it('should return false for embedding without resume text', async () => {
      nexusDb.prepare(`
        INSERT INTO resume_embeddings (source_type, source_id, upstream_id, resume_text)
        VALUES ('employees', 1, 100, NULL)
      `).run()

      const result = await resumeSkillExtractor.extractOne(1)
      expect(result).toBe(false)
    })
  })

  describe('extractBatch', () => {
    it('should extract skills from multiple unprocessed resumes', async () => {
      nexusDb.prepare(`
        INSERT INTO resume_embeddings (source_type, source_id, upstream_id, resume_text)
        VALUES ('employees', 1, 100, 'Developer A - Java'),
               ('candidates', 2, 200, 'Developer B - Python'),
               ('employees', 3, 300, 'Developer C - Go')
      `).run()

      mockChatAsync
        .mockResolvedValueOnce({ text: JSON.stringify({ primary_tech_stack: ['Java'], secondary_tech_stack: [], roles: [], domains: [], years_experience: null, seniority_signals: [], certifications: [], languages: [], summary: '' }), usage: { inputTokens: 0, outputTokens: 0 } })
        .mockResolvedValueOnce({ text: JSON.stringify({ primary_tech_stack: ['Python'], secondary_tech_stack: [], roles: [], domains: [], years_experience: null, seniority_signals: [], certifications: [], languages: [], summary: '' }), usage: { inputTokens: 0, outputTokens: 0 } })
        .mockResolvedValueOnce({ text: JSON.stringify({ primary_tech_stack: ['Go'], secondary_tech_stack: [], roles: [], domains: [], years_experience: null, seniority_signals: [], certifications: [], languages: [], summary: '' }), usage: { inputTokens: 0, outputTokens: 0 } })

      const result = await resumeSkillExtractor.extractBatch(undefined, 10)
      expect(result.extracted).toBe(3)
      expect(result.failed).toBe(0)
      expect(result.skipped).toBe(0)
    })

    it('should filter by sourceType when provided', async () => {
      nexusDb.prepare(`
        INSERT INTO resume_embeddings (source_type, source_id, upstream_id, resume_text)
        VALUES ('employees', 1, 100, 'Employee resume'),
               ('candidates', 2, 200, 'Candidate resume')
      `).run()

      mockChatAsync.mockResolvedValue({ text: VALID_SKILLS_JSON, usage: { inputTokens: 0, outputTokens: 0 } })

      const result = await resumeSkillExtractor.extractBatch('employees', 10)
      expect(result.extracted).toBe(1)
      expect(mockChatAsync).toHaveBeenCalledOnce()
    })

    it('should handle partial failures gracefully', async () => {
      nexusDb.prepare(`
        INSERT INTO resume_embeddings (source_type, source_id, upstream_id, resume_text)
        VALUES ('employees', 1, 100, 'Good resume'),
               ('candidates', 2, 200, 'Bad resume')
      `).run()

      mockChatAsync
        .mockResolvedValueOnce({ text: VALID_SKILLS_JSON, usage: { inputTokens: 0, outputTokens: 0 } })
        .mockRejectedValueOnce(new Error('LLM timeout'))

      const result = await resumeSkillExtractor.extractBatch()
      expect(result.extracted).toBe(1)
      expect(result.failed).toBe(1)
    })

    it('should return zero counts when no rows need extraction', async () => {
      const result = await resumeSkillExtractor.extractBatch()
      expect(result).toEqual({ extracted: 0, skipped: 0, failed: 0 })
    })
  })

  describe('getExtractionStatus', () => {
    it('should report correct counts', () => {
      nexusDb.prepare(`
        INSERT INTO resume_embeddings (source_type, source_id, upstream_id, resume_text, extracted_skills_json)
        VALUES ('employees', 1, 100, 'Resume A', '{"primary_tech_stack":["C#"]}'),
               ('candidates', 2, 200, 'Resume B', NULL),
               ('employees', 3, 300, NULL, NULL)
      `).run()

      const status = resumeSkillExtractor.getExtractionStatus()
      expect(status.total).toBe(2)
      expect(status.extracted).toBe(1)
      expect(status.pending).toBe(1)
    })
  })

  describe('getExtractedSkills', () => {
    it('should return parsed skills for a known upstream ID', async () => {
      nexusDb.prepare(`
        INSERT INTO resume_embeddings (source_type, source_id, upstream_id, resume_text, extracted_skills_json, skills_extracted_at)
        VALUES ('employees', 1, 100, 'Resume', ?, datetime('now'))
      `).run(VALID_SKILLS_JSON)

      const skills = await resumeSkillExtractor.getExtractedSkills('employees', 100)
      expect(skills).not.toBeNull()
      expect(skills!.primary_tech_stack).toContain('C#')
      expect(skills!.years_experience).toBe(8)
    })

    it('should return null when no skills extracted', async () => {
      const skills = await resumeSkillExtractor.getExtractedSkills('employees', 999)
      expect(skills).toBeNull()
    })
  })
})
