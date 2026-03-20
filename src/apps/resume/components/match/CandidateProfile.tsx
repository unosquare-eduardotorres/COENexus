import { useState } from 'react';
import { MatchCandidate, SkillMatch, NonTechSkill } from '../../types';
import { formatSalary } from '../../utils/formatSalary';
import ScoreRing from './ScoreRing';
import CategoryBar from './CategoryBar';
import RadarChart from './RadarChart';
import {
  getStatusChipClasses,
  getStatusLabel,
  getStatusDotColor,
  getScoreColor,
  getConfidenceBarClass,
  getFitVerdictConfig,
  getInitials,
  STATUS_ORDER,
  PRIORITY_LABELS,
  AI_ASSESSMENT_SECTIONS,
} from './shared/matchDetailUtils';

function SkillRow({ skill }: { skill: SkillMatch }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusDotColor(skill.status)}`} />
      <span className="text-sm text-primary flex-1">{skill.name}</span>
      <span className="text-xs font-mono text-muted">{skill.years}y</span>
      <span className={`text-[10px] font-medium w-16 text-center py-0.5 rounded-full ${getStatusChipClasses(skill.status)}`}>
        {getStatusLabel(skill.status)}
      </span>
    </div>
  );
}

function isStructuredNonTech(arr: unknown[]): arr is NonTechSkill[] {
  return arr.length > 0 && typeof arr[0] === 'object' && arr[0] !== null && 'label' in arr[0];
}

interface CandidateProfileProps {
  candidate: MatchCandidate;
  onBack: () => void;
}

export default function CandidateProfile({ candidate, onBack }: CandidateProfileProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));

  const avatarGradient =
    candidate.type === 'employee'
      ? 'bg-gradient-to-br from-indigo-500 to-indigo-600'
      : 'bg-gradient-to-br from-amber-500 to-amber-600';

  const typeBadge =
    candidate.type === 'employee'
      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400';

  const tabs = [
    { label: 'Overview' },
    { label: 'Scores & Skills' },
    { label: 'Gap Analysis' },
    ...(candidate.analysis ? [{ label: 'AI Assessment' }] : []),
  ];

  const toggleCard = (index: number) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const highGaps = candidate.gaps.filter((g) => g.severity === 'high').length;
  const mediumGaps = candidate.gaps.filter((g) => g.severity === 'medium').length;
  const lowGaps = candidate.gaps.filter((g) => g.severity === 'low').length;

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted hover:text-secondary transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Results
      </button>

      <div className="glass-card border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-indigo-500/5 p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white font-semibold text-lg flex-shrink-0 ${avatarGradient}`}
          >
            {getInitials(candidate.name)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-primary">{candidate.name}</h2>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${typeBadge}`}>
                {candidate.type}
              </span>
            </div>
            <div className="text-sm text-secondary">{candidate.role}</div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="glass-panel-subtle px-2 py-1 rounded-lg text-xs text-secondary">
              {candidate.location}
            </span>
            <span className="glass-panel-subtle px-2 py-1 rounded-lg text-xs text-secondary">
              {formatSalary(candidate.expectedRate, candidate.currency)}
            </span>
            <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
              candidate.type === 'employee'
                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            }`}>
              {candidate.candidateStatus ?? candidate.type}
            </span>
            <span className="glass-panel-subtle px-2 py-1 rounded-lg text-xs text-secondary">
              {candidate.years} yrs exp
            </span>
            <a
              href={candidate.type === 'employee'
                ? `https://unosquare.sharepoint.com/sites/CoE-Core/SitePages/Employees.aspx?employeeId=${candidate.id}`
                : `https://unosquare.sharepoint.com/sites/CoE-Core/SitePages/Candidates.aspx?CandidateId=${candidate.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-panel-subtle px-2 py-1 rounded-lg text-xs text-accent-500 hover:text-accent-600 transition-colors inline-flex items-center gap-1"
              title="View in SharePoint"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              SharePoint
            </a>
          </div>

          <div className="flex flex-col items-center gap-1">
            <ScoreRing score={candidate.matchScore} size={80} />
            <span className="text-xs text-muted">Match Score</span>
          </div>
        </div>
      </div>

      <div className="glass-panel-subtle p-1 rounded-xl">
        <div className="flex gap-1">
          {tabs.map((tab, index) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(index)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === index
                  ? 'bg-white/10 text-accent border-b-2 border-accent'
                  : 'text-muted hover:text-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 0 && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <p className="text-sm text-secondary italic">{candidate.summary}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="glass-card p-3">
              <div className="text-xs text-muted">Seniority</div>
              <div className="text-sm font-semibold text-primary">{candidate.seniority}</div>
            </div>
            <div className="glass-card p-3">
              <div className="text-xs text-muted">Main Skill</div>
              <div className="text-sm font-semibold text-primary">{candidate.mainSkill}</div>
            </div>
            <div className="glass-card p-3">
              <div className="text-xs text-muted">Country</div>
              <div className="text-sm font-semibold text-primary">{candidate.country}</div>
            </div>
            <div className="glass-card p-3">
              <div className="text-xs text-muted">Expected Rate</div>
              <div className="text-sm font-semibold text-primary">{formatSalary(candidate.expectedRate, candidate.currency)}</div>
            </div>
            <div className="glass-card p-3">
              <div className="text-xs text-muted">Status</div>
              <div className="text-sm font-semibold text-primary">{candidate.candidateStatus ?? candidate.type}</div>
            </div>
            <div className="glass-card p-3">
              <div className="text-xs text-muted">Bench</div>
              <div className="text-sm font-semibold text-primary">{candidate.isBench ? 'Yes' : 'No'}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-primary mb-4">Score Breakdown</h3>
              <div className="flex justify-center mb-6">
                <RadarChart candidates={[candidate]} size={260} />
              </div>
              <div className="space-y-3">
                <CategoryBar label="Technical" value={candidate.scores.technical} description={candidate.scores.technicalReason || "Hard skills, frameworks, and tools match against the JD requirements"} />
                <CategoryBar label="Domain" value={candidate.scores.domain} description={candidate.scores.domainReason || "Industry knowledge and vertical experience relevant to the role"} />
                <CategoryBar label="Leadership" value={candidate.scores.leadership} description={candidate.scores.leadershipReason || "Team management, mentoring, and architectural decision-making ability"} />
                <CategoryBar label="Soft Skills" value={candidate.scores.softSkills} description={candidate.scores.softSkillsReason || "Communication, collaboration, and stakeholder interaction capabilities"} />
                <CategoryBar label="Availability" value={candidate.scores.availability} description={candidate.scores.availabilityReason || "How quickly the candidate can start based on bench status and notice period"} />
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-primary mb-4">Stack Alignment</h3>
              <div className="mb-4">
                {candidate.skills.length === 0 ? (
                  <p className="text-sm text-muted italic">
                    No required skills defined in this job description
                  </p>
                ) : candidate.skills.some(s => s.priority) ? (
                  (['required', 'nice-to-have', 'optional'] as const).map(tier => {
                    const skills = candidate.skills
                      .filter(s => (s.priority ?? 'required') === tier)
                      .sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99));
                    if (!skills.length) return null;
                    return (
                      <div key={tier} className="mb-4 last:mb-0">
                        <h4 className="text-xs font-medium text-secondary mb-2 uppercase tracking-wide">
                          {PRIORITY_LABELS[tier]}
                        </h4>
                        <div className="space-y-2">
                          {skills.map(skill => <SkillRow key={skill.name} skill={skill} />)}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="space-y-2">
                    {[...candidate.skills]
                      .sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99))
                      .map(skill => <SkillRow key={skill.name} skill={skill} />)}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 pt-3 border-t border-gray-200/20 dark:border-dark-border/20">
                {(['met', 'surpassed', 'partial', 'missing'] as const).map(status => (
                  <div key={status} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${getStatusDotColor(status)}`} />
                    <span className="text-xs text-muted">{getStatusLabel(status)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-primary mb-4">Domain Experience</h3>
              <div className="space-y-4">
                {candidate.domains.map((domain) => (
                  <div key={domain.name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-primary">{domain.name}</span>
                      <span className={`text-xs font-mono ${getScoreColor(domain.confidence)}`}>
                        {domain.confidence}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${getConfidenceBarClass(domain.confidence)}`}
                        style={{ width: `${domain.confidence}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted">{domain.evidence}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-primary mb-4">Leadership & Soft Skills</h3>
              {(() => {
                const hasLeadership = candidate.leadership.length > 0;
                const hasSoftSkills = candidate.softSkills.length > 0;

                if (!hasLeadership && !hasSoftSkills) {
                  return (
                    <p className="text-sm text-muted italic">
                      No leadership or soft skill requirements defined
                    </p>
                  );
                }

                const renderNonTechSection = (title: string, items: string[] | NonTechSkill[]) => {
                  if (!items.length) return null;

                  if (isStructuredNonTech(items)) {
                    const hasPriorities = items.some(i => i.priority);
                    if (hasPriorities) {
                      return (
                        <div className="mb-4 last:mb-0">
                          <h4 className="text-xs font-medium text-secondary mb-2">{title}</h4>
                          {(['required', 'nice-to-have', 'optional'] as const).map(tier => {
                            const tierItems = items.filter(i => i.priority === tier)
                              .sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99));
                            if (!tierItems.length) return null;
                            return (
                              <div key={tier} className="mb-3 last:mb-0">
                                <span className="text-[10px] uppercase tracking-wide text-muted">{PRIORITY_LABELS[tier]}</span>
                                <ul className="space-y-1.5 mt-1">
                                  {tierItems.map((item, idx) => (
                                    <li key={idx} className="flex items-center gap-2">
                                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusDotColor(item.status)}`} />
                                      <span className="text-xs text-muted flex-1">{item.label}</span>
                                      <span className={`text-[10px] font-medium w-16 text-center py-0.5 rounded-full ${getStatusChipClasses(item.status)}`}>
                                        {getStatusLabel(item.status)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                    return (
                      <div className="mb-4 last:mb-0">
                        <h4 className="text-xs font-medium text-secondary mb-2">{title}</h4>
                        <ul className="space-y-1.5">
                          {[...items]
                            .sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99))
                            .map((item, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusDotColor(item.status)}`} />
                              <span className="text-xs text-muted flex-1">{item.label}</span>
                              <span className={`text-[10px] font-medium w-16 text-center py-0.5 rounded-full ${getStatusChipClasses(item.status)}`}>
                                {getStatusLabel(item.status)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  }

                  return (
                    <div className="mb-4 last:mb-0">
                      <h4 className="text-xs font-medium text-secondary mb-2">{title}</h4>
                      <ul className="space-y-1.5">
                        {(items as string[]).map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                            <span className="text-xs text-muted">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                };

                return (
                  <>
                    {renderNonTechSection('Leadership', candidate.leadership)}
                    {renderNonTechSection('Soft Skills', candidate.softSkills)}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {activeTab === 2 && (
        <div className="space-y-4">
          <div className="flex gap-3 mb-4">
            <span className="glass-panel-subtle px-3 py-1.5 rounded-lg text-xs font-medium text-red-500">
              {highGaps} High
            </span>
            <span className="glass-panel-subtle px-3 py-1.5 rounded-lg text-xs font-medium text-amber-500">
              {mediumGaps} Medium
            </span>
            <span className="glass-panel-subtle px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-500">
              {lowGaps} Low
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {candidate.gaps.map((gap, index) => (
              <div key={index} className="glass-card p-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-primary">{gap.skill}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      gap.severity === 'high'
                        ? 'bg-red-500/10 text-red-500'
                        : gap.severity === 'medium'
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-emerald-500/10 text-emerald-500'
                    }`}
                  >
                    {gap.severity}
                  </span>
                </div>
                <p className="text-xs text-muted">{gap.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 3 && candidate.analysis && (
        <div className="space-y-3">
          {candidate.analysis.fitVerdict && (() => {
            const config = getFitVerdictConfig(candidate.analysis!.fitVerdict);
            return (
              <div className="space-y-3">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold text-sm ${config.classes}`}>
                  <span className="text-base">{config.icon}</span>
                  {config.label}
                </div>
                {candidate.analysis!.fitSummary && (
                  <div className={`p-4 rounded-xl border ${config.calloutBg}`}>
                    <p className="text-sm text-primary font-medium">{candidate.analysis!.fitSummary}</p>
                  </div>
                )}
              </div>
            );
          })()}

          {candidate.analysis.whyNotFit && (candidate.analysis.fitVerdict === 'partial-fit' || candidate.analysis.fitVerdict === 'not-a-fit') && (
            <div className="glass-card border-l-4 border-red-500">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span>🚫</span>
                  <span className="text-sm font-semibold text-primary">Why This Candidate Is NOT a Fit</span>
                </div>
                <p className="text-sm text-secondary">{candidate.analysis.whyNotFit}</p>
              </div>
            </div>
          )}

          {AI_ASSESSMENT_SECTIONS.map((section, index) => {
            const isExpanded = expandedCards.has(index);
            return (
              <div key={section.key} className={`glass-card border-l-4 ${section.borderColor}`}>
                <button
                  onClick={() => toggleCard(index)}
                  className="flex items-center justify-between w-full p-4"
                >
                  <div className="flex items-center gap-2">
                    <span>{section.icon}</span>
                    <span className="text-sm font-semibold text-primary">{section.title}</span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-secondary mt-3">{candidate.analysis![section.key]}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
