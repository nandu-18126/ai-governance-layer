# 🛡️ AI Safety & Governance Layer

**Cognizant Techathon — Problem Statement Prototype**

Real-time PII/sensitive-data interceptor and audit dashboard for AI chatbot conversations.

🔗 **Live Demo:** https://ai-governance-layer.onrender.com
📂 **Repo:** https://github.com/nandu-18126/ai-governance-layer

---

## The Problem

Enterprises are rapidly embedding AI agents into customer support, HR, and internal tools. Sensitive data — SSNs, salaries, medical IDs, login credentials — frequently flows into these conversations unchecked.

Existing tools scan static documents **once**. Nobody protects data **moving live** through an AI conversation, and nobody can prove after the fact what was blocked and why.

## The Solution

A **Governance Interceptor** sits between the user and the AI agent, watching both directions of every conversation:

1. **Live detection** — regex + heuristic scanning catches PII (SSN, email, phone, salary, medical IDs, credentials) and social-engineering language (urgency, secrecy requests) as it's typed.
2. **Mask before delivery** — sensitive content is redacted (`[REDACTED:SSN]`) before it ever reaches the LLM, and the AI's reply is scanned again before it reaches the user.
3. **Explainable audit trail** — every decision (masked or allowed) is logged with a step-by-step reasoning trace: which rule fired, what confidence it had, what policy threshold applied, and why the final call was made. Not a black box.
4. **Per-bot policy control** — HR bots can run "strict," public FAQ bots can run "relaxed" — configurable without redeploying code.
5. **Attack Simulation mode** — a built-in stress test that fires evasion attempts (spaced-out digits, unicode lookalikes, spelled-out text) against the detector and honestly reports what gets caught vs. missed.

## Why This Is Different

Most PII tools scan a document once and stop there. This project treats governance as a **live layer around every AI conversation** — not a one-time check — and is transparent about its own limitations instead of claiming perfect detection.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Real-time updates | Socket.io |
| Detection engine | Regex + heuristic rule engine |
| Frontend | Vanilla HTML / CSS / JavaScript (no build step) |
| Storage | In-memory audit log (swap for PostgreSQL in production) |
| AI Agent | Simulated mock chatbot — no external API key required |

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

---

## How to Run Locally

```bash
git clone https://github.com/YOUR-USERNAME/ai-governance-layer.git
cd ai-governance-layer
npm install
npm start
```

Then open **http://localhost:4000** in your browser.

---

## Detection Rules Currently Covered

| Type | Example |
|---|---|
| SSN | `123-45-6789` |
| Email | `jane.doe@email.com` |
| Phone | `(555) 987-6543` |
| Credit Card | `4111 1111 1111 1111` |
| Salary | `salary is $95,000` |
| Medical Record ID | `MRN 88213` |
| Credentials | `password is Summer2024!` |
| Social Engineering | `don't tell anyone`, `wire money now` |

---

## Demo Script (30 seconds)

1. **Chat Simulator tab** → click **"Safe message"**. Show it passes through untouched — green "Allowed" tag.
2. Click **"Contains SSN"**. Show the message gets masked *before* reaching the AI (`→ Sent to AI: My [REDACTED:SSN]...`).
3. Click **"Run Attack Simulation"**. Show the honest result — some evasion attempts are caught, some slip through — and explain this proves the system was stress-tested, not just claimed to work.
4. **Dashboard tab** → click any feed entry to expand its **explainability trace**: rule matched, confidence score, policy threshold, final decision.
5. **Policies tab** → change a bot's strictness live, go back to Chat Simulator, and show the same message get treated differently.

---

## Known Limitations (MVP)

- Detection is regex/heuristic-based — misses disguised formats (spaced-out digits, unicode lookalikes, spelled-out text). A production version would add an NER/ML model for semantic detection — proven honestly via the built-in Attack Simulation.
- In-memory storage — swap for a real database for persistence across restarts.
- No authentication/role-based access on the Policies page — in production, only a Compliance Admin role should be able to change strictness settings.

## Extending to a Real LLM

Replace `server/mockAgent.js`'s `getAgentReply()` with a real API call (OpenAI, Anthropic, Azure OpenAI, etc.) — the interceptor logic doesn't change, since it scans whatever text comes back regardless of source. Governance is a layer *around* the AI, not baked into it.

---

## Team

- Team Name: Zenith
- Year:III
- Department:CSE
- College: Panimalar Engineering college

---

© 2026 — Built for Cognizant Techathon
