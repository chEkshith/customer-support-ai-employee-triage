# SupportPilot

<p align="center">
  <strong>Evidence-first Tier-1 customer support intelligence</strong>
</p>

<p align="center">
  A safe, grounded support assistant that answers from a synthetic knowledge base—and knows when to pause and escalate.
</p>

<p align="center">
  <code>React</code> · <code>TypeScript</code> · <code>tRPC</code> · <code>Express</code> · <code>SQLite</code> · <code>Vitest</code>
</p>

---

## Overview

**SupportPilot** is a fictional SaaS customer-support AI employee built for Tier-1 triage. A user submits a support question through a responsive chat interface. The backend classifies the request, retrieves relevant evidence from a synthetic FAQ corpus, produces a grounded answer, and displays the supporting source identifiers.

When the request is ambiguous, sensitive, security-related, out of scope, or not sufficiently supported by the available evidence, SupportPilot does not guess. Instead, it returns a clear response and recommends human review with a stable escalation reason code.

> **Core principle:** A helpful support assistant should be measured not only by the questions it answers, but also by the questions it safely refuses to answer alone.

## Product capabilities

| Capability | Description |
|---|---|
| **Deterministic classification** | Routes every message to Billing, Technical, Account Access, or Other / Out of Scope. |
| **Confidence and rationale** | Returns a heuristic confidence score, explanation, and risk flags for every classification. |
| **Grounded retrieval** | Searches a synthetic FAQ corpus and displays the supporting source IDs and match scores. |
| **Safe escalation** | Escalates low-confidence, risky, sensitive, unsupported, and out-of-scope requests. |
| **Bounded conversations** | Persists UUID-based conversations and uses only recent message history for follow-ups. |
| **Responsive experience** | Provides a polished desktop and mobile chat experience with loading, error, reset, and empty states. |
| **No external AI dependency** | Uses deterministic template-based answers so the local demo runs without an LLM service. |

## Architecture

SupportPilot is implemented as a modular monolith. The frontend communicates with typed tRPC procedures, while the backend owns classification, retrieval, answer support, escalation, and persistence decisions.

```text
┌──────────────────────────────────────────────────────────────┐
│                      React + TypeScript UI                   │
│  Chat history · Composer · Confidence · Citations · Handoff  │
└─────────────────────────────┬────────────────────────────────┘
                              │ typed tRPC procedures
┌─────────────────────────────▼────────────────────────────────┐
│                    Express + tRPC server                     │
│                                                              │
│  classify → retrieve → validate → answer or escalate         │
│       │          │           │             │                  │
│       ▼          ▼           ▼             ▼                  │
│   Risk scan  FAQ corpus  Decision engine  SQLite              │
└──────────────────────────────────────────────────────────────┘
```

### Decision flow

```text
Incoming message
      │
      ▼
Normalize and scan for risk
      │
      ▼
Classify with heuristic confidence
      │
      ├── Risky, sensitive, unclear, or out of scope ──► Escalate
      │
      ▼
Retrieve relevant FAQ evidence
      │
      ├── Evidence below threshold ────────────────────► Escalate
      │
      ▼
Build grounded template answer
      │
      ├── Citation validation fails ────────────────────► Escalate
      │
      ▼
Return answer with sources and confidence
```

## Repository structure

```text
supportpilot/
├── client/
│   ├── index.html                 # Browser document shell and title
│   └── src/
│       ├── components/            # Reusable UI and scaffold components
│       │   ├── ui/                # shadcn-style interface primitives
│       │   ├── AIChatBox.tsx      # Existing chat component from scaffold
│       │   ├── DashboardLayout.tsx
│       │   └── ErrorBoundary.tsx
│       ├── contexts/              # Theme and application contexts
│       ├── hooks/                 # Reusable React hooks
│       ├── lib/
│       │   └── trpc.ts            # Typed tRPC client binding
│       ├── pages/
│       │   ├── Home.tsx           # Main SupportPilot chat experience
│       │   └── NotFound.tsx        # Fallback route
│       ├── App.tsx                 # Application shell and routing
│       ├── index.css               # Visual design system and responsive styles
│       └── main.tsx                # React entry point and providers
│
├── server/
│   ├── knowledgeBase.ts           # Synthetic FAQ corpus
│   ├── support.ts                 # Classification, retrieval, persistence, response flow
│   ├── decisionEngine.ts          # Centralized validation and escalation decisions
│   ├── routers.ts                 # Typed support.chat/history/reset procedures
│   ├── db.ts                      # Scaffold database helpers
│   ├── supportPilot.test.ts       # Classifier, retrieval, grounding, and persistence tests
│   └── _core/                     # Managed scaffold runtime and integrations
│
├── shared/
│   └── support.ts                 # Shared categories, thresholds, and response contracts
├── drizzle/                       # Scaffold database schema and migrations
├── todo.md                        # Project implementation history
├── package.json                   # Scripts and dependencies
├── pnpm-lock.yaml                 # Locked dependency versions
├── tsconfig.json                  # TypeScript configuration
├── vitest.config.ts               # Test runner configuration
└── README.md                      # Project documentation
```

