import {
  CareerLadder,
  CoeUnit,
  CodeChallenge,
  LearningResource,
  MainSkill,
  Practice,
  PromotionGate,
  SeniorityLevel,
  SkillDomain,
  SkillTopic,
} from '../types';

export const seniorityLevels: SeniorityLevel[] = [
  { id: 'jr-1', name: 'Junior I', displayOrder: 1, country: 'MX' },
  { id: 'jr-2', name: 'Junior II', displayOrder: 2, country: 'MX' },
  { id: 'mid-1', name: 'Mid I', displayOrder: 3, country: 'MX' },
  { id: 'mid-2', name: 'Mid II', displayOrder: 4, country: 'MX' },
  { id: 'sr-1', name: 'Senior I', displayOrder: 5, country: 'MX' },
  { id: 'sr-2', name: 'Senior II', displayOrder: 6, country: 'US' },
];

export const coeUnits: CoeUnit[] = [
  { id: 'coe-digital', name: 'Digital Engineering COE' },
  { id: 'coe-data', name: 'Data & AI COE' },
];

export const practices: Practice[] = [
  { id: 'practice-web', coeId: 'coe-digital', name: 'Web Platforms' },
  { id: 'practice-cloud', coeId: 'coe-digital', name: 'Cloud Engineering' },
  { id: 'practice-ml', coeId: 'coe-data', name: 'Applied AI' },
];

export const mainSkills: MainSkill[] = [
  { id: 'ms-react', practiceId: 'practice-web', name: 'React + TypeScript' },
  { id: 'ms-node', practiceId: 'practice-web', name: 'Node.js Services' },
  { id: 'ms-azure', practiceId: 'practice-cloud', name: 'Azure Delivery' },
  { id: 'ms-mlops', practiceId: 'practice-ml', name: 'MLOps Foundations' },
];

export const careerLadders: CareerLadder[] = [
  {
    id: 'ladder-react-mid2-sr1',
    mainSkillId: 'ms-react',
    fromLevel: 'Mid II',
    toLevel: 'Senior I',
    description: 'Advance from feature contributor to architecture owner for React products.',
  },
  {
    id: 'ladder-node-mid2-sr1',
    mainSkillId: 'ms-node',
    fromLevel: 'Mid II',
    toLevel: 'Senior I',
    description: 'Demonstrate backend ownership, reliability patterns, and coaching impact.',
  },
  {
    id: 'ladder-azure-sr1-sr2',
    mainSkillId: 'ms-azure',
    fromLevel: 'Senior I',
    toLevel: 'Senior II',
    description: 'Lead cloud governance, platform resilience, and cross-team enablement.',
  },
];

export const skillDomains: SkillDomain[] = [
  { id: 'sd-architecture', mainSkillId: 'ms-react', name: 'Architecture & Design', isCoreGate: true, displayOrder: 1 },
  { id: 'sd-quality', mainSkillId: 'ms-react', name: 'Code Quality & Testing', isCoreGate: true, displayOrder: 2 },
  { id: 'sd-delivery', mainSkillId: 'ms-node', name: 'Delivery Excellence', isCoreGate: true, displayOrder: 3 },
  { id: 'sd-platform', mainSkillId: 'ms-azure', name: 'Platform Reliability', isCoreGate: false, displayOrder: 4 },
  { id: 'sd-leadership', mainSkillId: 'ms-node', name: 'Technical Leadership', isCoreGate: true, displayOrder: 5 },
];

export const skillTopics: SkillTopic[] = [
  {
    id: 'topic-react-boundaries',
    skillDomainId: 'sd-architecture',
    careerLadderId: 'ladder-react-mid2-sr1',
    name: 'Define Bounded Frontend Modules',
    displayOrder: 1,
  },
  {
    id: 'topic-adr-practice',
    skillDomainId: 'sd-architecture',
    careerLadderId: 'ladder-react-mid2-sr1',
    name: 'Architecture Decision Records',
    displayOrder: 2,
  },
  {
    id: 'topic-test-observability',
    skillDomainId: 'sd-quality',
    careerLadderId: 'ladder-react-mid2-sr1',
    name: 'Test Strategy & Observability',
    displayOrder: 1,
  },
  {
    id: 'topic-pr-governance',
    skillDomainId: 'sd-delivery',
    careerLadderId: 'ladder-node-mid2-sr1',
    name: 'PR Governance & Release Readiness',
    displayOrder: 1,
  },
  {
    id: 'topic-sre-error-budget',
    skillDomainId: 'sd-platform',
    careerLadderId: 'ladder-azure-sr1-sr2',
    name: 'Error Budgets and Reliability Signals',
    displayOrder: 1,
  },
  {
    id: 'topic-team-multipliers',
    skillDomainId: 'sd-leadership',
    careerLadderId: 'ladder-node-mid2-sr1',
    name: 'Mentoring as a Delivery Multiplier',
    displayOrder: 1,
  },
];

