import { assessmentSessions, codeReviews, defenseNotes, interviewQuestions, promotionDossiers } from '../data';
import { AssessmentSession, PromotionDossier } from '../types';

export interface AssessmentFilters {
  search?: string;
  role?: string;
  page?: number;
  pageSize?: number;
}

const toPathNumericId = (id: string): number => {
  const parsed = Number(id.replace(/\D+/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

type PathApi = {
  listAssessments: (params: AssessmentFilters) => Promise<unknown>;
  getAssessment: (params: { id: number }) => Promise<unknown>;
  saveAssessmentDraft: (params: {
    assessmentId: number;
    answers: Array<{ questionId: number; score: number; notes?: string }>;
  }) => Promise<{ saved: boolean }>;
  submitAssessment: (params: {
    assessmentId: number;
    reviewerId: number;
    answers: Array<{ questionId: number; score: number; notes?: string }>;
  }) => Promise<{ submitted: boolean; score: number | null }>;
  listDossiers: (params: AssessmentFilters) => Promise<unknown>;
  getDossier: (params: { id: number }) => Promise<unknown>;
  updateDossierStatus: (params: {
    dossierId: number;
    status: string;
    reviewerId: number;
  }) => Promise<{ updated: boolean }>;
};

const getPathApi = (): PathApi | undefined => (window.api as { path?: PathApi }).path;

export const assessmentService = {
  async listAssessments(filters: AssessmentFilters = {}): Promise<AssessmentSession[]> {
    const fallback = assessmentSessions.filter((session) => {
      if (!filters.search) {
        return true;
      }
      const term = filters.search.toLowerCase();
      return (
        session.evaluatorName.toLowerCase().includes(term) ||
        session.targetLevel.toLowerCase().includes(term) ||
        session.status.toLowerCase().includes(term)
      );
    });
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return fallback;
      }
      await pathApi.listAssessments(filters);
      return fallback;
    } catch (_error) {
      return fallback;
    }
  },

  async getAssessmentById(assessmentId: string): Promise<AssessmentSession | null> {
    const fallback = assessmentSessions.find((session) => session.id === assessmentId) || null;
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return fallback;
      }
      await pathApi.getAssessment({ id: toPathNumericId(assessmentId) });
      return fallback;
    } catch (_error) {
      return fallback;
    }
  },

  async saveAssessmentDraft(assessmentId: string): Promise<{ saved: boolean }> {
    const session = assessmentSessions.find((item) => item.id === assessmentId);
    try {
      const pathApi = getPathApi();
      if (!pathApi || !session) {
        return { saved: !!session };
      }
      const answers = (session.questions || []).map((question) => ({
        questionId: toPathNumericId(question.id),
        score: question.score || 0,
        notes: question.evaluatorNotes,
      }));
      return await pathApi.saveAssessmentDraft({
        assessmentId: toPathNumericId(assessmentId),
        answers,
      });
    } catch (_error) {
      return { saved: !!session };
    }
  },

  async submitAssessment(assessmentId: string, reviewerId = 1): Promise<{ submitted: boolean; score: number | null }> {
    const session = assessmentSessions.find((item) => item.id === assessmentId);
    const fallbackScore = session?.compositeScore ?? null;
    try {
      const pathApi = getPathApi();
      if (!pathApi || !session) {
        return { submitted: !!session, score: fallbackScore };
      }
      const answers = (session.questions || []).map((question) => ({
        questionId: toPathNumericId(question.id),
        score: question.score || 0,
        notes: question.evaluatorNotes,
      }));
      return await pathApi.submitAssessment({
        assessmentId: toPathNumericId(assessmentId),
        reviewerId,
        answers,
      });
    } catch (_error) {
      return { submitted: !!session, score: fallbackScore };
    }
  },

  async listDossiers(filters: AssessmentFilters = {}): Promise<PromotionDossier[]> {
    const fallback = promotionDossiers.filter((dossier) => {
      if (!filters.search) {
        return true;
      }
      const term = filters.search.toLowerCase();
      return (
        dossier.skillAnalysis.toLowerCase().includes(term) ||
        dossier.consistencyData.toLowerCase().includes(term) ||
        (dossier.recommendation || '').toLowerCase().includes(term)
      );
    });
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return fallback;
      }
      await pathApi.listDossiers(filters);
      return fallback;
    } catch (_error) {
      return fallback;
    }
  },

  async getDossierById(dossierId: string): Promise<PromotionDossier | null> {
    const fallback = promotionDossiers.find((dossier) => dossier.id === dossierId) || null;
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return fallback;
      }
      await pathApi.getDossier({ id: toPathNumericId(dossierId) });
      return fallback;
    } catch (_error) {
      return fallback;
    }
  },

  async updateDossierStatus(dossierId: string, status: string, reviewerId = 1): Promise<{ updated: boolean }> {
    const fallback = promotionDossiers.some((dossier) => dossier.id === dossierId && !!status);
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return { updated: fallback };
      }
      return await pathApi.updateDossierStatus({
        dossierId: toPathNumericId(dossierId),
        status,
        reviewerId,
      });
    } catch (_error) {
      return { updated: fallback };
    }
  },

  async getAssessmentEvidence(assessmentId: string) {
    const reviewEvidence = codeReviews.filter((review) => review.sessionId === assessmentId);
    const questionEvidence = interviewQuestions.filter((question) => question.sessionId === assessmentId);
    const defenseEvidence = defenseNotes.filter((note) => note.sessionId === assessmentId);
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return {
          reviews: reviewEvidence,
          questions: questionEvidence,
          notes: defenseEvidence,
        };
      }
      await pathApi.getAssessment({ id: toPathNumericId(assessmentId) });
      return {
        reviews: reviewEvidence,
        questions: questionEvidence,
        notes: defenseEvidence,
      };
    } catch (_error) {
      return {
        reviews: reviewEvidence,
        questions: questionEvidence,
        notes: defenseEvidence,
      };
    }
  },
};
