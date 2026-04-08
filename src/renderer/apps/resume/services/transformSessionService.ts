import {
  TransformSessionSummary,
  TransformSessionDetail,
  CreateOrUpdateTransformSession,
} from '../types';

export const transformSessionService = {
  async list(): Promise<TransformSessionSummary[]> {
    return window.api.sessions.list() as Promise<TransformSessionSummary[]>;
  },

  async get(id: number): Promise<TransformSessionDetail> {
    return window.api.sessions.get(id) as Promise<TransformSessionDetail>;
  },

  async create(request: CreateOrUpdateTransformSession): Promise<TransformSessionDetail> {
    const result = await window.api.sessions.create(request);
    return result as TransformSessionDetail;
  },

  async update(id: number, request: CreateOrUpdateTransformSession): Promise<TransformSessionDetail> {
    await window.api.sessions.update(id, request);
    return window.api.sessions.get(id) as Promise<TransformSessionDetail>;
  },

  async remove(id: number): Promise<void> {
    await window.api.sessions.delete(id);
  },
};
