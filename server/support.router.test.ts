import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

describe("support router", () => {
  it("returns structured chat metadata and a conversation id", async () => {
    const result = await appRouter.createCaller({ user: undefined, req: {} as any, res: {} as any }).support.chat({ message: "How do I download an invoice?" });
    expect(result).toMatchObject({ category: "Billing", escalated: false });
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.answer).toContain(result.sources[0].sourceId);
  });
  it("resets a conversation", async () => {
    const caller = appRouter.createCaller({ user: undefined, req: {} as any, res: {} as any });
    const created = await caller.support.chat({ message: "How do I download an invoice?" });
    await expect(caller.support.reset({ conversationId: created.conversationId })).resolves.toEqual({ success: true });
  });
});
