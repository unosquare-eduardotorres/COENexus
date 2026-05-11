import { describe, expect, it, vi, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { createAgentsDb } from '../../../../../../tests/_helpers/mockDb'

let db: Database.Database

vi.mock('../../agentsConnection', () => ({
  getAgentsDatabase: () => db,
}))

import {
  getConfig,
  updateConfig,
  createPromptVersion,
  activateVersion,
  listPromptVersions,
  getActivePromptVersion,
} from '../configRepository'

describe('configRepository', () => {
  beforeEach(() => {
    db = createAgentsDb()
  })

  it('should getConfig with seeded row (id=1)', () => {
    const config = getConfig()

    expect(config.id).toBe(1)
    expect(typeof config.model_name).toBe('string')
    expect(typeof config.token_budget).toBe('number')
    expect(typeof config.temperature).toBe('number')
    expect(typeof config.max_reports_per_run).toBe('number')
  })

  it('should updateConfig fields', () => {
    updateConfig({ token_budget: 50000, temperature: 0.5 })

    const config = getConfig()
    expect(config.token_budget).toBe(50000)
    expect(config.temperature).toBe(0.5)
  })

  it('should createPromptVersion and return inactive row', () => {
    const version = createPromptVersion('v1.0', 'You are a helpful assistant.', 'Initial version', 'admin')

    expect(version.id).toBeDefined()
    expect(version.version_label).toBe('v1.0')
    expect(version.prompt_text).toBe('You are a helpful assistant.')
    expect(version.is_active).toBe(0)
    expect(version.created_by).toBe('admin')
  })

  it('should activateVersion and deactivate others', () => {
    const v1 = createPromptVersion('v1', 'Prompt v1', 'First')
    const v2 = createPromptVersion('v2', 'Prompt v2', 'Second')

    activateVersion(v1.id)
    let active = getActivePromptVersion()
    expect(active!.id).toBe(v1.id)
    expect(active!.is_active).toBe(1)

    activateVersion(v2.id)
    active = getActivePromptVersion()
    expect(active!.id).toBe(v2.id)

    const all = listPromptVersions()
    const v1Row = all.find(v => v.id === v1.id)
    expect(v1Row!.is_active).toBe(0)

    const config = getConfig()
    expect(config.active_prompt_version_id).toBe(v2.id)
  })
})
