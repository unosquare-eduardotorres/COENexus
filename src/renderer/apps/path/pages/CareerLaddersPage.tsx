import { useState, useEffect } from 'react';
import { assessmentService, developerService } from '../services';
import { trackPathEvent } from '../services/pathAnalytics';
import type { PromotionDossier, DeveloperProfile } from '../types';
import SkillRadar from '../components/SkillRadar';
import ConsistencyChart from '../components/ConsistencyChart';

const candidateRadar = [
  { label: 'Architecture', value: 88 },
  { label: 'Craft', value: 84 },
  { label: 'Admin', value: 72 },
  { label: 'Culture', value: 78 },
];

const benchmarkRadar = [
  { label: 'Architecture', value: 85 },
  { label: 'Craft', value: 85 },
  { label: 'Admin', value: 85 },
  { label: 'Culture', value: 85 },
];

const consistencyData = [
  { month: 'Oct', value: 28 },
  { month: 'Nov', value: 32 },
  { month: 'Dec', value: 30 },
  { month: 'Jan', value: 34 },
  { month: 'Feb', value: 31 },
  { month: 'Mar', value: 33 },
];

const stages = [
  { label: 'Theoretical Interview', type: 'External', outcome: 'Exceeds', outcomeCls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', desc: 'System architecture and distributed computing evaluation.' },
  { label: 'Code Challenge', type: 'Internal', outcome: 'Met', outcomeCls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', desc: 'Scale-heavy algorithmic implementation.' },
  { label: 'Defense Session', type: 'Panel', outcome: 'Notes Available', outcomeCls: 'bg-blue-500/15 text-blue-600 dark:text-blue-400', desc: 'Portfolio review and cultural leadership impact assessment.' },
];

export default function CareerLaddersPage() {
  const [dossier, setDossier] = useState<PromotionDossier | null>(null);
  const [dev, setDev] = useState<DeveloperProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [rationale, setRationale] = useState('');

  useEffect(() => {
    let cancelled = false;
    assessmentService.getDossierById('dossier-001')
      .then((d) => {
        setDossier(d);
        if (cancelled) return null;
        if (d) return developerService.getDeveloperById(d.developerId);
        return null;
      })
      .then((profile) => {
        if (cancelled) return;
        if (profile) setDev(profile);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDecision = (decision: string) => {
    trackPathEvent('decision_submitted', { decision });
  };

  if (loading) return <div className="flex items-center justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" /></div>;
  if (!dossier || !dev) return <div className="glass-card rounded-xl p-8 text-center text-secondary">No data available</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold text-primary">Dossier Revision</h1>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/15 text-xl font-bold text-violet-600 dark:text-violet-300">
            {dev.fullName.split(' ').map((w) => w[0]).join('')}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-primary">{dev.fullName}</h2>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-white/15 dark:text-gray-300">
                {dev.currentLevel}
              </span>
              <svg className="h-4 w-4 text-muted" viewBox="0 0 16 16" fill="none"><path d="M4 8h8M9 5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-300">
                Target: {dev.targetLevel}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase text-muted">Last Updated</p>
          <p className="text-sm font-medium text-primary">{dossier.decidedAt ? new Date(dossier.decidedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stages.map((s) => (
          <div key={s.label} className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                <svg className="h-4 w-4 text-violet-600 dark:text-violet-400" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" /></svg>
              </div>
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600 dark:bg-white/15 dark:text-gray-400">{s.type}</span>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-primary">{s.label}</h3>
            <p className="mt-1 text-xs text-secondary">{s.desc}</p>
            <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${s.outcomeCls}`}>
              {s.outcome}
            </span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-secondary">Narrative Recap</h2>
          <div className="mt-4 space-y-4">
            {dossier.narratives?.map((n) => (
              <div key={n.id}>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-bold text-violet-600 dark:text-violet-300">
                    {n.authorName.split(' ').map((w) => w[0]).join('')}
                  </div>
                  <span className="text-xs font-semibold text-primary">{n.authorName}</span>
                  <span className="text-[10px] uppercase text-muted">{n.authorRole.replace('-', ' ')}</span>
                </div>
                <p className="mt-2 text-sm italic text-secondary leading-relaxed">&quot;{n.content}&quot;</p>
              </div>
            ))}
          </div>
          {dossier.recommendation && (
            <div className="mt-4 rounded-lg bg-emerald-500/10 p-4">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Final Recommendation</p>
              <p className="mt-1 text-sm text-secondary">{dossier.recommendation}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="glass-card rounded-xl p-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-secondary">Skill Analysis</h2>
            <div className="mt-2 flex justify-center">
              <SkillRadar data={candidateRadar} comparison={benchmarkRadar} size={220} maxValue={100} />
            </div>
            <div className="mt-2 flex items-center justify-center gap-4 text-[11px]">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#3bbffa]" />Candidate {dossier.overallReadiness}%</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full border border-dashed border-[#62fae3]" />L6 Benchmark 85%</span>
            </div>
          </div>

          <div className="glass-card rounded-xl p-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-secondary">Consistency Analysis</h2>
            <ConsistencyChart data={consistencyData} avgVelocity={String(dossier.avgVelocity)} />
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-secondary">Rationale for Decision</h2>
        <textarea
          className="glass-input mt-3 w-full rounded-lg px-3 py-3 text-sm"
          rows={3}
          placeholder="Explain the key factor behind your decision..."
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
        />
        <div className="mt-4 flex items-center justify-end gap-3">
          <button
            onClick={() => handleDecision('defer')}
            className="glass-button rounded-xl px-5 py-2.5 text-sm font-medium text-secondary hover:text-primary"
          >
            Defer
          </button>
          <button
            onClick={() => handleDecision('conditional')}
            className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
          >
            Conditional
          </button>
          <button
            onClick={() => handleDecision('approve')}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
          >
            Approve Promotion
          </button>
        </div>
      </div>
    </div>
  );
}
