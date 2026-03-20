import {
  TransformSessionSummary,
  TransformSessionDetail,
  CreateOrUpdateTransformSession,
} from '../types';

const API_BASE = '/api/sessions';

export const transformSessionService = {
  async list(): Promise<TransformSessionSummary[]> {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error(`List sessions failed: ${res.status}`);
    return res.json();
  },

  async get(id: number): Promise<TransformSessionDetail> {
    const res = await fetch(`${API_BASE}/${id}`);
    if (!res.ok) throw new Error(`Get session failed: ${res.status}`);
    return res.json();
  },

  async create(request: CreateOrUpdateTransformSession): Promise<TransformSessionDetail> {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) throw new Error(`Create session failed: ${res.status}`);
    return res.json();
  },

  async update(id: number, request: CreateOrUpdateTransformSession): Promise<TransformSessionDetail> {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) throw new Error(`Update session failed: ${res.status}`);
    return res.json();
  },

  async remove(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Delete session failed: ${res.status}`);
  },
};
