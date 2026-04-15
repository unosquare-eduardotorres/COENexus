import { describe, it, expect } from 'vitest'
import { adminService, assessmentService, developerService, discussionService, learningPathService } from './index'

describe('path services barrel export', () => {
  it('should export adminService', () => {
    expect(adminService).toBeDefined()
  })

  it('should export assessmentService', () => {
    expect(assessmentService).toBeDefined()
  })

  it('should export developerService', () => {
    expect(developerService).toBeDefined()
  })

  it('should export discussionService', () => {
    expect(discussionService).toBeDefined()
  })

  it('should export learningPathService', () => {
    expect(learningPathService).toBeDefined()
  })
})
