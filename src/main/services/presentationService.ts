import { presentationRepository } from '../db/repositories/presentationRepository'
import { llmRouter } from './llmRouter'
import { createLogger } from './logger'
import {
  fillTemplate,
  PRESENTATION_INTRO,
  PRESENTATION_CANDIDATE_PROFILE,
  RESUME_FORMAT_CHECK,
} from './promptTemplates'

const log = createLogger('PresentationService')

interface ResumeFormatCheckResult {
  isFormatted: boolean
  details: string[]
}

interface ResumeTransformResult {
  transformedResume: string
}

interface CandidateProfileResult {
  professionalSummary: string
  techStack: string[]
  domainExperience: string
  yearsOfExperience: string
}

interface PresentationSessionRow {
  id: number
  name: string | null
  intro_text: string | null
  position_title: string | null
  account_name: string | null
  job_description: string | null
}

interface PresentationEntryRow {
  id: number
  full_name: string
  main_skill: string
  seniority: string
  country: string
  years_of_experience: string | null
  availability: string | null
  recommended_rate: string | null
  tech_stack_json: string | null
  professional_summary: string | null
  domain_experience: string | null
  individual_intro_text: string | null
  sort_order: number | null
}

const RESUME_TRANSFORM_PROMPT = `You are an expert resume writer specialized in creating polished candidate profiles for client presentations.

Candidate Name: {{fullName}}
Job Description:
{{jobDescription}}

Resume Text:
{{resumeText}}

Transform the resume into a concise, client-ready profile. Preserve factual accuracy.

Return a JSON object with this exact structure:
{
  "transformedResume": "string"
}

Rules:
- Keep the transformed resume concise and professional.
- Prioritize relevance to the job description.
- Do not invent experience, achievements, or technologies.
- Return only valid JSON.`

function extractFirstJsonObject(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/)
  return match ? match[0] : null
}

