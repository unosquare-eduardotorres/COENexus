interface CreateSessionPayload {
  name: string;
  contextType: string;
  contextId?: number | null;
  contextName?: string;
  processingMode: string;
  refinementMode: string;
  jobDescription?: string | null;
  jobDescriptionSource?: string | null;
  selectedPositionId?: string | null;
  resumeContentJson?: string | null;
  wizardStateJson?: string | null;
  status: string;
}

interface CreateSessionResponse {
  id: number;
  name: string;
  contextType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const sessionService = {
  async createSession(payload: CreateSessionPayload): Promise<CreateSessionResponse> {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Create session failed: ${res.status}`);
    return res.json();
  },
};
