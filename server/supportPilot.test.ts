import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { classify, retrieve, respond, resetConversation, setEmbeddingAdapter } from "./support";
import type { TrpcContext } from "./_core/context";

const caller = appRouter.createCaller({ user: undefined, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });

describe("SupportPilot support engine and API", () => {
  it("classifies billing intent with a useful confidence", () => {
    const result = classify("Where can I download my invoice?");
    expect(result.category).toBe("Billing");
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    expect(result.riskFlags).toEqual([]);
  });

  it("retrieves matching FAQ evidence", () => {
    const results = retrieve("How do webhook retries work?", "Technical");
    expect(results[0]?.sourceId).toBe("technical.webhooks");
    expect(results[0]?.score).toBeGreaterThanOrEqual(0.45);
  });

  it("uses an embedding adapter when available and lexical retrieval when cleared", () => {
    setEmbeddingAdapter(() => [{ sourceId: "embedding.test", title: "Embedding result", category: "Technical", snippet: "Grounded test evidence.", score: 0.91 }]);
    expect(retrieve("anything", "Technical")[0]?.sourceId).toBe("embedding.test");
    setEmbeddingAdapter(undefined);
    expect(retrieve("webhook retries", "Technical")[0]?.sourceId).toBe("technical.webhooks");
  });

  it("escalates sensitive actions instead of pretending to act", () => {
    const result = respond("Please issue me a refund now");
    expect(result.escalated).toBe(true);
    expect(result.escalationReasonCode).toBe("sensitive_action");
    expect(result.answer).not.toMatch(/issued|processed|completed/i);
    resetConversation(result.conversationId);
  });

  it("returns grounded citations for supported questions", () => {
    const result = respond("What browsers are supported?");
    expect(result.escalated).toBe(false);
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.answer).toContain(result.citations[0]!.sourceId);
    resetConversation(result.conversationId);
  });

  it("uses a conversation UUID and bounded follow-up context", () => {
    const first = respond("How do I reset my password?");
    const followUp = respond("How long does that take?", first.conversationId);
    expect(followUp.conversationId).toBe(first.conversationId);
    expect(followUp.classification.category).toBe("Account Access");
    resetConversation(first.conversationId);
  });

  it("supports chat, history, and reset through typed procedures", async () => {
    const result = await caller.support.chat({ message: "How do I download an invoice?" });
    expect(result.conversationId).toMatch(/^[0-9a-f-]{36}$/);
    const history = await caller.support.history({ conversationId: result.conversationId });
    expect(history).toHaveLength(2);
    expect((await caller.support.reset({ conversationId: result.conversationId })).success).toBe(true);
  });
});
