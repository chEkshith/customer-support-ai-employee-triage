# Project TODO

- [x] Build responsive SupportPilot chat screen with message history, composer, send/loading/error states, category and confidence badges, sources, escalation panel, and reset flow.
- [x] Keep all classification, retrieval, answer generation, safety, and escalation decisions on the backend.
- [x] Add deterministic four-way message classification with heuristic confidence, rationale, and risk flags.
- [x] Add at least 24 synthetic local SupportPilot knowledge-base entries across Billing, Technical, Account Access, and Other / Out of Scope handling.
- [x] Add local semantic retrieval when available with lexical fallback and source metadata.
- [x] Add template-based grounded answer generation with source citation validation and optional Ollama adapter boundary.
- [x] Add conservative threshold-based decision engine for low-confidence, unsupported, risky, sensitive-action, security, outage, and out-of-scope requests.
- [x] Add backend-generated UUID conversations, bounded latest-10-message context, and local file persistence fallback.
- [x] Add focused automated tests for classification, retrieval, escalation, chat API, and key UI states.
- [x] Add concise demo-friendly README with setup, architecture, safety boundaries, and demo script.
- [x] Run type checks, tests, build validation, and responsive visual review.
