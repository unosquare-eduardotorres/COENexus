import { useState } from 'react';
import type { CoeUnit, Practice, MainSkill, SkillDomain } from '../types';

interface TaxonomyBrowserProps {
  coeUnits: CoeUnit[];
  allPractices: Practice[];
  mainSkillsList: MainSkill[];
  allDomains: SkillDomain[];
  initialExpandedCoe?: string | null;
}

export default function TaxonomyBrowser({ coeUnits, allPractices, mainSkillsList, allDomains, initialExpandedCoe = null }: TaxonomyBrowserProps) {
  const [expandedCoe, setExpandedCoe] = useState<string | null>(initialExpandedCoe);
  const [expandedPractice, setExpandedPractice] = useState<string | null>(null);

  return (
    <div className="glass-panel rounded-xl p-6">
      <h2 className="text-sm font-semibold text-primary mb-4">Skill Taxonomy Browser</h2>
      <div className="space-y-1">
        {coeUnits.map((coe) => {
          const coePractices = allPractices.filter((p) => p.coeId === coe.id);
          const isExpanded = expandedCoe === coe.id;
          return (
            <div key={coe.id}>
              <button
                onClick={() => setExpandedCoe(isExpanded ? null : coe.id)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-primary hover:bg-violet-500/5"
              >
                <svg className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} viewBox="0 0 12 12" fill="currentColor"><path d="M4 2l4 4-4 4" /></svg>
                {coe.name}
              </button>
              {isExpanded && (
                <div className="ml-5 space-y-1">
                  {coePractices.map((practice) => {
                    const pSkills = mainSkillsList.filter((s) => s.practiceId === practice.id);
                    const isPracticeExpanded = expandedPractice === practice.id;
                    return (
                      <div key={practice.id}>
                        <button
                          onClick={() => setExpandedPractice(isPracticeExpanded ? null : practice.id)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-secondary hover:text-primary hover:bg-violet-500/5"
                        >
                          <svg className={`h-3 w-3 transition-transform ${isPracticeExpanded ? 'rotate-90' : ''}`} viewBox="0 0 12 12" fill="currentColor"><path d="M4 2l4 4-4 4" /></svg>
                          {practice.name}
                        </button>
                        {isPracticeExpanded && (
                          <div className="ml-5 space-y-1">
                            {pSkills.map((skill) => {
                              const domains = allDomains.filter((d) => d.mainSkillId === skill.id);
                              return (
                                <div key={skill.id} className="rounded-lg px-3 py-1.5">
                                  <p className="text-xs font-medium text-primary">{skill.name}</p>
                                  {domains.length > 0 && (
                                    <div className="ml-3 mt-1 space-y-0.5">
                                      {domains.map((d) => (
                                        <div key={d.id} className="flex items-center gap-2">
                                          <span className={`h-1.5 w-1.5 rounded-full ${d.isCoreGate ? 'bg-violet-500' : 'bg-gray-300 dark:bg-white/20'}`} />
                                          <span className="text-[11px] text-muted">{d.name}</span>
                                          {d.isCoreGate && <span className="text-[9px] text-violet-600 dark:text-violet-400">Core Gate</span>}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
