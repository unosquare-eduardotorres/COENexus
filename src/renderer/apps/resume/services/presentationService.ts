import type { PresentationSessionSummary, PresentationSessionDetail } from '../types'
import { isIpcError } from '../../../shared/types'

function unwrap<T>(result: unknown): T {
  if (isIpcError(result)) throw new Error((result as { message: string }).message)
  return result as T
}

export const presentationService = {
  async createSession(params: {
    name?: string; mode?: string; openPositionId?: number;
    positionTitle?: string; accountName?: string;
    positionUpstreamId?: number; jobDescription?: string
  }): Promise<{ id: number }> {
    const result = await window.api.present.createSession(params)
    return unwrap<{ id: number }>(result)
  },

  async updateSession(id: number, data: {
    name?: string; mode?: string; introText?: string; status?: string;
    openPositionId?: number; positionTitle?: string; accountName?: string;
    positionUpstreamId?: number; jobDescription?: string
  }): Promise<{ success: boolean }> {
    const result = await window.api.present.updateSession(id, data)
    return unwrap<{ success: boolean }>(result)
  },

  async getSession(id: number): Promise<PresentationSessionDetail | null> {
    const result = await window.api.present.getSession(id)
    if (result === null) return null
    return unwrap<PresentationSessionDetail>(result)
  },

  async listSessions(): Promise<PresentationSessionSummary[]> {
    const result = await window.api.present.listSessions()
    return unwrap<PresentationSessionSummary[]>(result)
  },

  async deleteSession(id: number): Promise<{ deleted: boolean }> {
    const result = await window.api.present.deleteSession(id)
    return unwrap<{ deleted: boolean }>(result)
  },

  async addEntry(params: {
    sessionId: number; sourceType: string; upstreamId: number;
    fullName: string; mainSkill: string; seniority: string; country: string;
    yearsOfExperience?: string; availability?: string; recommendedRate?: string;
    techStack?: string[]; professionalSummary?: string; domainExperience?: string;
    resumeFormatStatus?: string; sortOrder?: number
  }): Promise<{ id: number }> {
    const result = await window.api.present.addEntry(params)
    return unwrap<{ id: number }>(result)
  },

  async updateEntry(id: number, data: Record<string, unknown>): Promise<{ success: boolean }> {
    const result = await window.api.present.updateEntry(id, data)
    return unwrap<{ success: boolean }>(result)
  },

  async deleteEntry(id: number): Promise<{ deleted: boolean }> {
    const result = await window.api.present.deleteEntry(id)
    return unwrap<{ deleted: boolean }>(result)
  },

  async checkResumeFormat(params: { resumeText: string }): Promise<{ isFormatted: boolean; details: string[] }> {
    const result = await window.api.present.checkResumeFormat(params)
    return unwrap<{ isFormatted: boolean; details: string[] }>(result)
  },

  async transformResume(params: { resumeText: string; fullName: string; jobDescription?: string }): Promise<{ transformedResumeText: string }> {
    const result = await window.api.present.transformResume(params)
    return unwrap<{ transformedResumeText: string }>(result)
  },

  async generateIntro(params: {
    candidateNames: string[]; positionTitle?: string;
    accountName?: string; jobDescription?: string; mainSkill?: string
  }): Promise<{ introText: string }> {
    const result = await window.api.present.generateIntro(params)
    return unwrap<{ introText: string }>(result)
  },

  async generateCandidateProfile(params: {
    resumeText: string; fullName: string; mainSkill: string;
    jobDescription?: string; positionTitle?: string
  }): Promise<{ professionalSummary: string; techStack: string[]; domainExperience: string; yearsOfExperience: string }> {
    const result = await window.api.present.generateCandidateProfile(params)
    return unwrap<{
      professionalSummary: string; techStack: string[]; domainExperience: string; yearsOfExperience: string
    }>(result)
  },

  async generateHtml(params: { sessionId: number; mode: string }): Promise<{ html: string }> {
    const result = await window.api.present.generateHtml(params)
    return unwrap<{ html: string }>(result)
  },
}
