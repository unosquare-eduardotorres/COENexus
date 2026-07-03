import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { catalogService } from '../catalogService'

vi.mock('../../config', () => ({
  getConfig: () => ({
    catalog: { apiUrl: 'https://test-api.example.com/' },
  }),
}))

function createOkResponse<T>(payload: T): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => payload,
  } as Response
}

describe('catalogService', () => {
  beforeEach(() => {
    catalogService.clearCache()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('should deserialize key/text seniorities', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createOkResponse([
        { key: 1, text: 'Junior' },
        { key: 2, text: 'Senior' },
      ]),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await catalogService.getSeniorities('token-1')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual(
      new Map([
        [1, 'Junior'],
        [2, 'Senior'],
      ]),
    )
  })

  it('should deserialize value/label countries', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createOkResponse([
        { value: 34, label: 'Spain' },
        { value: 52, label: 'Mexico' },
      ]),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await catalogService.getCountries('token-2')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual(
      new Map([
        [34, 'Spain'],
        [52, 'Mexico'],
      ]),
    )
  })

  it('should deserialize value/label skills', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createOkResponse([
        { value: 10, label: 'TypeScript' },
        { value: 11, label: 'React' },
      ]),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await catalogService.getMainSkills('token-3')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual(
      new Map([
        [10, 'TypeScript'],
        [11, 'React'],
      ]),
    )
  })

  it('should use cache on second call', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createOkResponse([{ key: 1, text: 'Junior' }]),
    )
    vi.stubGlobal('fetch', fetchMock)

    const first = await catalogService.getSeniorities('token-4')
    const second = await catalogService.getSeniorities('token-4')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)
  })

  it('should clear cache', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createOkResponse([{ key: 1, text: 'Junior' }]))
      .mockResolvedValueOnce(createOkResponse([{ key: 1, text: 'Junior' }]))
    vi.stubGlobal('fetch', fetchMock)
    await catalogService.getSeniorities('token-5')

    catalogService.clearCache()
    await catalogService.getSeniorities('token-5')

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
