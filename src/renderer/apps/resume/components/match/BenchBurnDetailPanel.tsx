import { useState, memo } from 'react';
import { BenchEmployee, BenchOpenPosition, CrossMatchResult, SkillMatch } from '../../types';
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
  getSeverityBadgeClasses,
  getInitials,
  STATUS_ORDER,
  PRIORITY_LABELS,
  AI_ASSESSMENT_SECTIONS,
} from './shared/matchDetailUtils';
import FitVerdictSummary from './shared/FitVerdictSummary';

interface BenchBurnDetailPanelProps {
  match: CrossMatchResult;
  employee: BenchEmployee;
  position: BenchOpenPosition;
  onBack: () => void;
}

function SkillRow({ skill }: { skill: SkillMatch }) {
  const status = skill.years === -1 && skill.status !== 'missing' ? 'missing' : skill.status;
  return (
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusDotColor(status)}`} />
      <span className="text-sm text-primary flex-1">{skill.name}</span>
      <span className="text-xs font-mono text-muted">{skill.years === -1 ? '—' : `${skill.years}y`}</span>
      <span className={`text-xs font-medium w-16 text-center py-0.5 rounded-full ${getStatusChipClasses(status)}`}>
        {getStatusLabel(status)}
      </span>
    </div>
  );
}

const BenchBurnDetailPanel = memo(function BenchBurnDetailPanel({ match, employee, position, onBack }: BenchBurnDetailPanelProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));

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

  const highGaps = match.gaps.filter((g) => g.severity === 'high').length;
  const mediumGaps = match.gaps.filter((g) => g.severity === 'medium').length;
  const lowGaps = match.gaps.filter((g) => g.severity === 'low').length;

  const radarCandidate = {
    name: employee.name,
    scores: match.scores,
  };

  const tabs = [
    { label: 'Overview' },
    { label: 'Scores & Skills' },
    { label: 'Gap Analysis' },
    ...(match.analysis ? [{ label: 'AI Assessment' }] : []),
  ];

  const isInternalEmployee = employee.upstreamId > 0;

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
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
            {getInitials(employee.name)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-primary">{employee.name}</h2>
              {employee.isBench !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                  employee.isBench
                    ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {employee.isBench ? 'Bench' : 'Active'}
                </span>
              )}
            </div>
            <div className="text-sm text-secondary">{employee.seniority} {employee.mainSkill}</div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="glass-panel-subtle px-2 py-1 rounded-lg text-xs text-secondary">
              {employee.country}
            </span>
            {employee.grossMonthlySalary && (
              <span className="glass-panel-subtle px-2 py-1 rounded-lg text-xs text-secondary">
                {employee.salaryCurrency ?? 'USD'} {employee.grossMonthlySalary.toLocaleString()}/mo
              </span>
            )}
            {employee.lastAccount && (
              <span className="glass-panel-subtle px-2 py-1 rounded-lg text-xs text-secondary">
                Last: {employee.lastAccount}
              </span>
            )}
            {isInternalEmployee && (
              <a
                href={`https://unosquare.sharepoint.com/sites/CoE-Core/SitePages/Employees.aspx?employeeId=${employee.upstreamId}`}
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
            )}
          </div>

          <div className="flex flex-col items-center gap-1">
            <ScoreRing score={match.matchScore} size={80} />
            <span className="text-xs text-muted">Match Score</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200/20 dark:border-dark-border/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {position.account.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-primary">{match.positionLabel}</div>
              <div className="text-xs text-muted">
                {position.stakeholder && <span className="text-secondary">{position.stakeholder} · </span>}
                <span className="font-mono">OP#{match.positionUpstreamId}</span>
                {' · '}{position.coe} · {position.practice}
              </div>
            </div>
            <div className="text-xs font-mono text-muted">
              cos: {match.cosineSimilarity.toFixed(4)}
            </div>
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
                  ? 'bg-accent-50/50 dark:bg-accent-500/10 text-accent-600 dark:text-accent-400 border-b-2 border-accent-500'
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
          {match.summary && (
            <div className="glass-card p-6">
              <FitVerdictSummary summary={match.summary} fitVerdict={match.analysis?.fitVerdict} />
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="glass-card p-3">
              <div className="text-xs text-muted">Seniority</div>
              <div className="text-sm font-semibold text-primary">{employee.seniority || '—'}</div>
            </div>
            <div className="glass-card p-3">
              <div className="text-xs text-muted">Main Skill</div>
              <div className="text-sm font-semibold text-primary">{employee.mainSkill || '—'}</div>
            </div>
            <div className="glass-card p-3">
              <div className="text-xs text-muted">Country</div>
              <div className="text-sm font-semibold text-primary">{employee.country || '—'}</div>
            </div>
            <div className="glass-card p-3">
              <div className="text-xs text-muted">Account</div>
              <div className="text-sm font-semibold text-primary">{position.account}</div>
            </div>
            <div className="glass-card p-3">
              <div className="text-xs text-muted">COE / Practice</div>
              <div className="text-sm font-semibold text-primary">{position.coe} · {position.practice}</div>
            </div>
            <div className="glass-card p-3">
              <div className="text-xs text-muted">Bench</div>
              <div className="text-sm font-semibold text-primary">{employee.isBench === undefined ? '—' : employee.isBench ? 'Yes' : 'No'}</div>
            </div>
          </div>

          {position.jobDescription && (
            <div className="glass-card p-5">
              <details>
                <summary className="text-sm font-semibold text-primary cursor-pointer select-none">
                  Job Description
                </summary>
                <div className="mt-3 text-sm text-secondary leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {position.jobDescription}
                </div>
              </details>
            </div>
          )}
        </div>
      )}

      {activeTab === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-primary mb-4">Score Breakdown</h3>
              <div className="flex justify-center mb-6">
                <RadarChart candidates={[radarCandidate]} size={260} />
              </div>
              <div className="space-y-3">
                <CategoryBar label="Technical" value={match.scores.technical} description={match.scores.technicalReason || "Hard skills, frameworks, and tools match against the JD requirements"} />
                <CategoryBar label="Domain" value={match.scores.domain} description={match.scores.domainReason || "Industry knowledge and vertical experience relevant to the role"} />
                <CategoryBar label="Leadership" value={match.scores.leadership} description={match.scores.leadershipReason || "Team management, mentoring, and architectural decision-making ability"} />
                <CategoryBar label="Soft Skills" value={match.scores.softSkills} description={match.scores.softSkillsReason || "Communication, collaboration, and stakeholder interaction capabilities"} />
                <CategoryBar label="Availability" value={match.scores.availability} description={match.scores.availabilityReason || "How quickly the candidate can start based on bench status and notice period"} />
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-primary mb-4">Stack Alignment</h3>
              <div className="mb-4">
                {match.skills.length === 0 ? (
                  <p className="text-sm text-muted italic">
                    No required skills defined in this job description
                  </p>
                ) : match.skills.some(s => s.priority) ? (
                  (['required', 'nice-to-have', 'optional'] as const).map(tier => {
                    const skills = match.skills
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
                    {[...match.skills]
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
            {match.domains.length > 0 && (
              <div className="glass-card p-6">
                <h3 className="text-sm font-semibold text-primary mb-4">Domain Experience</h3>
                <div className="space-y-4">
                  {match.domains.map((domain) => (
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
            )}
          </div>
        </div>
      )}

      {activeTab === 2 && (
        <div className="space-y-4">
          {match.gaps.length > 0 ? (
            <>
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
                {match.gaps.map((gap, index) => (
                  <div key={index} className="glass-card p-4">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-primary">{gap.skill}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${getSeverityBadgeClasses(gap.severity)}`}>
                        {gap.severity}
                      </span>
                    </div>
                    <p className="text-xs text-muted">{gap.note}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="glass-card p-8 text-center">
              <p className="text-sm text-muted italic">No gaps identified for this match.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 3 && match.analysis && (
        <div className="space-y-3">
          {match.analysis.fitVerdict && (() => {
            const config = getFitVerdictConfig(match.analysis!.fitVerdict);
            return (
              <div className="space-y-3">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold text-sm ${config.classes}`}>
                  <span className="text-base">{config.icon}</span>
                  {config.label}
                </div>
                {match.analysis!.fitSummary && (
                  <div className={`p-4 rounded-xl border ${config.calloutBg}`}>
                    <p className="text-sm text-primary font-medium">{match.analysis!.fitSummary}</p>
                  </div>
                )}
              </div>
            );
          })()}

          {match.analysis.whyNotFit && (match.analysis.fitVerdict === 'partial-fit' || match.analysis.fitVerdict === 'not-a-fit') && (
            <div className="glass-card border-l-4 border-red-500">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span>🚫</span>
                  <span className="text-sm font-semibold text-primary">Why This Candidate Is NOT a Fit</span>
                </div>
                <p className="text-sm text-secondary">{match.analysis.whyNotFit}</p>
              </div>
            </div>
          )}

          {AI_ASSESSMENT_SECTIONS.map((section, index) => {
            const value = match.analysis![section.key];
            if (!value) return null;
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
                    <p className="text-sm text-secondary mt-3">{value}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default BenchBurnDetailPanel;
