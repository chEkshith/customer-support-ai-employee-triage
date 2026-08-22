import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { chat, resetConversation } from "./supportpilot";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  support: router({
    chat: publicProcedure.input(z.object({ message: z.string().min(1).max(2000), conversationId: z.string().uuid().optional() })).mutation(({ input }) => chat(input.message, input.conversationId)),
    reset: publicProcedure.input(z.object({ conversationId: z.string().uuid() })).mutation(({ input }) => resetConversation(input.conversationId)),
  }),
});

export type AppRouter = typeof appRouter;
