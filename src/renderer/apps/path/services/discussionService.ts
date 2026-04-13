import { discussionThreads, threadMessages } from '../data';
import { DiscussionThread, ThreadMessage } from '../types';

export interface DiscussionFilters {
  search?: string;
  role?: string;
  page?: number;
  pageSize?: number;
}

const toPathNumericId = (id: string): number => {
  const parsed = Number(id.replace(/\D+/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const randomId = (): string => `msg-${Date.now()}`;

type PathApi = {
  listDiscussionThreads: (params: DiscussionFilters) => Promise<unknown>;
  getDiscussionThread: (params: { id: number }) => Promise<unknown>;
  createDiscussionPost: (params: { threadId: number; authorId: number; message: string }) => Promise<{ id: number }>;
  replyDiscussionPost: (params: {
    threadId: number;
    parentPostId: number;
    authorId: number;
    message: string;
  }) => Promise<{ id: number }>;
};

const getPathApi = (): PathApi | undefined => (window.api as { path?: PathApi }).path;

export const discussionService = {
  async listThreads(filters: DiscussionFilters = {}): Promise<DiscussionThread[]> {
    const fallback = discussionThreads.filter((thread) => {
      if (!filters.search) {
        return true;
      }
      const term = filters.search.toLowerCase();
      return (
        thread.title.toLowerCase().includes(term) ||
        (thread.goal || '').toLowerCase().includes(term) ||
        (thread.competency || '').toLowerCase().includes(term)
      );
    });
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return fallback;
      }
      await pathApi.listDiscussionThreads(filters);
      return fallback;
    } catch (_error) {
      return fallback;
    }
  },

  async getThreadById(threadId: string): Promise<DiscussionThread | null> {
    const fallback = discussionThreads.find((thread) => thread.id === threadId) || null;
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return fallback;
      }
      await pathApi.getDiscussionThread({ id: toPathNumericId(threadId) });
      return fallback;
    } catch (_error) {
      return fallback;
    }
  },

  async listMessages(threadId: string): Promise<ThreadMessage[]> {
    const fallback = threadMessages.filter((message) => message.threadId === threadId);
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return fallback;
      }
      await pathApi.getDiscussionThread({ id: toPathNumericId(threadId) });
      return fallback;
    } catch (_error) {
      return fallback;
    }
  },

  async createPost(threadId: string, authorId: number, message: string): Promise<{ id: string }> {
    const fallbackId = randomId();
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return { id: fallbackId };
      }
      const created = await pathApi.createDiscussionPost({
        threadId: toPathNumericId(threadId),
        authorId,
        message,
      });
      return { id: `msg-${created.id}` };
    } catch (_error) {
      return { id: fallbackId };
    }
  },

  async replyToPost(threadId: string, parentPostId: string, authorId: number, message: string): Promise<{ id: string }> {
    const fallbackId = randomId();
    try {
      const pathApi = getPathApi();
      if (!pathApi) {
        return { id: fallbackId };
      }
      const created = await pathApi.replyDiscussionPost({
        threadId: toPathNumericId(threadId),
        parentPostId: toPathNumericId(parentPostId),
        authorId,
        message,
      });
      return { id: `msg-${created.id}` };
    } catch (_error) {
      return { id: fallbackId };
    }
  },
};