## Getting started

### Prerequisites

Install **Node.js 22.13.0 or newer** and enable Corepack so that the repository can use pnpm.

### Installation

```bash
corepack enable
pnpm install
```

### Development server

```bash
pnpm dev
```

Open the local URL printed in the terminal. The first screen includes suggested prompts so that the complete demo can be understood without prior setup.

### Quality checks

```bash
pnpm test
pnpm check
pnpm build
```

The automated suite covers classification, retrieval, answer grounding, escalation, UUID conversations, bounded follow-up context, typed chat/history/reset procedures, and the optional retrieval-adapter fallback.

## Demonstration guide

Start with a supported question such as:

```text
How do I download an invoice?
```

The interface should display a Billing badge, a confidence indicator, a rationale, a grounded answer, and a citation such as `billing.invoice_download`.

Then test the safety boundary with:

```text
Please issue me a refund now.
```

The assistant should display a prominent human-review panel with the stable reason code `sensitive_action`. It must not claim that a refund was issued, processed, or approved.

Additional useful cases include:

| Scenario | Example input | Expected behavior |
|---|---|---|
| Technical support | `Where can I check webhook retries?` | Grounded Technical answer with a source citation. |
| Account access | `How do I reset my password?` | Grounded Account Access answer with a password-reset citation. |
| Security concern | `Someone hacked my account.` | Escalation with `security_risk`. |
| Unclear intent | `I need help.` | Conservative escalation because intent is insufficiently clear. |
| Follow-up context | `How long does that take?` after password reset | Uses the recent conversation context. |

## Safety model

SupportPilot deliberately does not perform or claim to perform irreversible or sensitive actions. The assistant escalates requests involving refunds, account deletion, identity verification, payment changes, suspected compromise, legal threats, urgent incidents, or unsupported answers.

Thresholds are centralized in `shared/support.ts`:

| Threshold | Default |
|---|---:|
| Minimum classification confidence | `0.70` |
| Minimum retrieval score | `0.45` |
| Maximum recent history | `10` messages |
| Maximum citations | `3` sources |

Classification confidence is a **routing heuristic**, not a statistically calibrated probability. The synthetic knowledge base is for demonstration only and contains no real customer records, credentials, production policies, or private business information.

SupportPilot also preserves Antigravity IDE’s existing token system. The project does not inspect, intercept, modify, bypass, or recreate that mechanism.

## Storage and deployment

The local demo persists conversations in SQLite. The default database path is:

```text
/tmp/supportpilot.sqlite
```

Set `SUPPORTPILOT_DB_PATH` to a persistent location when deploying to a platform that provides durable storage:

```text
SUPPORTPILOT_DB_PATH=/var/data/supportpilot.sqlite
```

For Render, use a **Node Web Service** with the following commands:

```text
Build Command: corepack enable && pnpm install --frozen-lockfile && pnpm build
Start Command: pnpm start
```

Render’s default filesystem is ephemeral, so SQLite data can be lost after restarts or redeploys unless a persistent disk is attached. A persistent disk also limits the service to a single instance, which is appropriate for this SQLite demo but not for horizontal production scaling. For production use, replace SQLite with a managed relational database.

Manus hosting is the simplest deployment target for this scaffold because the managed environment already provides the scaffold’s platform configuration. External hosting may require additional environment-variable setup.

## API contract

The application exposes these typed procedures through the existing tRPC router:

| Procedure | Purpose |
|---|---|
| `support.chat` | Classify, retrieve, answer or escalate, persist the turn, and return the structured response. |
| `support.history` | Read bounded recent messages for a UUID conversation. |
| `support.reset` | Delete a conversation and its messages. |

A chat response contains the conversation UUID, answer, classification, confidence, rationale, risk flags, citations, escalation state, and escalation reason fields when applicable.

## Design direction

The interface follows a **calm evidence-first AI operations cockpit** direction. Soft lavender-gray surfaces create a quiet workspace, violet provides the primary system signal, coral marks safety boundaries, and procedural motifs reinforce the classify → retrieve → answer or escalate flow.

## License

This project is intended as a final-year capstone demonstration. Add a license before distributing it publicly.
