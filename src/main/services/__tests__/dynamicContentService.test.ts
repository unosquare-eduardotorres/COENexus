import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockCheckAvailability, mockChatAsync } = vi.hoisted(() => ({
  mockCheckAvailability: vi.fn(),
  mockChatAsync: vi.fn(),
}))

vi.mock('../claudeService', () => ({
  claudeService: {
    checkAvailability: mockCheckAvailability,
    chatAsync: mockChatAsync,
  },
}))

vi.mock('../logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}))

import { dynamicContentService } from '../dynamicContentService'

const baseParams = {
  topicName: 'React Hooks',
  skillDomain: 'Frontend',
  level: 'intermediate',
  preferredFormats: ['article', 'tutorial'],
}

describe('dynamicContentService', () => {
  beforeEach(() => {
    mockCheckAvailability.mockReset()
    mockChatAsync.mockReset()
  })

  it('should return empty array when Claude is unavailable', async () => {
    mockCheckAvailability.mockResolvedValue(false)

    const result = await dynamicContentService.searchResources(baseParams)

    expect(result).toEqual([])
    expect(mockChatAsync).not.toHaveBeenCalled()
  })

  it('should parse JSON array from Claude response', async () => {
    mockCheckAvailability.mockResolvedValue(true)
    mockChatAsync.mockResolvedValue(JSON.stringify([
      { title: 'React Hooks Guide', url: 'https://react.dev', source: 'React Docs', relevanceScore: 0.95, format: 'documentation' },
      { title: 'useEffect Deep Dive', url: 'https://example.com', source: 'Blog', relevanceScore: 0.8, format: 'article' },
    ]))

    const result = await dynamicContentService.searchResources(baseParams)

    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('React Hooks Guide')
  })

  it('should return empty array when response is unparseable', async () => {
    mockCheckAvailability.mockResolvedValue(true)
    mockChatAsync.mockResolvedValue('Sorry, I cannot help with that.')

    const result = await dynamicContentService.searchResources(baseParams)

    expect(result).toEqual([])
  })

  it('should sort results by relevanceScore descending', async () => {
    mockCheckAvailability.mockResolvedValue(true)
    mockChatAsync.mockResolvedValue(JSON.stringify([
      { title: 'Low', url: 'https://a.com', source: 'A', relevanceScore: 0.3, format: 'article' },
      { title: 'High', url: 'https://b.com', source: 'B', relevanceScore: 0.9, format: 'article' },
      { title: 'Medium', url: 'https://c.com', source: 'C', relevanceScore: 0.6, format: 'article' },
    ]))

    const result = await dynamicContentService.searchResources(baseParams)

    expect(result[0].relevanceScore).toBe(0.9)
    expect(result[1].relevanceScore).toBe(0.6)
    expect(result[2].relevanceScore).toBe(0.3)
  })
})
