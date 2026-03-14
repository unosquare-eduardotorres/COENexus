import { useState } from 'react';
import { MatchCandidate, SonnetAnalysis } from '../../types';
import ScoreRing from './ScoreRing';
import CategoryBar from './CategoryBar';
import RadarChart from './RadarChart';

interface CandidateProfileProps {
  candidate: MatchCandidate;
  onBack: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

function getScoreColor(score: number): string {
  if (score >= 85) return 'text-emerald-500';
  if (score >= 70) return 'text-amber-500';
  return 'text-red-500';
}

function getConfidenceBarClass(confidence: number): string {
  if (confidence >= 85) return 'bg-emerald-500';
  if (confidence >= 70) return 'bg-amber-500';
  return 'bg-red-500';
}

const AI_ASSESSMENT_SECTIONS: { key: keyof SonnetAnalysis; title: string; icon: string; borderColor: string }[] = [
  { key: 'whyRightFit', title: 'Why This Candidate Is the Right Fit', icon: '🎯', borderColor: 'border-emerald-500' },
  { key: 'immediateValue', title: 'Immediate Value to the Team', icon: '⚡', borderColor: 'border-blue-500' },
  { key: 'rampUpEstimate', title: 'Ramp-Up Time Estimate', icon: '⏱️', borderColor: 'border-indigo-500' },
  { key: 'riskFactors', title: 'Risk Factors & Mitigation', icon: '⚠️', borderColor: 'border-amber-500' },
  { key: 'beyondJd', title: 'Beyond the Job Description', icon: '💎', borderColor: 'border-purple-500' },
  { key: 'leadershipDynamics', title: 'Leadership & Team Dynamics', icon: '👥', borderColor: 'border-teal-500' },
  { key: 'industryDepth', title: 'Industry & Domain Depth', icon: '🏥', borderColor: 'border-cyan-500' },
  { key: 'trackRecord', title: 'Track Record & Proof Points', icon: '📊', borderColor: 'border-violet-500' },
  { key: 'culturalFit', title: 'Cultural & Work Style Compatibility', icon: '🌍', borderColor: 'border-rose-500' },
  { key: 'retentionPotential', title: 'Retention & Long-Term Potential', icon: '🔒', borderColor: 'border-sky-500' },
];

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

          <div className="flex flex-wrap gap-2">
            <span className="glass-panel-subtle px-2 py-1 rounded-lg text-xs text-secondary">
              {candidate.location}
            </span>
            <span className="glass-panel-subtle px-2 py-1 rounded-lg text-xs text-secondary">
              {candidate.salary}
            </span>
            <span className="glass-panel-subtle px-2 py-1 rounded-lg text-xs text-secondary">
              {candidate.availability}
            </span>
            <span className="glass-panel-subtle px-2 py-1 rounded-lg text-xs text-secondary">
              {candidate.years} yrs exp
            </span>
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
              <div className="text-sm font-semibold text-primary">{candidate.expectedRate}</div>
            </div>
            <div className="glass-card p-3">
              <div className="text-xs text-muted">Currency</div>
              <div className="text-sm font-semibold text-primary">{candidate.currency}</div>
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
                <CategoryBar label="Technical" value={candidate.scores.technical} description="Hard skills, frameworks, and tools match against the JD requirements" />
                <CategoryBar label="Domain" value={candidate.scores.domain} description="Industry knowledge and vertical experience relevant to the role" />
                <CategoryBar label="Leadership" value={candidate.scores.leadership} description="Team management, mentoring, and architectural decision-making ability" />
                <CategoryBar label="Soft Skills" value={candidate.scores.softSkills} description="Communication, collaboration, and stakeholder interaction capabilities" />
                <CategoryBar label="Availability" value={candidate.scores.availability} description="How quickly the candidate can start based on bench status and notice period" />
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-primary mb-4">Stack Alignment</h3>
              <div className="space-y-2 mb-4">
                {candidate.skills.map((skill) => (
                  <div key={skill.name} className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        skill.status === 'match'
                          ? 'bg-emerald-500'
                          : skill.status === 'partial'
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                      }`}
                    />
                    <span className="text-sm text-primary flex-1">{skill.name}</span>
                    <span className="text-xs font-mono text-muted">{skill.years}y</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 pt-3 border-t border-gray-200/20 dark:border-dark-border/20">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-muted">Match</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs text-muted">Partial</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-xs text-muted">Missing</span>
                </div>
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
              <div className="mb-4">
                <h4 className="text-xs font-medium text-secondary mb-2">Leadership</h4>
                <ul className="space-y-1.5">
                  {candidate.leadership.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                      <span className="text-xs text-muted">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs font-medium text-secondary mb-2">Soft Skills</h4>
                <ul className="space-y-1.5">
                  {candidate.softSkills.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                      <span className="text-xs text-muted">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
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
