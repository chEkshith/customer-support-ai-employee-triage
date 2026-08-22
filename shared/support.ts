export const CATEGORIES = ["Billing", "Technical", "Account Access", "Other / Out of Scope"] as const;
export type Category = (typeof CATEGORIES)[number];

export type RiskFlag = "security_risk" | "sensitive_action" | "urgent_outage" | "legal_threat";
export type EscalationCode = "low_classification_confidence" | "out_of_scope" | "insufficient_retrieval" | "sensitive_action" | "security_risk" | "unsupported_answer";

export interface ClassificationResult {
  category: Category;
  confidence: number;
  reason: string;
  riskFlags: RiskFlag[];
}
export interface RetrievalResult {
  sourceId: string;
  title: string;
  category: Category;
  snippet: string;
  score: number;
}
export interface ChatResponse {
  conversationId: string;
  answer: string;
  classification: ClassificationResult;
  citations: RetrievalResult[];
  escalated: boolean;
  escalationReasonCode?: EscalationCode;
  escalationReasonMessage?: string;
  createdAt: number;
}

export const THRESHOLDS = {
  minClassificationConfidence: 0.7,
  minRetrievalScore: 0.45,
  maxHistoryMessages: 10,
  maxCitations: 3,
} as const;
