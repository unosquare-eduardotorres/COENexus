import type { PresentationSessionSummary, PresentationSessionDetail } from '../types'

export const presentationService = {
  async createSession(params: {
    name?: string; mode?: string; openPositionId?: number;
    positionTitle?: string; accountName?: string;
    positionUpstreamId?: number; jobDescription?: string
  }): Promise<{ id: number }> {
    return window.api.present.createSession(params) as Promise<{ id: number }>
  },

  async updateSession(id: number, data: {
    name?: string; mode?: string; introText?: string; status?: string;
    openPositionId?: number; positionTitle?: string; accountName?: string;
    positionUpstreamId?: number; jobDescription?: string
  }): Promise<{ success: boolean }> {
    return window.api.present.updateSession(id, data) as Promise<{ success: boolean }>
  },

  async getSession(id: number): Promise<PresentationSessionDetail | null> {
    return window.api.present.getSession(id) as Promise<PresentationSessionDetail | null>
  },

  async listSessions(): Promise<PresentationSessionSummary[]> {
    return window.api.present.listSessions() as Promise<PresentationSessionSummary[]>
  },

  async deleteSession(id: number): Promise<{ deleted: boolean }> {
    return window.api.present.deleteSession(id) as Promise<{ deleted: boolean }>
  },

  async addEntry(params: {
    sessionId: number; sourceType: string; upstreamId: number;
    fullName: string; mainSkill: string; seniority: string; country: string;
    yearsOfExperience?: string; availability?: string; recommendedRate?: string;
    techStack?: string[]; professionalSummary?: string; domainExperience?: string;
    resumeFormatStatus?: string; sortOrder?: number
  }): Promise<{ id: number }> {
    return window.api.present.addEntry(params) as Promise<{ id: number }>
  },

  async updateEntry(id: number, data: Record<string, unknown>): Promise<{ success: boolean }> {
    return window.api.present.updateEntry(id, data) as Promise<{ success: boolean }>
  },

  async deleteEntry(id: number): Promise<{ deleted: boolean }> {
    return window.api.present.deleteEntry(id) as Promise<{ deleted: boolean }>
  },

  async checkResumeFormat(params: { resumeText: string }): Promise<{ isFormatted: boolean; details: string }> {
    return window.api.present.checkResumeFormat(params) as Promise<{ isFormatted: boolean; details: string }>
  },

  async transformResume(params: { resumeText: string; fullName: string; jobDescription?: string }): Promise<{ transformedText: string }> {
    return window.api.present.transformResume(params) as Promise<{ transformedText: string }>
  },

  async generateIntro(params: {
    candidateNames: string[]; positionTitle?: string;
    accountName?: string; jobDescription?: string; mainSkill?: string
  }): Promise<{ introText: string }> {
    return window.api.present.generateIntro(params) as Promise<{ introText: string }>
  },

  async generateCandidateProfile(params: {
    resumeText: string; fullName: string; mainSkill: string;
    jobDescription?: string; positionTitle?: string
  }): Promise<{ professionalSummary: string; techStack: string[]; domainExperience: string; yearsOfExperience: string }> {
    return window.api.present.generateCandidateProfile(params) as Promise<{
      professionalSummary: string; techStack: string[]; domainExperience: string; yearsOfExperience: string
    }>
  },

  async generateHtml(params: { sessionId: number; mode: string }): Promise<{ html: string }> {
    return window.api.present.generateHtml(params) as Promise<{ html: string }>
  },
}
