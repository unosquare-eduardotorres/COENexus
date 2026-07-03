import { describe, it, expect, vi, beforeEach } from 'vitest'
import { transformSessionService } from './transformSessionService'

describe('transformSessionService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('list', () => {
    it('should call sessions.list', async () => {
      vi.mocked(window.api.sessions.list).mockResolvedValue([{ id: 1, name: 'Session 1' }])
      const result = await transformSessionService.list()
      expect(window.api.sessions.list).toHaveBeenCalledOnce()
      expect(result).toHaveLength(1)
    })
  })

  describe('get', () => {
    it('should call sessions.get with id', async () => {
      vi.mocked(window.api.sessions.get).mockResolvedValue({ id: 5, name: 'Detail' })
      const result = await transformSessionService.get(5)
      expect(window.api.sessions.get).toHaveBeenCalledWith(5)
      expect(result).toHaveProperty('id', 5)
    })
  })

  describe('create', () => {
    it('should call sessions.create with request', async () => {
      const request = { name: 'New', contextType: 'employee' } as any
      vi.mocked(window.api.sessions.create).mockResolvedValue({ id: 10, name: 'New' })
      const result = await transformSessionService.create(request)
      expect(window.api.sessions.create).toHaveBeenCalledWith(request)
      expect(result).toHaveProperty('id', 10)
    })
  })

  describe('update', () => {
    it('should call sessions.update then sessions.get', async () => {
      const request = { name: 'Updated' } as any
      vi.mocked(window.api.sessions.update).mockResolvedValue({})
      vi.mocked(window.api.sessions.get).mockResolvedValue({ id: 3, name: 'Updated' })
      const result = await transformSessionService.update(3, request)
      expect(window.api.sessions.update).toHaveBeenCalledWith(3, request)
      expect(window.api.sessions.get).toHaveBeenCalledWith(3)
      expect(result).toHaveProperty('name', 'Updated')
    })
  })

  describe('remove', () => {
    it('should call sessions.delete with id', async () => {
      await transformSessionService.remove(7)
      expect(window.api.sessions.delete).toHaveBeenCalledWith(7)
    })
  })
})