export const learningResources: LearningResource[] = [
  {
    id: 'res-ddd-frontend',
    topicId: 'topic-react-boundaries',
    tier: 'gold',
    title: 'Domain-Driven Frontend Architecture',
    type: 'course',
    source: 'Internal Academy',
    url: 'https://learning.unosquare.com/ddf-architecture',
    duration: '3h 20m',
    reviewDate: '2026-02-14',
    endorsementCount: 48,
  },
  {
    id: 'res-adr-catalog',
    topicId: 'topic-adr-practice',
    tier: 'platform',
    title: 'ADR Catalog and Templates',
    type: 'playbook',
    source: 'Engineering Handbook',
    url: 'https://wiki.unosquare.com/eng/adr-catalog',
    duration: '45m',
    reviewDate: '2026-01-30',
    endorsementCount: 62,
  },
  {
    id: 'res-contract-testing',
    topicId: 'topic-test-observability',
    tier: 'dynamic',
    title: 'Contract Testing with MSW and Pact',
    type: 'video',
    source: 'Tech Talks',
    url: 'https://videos.unosquare.com/contract-testing',
    duration: '55m',
    reviewDate: '2026-03-02',
    endorsementCount: 29,
  },
  {
    id: 'res-release-rubric',
    topicId: 'topic-pr-governance',
    tier: 'gold',
    title: 'Release Governance Rubric',
    type: 'article',
    source: 'Delivery Office',
    url: 'https://wiki.unosquare.com/delivery/release-rubric',
    duration: '35m',
    reviewDate: '2026-03-06',
    endorsementCount: 35,
  },
  {
    id: 'res-sre-fundamentals',
    topicId: 'topic-sre-error-budget',
    tier: 'community',
    title: 'SRE Workbook: Error Budgets',
    type: 'book',
    source: 'SRE Guild',
    duration: '2h 10m',
    reviewDate: '2026-02-21',
    endorsementCount: 16,
  },
  {
    id: 'res-feedback-loops',
    topicId: 'topic-team-multipliers',
    tier: 'platform',
    title: 'Feedback Loops for Mentors',
    type: 'lab',
    source: 'Mentor Lab',
    url: 'https://learning.unosquare.com/mentor-feedback-lab',
    duration: '1h 15m',
    reviewDate: '2026-03-10',
    endorsementCount: 21,
  },
];

export const codeChallenges: CodeChallenge[] = [
  {
    id: 'ch-split-monolith-ui',
    topicId: 'topic-react-boundaries',
    title: 'Split a Monolithic UI into Feature Modules',
    description: 'Refactor a legacy dashboard into bounded modules with route-level ownership and typed contracts.',
    repositoryUrl: 'https://github.com/unosquare/path-challenges/tree/main/split-monolith-ui',
    rubricMdUrl: 'https://github.com/unosquare/path-challenges/blob/main/rubrics/split-monolith-ui.md',
    adrTemplateUrl: 'https://github.com/unosquare/path-challenges/blob/main/templates/adr-template.md',
  },
  {
    id: 'ch-adr-tradeoffs',
    topicId: 'topic-adr-practice',
    title: 'Author ADRs for Integration Tradeoffs',
    description: 'Produce three ADRs for build-vs-buy and contract versioning choices under delivery constraints.',
    repositoryUrl: 'https://github.com/unosquare/path-challenges/tree/main/adr-tradeoffs',
    rubricMdUrl: 'https://github.com/unosquare/path-challenges/blob/main/rubrics/adr-tradeoffs.md',
  },
  {
    id: 'ch-observability-hardening',
    topicId: 'topic-test-observability',
    title: 'Harden CI with Quality Gates',
    description: 'Implement smoke, contract, and component suites with quality gate scoring in CI.',
    repositoryUrl: 'https://github.com/unosquare/path-challenges/tree/main/observability-hardening',
    rubricMdUrl: 'https://github.com/unosquare/path-challenges/blob/main/rubrics/observability-hardening.md',
  },
];

export const promotionGates: PromotionGate[] = [
  { id: 'gate-arch', careerLadderId: 'ladder-react-mid2-sr1', skillDomainId: 'sd-architecture', name: 'Architecture Gate' },
  { id: 'gate-quality', careerLadderId: 'ladder-react-mid2-sr1', skillDomainId: 'sd-quality', name: 'Quality Gate' },
  { id: 'gate-delivery', careerLadderId: 'ladder-node-mid2-sr1', skillDomainId: 'sd-delivery', name: 'Delivery Gate' },
  { id: 'gate-leadership', careerLadderId: 'ladder-node-mid2-sr1', skillDomainId: 'sd-leadership', name: 'Leadership Gate' },
];
