import { describe, expect, it } from "vitest";
import { chat, classify, retrieve, validateGrounding } from "./supportpilot";

describe("SupportPilot triage", () => {
  it("classifies billing intent", () => expect(classify("Where is my invoice?").category).toBe("Billing"));
  it("classifies access intent", () => expect(classify("I cannot log in").category).toBe("Account Access"));
  it("retrieves cited technical guidance", () => { const sources = retrieve("The API request is timing out", "Technical"); expect(sources[0]?.sourceId).toContain("technical"); expect(sources[0]?.score).toBeGreaterThan(0.45); });
  it("escalates sensitive actions", () => { const result = chat("Please refund and delete my account"); expect(result.escalated).toBe(true); expect(result.escalationReasonCode).toBe("sensitive_action"); });
  it("escalates unclear requests", () => expect(chat("Tell me something").escalated).toBe(true));
  it("validates source grounding", () => { const sources = retrieve("How do I download an invoice?", "Billing"); expect(validateGrounding(`See ${sources[0].sourceId}`, sources)).toBe(true); });
  it("returns a backend-generated conversation id", () => expect(chat("How do I download an invoice?").conversationId).toMatch(/^[0-9a-f-]{36}$/));
});
