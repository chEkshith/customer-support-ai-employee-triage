# SupportPilot folder structure

This document explains where the main SupportPilot application responsibilities live.

```text
supportpilot/
├── client/                         # React frontend
│   ├── index.html                  # Browser shell and document metadata
│   └── src/
│       ├── components/             # Shared UI components and primitives
│       │   ├── ui/                 # Reusable shadcn-style components
│       │   ├── AIChatBox.tsx       # Existing scaffold chat component
│       │   ├── DashboardLayout.tsx # Existing scaffold layout
│       │   └── ErrorBoundary.tsx   # Runtime error boundary
│       ├── contexts/               # React context providers
│       ├── hooks/                  # Reusable frontend hooks
│       ├── lib/trpc.ts             # Typed server-client binding
│       ├── pages/
│       │   ├── Home.tsx            # Main SupportPilot interface
│       │   └── NotFound.tsx         # Fallback route
│       ├── App.tsx                  # Routes, theme, and application shell
│       ├── index.css                # Global theme, layout, and responsive styles
│       └── main.tsx                 # Frontend entry point
│
├── server/                         # Server-side application logic
│   ├── knowledgeBase.ts            # Synthetic FAQ records
│   ├── support.ts                  # Classification, retrieval, persistence, response flow
│   ├── decisionEngine.ts           # Answer validation and escalation decisions
│   ├── routers.ts                  # Typed support.chat/history/reset procedures
│   ├── db.ts                       # Existing scaffold database helpers
│   ├── supportPilot.test.ts        # Core support-engine tests
│   └── _core/                      # Managed runtime and platform integrations
│
├── shared/
│   └── support.ts                  # Shared categories, thresholds, and contracts
├── drizzle/                        # Scaffold schema and migrations
├── docs/
│   └── FOLDER_STRUCTURE.md         # This reference document
├── todo.md                         # Implementation checklist and project history
├── package.json                    # Scripts and dependencies
├── pnpm-lock.yaml                  # Locked dependency graph
├── tsconfig.json                   # TypeScript configuration
├── vitest.config.ts                # Test configuration
└── README.md                       # Main GitHub project documentation
```

## Responsibility map

| Area | Primary location | Responsibility |
|---|---|---|
| Chat interface | `client/src/pages/Home.tsx` | Message history, composer, loading/error states, citations, confidence, and escalation UI. |
| Visual design | `client/src/index.css` | Typography, colors, layout, responsive behavior, motion, and accessibility states. |
| Typed API | `server/routers.ts` | Input validation and the public chat/history/reset procedures. |
| Classification | `server/support.ts` | Deterministic category selection, confidence heuristic, and risk scanning. |
| Retrieval | `server/support.ts` | Optional embedding-adapter seam and lexical fallback over the FAQ corpus. |
| Decision safety | `server/decisionEngine.ts` | Retrieval thresholds, citation validation, and stable escalation codes. |
| FAQ content | `server/knowledgeBase.ts` | Synthetic support articles across all four categories. |
| Persistence | `server/support.ts` | SQLite conversations and bounded recent message history. |
| Shared contracts | `shared/support.ts` | Categories, thresholds, risk flags, escalation codes, and response types. |
| Automated verification | `server/*.test.ts` | Classification, retrieval, grounding, API behavior, persistence, and fallback coverage. |

## Request lifecycle

A message enters through `support.chat`, which delegates to the SupportPilot service. The service normalizes the message, checks risk patterns, classifies the request, retrieves evidence, builds a cited answer, validates support, and either returns the answer or produces a structured escalation. The frontend renders the result without making safety decisions itself.
