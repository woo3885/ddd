import type {
  BackendSanitizedDomSnapshot,
} from "../api/aiRequest.types.js";

export const GOAL_STATUSES = [
  "ACTIVE",
  "CANCELLED",
  "COMPLETED",
  "SUPERSEDED",
] as const;

export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const GOAL_INTENTS = [
  "DEPOSIT",
  "TRANSFER",
  "INQUIRY",
  "CHANGE",
  "UNKNOWN",
] as const;

export type GoalIntent = (typeof GOAL_INTENTS)[number];

export type DurationUnit = "MONTH";
export type RiskState = "NONE" | "WARNING" | "BLOCKED";
export type ConfirmationState =
  | "NONE"
  | "REQUIRED"
  | "APPROVED"
  | "REJECTED";

export interface GoalAmount {
  value: string;
  currency: "KRW";
}

export interface GoalDuration {
  value: number;
  unit: DurationUnit;
}

export interface ConversationUserGoal {
  goalId: string;
  revision: number;
  status: GoalStatus;
  intent: GoalIntent;
  normalizedRequest: string;
  amount: GoalAmount | null;
  duration: GoalDuration | null;
  missingFields: string[];
  pendingQuestion: {
    questionId: string;
    fieldKey: string;
  } | null;
  stage: string;
  safety: {
    secureInputActive: boolean;
    riskState: RiskState;
    confirmationState: ConfirmationState;
  };
  lastAppliedMessageId: string | null;
}

export interface UserGoalPatch {
  basedOnRevision: number;
  intent?: GoalIntent;
  amount?: GoalAmount | null;
  duration?: GoalDuration | null;
  missingFields?: string[];
  pendingQuestionFieldKey?: string | null;
  status?: Exclude<GoalStatus, "COMPLETED">;
}

export const AGENT_MODES = [
  "AUTO_EXECUTE",
  "GUIDE_USER",
  "ASK_USER",
  "SECURE_INPUT_REQUIRED",
  "RISK_WARNING",
  "FINAL_CONFIRMATION_REQUIRED",
  "COMPLETE",
  "STOP",
  "GOAL_PATCH_PROPOSED",
] as const;

export type AgentMode = (typeof AGENT_MODES)[number];

/** Day 1 intentionally carries no target identity. */
export interface Day1MinimalActionCandidate {
  actionType: string;
}

export interface AgentDecision {
  requestId: string;
  requestMessageId: string;
  goalId: string;
  baseGoalRevision: number;
  mode: AgentMode;
  message: string | null;
  confidence: number;
  reasonCode: string;
  nextCondition: string | null;
  sourceSnapshotId: string | null;
  goalPatch: UserGoalPatch | null;
  question: { fieldKey: string } | null;
  actionCandidate: Day1MinimalActionCandidate | null;
}

export interface ConversationAgentRequest {
  sessionId: string;
  requestId: string;
  requestMessageId: string;
  conversationSequence: number;
  goal: ConversationUserGoal;
  userMessage: {
    content: string;
    answerToQuestionId: string | null;
  };
  snapshot: {
    sourceSnapshotId: string;
    pageIdentity: string;
    sanitizedDomSnapshot: BackendSanitizedDomSnapshot;
  } | null;
}
