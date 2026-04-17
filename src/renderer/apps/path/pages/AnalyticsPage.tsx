import { useState, useEffect } from 'react';
import { adminService } from '../services';
import type { OrgAnalytics, PromotionVelocityDataPoint, AtRiskCandidate } from '../types';
import PromotionVelocityChart from '../components/PromotionVelocityChart';
import SkillRadar from '../components/SkillRadar';
import AssessmentQueueList from '../components/AssessmentQueueList';
import { trackPathEvent } from '../services/pathAnalytics';

const radarData = [
  { label: 'Backend', value: 75 },
  { label: 'Architecture', value: 68 },
  { label: 'Security', value: 55 },
  { label: 'Design', value: 62 },
  { label: 'Testing', value: 72 },
  { label: 'Leadership', value: 48 },
];

const cohortData = [
  { label: 'Backend', value: 82 },
  { label: 'Architecture', value: 76 },
  { label: 'Security', value: 64 },
  { label: 'Design', value: 70 },
  { label: 'Testing', value: 78 },
  { label: 'Leadership', value: 55 },
];

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<OrgAnalytics | null>(null);
  const [velocity, setVelocity] = useState<PromotionVelocityDataPoint[]>([]);
  const [atRisk, setAtRisk] = useState<AtRiskCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trackPathEvent('dashboard_viewed', { page: 'analytics' });
    Promise.all([
      adminService.getOrgAnalytics(),
      adminService.getPromotionVelocity(),
      adminService.getAtRiskCandidates(),
    ])
      .then(([org, vel, risk]) => {
        setAnalytics(org);
        setVelocity(vel);
        setAtRisk(risk);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" /></div>;
  if (!analytics) return <div className="glass-card rounded-xl p-8 text-center text-secondary">No data available</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">COE Intelligence Summary</h1>
          <p className="mt-1 text-sm text-secondary">
            Analyzing 1,420 developers across 14 global centers. Promotion velocity is up 12% following the Q3 Skill Taxonomy update.
          </p>
        </div>
        <div className="flex gap-2 self-start">
          <button className="glass-button rounded-xl px-4 py-2 text-sm font-medium text-secondary hover:text-primary">
            Export Dataset
          </button>
          <button className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700">
            Generate Quarterly Report
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-primary">Organization-wide Promotion Velocity</h2>
              <p className="text-xs text-muted">Rolling 12 Month Trajectory</p>
            </div>
          </div>
          <div className="mt-4">
            <PromotionVelocityChart data={velocity} />
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div>
            <h2 className="text-sm font-semibold text-primary">Skill Taxonomy</h2>
            <p className="text-xs text-muted">Aggregated Mastery</p>
          </div>
          <div className="mt-2 flex justify-center">
            <SkillRadar data={radarData} comparison={cohortData} size={240} />
          </div>
          <div className="mt-2 flex items-center justify-center gap-4 text-[11px]">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#3bbffa]" />Org Mean</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full border border-dashed border-[#62fae3]" />Current Cohort</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-primary">Promotion Pipeline Status</h2>
              <p className="text-xs text-muted">Flow from learning to dossier finalization</p>
            </div>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">84% <span className="text-xs font-normal text-muted">Success Rate</span></span>
          </div>
          <div className="mt-4 space-y-3">
            {[
              { num: '01', label: 'Learning Path', count: 642, suffix: 'Active', color: 'bg-blue-500' },
              { num: '02', label: 'Assessment', count: 218, suffix: 'Queued', color: 'bg-violet-500' },
              { num: '03', label: 'Dossier Review', count: 45, suffix: 'Pending', color: 'bg-emerald-500' },
            ].map((stage) => (
              <div key={stage.num} className="flex items-center gap-3">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${stage.color} text-xs font-bold text-white`}>
                  {stage.num}
                </span>
                <div className="flex-1">
                  <div className="h-8 rounded-lg bg-gray-200/50 dark:bg-white/10 relative overflow-hidden">
                    <div
                      className={`h-full rounded-lg ${stage.color}/80 flex items-center px-3`}
                      style={{ width: `${(stage.count / 642) * 100}%` }}
                    >
                      <span className="text-xs font-semibold text-white">{stage.label}</span>
                    </div>
                  </div>
                </div>
                <span className="text-sm font-bold text-primary">{stage.count}</span>
                <span className="text-xs text-muted uppercase">{stage.suffix}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-primary">Assessment Queue Summary</h2>
            <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-[10px] font-bold uppercase text-red-600 dark:text-red-400">
              High Priority
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="glass-card rounded-lg p-3 text-center">
              <p className="text-xs uppercase tracking-wide text-muted">Total Pending</p>
              <p className="text-2xl font-bold text-primary">{analytics.assessmentQueue.pending + analytics.assessmentQueue.inProgress}</p>
            </div>
            <div className="glass-card rounded-lg p-3 text-center">
              <p className="text-xs uppercase tracking-wide text-muted">Avg Wait Time</p>
              <p className="text-2xl font-bold text-primary">4.2d</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-secondary">Nearing Band Limits (At-Risk)</p>
            <AssessmentQueueList candidates={atRisk} />
          </div>
        </div>
      </div>
    </div>
  );
}
