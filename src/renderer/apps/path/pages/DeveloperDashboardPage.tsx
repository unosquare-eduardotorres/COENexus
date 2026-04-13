import { useState, useEffect } from 'react';
import { developerService } from '../services';
import { trackPathEvent } from '../services/pathAnalytics';
import type { DeveloperProfile } from '../types';
import ReadinessRing from '../components/ReadinessRing';
import SkillRadar from '../components/SkillRadar';
import PromotionGateCard from '../components/PromotionGateCard';
import MentorFeedbackCard from '../components/MentorFeedbackCard';

const radarData = [
  { label: 'Backend', value: 78 },
  { label: 'Architecture', value: 84 },
  { label: 'Design', value: 65 },
  { label: 'Testing', value: 72 },
  { label: 'Security', value: 58 },
  { label: 'Leadership', value: 45 },
];

const gates = [
  { name: 'Code Quality', status: 'met' as const, detail: 'Consistently maintained 98% coverage', verifiedBy: '4 Peer Reviews' },
  { name: 'Architecture', status: 'blocked' as const, detail: 'High-level design docs for Project X pending' },
  { name: 'Security', status: 'in-progress' as const, detail: 'Awaiting Mentor Sign-off' },
];

export default function DeveloperDashboardPage() {
  const [dev, setDev] = useState<DeveloperProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    developerService.hydrateDeveloperProfile('dev-001')
      .then((profile) => {
        setDev(profile);
        trackPathEvent('dashboard_viewed');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" /></div>;
  if (!dev) return <div className="glass-card rounded-xl p-8 text-center text-secondary">No data available</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Developer Portal</h1>
          <p className="text-sm text-secondary">
            Welcome back, {dev.fullName.split(' ')[0]}. Your promotion track is {dev.readinessScore}% complete.
          </p>
        </div>
        <span className="inline-flex items-center self-start rounded-full bg-violet-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
          Active Path: {dev.practice.name}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="glass-card rounded-xl p-6">
          <h2 className="mb-4 text-sm font-semibold text-secondary">Readiness Score</h2>
          <div className="flex justify-center">
            <div className="relative">
              <ReadinessRing score={dev.readinessScore} size={180} label="READY %" />
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-secondary">
            You&apos;re <span className="font-semibold text-primary">12% ahead</span> of the average institutional pace for this level.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 p-6 text-white">
          <div className="absolute right-0 top-0 h-full w-1/3 opacity-20">
            <div className="h-full w-full rounded-l-3xl bg-gradient-to-l from-violet-500/30" />
          </div>
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-amber-300">
              <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M3 2l5 5-5 5" /></svg>
              Up Next
            </span>
            <h2 className="mt-3 text-xl font-bold leading-tight sm:text-2xl">
              Advanced System Design: High-Availability Patterns
            </h2>
            <p className="mt-2 max-w-lg text-sm text-white/70">
              Complete the case study on multi-region failover to unlock the Architecture Gate.
            </p>
            <button className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-100">
              Resume Module
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-secondary">Skill Coverage</h2>
            <button className="text-muted hover:text-primary">
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none"><path d="M2 2h4v4H2V2Zm8 0h4v4h-4V2ZM2 10h4v4H2v-4Zm8 0h4v4h-4v-4Z" stroke="currentColor" strokeWidth="1.2" /></svg>
            </button>
          </div>
          <div className="mt-2 flex justify-center">
            <SkillRadar data={radarData} size={280} />
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-secondary">Core Engineering</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">92%</span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200 dark:bg-white/10">
              <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: '92%' }} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-secondary">Critical Promotion Gates</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {gates.map((g) => (
                <PromotionGateCard key={g.name} {...g} />
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-secondary">Mentor Feedback & Activity</h2>
            <div className="space-y-3">
              <MentorFeedbackCard
                authorName="Elena Rodriguez"
                authorRole="Lead Mentor"
                content="Marcus, your recent PR for the streaming service refactor showed exceptional handling of edge cases. Let's discuss the gate blockers in our 1:1."
                timestamp={new Date(Date.now() - 7200000).toISOString()}
              />
              <div className="glass-card flex items-start gap-3 rounded-xl p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/15">
                  <svg className="h-4 w-4 text-blue-500" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2l2 2H6l2-2ZM3 6h10v1H3V6Zm1 3h8v1H4V9Zm2 3h4v1H6v-1Z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary">System Update</p>
                  <p className="mt-0.5 text-xs text-secondary">
                    New learning path available: <span className="font-semibold text-primary">Distributed Systems Masterclass</span>.
                    Recommended based on your interest in backend scale.
                  </p>
                </div>
                <span className="ml-auto whitespace-nowrap text-[11px] text-muted">5h ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <h2 className="mb-3 text-sm font-semibold text-secondary">Institutional Insight</h2>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <p className="flex-1 text-sm text-secondary leading-relaxed">
            Your growth trajectory indicates a high potential for the <span className="font-semibold text-primary">Principal Track</span>.
            Focusing on &quot;Stakeholder Influence&quot; next quarter would optimize your timeline.
          </p>
          <div className="flex gap-3">
            {[
              { value: '14', label: 'Units Done', color: 'text-violet-600 dark:text-violet-400' },
              { value: '3', label: 'To Review', color: 'text-blue-600 dark:text-blue-400' },
              { value: '1', label: 'Blocker', color: 'text-red-600 dark:text-red-400' },
            ].map((stat) => (
              <div key={stat.label} className="glass-card flex flex-col items-center rounded-lg px-5 py-3">
                <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
                <span className="mt-0.5 text-[10px] uppercase tracking-wide text-muted">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
