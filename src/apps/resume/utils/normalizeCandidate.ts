import { MatchCandidate, SkillMatchStatus, NonTechSkill } from '../types';

function normalizeStatus(status: string, years?: number): SkillMatchStatus {
  if (status === 'match') return 'met';
  if (years === -1 && (status === 'partial' || status === 'met' || status === 'surpassed')) return 'missing';
  return status as SkillMatchStatus;
}

function isStructuredNonTech(arr: unknown[]): arr is NonTechSkill[] {
  return arr.length > 0 && typeof arr[0] === 'object' && arr[0] !== null && 'label' in arr[0];
}

export function normalizeCandidate(candidate: MatchCandidate): MatchCandidate {
  return {
    ...candidate,
    skills: candidate.skills.map(s => ({
      ...s,
      status: normalizeStatus(s.status, s.years),
    })),
    leadership: isStructuredNonTech(candidate.leadership)
      ? candidate.leadership.map(item => ({ ...item, status: normalizeStatus(item.status) }))
      : candidate.leadership,
    softSkills: isStructuredNonTech(candidate.softSkills)
      ? candidate.softSkills.map(item => ({ ...item, status: normalizeStatus(item.status) }))
      : candidate.softSkills,
  };
}
