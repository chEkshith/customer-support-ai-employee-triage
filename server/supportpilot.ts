import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export const THRESHOLDS = {
  classification: 0.7,
  retrieval: 0.45,
  history: 10,
};

export type Category = "Billing" | "Technical" | "Account Access" | "Other / Out of Scope";
export type RiskFlag = "security_risk" | "sensitive_action" | "urgent_outage" | "out_of_scope";

type Entry = { id: string; title: string; category: Category; answer: string; keywords: string[] };
export type Source = { sourceId: string; title: string; category: Category; snippet: string; score: number };

type StoredMessage = { role: "user" | "assistant"; content: string };
const conversationFile = "supportpilot-conversations.json";
function readStore(): Record<string, StoredMessage[]> { try { return existsSync(conversationFile) ? JSON.parse(readFileSync(conversationFile, "utf8")) : {}; } catch { return {}; } }
function readHistory(id: string): StoredMessage[] { return (readStore()[id] || []).slice(-THRESHOLDS.history); }
function writeHistory(id: string, history: StoredMessage[]) { const store = readStore(); store[id] = history.slice(-THRESHOLDS.history); writeFileSync(conversationFile, JSON.stringify(store)); }

const make = (category: Category, prefix: string, rows: [string, string, string[]][]): Entry[] =>
  rows.map(([slug, title, keywords], index) => ({
    id: `${prefix}.${String(index + 1).padStart(2, "0")}`,
    title,
    category,
    answer: `${title}. SupportPilot’s Tier-1 guidance is to ${slug}. This guidance is informational and does not change account data or billing settings.`,
    keywords,
  }));

export const KNOWLEDGE_BASE: Entry[] = [
  ...make("Billing", "billing", [
    ["open Settings > Billing > Invoices and download the PDF for a completed period", "Downloading an invoice", ["invoice", "receipt", "pdf"]],
    ["review the plan comparison in Settings > Billing before selecting an upgrade", "Changing a plan", ["plan", "upgrade", "downgrade"]],
    ["check the invoice line items and payment history in Settings > Billing", "Understanding a charge", ["charge", "charged", "payment"]],
    ["confirm the renewal date on the Billing overview; the workspace owner can review renewal details", "Checking a renewal date", ["renewal", "subscription", "date"]],
    ["review current usage on the Usage page; limits reset according to the workspace plan", "Checking usage limits", ["usage", "limit", "quota"]],
    ["contact a human support agent for refund or charge-dispute review because this demo cannot reverse payments", "Refund and charge disputes", ["refund", "dispute", "chargeback"]],
  ]),
  ...make("Technical", "technical", [
    ["refresh the page, confirm the browser is current, and retry once", "A page is not loading", ["loading", "browser", "blank"]],
    ["check the integration endpoint and review the request logs for the returned status code", "Integration troubleshooting", ["integration", "endpoint", "status"]],
    ["verify the API key scope and request format against the API reference", "API request errors", ["api", "request", "error"]],
    ["confirm the webhook URL is reachable and inspect the latest delivery attempt", "Webhook delivery", ["webhook", "delivery", "event"]],
    ["retry after checking network connectivity; persistent timeouts need technical review", "Request timeouts", ["timeout", "slow", "network"]],
    ["capture the error message, browser version, and reproduction steps for a human agent", "Reporting a bug", ["bug", "crash", "error"]],
  ]),
  ...make("Account Access", "access", [
    ["use the Sign in page’s password reset link and follow the email instructions", "Resetting a password", ["password", "reset", "forgot"]],
    ["enter the current verification code from your authenticator or recovery method", "Two-factor authentication", ["mfa", "two-factor", "code"]],
    ["wait briefly and use the account recovery flow rather than repeatedly retrying", "A locked account", ["locked", "lockout", "access"]],
    ["confirm that you are using the email address associated with the workspace", "Cannot sign in", ["login", "log in", "sign in"]],
    ["ask a workspace owner to review the member access settings", "Workspace access", ["workspace", "member", "permission"]],
    ["contact a human support agent immediately if you suspect compromise; do not share passwords or codes", "Suspected account compromise", ["compromise", "hacked", "security"]],
  ]),
  ...make("Other / Out of Scope", "other", [
    ["contact the appropriate human team because sales requests are outside Tier-1 support", "Sales requests", ["sales", "pricing", "demo"]],
    ["contact a human agent for legal guidance; this assistant cannot provide legal advice", "Legal questions", ["legal", "lawyer", "policy"]],
    ["contact a human agent for partnership discussions", "Partnership requests", ["partnership", "partner", "business"]],
    ["use the security reporting channel and avoid sharing secrets in chat", "Security incidents", ["security incident", "vulnerability", "breach"]],
    ["rephrase the request with a specific SupportPilot product question", "Unclear requests", ["help", "question", "unclear"]],
    ["contact a human agent for urgent service outages", "Urgent outages", ["outage", "down", "unavailable"]],
  ]),
];

const rules: Record<Exclude<Category, "Other / Out of Scope">, string[]> = {
  Billing: ["invoice", "receipt", "charge", "charged", "plan", "subscription", "renewal", "payment", "refund", "upgrade", "downgrade", "billing", "quota"],
  Technical: ["error", "bug", "api", "integration", "webhook", "timeout", "not loading", "crash", "slow", "browser", "outage", "unavailable"],
  "Account Access": ["login", "log in", "sign in", "password", "reset", "locked", "mfa", "two-factor", "verification code", "access", "compromise", "hacked"],
};

