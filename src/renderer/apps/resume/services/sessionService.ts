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
    const result = await window.api.sessions.create(payload);
    return result as CreateSessionResponse;
  },
};
