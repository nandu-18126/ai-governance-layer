// server.js
const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const { scanText, maskText, riskScore } = require("./detectionEngine");
const policyEngine = require("./policyEngine");
const auditLog = require("./auditLog");
const mockAgent = require("./mockAgent");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

const server = http.createServer(app);
const io = new Server(server);

auditLog.seed();

function runGovernanceScan(botName, direction, text) {
  const start = Date.now();
  const matches = scanText(text);
  const threshold = policyEngine.getThreshold(botName);
  const strictness = policyEngine.getPolicies().find((p) => p.botName === botName)?.strictness || "moderate";
  const shouldMask = matches.some((m) => m.confidence >= threshold);
  const masked = shouldMask ? maskText(text, matches) : text;
  const latencyMs = Date.now() - start + 20 + Math.round(Math.random() * 60); // simulate realistic network+model overhead

  // ---- Build an explainability trace: the step-by-step reasoning behind the decision ----
  const trace = [];
  trace.push({ step: "scan", detail: `Scanned message against ${8} detection rules (PII patterns + risk phrases).` });
  if (matches.length === 0) {
    trace.push({ step: "no-match", detail: "No sensitive patterns matched anywhere in the text." });
  } else {
    matches.forEach((m) => {
      trace.push({
        step: "match",
        detail: `Rule "${m.rule}" matched "${m.matchedText}" → type ${m.type}, confidence ${(m.confidence * 100).toFixed(0)}%.`,
      });
    });
  }
  trace.push({ step: "policy", detail: `Policy for "${botName}" is set to "${strictness}" → masking threshold ${(threshold * 100).toFixed(0)}%.` });
  trace.push({
    step: "decision",
    detail: shouldMask
      ? `At least one match's confidence was ≥ threshold → DECISION: MASKED.`
      : `No match reached the threshold → DECISION: ALLOWED.`,
  });

  const entry = auditLog.addEntry({
    botName,
    direction,
    originalText: text,
    maskedText: masked,
    matches,
    action: shouldMask ? "masked" : "allowed",
    riskScore: riskScore(matches),
    latencyMs,
    trace,
  });

  io.emit("audit:new", entry);

  return { text: masked, matches, action: entry.action, entry, latencyMs, trace };
}

app.post("/api/chat", (req, res) => {
  const { botName, message } = req.body;
  if (!botName || !message) {
    return res.status(400).json({ error: "botName and message are required" });
  }

  // 1. Scan + mask the INBOUND message before it "reaches" the AI agent
  const inboundScan = runGovernanceScan(botName, "inbound", message);

  // 2. The mock AI agent only ever sees the (possibly masked) inbound text
  const rawReply = mockAgent.getAgentReply(botName, inboundScan.text);

  // 3. Scan + mask the OUTBOUND reply before it reaches the user
  const outboundScan = runGovernanceScan(botName, "outbound", rawReply);

  res.json({
    reply: outboundScan.text,
    inboundScan: {
      original: message,
      masked: inboundScan.text,
      matches: inboundScan.matches,
      action: inboundScan.action,
      latencyMs: inboundScan.latencyMs,
    },
    outboundScan: {
      original: rawReply,
      masked: outboundScan.text,
      matches: outboundScan.matches,
      action: outboundScan.action,
      latencyMs: outboundScan.latencyMs,
    },
  });
});

app.get("/api/audit-log", (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  res.json({ entries: auditLog.getRecent(limit), stats: auditLog.getStats() });
});

app.get("/api/policies", (req, res) => {
  res.json({ policies: policyEngine.getPolicies() });
});

app.post("/api/policies/:botName", (req, res) => {
  const { botName } = req.params;
  const { strictness } = req.body;
  try {
    const updated = policyEngine.setStrictness(botName, strictness);
    res.json({ botName, ...updated });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/api/bots", (req, res) => {
  res.json({ bots: policyEngine.listBotNames() });
});

// ---- Attack Simulation: a scripted set of evasion attempts, evaluated honestly ----
const ATTACK_SEQUENCE = [
  { label: "Direct SSN (baseline)", text: "My SSN is 123-45-6789, please help.", expectCatch: true },
  { label: "Spaced-out SSN", text: "My SSN is 1 2 3 - 4 5 - 6 7 8 9, please help.", expectCatch: false },
  { label: "Unicode lookalike hyphen", text: "My SSN is 123\u201145\u20116789, please help.", expectCatch: false },
  { label: "Spelled-out email", text: "Reach me at jane dot doe at email dot com", expectCatch: false },
];

app.post("/api/attack-simulation", (req, res) => {
  const { botName } = req.body;
  const results = ATTACK_SEQUENCE.map((atk) => {
    const scan = runGovernanceScan(botName || "HR Bot", "inbound", atk.text);
    const caught = scan.action === "masked";
    return {
      label: atk.label,
      text: atk.text,
      caught,
      expectCatch: atk.expectCatch,
      note: caught
        ? "Caught — pattern matched a detection rule."
        : "Missed — evaded the current regex/heuristic rules.",
    };
  });
  const caughtCount = results.filter((r) => r.caught).length;
  res.json({ results, caughtCount, total: results.length });
});

io.on("connection", (socket) => {
  socket.emit("audit:init", auditLog.getRecent(50));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`AI Governance Layer server running on http://localhost:${PORT}`);
});
