import {
  AssessmentSession,
  CodeReview,
  CodeRubric,
  DefenseNote,
  DossierNarrative,
  InterviewQuestion,
  PromotionDossier,
} from '../types';

export const interviewQuestions: InterviewQuestion[] = [
  {
    id: 'question-001',
    sessionId: 'assessment-001',
    category: 'Architecture',
    questionText: 'How would you isolate domain concerns in a React monorepo with shared UI primitives?',
    score: 4,
    evaluatorNotes: 'Strong decomposition rationale and clear boundary contracts.',
    displayOrder: 1,
  },
  {
    id: 'question-002',
    sessionId: 'assessment-001',
    category: 'Delivery',
    questionText: 'Describe the release strategy used to reduce regression risk in your last quarter.',
    score: 4,
    evaluatorNotes: 'Concrete use of canary rollout and rollback criteria.',
    displayOrder: 2,
  },
  {
    id: 'question-003',
    sessionId: 'assessment-002',
    category: 'Leadership',
    questionText: 'How do you measure mentoring impact beyond subjective feedback?',
    score: 2,
    evaluatorNotes: 'Needs stronger metrics and explicit team-level outcomes.',
    displayOrder: 1,
  },
];

export const codeRubrics: CodeRubric[] = [
  { id: 'rubric-001', codeReviewId: 'code-review-001', dimension: 'Architecture', score: 8, maxScore: 10 },
  { id: 'rubric-002', codeReviewId: 'code-review-001', dimension: 'Test Coverage', score: 9, maxScore: 10 },
  { id: 'rubric-003', codeReviewId: 'code-review-001', dimension: 'Maintainability', score: 8, maxScore: 10 },
  { id: 'rubric-004', codeReviewId: 'code-review-002', dimension: 'Code Readability', score: 7, maxScore: 10 },
  { id: 'rubric-005', codeReviewId: 'code-review-002', dimension: 'Risk Management', score: 6, maxScore: 10 },
];

export const codeReviews: CodeReview[] = [
  {
    id: 'code-review-001',
    sessionId: 'assessment-001',
    prUrl: 'https://github.com/unosquare/coe-nexus/pull/224',
    prNumber: '224',
    stagingUrl: 'https://staging.unosquare.com/path/sandbox',
    evaluatorQuote: 'This PR shows mature architectural choices with verifiable constraints.',
    strengths: ['Clear module boundaries', 'Strong integration tests', 'Reliable rollback notes'],
    rubrics: codeRubrics.filter((rubric) => rubric.codeReviewId === 'code-review-001'),
  },
  {
    id: 'code-review-002',
    sessionId: 'assessment-002',
    prUrl: 'https://github.com/unosquare/coe-nexus/pull/231',
    prNumber: '231',
    evaluatorQuote: 'Delivery execution is good, leadership traceability remains weak.',
    strengths: ['Consistent CI status', 'Fast defect turnaround'],
    rubrics: codeRubrics.filter((rubric) => rubric.codeReviewId === 'code-review-002'),
  },
];

export const defenseNotes: DefenseNote[] = [
  {
    id: 'defense-001',
    sessionId: 'assessment-001',
    tabName: 'Career Evidence',
    notes: 'Presented 3 delivery cycles with measurable stability gains and zero escaped defects.',
    tags: ['delivery', 'stability', 'evidence'],
  },
  {
    id: 'defense-002',
    sessionId: 'assessment-001',
    tabName: 'Architecture',
    notes: 'ADR set was complete and linked to implementation commits.',
    tags: ['architecture', 'adr'],
  },
  {
    id: 'defense-003',
    sessionId: 'assessment-002',
    tabName: 'Leadership',
    notes: 'Mentoring outcomes discussed but lacked objective KPI baselines.',
    tags: ['leadership', 'mentoring', 'gap'],
  },
];

export const assessmentSessions: AssessmentSession[] = [
  {
    id: 'assessment-001',
    developerId: 'dev-002',
    evaluatorName: 'Veronica Castillo',
    targetLevel: 'Senior I',
    compositeScore: 86,
    knowledgeScore: 88,
    deliveryScore: 84,
    status: 'completed',
    questions: interviewQuestions.filter((item) => item.sessionId === 'assessment-001'),
    codeReviews: codeReviews.filter((item) => item.sessionId === 'assessment-001'),
    defenseNotes: defenseNotes.filter((item) => item.sessionId === 'assessment-001'),
    createdAt: '2026-03-12T14:00:00Z',
    completedAt: '2026-03-19T18:30:00Z',
  },
  {
    id: 'assessment-002',
    developerId: 'dev-003',
    evaluatorName: 'Marco Vela',
    targetLevel: 'Senior I',
    compositeScore: 67,
    knowledgeScore: 73,
    deliveryScore: 61,
    status: 'in-progress',
    questions: interviewQuestions.filter((item) => item.sessionId === 'assessment-002'),
    codeReviews: codeReviews.filter((item) => item.sessionId === 'assessment-002'),
    defenseNotes: defenseNotes.filter((item) => item.sessionId === 'assessment-002'),
    createdAt: '2026-03-25T15:30:00Z',
  },
];

export const dossierNarratives: DossierNarrative[] = [
  {
    id: 'narrative-001',
    dossierId: 'dossier-001',
    authorName: 'Veronica Castillo',
    authorRole: 'evaluator',
    content: 'Candidate demonstrates repeatable architectural leadership with measurable quality impact.',
    createdAt: '2026-03-19T19:10:00Z',
  },
  {
    id: 'narrative-002',
    dossierId: 'dossier-001',
    authorName: 'Rafael Mena',
    authorRole: 'mentor',
    content: 'Readiness improved significantly over the last two cycles; guidance needs are now minimal.',
    createdAt: '2026-03-20T09:20:00Z',
  },
  {
    id: 'narrative-003',
    dossierId: 'dossier-002',
    authorName: 'Nadia Ruiz',
    authorRole: 'practice-lead',
    content: 'Maintain progression with a focused leadership evidence sprint before the next panel.',
    createdAt: '2026-03-28T11:05:00Z',
  },
];

export const promotionDossiers: PromotionDossier[] = [
  {
    id: 'dossier-001',
    developerId: 'dev-002',
    assessmentSessionId: 'assessment-001',
    overallReadiness: 91,
    skillAnalysis: 'Architecture and quality gates are fully met; delivery consistency exceeded baseline.',
    consistencyData: 'Velocity variance stayed under 8% for the last four sprints.',
    avgVelocity: 31.5,
    recommendation: 'Promote to Senior I in April cycle.',
    decision: 'promote',
    decisionRationale: 'Panel consensus based on sustained quality metrics and leadership behavior.',
    decidedBy: 'COE Council',
    decidedAt: '2026-03-22T17:00:00Z',
    narratives: dossierNarratives.filter((item) => item.dossierId === 'dossier-001'),
  },
  {
    id: 'dossier-002',
    developerId: 'dev-003',
    assessmentSessionId: 'assessment-002',
    overallReadiness: 64,
    skillAnalysis: 'Delivery execution is acceptable; leadership gate still below threshold.',
    consistencyData: 'Recent sprint velocity improved but coaching outcomes are not yet stable.',
    avgVelocity: 24.1,
    recommendation: 'Defer and reassess after leadership evidence cycle.',
    decision: 'defer',
    decisionRationale: 'Need objective mentoring KPI improvements before panel approval.',
    decidedBy: 'Practice Council',
    decidedAt: '2026-03-30T16:40:00Z',
    narratives: dossierNarratives.filter((item) => item.dossierId === 'dossier-002'),
  },
];
