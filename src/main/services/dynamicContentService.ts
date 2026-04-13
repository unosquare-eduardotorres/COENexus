import { claudeService } from './claudeService'
import { createLogger } from './logger'

const log = createLogger('DynamicContent')

export interface DynamicResourceSearchParams {
  topicName: string
  skillDomain: string
  level: string
  preferredFormats: string[]
}

export interface DynamicResource {
  title: string
  url: string
  source: string
  relevanceScore: number
  format: string
}

export const dynamicContentService = {
  async searchResources(params: DynamicResourceSearchParams): Promise<DynamicResource[]> {
    log.info('Searching dynamic resources', { topicName: params.topicName, skillDomain: params.skillDomain, level: params.level })

    const available = await claudeService.checkAvailability()
    if (!available) {
      log.warn('Claude service not available for dynamic resource search')
      return []
    }

    const prompt = `You are a technical learning resource curator. Find the best learning resources for this topic.

Topic: ${params.topicName}
Skill Domain: ${params.skillDomain}
Target Level: ${params.level}
Preferred Formats: ${params.preferredFormats.join(', ')}

Suggest 5-8 high-quality learning resources. For each resource, provide:
- title: descriptive resource title
- url: a plausible URL (official docs, GitHub, reputable education platforms)
- source: the platform name (e.g., "MDN", "GitHub", "Coursera")
- relevanceScore: 0.0-1.0 based on relevance to the topic and level
- format: one of "article", "video", "course", "documentation", "tutorial", "book", "interactive"

Respond with a JSON array:
[{"title": "...", "url": "...", "source": "...", "relevanceScore": 0.9, "format": "article"}, ...]`

    const signal = AbortSignal.timeout(30_000)
    const response = await claudeService.chatAsync(
      'claude-sonnet-4-20250514',
      prompt,
      2000,
      0.4,
      'You are a learning resource curator. Always respond with a valid JSON array.',
      signal
    )

    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const resources = JSON.parse(jsonMatch[0]) as DynamicResource[]
        log.info('Dynamic resources found', { count: resources.length })
        return resources.sort((a, b) => b.relevanceScore - a.relevanceScore)
      }
      log.warn('Could not parse dynamic content response')
      return []
    } catch {
      log.warn('Failed to parse dynamic content response')
      return []
    }
  },
}
