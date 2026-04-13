import { useState, useEffect } from 'react';
import { assessmentService, developerService } from '../services';
import { trackPathEvent } from '../services/pathAnalytics';
import type { AssessmentSession, DeveloperProfile } from '../types';
import ScorecardPreview from '../components/ScorecardPreview';
import TheoreticalInterviewSection from '../components/TheoreticalInterviewSection';
import CodeChallengeSection from '../components/CodeChallengeSection';
import DefenseNotesSection from '../components/DefenseNotesSection';

const defenseTabNames = ['System Thinking', 'Problem Solving', 'Soft Skills'];
const quickTags = ['#confidence', '#tradeoffs', '#scalability'];

export default function AssessmentQueuePage() {
  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [dev, setDev] = useState<DeveloperProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [activeDefenseTab, setActiveDefenseTab] = useState(0);
  const [defenseNotes, setDefenseNotes] = useState('');

  useEffect(() => {
    let cancelled = false;
    assessmentService.getAssessmentById('session-001')
      .then((s) => {
        setSession(s);
        if (cancelled) return null;
        if (s) {
          const initial: Record<string, number> = {};
          s.questions?.forEach((q) => {
            if (q.score) initial[q.id] = q.score;
          });
          setScores(initial);
          return developerService.getDeveloperById(s.developerId);
        }
        return null;
      })
      .then((d) => {
        if (cancelled) return;
        if (d) setDev(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleScoreClick = (questionId: string, score: number) => {
    setScores((prev) => ({ ...prev, [questionId]: score }));
    trackPathEvent('assessment_score_entered', { questionId, score });
  };

  if (loading) return <div className="flex items-center justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" /></div>;
  if (!session || !dev) return <div className="glass-card rounded-xl p-8 text-center text-secondary">No data available</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-primary">
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none"><path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-violet-600 dark:text-violet-400">Assessment Workspace</h1>
          <p className="text-xs text-muted">Candidate: {dev.fullName} &bull; {dev.practice.name} Track</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="glass-button flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-secondary">
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" /><path d="M5 8h6M8 5v6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
            Save Draft
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-8">
          <TheoreticalInterviewSection
            questions={session.questions || []}
            scores={scores}
            onScoreClick={handleScoreClick}
          />

          <CodeChallengeSection codeReviews={session.codeReviews || []} />

          <DefenseNotesSection
            tabNames={defenseTabNames}
            activeTab={activeDefenseTab}
            onTabChange={setActiveDefenseTab}
            notes={defenseNotes}
            onNotesChange={setDefenseNotes}
            quickTags={quickTags}
          />
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <ScorecardPreview
            compositeScore={session.compositeScore}
            knowledgeScore={session.knowledgeScore ? session.knowledgeScore / 10 : undefined}
            deliveryScore={session.deliveryScore ? session.deliveryScore / 10 : undefined}
            candidateName={dev.fullName}
            candidateRole={`${dev.currentLevel} Developer Candidate`}
            earlyIndicators={[
              'Strong mastery of concurrent programming models and distributed caching.',
              'Exceptional documentation standards observed in code challenge.',
            ]}
          />
        </div>
      </div>
    </div>
  );
}
