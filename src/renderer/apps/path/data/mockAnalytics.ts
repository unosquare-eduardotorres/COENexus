import { AtRiskCandidate, OrgAnalytics, PromotionVelocityDataPoint } from '../types';

export const promotionVelocity: PromotionVelocityDataPoint[] = [
  { month: '2025-10', actual: 4, projected: 5 },
  { month: '2025-11', actual: 5, projected: 5 },
  { month: '2025-12', actual: 3, projected: 4 },
  { month: '2026-01', actual: 6, projected: 6 },
  { month: '2026-02', actual: 7, projected: 6 },
  { month: '2026-03', actual: 5, projected: 7 },
];

export const atRiskCandidates: AtRiskCandidate[] = [
  {
    id: 'dev-003',
    name: 'Lucia Bernal',
    avatarUrl: undefined,
    fromLevel: 'Mid II',
    toLevel: 'Senior I',
    bandLimitPercent: 94,
    detail: 'Leadership gate is blocked with 11 days left before band threshold.',
  },
  {
    id: 'dev-004',
    name: 'Jorge Salgado',
    avatarUrl: undefined,
    fromLevel: 'Senior I',
    toLevel: 'Senior II',
    bandLimitPercent: 88,
    detail: 'Platform reliability evidence is incomplete for latest quarter.',
  },
];

export const orgAnalytics: OrgAnalytics = {
  promotionVelocity,
  skillTaxonomy: {
    domains: 5,
    topics: 6,
    resources: 6,
    coreGates: 4,
  },
  pipelineStatus: [
    { stage: 'nomination', label: 'Nominated', count: 24, status: 'healthy' },
    { stage: 'learning', label: 'Active Learning', count: 17, status: 'healthy' },
    { stage: 'assessment', label: 'In Assessment', count: 9, status: 'warning' },
    { stage: 'decision', label: 'Panel Decision', count: 4, status: 'healthy' },
    { stage: 'blocked', label: 'Blocked', count: 3, status: 'critical' },
  ],
  assessmentQueue: {
    pending: 6,
    inProgress: 9,
    overdue: 2,
  },
};