function parseJsonResponse<T>(response: string, fallback: T, context: string): T {
  const jsonText = extractFirstJsonObject(response)
  if (!jsonText) {
    log.warn('AI response did not contain JSON object', { context, responseLength: response.length })
    return fallback
  }

  try {
    return JSON.parse(jsonText) as T
  } catch {
    log.warn('Failed to parse AI JSON response', { context, responseLength: response.length })
    return fallback
  }
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim()
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getSessionFromRepository(sessionId: number): PresentationSessionRow | null {
  const row = presentationRepository.getSession(sessionId)
  return (row as unknown as PresentationSessionRow) ?? null
}

function getEntriesFromRepository(sessionId: number): PresentationEntryRow[] {
  const rows = presentationRepository.listEntriesBySession(sessionId)
  return (rows as unknown as PresentationEntryRow[]) ?? []
}

function renderTechStack(rawTechStack: string | null): string {
  if (!rawTechStack) return ''
  try {
    const parsed = JSON.parse(rawTechStack) as unknown
    if (Array.isArray(parsed)) {
      return parsed.map(item => String(item).trim()).filter(Boolean).join(', ')
    }
  } catch {
    return rawTechStack
  }
  return rawTechStack
}

export const presentationService = {
  async checkResumeFormat(resumeText: string): Promise<ResumeFormatCheckResult> {
    const prompt = fillTemplate(RESUME_FORMAT_CHECK, {
      resumeText,
    })

    const { text: response } = await llmRouter.chatAsync('resumeFormatCheck', prompt, 1200, 0.1)
    const parsed = parseJsonResponse<ResumeFormatCheckResult>(
      response,
      { isFormatted: false, details: ['Could not parse format check response'] },
      'checkResumeFormat'
    )

    return {
      isFormatted: Boolean(parsed.isFormatted),
      details: Array.isArray(parsed.details) ? parsed.details.map(detail => String(detail)) : [],
    }
  },

  async transformResume(resumeText: string, fullName: string, jobDescription = ''): Promise<string> {
    const prompt = fillTemplate(RESUME_TRANSFORM_PROMPT, {
      resumeText,
      fullName,
      jobDescription,
    })

    const { text: response } = await llmRouter.chatAsync('resumeTransform', prompt, 2600, 0.2)
    const parsed = parseJsonResponse<ResumeTransformResult>(
      response,
      { transformedResume: resumeText },
      'transformResume'
    )

    return normalizeText(parsed.transformedResume) || resumeText
  },

  async generateIntro(
    candidateNames: string[],
    positionTitle = '',
    accountName = '',
    jobDescription = '',
    mainSkill = ''
  ): Promise<string> {
    const prompt = fillTemplate(PRESENTATION_INTRO, {
      candidateNames: candidateNames.join(', '),
      positionTitle,
      accountName,
      jobDescription,
      mainSkill,
    })

    const { text: response } = await llmRouter.chatAsync('coverLetter', prompt, 900, 0.35)
    return response.trim()
  },

  async generateCandidateProfile(
    resumeText: string,
    fullName: string,
    mainSkill: string,
    jobDescription = '',
    positionTitle = ''
  ): Promise<CandidateProfileResult> {
    const prompt = fillTemplate(PRESENTATION_CANDIDATE_PROFILE, {
      resumeText,
      fullName,
      mainSkill,
      jobDescription,
      positionTitle,
    })

    const { text: response } = await llmRouter.chatAsync('candidateProfile', prompt, 2200, 0.2)
    const parsed = parseJsonResponse<CandidateProfileResult>(
      response,
      {
        professionalSummary: '',
        techStack: [],
        domainExperience: '',
        yearsOfExperience: '',
      },
      'generateCandidateProfile'
    )

    return {
      professionalSummary: normalizeText(parsed.professionalSummary),
      techStack: Array.isArray(parsed.techStack) ? parsed.techStack.map(item => String(item).trim()).filter(Boolean) : [],
      domainExperience: normalizeText(parsed.domainExperience),
      yearsOfExperience: normalizeText(parsed.yearsOfExperience),
    }
  },

  generatePresentationHtml(sessionId: number, mode: string): string {
    const session = getSessionFromRepository(sessionId)
    if (!session) {
      throw new Error(`Presentation session not found for id ${sessionId}`)
    }

    const entries = getEntriesFromRepository(sessionId)
      .slice()
      .sort((a, b) => (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER))

    const sessionName = escapeHtml(normalizeText(session.name) || 'Candidate Presentation')
    const introText = normalizeText(session.intro_text)
    const positionTitle = escapeHtml(normalizeText(session.position_title))
    const accountName = escapeHtml(normalizeText(session.account_name))
    const jobDescription = escapeHtml(normalizeText(session.job_description))
    const modeLabel = escapeHtml(normalizeText(mode) || 'default')

    const candidateCards = entries.length > 0
      ? entries.map(entry => {
        const fullName = escapeHtml(normalizeText(entry.full_name))
        const mainSkill = escapeHtml(normalizeText(entry.main_skill))
        const seniority = escapeHtml(normalizeText(entry.seniority))
        const country = escapeHtml(normalizeText(entry.country))
        const yearsOfExperience = escapeHtml(normalizeText(entry.years_of_experience))
        const availability = escapeHtml(normalizeText(entry.availability))
        const recommendedRate = escapeHtml(normalizeText(entry.recommended_rate))
        const professionalSummary = escapeHtml(normalizeText(entry.professional_summary))
        const domainExperience = escapeHtml(normalizeText(entry.domain_experience))
        const individualIntro = escapeHtml(normalizeText(entry.individual_intro_text))
        const techStack = escapeHtml(renderTechStack(entry.tech_stack_json))

        const details = [
          yearsOfExperience ? `<span style="margin-right: 12px;"><strong>Experience:</strong> ${yearsOfExperience}</span>` : '',
          availability ? `<span style="margin-right: 12px;"><strong>Availability:</strong> ${availability}</span>` : '',
          recommendedRate ? `<span><strong>Rate:</strong> ${recommendedRate}</span>` : '',
        ].filter(Boolean).join('')

        return `
          <tr>
            <td style="padding: 0 0 16px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; border: 1px solid #D9E1EE; border-radius: 8px;">
                <tr>
                  <td style="padding: 16px 18px; font-family: Arial, Helvetica, sans-serif;">
                    <div style="font-size: 18px; font-weight: 700; color: #1A3353; margin-bottom: 6px;">${fullName}</div>
                    <div style="font-size: 14px; color: #314867; margin-bottom: 10px;">${seniority}${mainSkill ? ` | ${mainSkill}` : ''}${country ? ` | ${country}` : ''}</div>
                    ${details ? `<div style="font-size: 13px; color: #314867; margin-bottom: 10px;">${details}</div>` : ''}
                    ${techStack ? `<div style="font-size: 13px; color: #314867; margin-bottom: 10px;"><strong>Tech Stack:</strong> ${techStack}</div>` : ''}
                    ${professionalSummary ? `<div style="font-size: 13px; line-height: 1.6; color: #23344D; margin-bottom: 8px;"><strong>Summary:</strong> ${professionalSummary}</div>` : ''}
                    ${domainExperience ? `<div style="font-size: 13px; line-height: 1.6; color: #23344D; margin-bottom: 8px;"><strong>Domain Experience:</strong> ${domainExperience}</div>` : ''}
                    ${individualIntro ? `<div style="font-size: 13px; line-height: 1.6; color: #23344D;"><strong>Intro:</strong> ${individualIntro}</div>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
      }).join('')
      : `
        <tr>
          <td style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #4C607B; padding: 8px 0 0 0;">
            No candidates have been added to this presentation session yet.
          </td>
        </tr>`

    const introBlock = introText
      ? `<tr><td style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.7; color: #23344D; padding: 0 0 16px 0;">${escapeHtml(introText)}</td></tr>`
      : ''

    const roleContextBlock = (positionTitle || accountName || jobDescription)
      ? `<tr>
          <td style="padding: 0 0 18px 0;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; background: #F5F8FD; border: 1px solid #D9E1EE; border-radius: 8px;">
              <tr>
                <td style="padding: 14px 16px; font-family: Arial, Helvetica, sans-serif; color: #1F324E; font-size: 13px; line-height: 1.6;">
                  ${positionTitle ? `<div><strong>Position:</strong> ${positionTitle}</div>` : ''}
                  ${accountName ? `<div><strong>Account:</strong> ${accountName}</div>` : ''}
                  ${jobDescription ? `<div style="margin-top: 6px;"><strong>Job Description:</strong> ${jobDescription}</div>` : ''}
                </td>
              </tr>
            </table>
          </td>
        </tr>`
      : ''

    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${sessionName}</title>
  </head>
  <body style="margin: 0; padding: 24px 16px; background-color: #EEF3FA;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; max-width: 760px; margin: 0 auto; background: #FFFFFF; border: 1px solid #D5DEEA; border-radius: 10px;">
      <tr>
        <td style="padding: 22px 24px; font-family: Arial, Helvetica, sans-serif; border-bottom: 1px solid #E5EBF4;">
          <div style="font-size: 24px; line-height: 1.3; font-weight: 700; color: #112A46; margin-bottom: 6px;">${sessionName}</div>
          <div style="font-size: 12px; color: #4C607B;">Mode: ${modeLabel}</div>
        </td>
      </tr>
      <tr>
        <td style="padding: 18px 24px 22px 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
            ${introBlock}
            ${roleContextBlock}
            ${candidateCards}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

    log.info('Presentation HTML generated', { sessionId, mode, entryCount: entries.length, htmlLength: html.length })
    return html
  },
}
