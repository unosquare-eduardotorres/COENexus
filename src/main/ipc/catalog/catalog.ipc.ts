import { IPC_CHANNELS } from '../../../shared/ipc-channels'
import type {
  CatalogCoe,
  CatalogPractice,
  CatalogSkill,
  CatalogCoeRow,
  CatalogPracticeRow,
  CatalogSkillRow,
  CatalogCreateParams,
  CatalogUpdateParams,
  CatalogJunctionParams,
} from '../../../shared/ipc-types'
import { registerIpcHandler } from '../registerIpcHandler'
import { validateSender } from '../validate'
import { catalogRepository } from '../../db/repositories/catalogRepository'

export function registerCatalogHandlers(): void {
  // ── COEs ──

  registerIpcHandler(
    IPC_CHANNELS.CATALOG_GET_COES,
    async (event): Promise<CatalogCoe[]> => {
      validateSender(event)
      return catalogRepository.getAllCoes()
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.CATALOG_GET_COE,
    async (event, id: number): Promise<CatalogCoe | null> => {
      validateSender(event)
      return catalogRepository.getCoe(id)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.CATALOG_CREATE_COE,
    async (event, params: CatalogCreateParams): Promise<CatalogCoeRow> => {
      validateSender(event)
      return catalogRepository.createCoe(params.name)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.CATALOG_UPDATE_COE,
    async (event, params: CatalogUpdateParams): Promise<CatalogCoeRow> => {
      validateSender(event)
      return catalogRepository.updateCoe(params.id, { name: params.name, sort_order: params.sort_order })
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.CATALOG_TOGGLE_COE,
    async (event, id: number): Promise<CatalogCoeRow> => {
      validateSender(event)
      return catalogRepository.toggleCoeActive(id)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.CATALOG_ADD_PRACTICE_TO_COE,
    async (event, params: CatalogJunctionParams): Promise<{ success: boolean }> => {
      validateSender(event)
      catalogRepository.addPracticeToCoe(params.parentId, params.childId)
      return { success: true }
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.CATALOG_REMOVE_PRACTICE_FROM_COE,
    async (event, params: CatalogJunctionParams): Promise<{ success: boolean }> => {
      validateSender(event)
      catalogRepository.removePracticeFromCoe(params.parentId, params.childId)
      return { success: true }
    }
  )

  // ── Practices ──

  registerIpcHandler(
    IPC_CHANNELS.CATALOG_GET_PRACTICES,
    async (event): Promise<CatalogPractice[]> => {
      validateSender(event)
      return catalogRepository.getAllPractices()
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.CATALOG_GET_PRACTICE,
    async (event, id: number): Promise<CatalogPractice | null> => {
      validateSender(event)
      return catalogRepository.getPractice(id)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.CATALOG_CREATE_PRACTICE,
    async (event, params: CatalogCreateParams): Promise<CatalogPracticeRow> => {
      validateSender(event)
      return catalogRepository.createPractice(params.name)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.CATALOG_UPDATE_PRACTICE,
    async (event, params: CatalogUpdateParams): Promise<CatalogPracticeRow> => {
      validateSender(event)
      return catalogRepository.updatePractice(params.id, { name: params.name, sort_order: params.sort_order })
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.CATALOG_TOGGLE_PRACTICE,
    async (event, id: number): Promise<CatalogPracticeRow> => {
      validateSender(event)
      return catalogRepository.togglePracticeActive(id)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.CATALOG_ADD_SKILL_TO_PRACTICE,
    async (event, params: CatalogJunctionParams): Promise<{ success: boolean }> => {
      validateSender(event)
      catalogRepository.addSkillToPractice(params.parentId, params.childId)
      return { success: true }
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.CATALOG_REMOVE_SKILL_FROM_PRACTICE,
    async (event, params: CatalogJunctionParams): Promise<{ success: boolean }> => {
      validateSender(event)
      catalogRepository.removeSkillFromPractice(params.parentId, params.childId)
      return { success: true }
    }
  )

  // ── Skills ──

  registerIpcHandler(
    IPC_CHANNELS.CATALOG_GET_SKILLS,
    async (event): Promise<CatalogSkill[]> => {
      validateSender(event)
      return catalogRepository.getAllSkills()
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.CATALOG_GET_SKILL,
    async (event, id: number): Promise<CatalogSkill | null> => {
      validateSender(event)
      return catalogRepository.getSkill(id)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.CATALOG_CREATE_SKILL,
    async (event, params: CatalogCreateParams): Promise<CatalogSkillRow> => {
      validateSender(event)
      return catalogRepository.createSkill(params.name)
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.CATALOG_UPDATE_SKILL,
    async (event, params: CatalogUpdateParams): Promise<CatalogSkillRow> => {
      validateSender(event)
      return catalogRepository.updateSkill(params.id, { name: params.name, sort_order: params.sort_order })
    }
  )

  registerIpcHandler(
    IPC_CHANNELS.CATALOG_TOGGLE_SKILL,
    async (event, id: number): Promise<CatalogSkillRow> => {
      validateSender(event)
      return catalogRepository.toggleSkillActive(id)
    }
  )
}
