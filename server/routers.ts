import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getConversation, respond, resetConversation } from "./support";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  support: router({
    chat: publicProcedure.input(z.object({ message: z.string().trim().min(1).max(2000), conversationId: z.string().uuid().optional() })).mutation(({ input }) => respond(input.message, input.conversationId)),
    history: publicProcedure.input(z.object({ conversationId: z.string().uuid() })).query(({ input }) => getConversation(input.conversationId)),
    reset: publicProcedure.input(z.object({ conversationId: z.string().uuid() })).mutation(({ input }) => resetConversation(input.conversationId)),
  }),
});

export type AppRouter = typeof appRouter;
