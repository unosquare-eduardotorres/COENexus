import { describe, expect, it } from 'vitest'
import { runConcurrent } from './concurrency'

describe('runConcurrent', () => {
  it('should process all items and return results in order', async () => {
    const items = [1, 2, 3, 4, 5]
    const results = await runConcurrent(items, 2, async (n) => n * 10)
    expect(results).toEqual([10, 20, 30, 40, 50])
  })

  it('should respect concurrency limit', async () => {
    let concurrent = 0
    let maxConcurrent = 0

    const items = [1, 2, 3, 4, 5, 6]
    await runConcurrent(items, 2, async () => {
      concurrent++
      maxConcurrent = Math.max(maxConcurrent, concurrent)
      await new Promise(r => setTimeout(r, 10))
      concurrent--
    })

    expect(maxConcurrent).toBeLessThanOrEqual(2)
  })

  it('should handle empty items array', async () => {
    const results = await runConcurrent([], 5, async (n: number) => n)
    expect(results).toEqual([])
  })

  it('should handle concurrency greater than items length', async () => {
    const items = [1, 2]
    const results = await runConcurrent(items, 10, async (n) => n + 1)
    expect(results).toEqual([2, 3])
  })

  it('should propagate errors from worker functions', async () => {
    const items = [1, 2, 3]
    await expect(
      runConcurrent(items, 2, async (n) => {
        if (n === 2) throw new Error('fail on 2')
        return n
      })
    ).rejects.toThrow('fail on 2')
  })
})
