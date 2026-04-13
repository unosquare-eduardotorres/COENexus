export type PathRole = 'developer' | 'mentor' | 'evaluator' | 'practice-lead' | 'coe-lead';

export type DeveloperStatus = 'on-track' | 'at-risk' | 'ready' | 'promoted' | 'stalled';
export type ProgressStatus = 'not-started' | 'in-progress' | 'completed' | 'blocked';
export type GateStatus = 'pending' | 'in-progress' | 'met' | 'blocked';
export type SubmissionPrStatus = 'none' | 'draft' | 'open' | 'changes-requested' | 'merged';
export type SubmissionStatus = 'not-started' | 'in-progress' | 'submitted' | 'reviewed' | 'approved' | 'rework';
export type AssessmentStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
export type ThreadStatus = 'open' | 'in-review' | 'resolved' | 'archived';
export type ResourceTier = 'gold' | 'dynamic' | 'platform' | 'community';
export type ResourceType = 'course' | 'article' | 'video' | 'lab' | 'book' | 'playbook';
export type TeamRole = 'mentor' | 'evaluator' | 'practice-lead' | 'coe-lead';
export type DossierDecision = 'promote' | 'hold' | 'defer' | 'decline';
export type ActivityType = 'learning' | 'challenge' | 'assessment' | 'discussion' | 'promotion';

export interface SeniorityLevel {
  id: string;
  name: string;
  displayOrder: number;
  country?: string;
}

export interface CoeUnit {
  id: string;
  name: string;
}

export interface Practice {
  id: string;
  coeId: string;
  name: string;
}

export interface MainSkill {
  id: string;
  practiceId: string;
  name: string;
}

export interface DeveloperProfile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  currentLevel: string;
  targetLevel: string;
  practice: Practice;
  readinessScore: number;
  daysInBand: number;
  institutionalInsight?: string;
  status: DeveloperStatus;
  skillProgress?: DeveloperSkillProgress[];
  gateStatuses?: DeveloperGateStatus[];
  teamAssignments?: TeamMember[];
  activity?: ActivityItem[];
}

export interface SkillDomain {
  id: string;
  mainSkillId?: string;
  name: string;
  isCoreGate: boolean;
  displayOrder: number;
  topics?: SkillTopic[];
}

export interface SkillTopic {
  id: string;
  skillDomainId: string;
  careerLadderId: string;
  name: string;
  displayOrder: number;
  resources?: LearningResource[];
  challenges?: CodeChallenge[];
}

export interface LearningResource {
  id: string;
  topicId: string;
  tier: ResourceTier;
  title: string;
  type: ResourceType;
  source: string;
  url?: string;
  duration?: string;
  reviewDate?: string;
  endorsementCount?: number;
}

export interface CodeChallenge {
  id: string;
  topicId: string;
  title: string;
  description: string;
  repositoryUrl: string;
  rubricMdUrl?: string;
  adrTemplateUrl?: string;
}

export interface ChallengeSubmission {
  id: string;
  developerId: string;
  challengeId: string;
  repositoryUrl: string;
  branch?: string;
  prId?: string;
  prStatus: SubmissionPrStatus;
  status: SubmissionStatus;
  commitCount?: number;
  submittedAt?: string;
  reviewedAt?: string;
}

export interface CareerLadder {
  id: string;
  mainSkillId: string;
  fromLevel: string;
  toLevel: string;
  description: string;
  skillDomains?: SkillDomain[];
}

export interface DeveloperSkillProgress {
  id: string;
  developerId: string;
  skillDomainId: string;
  progress: number;
  status: ProgressStatus;
}

export interface DeveloperTopicProgress {
  id: string;
  developerId: string;
  topicId: string;
  status: ProgressStatus;
  completedAt?: string;
}

export interface PromotionGate {
  id: string;
  careerLadderId: string;
  skillDomainId: string;
  name: string;
}

export interface DeveloperGateStatus {
  id: string;
  developerId: string;
  gateId: string;
  status: GateStatus;
  detail: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface TeamMember {
  id: string;
  developerId: string;
  memberName: string;
  memberEmail?: string;
  role: TeamRole;
  isLead: boolean;
}

export interface AssessmentSession {
  id: string;
  developerId: string;
  evaluatorName: string;
  targetLevel: string;
  compositeScore?: number;
  knowledgeScore?: number;
  deliveryScore?: number;
  status: AssessmentStatus;
  questions?: InterviewQuestion[];
  codeReviews?: CodeReview[];
  defenseNotes?: DefenseNote[];
  createdAt: string;
  completedAt?: string;
}

export interface InterviewQuestion {
  id: string;
  sessionId: string;
  category: string;
  questionText: string;
  score?: number;
  evaluatorNotes: string;
  displayOrder: number;
}

export interface CodeReview {
  id: string;
  sessionId: string;
  prUrl: string;
  prNumber: string;
  stagingUrl?: string;
  evaluatorQuote?: string;
  strengths: string[];
  rubrics?: CodeRubric[];
}

export interface CodeRubric {
  id: string;
  codeReviewId: string;
  dimension: string;
  score: number;
  maxScore: number;
}

export interface DefenseNote {
  id: string;
  sessionId: string;
  tabName: string;
  notes: string;
  tags: string[];
}

export interface DiscussionThread {
  id: string;
  developerId: string;
  title: string;
  status: ThreadStatus;
  goal?: string;
  competency?: string;
  lastActivityAt: string;
  messages?: ThreadMessage[];
  messageCount?: number;
  participants?: string[];
}

export interface ThreadMessage {
  id: string;
  threadId: string;
  authorName: string;
  authorRole: PathRole;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface PromotionDossier {
  id: string;
  developerId: string;
  assessmentSessionId?: string;
  overallReadiness: number;
  skillAnalysis: string;
  consistencyData: string;
  avgVelocity?: number;
  recommendation?: string;
  decision?: DossierDecision;
  decisionRationale?: string;
  decidedBy?: string;
  decidedAt?: string;
  narratives?: DossierNarrative[];
}

export interface DossierNarrative {
  id: string;
  dossierId: string;
  authorName: string;
  authorRole: PathRole;
  content: string;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  developerId: string;
  type: ActivityType;
  title: string;
  detail?: string;
  evidenceUrl?: string;
  createdAt: string;
}

export interface PromotionVelocityDataPoint {
  month: string;
  actual: number;
  projected: number;
}

export interface PipelineFunnelStage {
  stage: string;
  label: string;
  count: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface AtRiskCandidate {
  id: string;
  name: string;
  avatarUrl?: string;
  fromLevel: string;
  toLevel: string;
  bandLimitPercent: number;
  detail: string;
}

export interface OrgAnalytics {
  promotionVelocity: PromotionVelocityDataPoint[];
  skillTaxonomy: {
    domains: number;
    topics: number;
    resources: number;
    coreGates: number;
  };
  pipelineStatus: PipelineFunnelStage[];
  assessmentQueue: {
    pending: number;
    inProgress: number;
    overdue: number;
  };
}
