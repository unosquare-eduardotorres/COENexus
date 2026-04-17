import { useState, useEffect } from 'react';
import { learningPathService } from '../services';
import { seniorityLevels as fallbackLevels, coeUnits as fallbackCoeUnits } from '../data';
import type { SeniorityLevel, CoeUnit, Practice, MainSkill, SkillDomain } from '../types';
import TaxonomyBrowser from '../components/TaxonomyBrowser';
import { trackPathEvent } from '../services/pathAnalytics';

export default function SkillTaxonomyPage() {
  const [seniorityLevels, setSeniorityLevels] = useState<SeniorityLevel[]>([]);
  const [coeUnits, setCoeUnits] = useState<CoeUnit[]>([]);
  const [allPractices, setAllPractices] = useState<Practice[]>([]);
  const [mainSkillsList, setMainSkillsList] = useState<MainSkill[]>([]);
  const [allDomains, setAllDomains] = useState<SkillDomain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trackPathEvent('dashboard_viewed', { page: 'skill_taxonomy' });
    Promise.all([
      learningPathService.getLearningPathBundle(),
      learningPathService.listSkillDomains(),
      learningPathService.listMainSkills(),
      learningPathService.listPractices(),
    ])
      .then(([_bundle, domains, skills, practices]) => {
        setSeniorityLevels(fallbackLevels);
        setCoeUnits(fallbackCoeUnits);
        setAllPractices(practices);
        setMainSkillsList(skills);
        setAllDomains(domains);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">PATH Settings</h1>
          <p className="text-sm text-secondary">Manage career ladders, skill taxonomy, and system configuration.</p>
        </div>
        <button className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700">
          Seed Demo Data
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel rounded-xl p-6">
          <h2 className="text-sm font-semibold text-primary mb-4">Career Ladder (Seniority Levels)</h2>
          <div className="space-y-2">
            {seniorityLevels.map((level) => (
              <div key={level.id} className="glass-card flex items-center justify-between rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-primary">{level.name}</p>
                  <p className="text-[11px] text-muted">Order: {level.displayOrder} {level.country ? `\u2022 ${level.country}` : ''}</p>
                </div>
                <div className="flex gap-1">
                  <button className="glass-button rounded-lg px-2 py-1 text-xs text-muted hover:text-primary">Edit</button>
                  <button className="glass-button rounded-lg px-2 py-1 text-xs text-red-500 hover:text-red-600">Remove</button>
                </div>
              </div>
            ))}
            <button className="glass-button flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-2.5 text-sm text-muted hover:text-primary dark:border-white/20">
              <span>+</span> Add Level
            </button>
          </div>
        </div>

        <TaxonomyBrowser
          coeUnits={coeUnits}
          allPractices={allPractices}
          mainSkillsList={mainSkillsList}
          allDomains={allDomains}
          initialExpandedCoe={fallbackCoeUnits[0]?.id ?? null}
        />
      </div>
    </div>
  );
}
