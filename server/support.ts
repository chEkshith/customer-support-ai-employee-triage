import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { knowledgeBase } from "./knowledgeBase";
import { THRESHOLDS, type Category, type ChatResponse, type ClassificationResult, type RetrievalResult, type RiskFlag } from "../shared/support";
import { decide } from "./decisionEngine";

const require = createRequire(import.meta.url);
const { DatabaseSync } = require(["node", "sqlite"].join(":")) as typeof import("node:sqlite");
const db = new DatabaseSync(process.env.SUPPORTPILOT_DB_PATH ?? "/tmp/supportpilot.sqlite");
db.exec(`CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, created_at INTEGER NOT NULL)`);

const groups: Record<Exclude<Category, "Other / Out of Scope">, string[]> = { Billing: ["invoice", "receipt", "charge", "charged", "plan", "subscription", "renewal", "payment", "refund", "upgrade", "downgrade", "billing", "price", "usage limit"], Technical: ["error", "bug", "api", "integration", "webhook", "timeout", "not loading", "crash", "slow", "unavailable", "browser", "performance"], "Account Access": ["login", "log in", "sign in", "password", "reset", "locked", "mfa", "two-factor", "verification code", "access", "session"] };
const riskPatterns: Array<[RiskFlag, RegExp]> = [["security_risk", /hack|hacked|compromis|breach|stolen|suspicious|unauthori[sz]ed|charge dispute/i], ["sensitive_action", /refund|delete my account|change payment|verify my identity|transfer ownership/i], ["urgent_outage", /urgent|entire service|everyone.*down|outage/i], ["legal_threat", /lawyer|legal action|sue|regulator/i]];
const tokens = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter(Boolean);

export type EmbeddingAdapter = (message: string, category: Category) => RetrievalResult[] | undefined;
let embeddingAdapter: EmbeddingAdapter | undefined;
export function setEmbeddingAdapter(adapter?: EmbeddingAdapter) { embeddingAdapter = adapter; }

export function classify(message: string): ClassificationResult {
  const normalized = message.trim().toLowerCase(); const riskFlags = riskPatterns.filter(([, re]) => re.test(normalized)).map(([flag]) => flag); const scores = Object.entries(groups).map(([category, words]) => ({ category: category as Category, score: words.reduce((n, word) => n + (normalized.includes(word) ? (word.includes(" ") ? 2 : 1) : 0), 0) })).sort((a, b) => b.score - a.score); const top = scores[0]; const second = scores[1];
  if (!top || top.score === 0) return { category: "Other / Out of Scope", confidence: 0.42, reason: "The message does not contain a clear Tier-1 support intent.", riskFlags };
  const confidence = Math.max(0.35, Math.min(0.97, 0.62 + top.score * 0.09 - (second && top.score === second.score ? 0.18 : 0)));
  return { category: top.category, confidence: Number(confidence.toFixed(2)), reason: `Detected ${top.category.toLowerCase()} intent from support terms in the message.`, riskFlags };
}

export function retrieve(message: string, category: Category): RetrievalResult[] {
  const embedded = embeddingAdapter?.(message, category); if (embedded?.length) return embedded.slice(0, THRESHOLDS.maxCitations);
  const query = new Set(tokens(message));
  return knowledgeBase.map(entry => { const text = tokens(`${entry.title} ${entry.question} ${entry.answer} ${entry.keywords.join(" ")}`); const overlap = text.filter(t => query.has(t)).length; const lexical = Math.min(1, overlap / Math.max(3, query.size * 0.45)); const score = Math.min(1, lexical * 0.92 + (entry.category === category ? 0.08 : 0)); return { sourceId: entry.id, title: entry.title, category: entry.category, snippet: entry.answer, score: Number(score.toFixed(2)) }; }).filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, THRESHOLDS.maxCitations);
}

function ensureConversation(id?: string) { const conversationId = id || randomUUID(); const now = Date.now(); db.prepare("INSERT OR IGNORE INTO conversations (id, created_at, updated_at) VALUES (?, ?, ?)").run(conversationId, now, now); return conversationId; }
function history(id: string) { return db.prepare("SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?").all(id, THRESHOLDS.maxHistoryMessages).reverse() as Array<{ role: string; content: string }>; }
export function respond(message: string, conversationId?: string): ChatResponse { const id = ensureConversation(conversationId); const now = Date.now(); const prior = history(id); const context = prior.map(m => m.content).join(" "); const fullMessage = context && /how long|what about|that|it|same/i.test(message) ? `${context} ${message}` : message; const classification = classify(fullMessage); const citations = retrieve(fullMessage, classification.category); const candidateAnswer = citations[0] ? `${citations[0].snippet}\n\nSource: ${citations[0].sourceId}` : "I can’t safely resolve this from the Tier-1 knowledge base."; const escalationResult = decide(classification, citations, candidateAnswer); const answer = escalationResult ? `I can’t safely resolve this from the Tier-1 knowledge base. ${escalationResult.message}` : candidateAnswer; db.prepare("INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)").run(id, "user", message, now); db.prepare("INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)").run(id, "assistant", answer, now + 1); db.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").run(now, id); return { conversationId: id, answer, classification, citations, escalated: Boolean(escalationResult), ...(escalationResult ? { escalationReasonCode: escalationResult.code, escalationReasonMessage: escalationResult.message } : {}), createdAt: now }; }
export function resetConversation(id: string) { db.prepare("DELETE FROM messages WHERE conversation_id = ?").run(id); db.prepare("DELETE FROM conversations WHERE id = ?").run(id); return { success: true as const }; }
export function getConversation(id: string) { return history(id); }
