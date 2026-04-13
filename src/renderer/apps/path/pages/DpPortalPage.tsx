import { useState, useEffect } from 'react';
import { developerService, learningPathService } from '../services';
import type { DeveloperProfile, CareerLadder } from '../types';
import ReadinessRing from '../components/ReadinessRing';
import SkillRadar from '../components/SkillRadar';
import PromotionGateCard from '../components/PromotionGateCard';

const radarData = [
  { label: 'Backend', value: 78 },
  { label: 'Architecture', value: 84 },
  { label: 'Design', value: 65 },
  { label: 'Testing', value: 72 },
  { label: 'Security', value: 58 },
  { label: 'Leadership', value: 45 },
];

const targetData = [
  { label: 'Backend', value: 90 },
  { label: 'Architecture', value: 90 },
  { label: 'Design', value: 85 },
  { label: 'Testing', value: 85 },
  { label: 'Security', value: 80 },
  { label: 'Leadership', value: 75 },
];

export default function DpPortalPage() {
  const [dev, setDev] = useState<DeveloperProfile | null>(null);
  const [ladder, setLadder] = useState<CareerLadder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      developerService.hydrateDeveloperProfile('dev-001'),
      learningPathService.listLearningPaths(),
    ])
      .then(([profile, ladders]) => {
        setDev(profile);
        setLadder(ladders[0] ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" /></div>;
  if (!dev) return <div className="glass-card rounded-xl p-8 text-center text-secondary">No data available</div>;

  const devGates = dev.gateStatuses ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Development Portal</h1>
          <p className="text-sm text-secondary">
            Deep analytical overview of your progression towards{' '}
            <span className="font-semibold text-violet-600 dark:text-violet-400">{dev.targetLevel}</span> elevation.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/15">
            <span className="text-xs font-bold text-violet-600 dark:text-violet-300">
              {dev.fullName.split(' ').map((w) => w[0]).join('')}
            </span>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-primary">{dev.fullName}</p>
            <p className="text-[11px] text-muted">{dev.currentLevel} Software Engineer</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-secondary">Promotion Readiness</h2>
          <div className="mt-4 flex justify-center">
            <div className="relative">
              <ReadinessRing score={dev.readinessScore} size={180} label="READY" />
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-secondary">
            You are <span className="font-semibold text-primary">12 deliverables</span> away from the next tier assessment.
          </p>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-secondary">Skill Proficiency Matrix</h2>
              <p className="mt-0.5 text-sm font-medium text-primary">Comprehensive Competency Analysis</p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />Current</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full border border-dashed border-cyan-400" />Target {dev.targetLevel}</span>
            </div>
          </div>
          <div className="mt-2 flex justify-center">
            <SkillRadar data={radarData} comparison={targetData} size={260} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-secondary">Promotion Gates</h2>
          <div className="space-y-3">
            {devGates.map((g) => (
              <PromotionGateCard
                key={g.id}
                name={g.gateId.replace('gate-', '').replace(/^\w/, (c) => c.toUpperCase())}
                status={g.status}
                detail={g.detail}
                verifiedBy={g.verifiedBy}
              />
            ))}
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-secondary">Learning Intensity</h2>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="glass-card rounded-lg p-3">
              <p className="text-lg font-bold text-primary">24h</p>
              <p className="text-[10px] uppercase tracking-wide text-muted">This Week</p>
            </div>
            <div className="glass-card rounded-lg p-3">
              <p className="text-lg font-bold text-primary">15</p>
              <p className="text-[10px] uppercase tracking-wide text-muted">PRs Merged</p>
            </div>
            <div className="glass-card rounded-lg p-3">
              <p className="text-lg font-bold text-primary">8</p>
              <p className="text-[10px] uppercase tracking-wide text-muted">Courses</p>
            </div>
          </div>
        </div>
      </div>

      {ladder && (
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-secondary">Career Path</h2>
          <p className="mt-1 text-sm text-primary">{ladder.fromLevel} → {ladder.toLevel}: {ladder.description}</p>
          <div className="mt-4 flex items-center gap-4">
            <div className="h-1.5 flex-1 rounded-full bg-gray-200 dark:bg-white/10">
              <div className="h-1.5 rounded-full bg-violet-500" style={{ width: `${dev.readinessScore}%` }} />
            </div>
            <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">{dev.readinessScore}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
