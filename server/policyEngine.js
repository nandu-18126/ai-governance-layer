// policyEngine.js
// In-memory policy config: each bot has a strictness level that maps to a
// confidence threshold. Anything scanned at or above the threshold gets masked.

const THRESHOLDS = {
  strict: 0.35,
  moderate: 0.6,
  relaxed: 0.8,
};

const STRICTNESS_DESCRIPTIONS = {
  strict: "Masks aggressively — best for HR, payroll, and medical bots handling highly sensitive data.",
  moderate: "Balanced default — masks confirmed PII, allows borderline/low-confidence signals through.",
  relaxed: "Masks only high-confidence PII — best for public-facing FAQ or marketing bots.",
};

let policies = {
  "HR Bot": { strictness: "strict" },
  "Support Bot": { strictness: "moderate" },
  "Public FAQ Bot": { strictness: "relaxed" },
};

function getThreshold(botName) {
  const level = policies[botName]?.strictness || "moderate";
  return THRESHOLDS[level];
}

function getPolicies() {
  return Object.entries(policies).map(([botName, cfg]) => ({
    botName,
    strictness: cfg.strictness,
    threshold: THRESHOLDS[cfg.strictness],
    description: STRICTNESS_DESCRIPTIONS[cfg.strictness],
  }));
}

function setStrictness(botName, level) {
  if (!THRESHOLDS[level]) throw new Error(`Invalid strictness level: ${level}`);
  if (!policies[botName]) policies[botName] = {};
  policies[botName].strictness = level;
  return policies[botName];
}

function listBotNames() {
  return Object.keys(policies);
}

module.exports = { getThreshold, getPolicies, setStrictness, listBotNames, THRESHOLDS, STRICTNESS_DESCRIPTIONS };
