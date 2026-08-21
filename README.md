# AI Safety & Governance Layer

**Cognizant Techathon — Problem Statement Prototype**

Real-time PII/sensitive-data interceptor and audit dashboard for AI chatbot conversations.

## The Problem

Enterprises are embedding AI agents into customer support, HR, and internal tools. Sensitive
data — SSNs, salaries, medical IDs, phone numbers — frequently flows into these conversations
unchecked. Existing tools scan static documents once; nobody protects data **moving live**
through an AI conversation, and nobody can prove after the fact what was blocked and why.

## The Solution

A **Governance Interceptor** sits between the user and the AI agent, watching both directions
of every conversation:

1. **Live detection** — regex + heuristic scanning catches PII (SSN, email, phone, salary,
   medical IDs) and social-engineering language (urgency, secrecy requests) as it's typed.
2. **Mask before delivery** — sensitive content is redacted (`[REDACTED:SSN]`) before it ever
   reaches the LLM, and the AI's reply is scanned again before it reaches the user.
3. **Explainable audit trail** — every decision (masked or allowed) is logged with the rule
   that fired, the confidence score, and the latency — not a silent black box.
4. **Per-bot policy control** — HR bots can run "strict," public FAQ bots can run "relaxed" —
   configurable without redeploying code.

## Tech Stack

- **Backend:** Node.js + Express + Socket.io (real-time audit feed)
- **Detection:** Regex + heuristic rule engine (`server/detectionEngine.js`)
- **Frontend:** Vanilla HTML/CSS/JS (no build step — runs instantly)
- **Storage:** In-memory audit log (swap for PostgreSQL in production)
- **Mock AI Agent:** Simulated chatbot responses — no API key required for the demo

## Project Structure

```
ai-governance-layer/
├── server/
│   ├── server.js            # Express + Socket.io app, ties everything together
│   ├── detectionEngine.js   # PII/sensitive-entity regex + heuristic scanner
│   ├── policyEngine.js      # Per-bot strictness thresholds
│   ├── auditLog.js          # In-memory audit trail + seed data
│   └── mockAgent.js         # Simulated AI chatbot (no external API needed)
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js                # Chat simulator, dashboard, policy UI
├── package.json
└── README.md
```

## How to Run

```bash
npm install
npm start
```

Then open **http://localhost:4000** in your browser.

## Demo Script (30 seconds)

1. **Chat Simulator tab** — click **"Safe message"** quick-send. Show it goes through
   untouched: no redaction tag, `Allowed` in green.
2. Click **"Contains SSN"** quick-send. Show the message gets masked *before* it reaches the
   AI (you'll see `→ Sent to AI: My SSN is [REDACTED:SSN]...`) — the AI never actually saw
   the real number.
3. Click **"Contains salary"** or **"Urgent + secrecy"** — show a different entity type/social-
   engineering pattern getting caught.
4. Switch to the **Dashboard tab** — show the live feed updating in real time (Socket.io),
   the stat cards (total scans, masked count, avg latency), and the breakdown-by-type chart.
   Click a feed row to expand and show original vs. delivered text side-by-side.
5. Switch to the **Policies tab** — change "Public FAQ Bot" from Relaxed to Strict, go back to
   Chat Simulator, send the same "safe" message under that bot, and show how a different
   strictness level changes what gets flagged.

## Extending to a Real LLM (Optional)

Replace `server/mockAgent.js`'s `getAgentReply()` with a real API call (OpenAI, Anthropic,
Azure OpenAI, etc.) — the interceptor logic doesn't change, since it scans whatever text comes
back regardless of source. This is the point of the architecture: governance is a layer around
the AI, not baked into it.

## Limitations (MVP)

- Detection is regex/heuristic-based — a production version would add an NER model for
  higher recall on unusual PII formats and non-English text.
- In-memory storage — swap for a real database for persistence across restarts.
- No auth/RBAC on the dashboard — add before any real deployment.

---
© 2026 — Built for Cognizant Techathon
