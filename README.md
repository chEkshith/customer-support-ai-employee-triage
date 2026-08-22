# SupportPilot

SupportPilot is a local-first Tier-1 support triage demo. It classifies each message as **Billing**, **Technical**, **Account Access**, or **Other / Out of Scope**, retrieves synthetic guidance, and returns a source-cited answer only when the evidence is sufficient. Risky, ambiguous, sensitive, urgent, and unsupported requests receive a visible human-review escalation instead.

## Run locally

Install dependencies with `pnpm install`, then start the app with `pnpm dev`. Open the printed preview URL. The frontend is a React + TypeScript experience and the server exposes the typed `support.chat` and `support.reset` operations. Conversation history is persisted locally in `supportpilot-conversations.json`; this intentionally lightweight store keeps the demo runnable without external services. It can be replaced by SQLite or the scaffold database layer without changing the typed chat contract.

## Architecture

The compact implementation keeps the core decision path in `server/supportpilot.ts`: normalization and deterministic classification, optional semantic-scoring switch with lexical fallback, top-three retrieval, citation validation, bounded history, and escalation decisions. The API boundary lives in `server/routers.ts`; the primary UI is `client/src/pages/Home.tsx`, with styling in `client/src/index.css`. Conversation context is capped at the latest ten stored messages.

## Demo script

Start with “How do I download an invoice?” to show a grounded Billing answer, source identifier, and confidence badge. Follow with “How long does that take?” to demonstrate the same conversation ID. Then try “Please refund and delete my account” to show a sensitive-action escalation, followed by “I think my account was hacked” for a security escalation. Finally, use **New conversation** to clear the bounded context.

## Safety boundaries

This is fictional support data only. The assistant does not inspect or modify credentials, tokens, payment methods, account status, or production systems. It does not perform refunds, deletion, identity verification, or other irreversible actions. Confidence is a conservative heuristic, not a statistically calibrated probability. Ollama or another local language model can be added behind a server-side adapter later, but it must not override deterministic safety decisions.

## Validation

Run `pnpm check` for TypeScript validation and `pnpm test -- --pool=forks --poolOptions.forks.singleFork` for focused classification, retrieval, grounding, escalation, and typed router tests. The UI includes empty, loading, error, citation, reset, responsive, and escalation states; the final visual review was checked against the desktop preview and narrow-screen CSS breakpoint.
