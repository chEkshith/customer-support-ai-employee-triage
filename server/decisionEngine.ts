import { THRESHOLDS, type ClassificationResult, type EscalationCode, type RetrievalResult } from "../shared/support";

export const escalationMessages: Record<EscalationCode, string> = {
  low_classification_confidence: "The request is ambiguous between support categories.", out_of_scope: "The request is outside the assistant’s Tier-1 support scope.", insufficient_retrieval: "No sufficiently relevant knowledge-base article was found.", sensitive_action: "The request involves an action that the demo cannot safely perform.", security_risk: "The request may involve account compromise or a security incident.", unsupported_answer: "The assistant could not produce an answer supported by the knowledge base.",
};
export function validateAnswer(answer: string, citations: RetrievalResult[]) { return citations.some(source => answer.includes(source.sourceId) || answer.includes(source.title)); }
export function decide(classification: ClassificationResult, citations: RetrievalResult[], answer: string) {
  let code: EscalationCode | undefined;
  if (classification.category === "Other / Out of Scope") code = "out_of_scope";
  else if (classification.confidence < THRESHOLDS.minClassificationConfidence) code = "low_classification_confidence";
  else if (classification.riskFlags.includes("security_risk")) code = "security_risk";
  else if (classification.riskFlags.includes("sensitive_action")) code = "sensitive_action";
  else if (!citations[0] || citations[0].score < THRESHOLDS.minRetrievalScore) code = "insufficient_retrieval";
  else if (!validateAnswer(answer, citations)) code = "unsupported_answer";
  return code ? { code, message: escalationMessages[code] } : undefined;
}
