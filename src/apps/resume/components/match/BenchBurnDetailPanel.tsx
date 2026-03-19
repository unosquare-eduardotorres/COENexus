import { BenchEmployee, BenchOpenPosition, CrossMatchResult } from '../../types';
import ScoreRing from './ScoreRing';
import CategoryBar from './CategoryBar';

interface BenchBurnDetailPanelProps {
  match: CrossMatchResult;
  employee: BenchEmployee;
  position: BenchOpenPosition;
  onBack: () => void;
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    high: 'bg-red-500/10 text-red-600 dark:text-red-400',
    medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    low: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded-md ${colors[severity] ?? colors.low}`}>
      {severity}
    </span>
  );
}

function SkillStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    surpassed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    met: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    partial: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    missing: 'bg-red-500/10 text-red-600 dark:text-red-400',
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded-md ${colors[status] ?? 'bg-gray-500/10 text-gray-500'}`}>
      {status}
    </span>
  );
}

export default function BenchBurnDetailPanel({ match, employee, position, onBack }: BenchBurnDetailPanelProps) {
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

      <div className="glass-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold">
              {employee.name.charAt(0)}
            </div>
            <div>
              <div className="font-semibold text-primary">{employee.name}</div>
              <div className="text-xs text-muted">{employee.seniority} · {employee.mainSkill} · {employee.country}</div>
            </div>
          </div>

          <ScoreRing score={match.matchScore} size={64} />

          <div className="flex items-center gap-3 flex-1 justify-end text-right">
            <div>
              <div className="font-semibold text-primary">{match.positionLabel}</div>
              <div className="text-xs text-muted">{position.coe} · {position.practice}</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
              {position.account.charAt(0)}
            </div>
          </div>
        </div>

        <div className="text-xs font-mono text-muted mb-2 text-center">
          Cosine similarity: {match.cosineSimilarity.toFixed(4)}
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-primary mb-3">Score Breakdown</h3>
        <div className="space-y-2.5">
          <CategoryBar label="Technical" value={match.scores.technical} tooltip="Technical skill alignment" />
          <CategoryBar label="Domain" value={match.scores.domain} tooltip="Industry/domain experience" />
          <CategoryBar label="Leadership" value={match.scores.leadership} tooltip="Leadership & management" />
          <CategoryBar label="Soft Skills" value={match.scores.softSkills} tooltip="Communication & teamwork" />
          <CategoryBar label="Availability" value={match.scores.availability} tooltip="Readiness to start" />
        </div>
      </div>

      {match.analysis && (
        <>
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-primary mb-3">Why This Fit</h3>
            <div className="space-y-4 text-sm text-secondary leading-relaxed">
              {match.analysis.whyRightFit && (
                <div>
                  <h4 className="text-xs font-semibold text-accent-500 mb-1">Why Right Fit</h4>
                  <p>{match.analysis.whyRightFit}</p>
                </div>
              )}
              {match.analysis.immediateValue && (
                <div>
                  <h4 className="text-xs font-semibold text-emerald-500 mb-1">Immediate Value</h4>
                  <p>{match.analysis.immediateValue}</p>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-primary mb-3">Risk & Ramp-Up</h3>
            <div className="space-y-4 text-sm text-secondary leading-relaxed">
              {match.analysis.rampUpEstimate && (
                <div>
                  <h4 className="text-xs font-semibold text-amber-500 mb-1">Ramp-Up Estimate</h4>
                  <p>{match.analysis.rampUpEstimate}</p>
                </div>
              )}
              {match.analysis.riskFactors && (
                <div>
                  <h4 className="text-xs font-semibold text-red-500 mb-1">Risk Factors</h4>
                  <p>{match.analysis.riskFactors}</p>
                </div>
              )}
            </div>
          </div>

          {(match.analysis.beyondJd || match.analysis.trackRecord || match.analysis.culturalFit) && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-primary mb-3">Additional Insights</h3>
              <div className="space-y-4 text-sm text-secondary leading-relaxed">
                {match.analysis.beyondJd && (
                  <div>
                    <h4 className="text-xs font-semibold text-violet-500 mb-1">Beyond the JD</h4>
                    <p>{match.analysis.beyondJd}</p>
                  </div>
                )}
                {match.analysis.trackRecord && (
                  <div>
                    <h4 className="text-xs font-semibold text-blue-500 mb-1">Track Record</h4>
                    <p>{match.analysis.trackRecord}</p>
                  </div>
                )}
                {match.analysis.culturalFit && (
                  <div>
                    <h4 className="text-xs font-semibold text-pink-500 mb-1">Cultural Fit</h4>
                    <p>{match.analysis.culturalFit}</p>
                  </div>
                )}
                {match.analysis.retentionPotential && (
                  <div>
                    <h4 className="text-xs font-semibold text-teal-500 mb-1">Retention Potential</h4>
                    <p>{match.analysis.retentionPotential}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {match.skills.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-primary mb-3">Skills Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200/30 dark:border-dark-border/30">
                  <th className="text-left py-2 px-2 text-xs font-medium text-muted">Skill</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-muted">Status</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-muted">Years</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-muted">Priority</th>
                </tr>
              </thead>
              <tbody>
                {match.skills.map((skill, i) => (
                  <tr key={i} className="border-b border-gray-100/10 dark:border-dark-border/10">
                    <td className="py-2 px-2 text-primary">{skill.name}</td>
                    <td className="py-2 px-2"><SkillStatusBadge status={skill.status} /></td>
                    <td className="py-2 px-2 text-right font-mono text-muted">{skill.years}y</td>
                    <td className="py-2 px-2 text-xs text-muted capitalize">{skill.priority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {match.gaps.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-primary mb-3">Gap Analysis</h3>
          <div className="space-y-2">
            {match.gaps.map((gap, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                <SeverityBadge severity={gap.severity} />
                <div>
                  <div className="text-sm font-medium text-primary">{gap.skill}</div>
                  <div className="text-xs text-muted mt-0.5">{gap.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {match.domains.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-primary mb-3">Domain Experience</h3>
          <div className="space-y-2">
            {match.domains.map((domain, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                <div className="flex-1">
                  <div className="text-sm font-medium text-primary">{domain.name}</div>
                  <div className="text-xs text-muted">{domain.evidence}</div>
                </div>
                <div className="text-xs font-mono text-accent-500">{domain.confidence}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {match.summary && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-primary mb-2">Executive Summary</h3>
          <p className="text-sm text-secondary leading-relaxed">{match.summary}</p>
        </div>
      )}
    </div>
  );
}
