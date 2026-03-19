import { MatchCandidate, SkillMatchStatus, NonTechSkill } from '../types';

function normalizeStatus(status: string): SkillMatchStatus {
  if (status === 'match') return 'met';
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
      status: normalizeStatus(s.status),
    })),
    leadership: isStructuredNonTech(candidate.leadership)
      ? candidate.leadership.map(item => ({ ...item, status: normalizeStatus(item.status) }))
      : candidate.leadership,
    softSkills: isStructuredNonTech(candidate.softSkills)
      ? candidate.softSkills.map(item => ({ ...item, status: normalizeStatus(item.status) }))
      : candidate.softSkills,
  };
}
