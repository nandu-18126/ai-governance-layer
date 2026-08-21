// auditLog.js
// In-memory audit trail. Every scan (inbound or outbound) gets logged here
// with the reasoning behind the decision, so nothing is a silent black box.

let log = [];
let nextId = 1;

function addEntry(entry) {
  const record = {
    id: nextId++,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  log.unshift(record); // newest first
  if (log.length > 500) log = log.slice(0, 500);
  return record;
}

function getRecent(limit = 50) {
  return log.slice(0, limit);
}

function getStats() {
  const total = log.length;
  const masked = log.filter((e) => e.action === "masked").length;
  const allowed = total - masked;
  const lowConfidenceAllowed = log.filter(
    (e) => e.action === "allowed" && e.matches?.some((m) => m.confidence >= 0.3 && m.confidence < 0.6)
  ).length;
  const avgLatency =
    total === 0 ? 0 : Math.round(log.reduce((sum, e) => sum + (e.latencyMs || 0), 0) / total);

  const byType = {};
  log.forEach((e) => {
    (e.matches || []).forEach((m) => {
      byType[m.type] = (byType[m.type] || 0) + 1;
    });
  });

  return { total, masked, allowed, lowConfidenceAllowed, avgLatency, byType };
}

// ---- Seed data so the dashboard looks alive on first load ----
function seed() {
  const now = Date.now();
  const sample = [
    { bot: "HR Bot", dir: "inbound", text: "My SSN is 123-45-6789, please update my file.", type: "SSN", conf: 0.98, action: "masked" },
    { bot: "HR Bot", dir: "outbound", text: "Sure, I've noted the update for record [REDACTED:SSN].", type: "SSN", conf: 0.98, action: "masked" },
    { bot: "Support Bot", dir: "inbound", text: "Hi, my order hasn't arrived yet, can you check?", type: null, conf: 0, action: "allowed" },
    { bot: "HR Bot", dir: "inbound", text: "My salary is $95,000, is that reflected correctly?", type: "SALARY", conf: 0.8, action: "masked" },
    { bot: "Public FAQ Bot", dir: "inbound", text: "What are your business hours?", type: null, conf: 0, action: "allowed" },
    { bot: "Support Bot", dir: "inbound", text: "You can reach me at jane.doe@email.com or 555-123-4567.", type: "EMAIL", conf: 0.95, action: "masked" },
    { bot: "HR Bot", dir: "inbound", text: "Don't tell anyone but I need this processed urgently.", type: "SOCIAL_ENGINEERING", conf: 0.75, action: "masked" },
    { bot: "Public FAQ Bot", dir: "inbound", text: "Do you ship internationally?", type: null, conf: 0, action: "allowed" },
    { bot: "Support Bot", dir: "outbound", text: "Your refund of $1,200 has been processed.", type: "SALARY_AMOUNT", conf: 0.7, action: "masked" },
    { bot: "HR Bot", dir: "inbound", text: "Patient ID MRN 88213 needs an update.", type: "MEDICAL_ID", conf: 0.9, action: "masked" },
    { bot: "Public FAQ Bot", dir: "inbound", text: "Is there a student discount?", type: null, conf: 0, action: "allowed" },
    { bot: "Support Bot", dir: "inbound", text: "My card number is 4111 1111 1111 1111 for the refund.", type: "CREDIT_CARD", conf: 0.9, action: "masked" },
    { bot: "HR Bot", dir: "inbound", text: "Please wire money to this account immediately.", type: "SOCIAL_ENGINEERING", conf: 0.85, action: "masked" },
    { bot: "Support Bot", dir: "inbound", text: "Thanks, that resolved my issue!", type: null, conf: 0, action: "allowed" },
    { bot: "HR Bot", dir: "inbound", text: "Call me at (555) 987-6543 to discuss.", type: "PHONE", conf: 0.85, action: "masked" },
  ];

  sample.forEach((s, i) => {
    const matches = s.type ? [{ type: s.type, matchedText: "***", startIndex: 0, endIndex: 3, confidence: s.conf, rule: "seed data" }] : [];
    const record = {
      id: nextId++,
      timestamp: new Date(now - (sample.length - i) * 4 * 60 * 1000).toISOString(),
      botName: s.bot,
      direction: s.dir,
      originalText: s.text,
      maskedText: s.type ? s.text.replace(/./g, "") + `[REDACTED:${s.type}]` : s.text,
      matches,
      action: s.action,
      riskScore: s.conf,
      latencyMs: 40 + Math.round(Math.random() * 80),
    };
    log.push(record);
  });
  log.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

module.exports = { addEntry, getRecent, getStats, seed };