export function classify(message: string) {
  const text = message.toLowerCase().trim();
  const riskFlags: RiskFlag[] = [];
  if (/(hack|compromis|breach|stolen|unauthori[sz]ed)/.test(text)) riskFlags.push("security_risk");
  if (/(refund|delete|delet(e|ion)|identity verification|change payment|cancel account)/.test(text)) riskFlags.push("sensitive_action");
  if (/(urgent|emergency|everything is down|service outage)/.test(text)) riskFlags.push("urgent_outage");
  const scores = Object.entries(rules).map(([category, terms]) => [category as Category, terms.reduce((n, term) => n + (text.includes(term) ? (term.includes(" ") ? 2 : 1) : 0), 0)] as const).sort((a, b) => b[1] - a[1]);
  const [top, second] = scores;
  const tied = top[1] === 0 || top[1] === second[1];
  const confidence = tied ? 0.42 : Math.min(0.96, 0.62 + top[1] * 0.08 - Math.max(0, second[1]) * 0.02);
  const category = tied ? "Other / Out of Scope" : top[0];
  if (category === "Other / Out of Scope") riskFlags.push("out_of_scope");
  return { category, confidence: Number(confidence.toFixed(2)), reason: tied ? "The message is unclear or overlaps multiple support categories." : `The message matches ${category.toLowerCase()} support intent.`, riskFlags };
}

export function retrieve(message: string, category: Category): Source[] {
  const tokens = message.toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean);
  return KNOWLEDGE_BASE.map((entry) => {
    const hits = entry.keywords.filter((keyword) => tokens.some((token) => token === keyword || token.includes(keyword) || keyword.includes(token))).length;
    const lexical = Math.min(1, hits / 3);
    const categoryBoost = entry.category === category ? 0.12 : 0;
    const score = Math.min(1, Number((lexical * 0.88 + categoryBoost).toFixed(2)));
    return { sourceId: entry.id, title: entry.title, category: entry.category, snippet: entry.answer, score };
  }).filter((source) => source.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
}

export function decide(message: string, classification = classify(message), sources = retrieve(message, classification.category)) {
  const best = sources[0]?.score ?? 0;
  let reasonCode: string | undefined;
  if (classification.riskFlags.includes("security_risk")) reasonCode = "security_risk";
  else if (classification.riskFlags.includes("urgent_outage")) reasonCode = "urgent_outage";
  else if (classification.riskFlags.includes("sensitive_action")) reasonCode = "sensitive_action";
  else if (classification.category === "Other / Out of Scope") reasonCode = "out_of_scope";
  else if (classification.confidence < THRESHOLDS.classification) reasonCode = "low_classification_confidence";
  else if (best < THRESHOLDS.retrieval || sources.length < 1) reasonCode = "insufficient_retrieval";
  return { escalated: Boolean(reasonCode), reasonCode, bestScore: best };
}

export function validateGrounding(answer: string, sources: Source[]) { return sources.length > 0 && sources.some((source) => answer.includes(source.sourceId) || answer.includes(source.title)); }

const reasonMessages: Record<string, string> = {
  security_risk: "A human support agent should review this possible security incident.",
  urgent_outage: "A human support agent should review this urgent service issue.",
  sensitive_action: "A human support agent must review this sensitive action; the demo cannot perform it.",
  out_of_scope: "This request is outside the assistant’s Tier-1 support scope.",
  low_classification_confidence: "The request is ambiguous between support categories.",
  insufficient_retrieval: "No sufficiently relevant knowledge-base article was found.",
  unsupported_answer: "The assistant could not produce an answer supported by the knowledge base.",
};

export function chat(message: string, conversationId?: string) {
  const id = conversationId || randomUUID();
  const history = readHistory(id);
  const classification = classify(message);
  const sources = retrieve(message, classification.category);
  const decision = decide(message, classification, sources);
  const entry = sources[0] && KNOWLEDGE_BASE.find((item) => item.id === sources[0].sourceId);
  let answer = decision.escalated ? `I can’t safely resolve this from the available Tier-1 guidance. A human support agent should review the request. ${sources[0] ? `Related source: ${sources[0].sourceId}.` : ""}` : `${entry?.answer || "I could not find grounded guidance."} Source: ${sources[0].sourceId}.`;
  if (!decision.escalated && !validateGrounding(answer, sources)) { decision.escalated = true; decision.reasonCode = "unsupported_answer"; answer = "I can’t provide a grounded answer from the available guidance. A human support agent should review this request."; }
  const updated = [...history, { role: "user" as const, content: message }, { role: "assistant" as const, content: answer }].slice(-THRESHOLDS.history);
  writeHistory(id, updated);
  return { conversationId: id, answer, category: classification.category, confidence: classification.confidence, reason: classification.reason, riskFlags: classification.riskFlags, sources, escalated: decision.escalated, escalationReasonCode: decision.reasonCode, escalationReasonMessage: decision.reasonCode ? reasonMessages[decision.reasonCode] : undefined };
}

export function resetConversation(id: string) { const store = readStore(); delete store[id]; writeFileSync(conversationFile, JSON.stringify(store)); return { success: true }; }
