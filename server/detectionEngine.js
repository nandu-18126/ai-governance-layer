// detectionEngine.js
// Scans text for sensitive entities using regex + keyword heuristics.
// Returns matches with type, position, confidence, and the rule that fired.

const RULES = [
  {
    type: "SSN",
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    confidence: 0.98,
    rule: "SSN pattern (XXX-XX-XXXX)",
  },
  {
    type: "CREDIT_CARD",
    regex: /\b(?:\d[ -]*?){13,16}\b/g,
    confidence: 0.9,
    rule: "Credit card-like digit sequence",
  },
  {
    type: "EMAIL",
    regex: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
    confidence: 0.95,
    rule: "Email address pattern",
  },
  {
    type: "PHONE",
    regex: /\b(?:\+?\d{1,2}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}\b/g,
    confidence: 0.85,
    rule: "Phone number pattern",
  },
  {
    type: "SALARY",
    regex: /\b(?:salary|compensation|pay)\s+(?:is|of)?\s*\$?\d{2,3}(?:,\d{3})+\b/gi,
    confidence: 0.8,
    rule: "Salary figure mention",
  },
  {
    type: "SALARY_AMOUNT",
    regex: /\$\d{2,3},\d{3}(?:\.\d{2})?/g,
    confidence: 0.7,
    rule: "Dollar amount (possible compensation)",
  },
  {
    type: "MEDICAL_ID",
    regex: /\b(?:MRN|patient id|medical record)\D{0,5}\d{4,10}\b/gi,
    confidence: 0.9,
    rule: "Medical record identifier",
  },
  {
    type: "CREDENTIALS",
    regex: /\b(?:password|pwd|pass|login|username|user\s?id)\s*(?:is|:|=)\s*\S+/gi,
    confidence: 0.92,
    rule: "Credential phrasing (password/login/username + value)",
  },
];

// Social-engineering / urgency phrases — not PII, but a governance risk signal.
const RISK_PHRASES = [
  { phrase: /don'?t tell (?:anyone|my|the)/gi, type: "SOCIAL_ENGINEERING", confidence: 0.75, rule: "Secrecy request" },
  { phrase: /wire (?:the )?money|send money now|transfer funds immediately/gi, type: "SOCIAL_ENGINEERING", confidence: 0.85, rule: "Urgent money transfer request" },
  { phrase: /urgent(?:ly)?|right now|immediately/gi, type: "URGENCY", confidence: 0.4, rule: "Urgency language" },
];

function scanText(text) {
  if (!text || typeof text !== "string") return [];
  const matches = [];

  for (const r of RULES) {
    let m;
    const re = new RegExp(r.regex.source, r.regex.flags);
    while ((m = re.exec(text)) !== null) {
      matches.push({
        type: r.type,
        matchedText: m[0],
        startIndex: m.index,
        endIndex: m.index + m[0].length,
        confidence: r.confidence,
        rule: r.rule,
      });
      if (m.index === re.lastIndex) re.lastIndex++; // avoid infinite loop on zero-length match
    }
  }

  for (const rp of RISK_PHRASES) {
    let m;
    const re = new RegExp(rp.phrase.source, rp.phrase.flags);
    while ((m = re.exec(text)) !== null) {
      matches.push({
        type: rp.type,
        matchedText: m[0],
        startIndex: m.index,
        endIndex: m.index + m[0].length,
        confidence: rp.confidence,
        rule: rp.rule,
      });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }

  // Sort by position, resolve overlaps by keeping the highest-confidence match
  matches.sort((a, b) => a.startIndex - b.startIndex || b.confidence - a.confidence);
  const resolved = [];
  let lastEnd = -1;
  for (const m of matches) {
    if (m.startIndex >= lastEnd) {
      resolved.push(m);
      lastEnd = m.endIndex;
    }
  }
  return resolved;
}

function maskText(text, matches) {
  if (!matches || matches.length === 0) return text;
  let result = "";
  let cursor = 0;
  for (const m of matches) {
    result += text.slice(cursor, m.startIndex);
    result += `[REDACTED:${m.type}]`;
    cursor = m.endIndex;
  }
  result += text.slice(cursor);
  return result;
}

function riskScore(matches) {
  if (!matches || matches.length === 0) return 0;
  const top = Math.max(...matches.map((m) => m.confidence));
  const volumeBoost = Math.min(matches.length * 0.05, 0.2);
  return Math.min(1, top + volumeBoost);
}

module.exports = { scanText, maskText, riskScore, RULES };
