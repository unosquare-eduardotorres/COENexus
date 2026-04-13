type PathEvent =
  | 'dashboard_viewed'
  | 'learning_path_opened'
  | 'module_started'
  | 'module_completed'
  | 'challenge_submitted'
  | 'assessment_score_entered'
  | 'assessment_submitted'
  | 'thread_opened'
  | 'message_sent'
  | 'dossier_reviewed'
  | 'decision_submitted'
  | 'role_switched'
  | 'settings_saved';

export function trackPathEvent(event: PathEvent, payload?: Record<string, unknown>): void {
  try {
    const pathApi = (window.api as { path?: { saveAnalyticsEvent?: (params: { eventName: string; payload: Record<string, unknown> }) => Promise<unknown> } }).path;
    pathApi?.saveAnalyticsEvent?.({ eventName: event, payload: payload ?? {} });
  } catch {
    // Swallow — analytics failures are non-critical
  }
}
