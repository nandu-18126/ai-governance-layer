// mockAgent.js
// Simulates an AI chatbot's reply without calling a real LLM, so the demo
// works with zero API keys. Occasionally echoes context back (including
// any PII that slipped through) so the OUTBOUND scan has something to catch.

const GENERIC_REPLIES = [
  "Got it — I've noted that down. Is there anything else I can help with?",
  "Thanks for sharing that. Let me look into it for you.",
  "I understand. Here's what I can do to help with your request.",
  "That's been recorded. You should see the update shortly.",
];

function getAgentReply(botName, userMessage) {
  const lower = userMessage.toLowerCase();

  if (lower.includes("hours")) {
    return "Our business hours are Monday–Friday, 9 AM to 6 PM.";
  }
  if (lower.includes("discount")) {
    return "Yes, we offer a 10% student discount with a valid ID.";
  }
  if (lower.includes("ship")) {
    return "Yes, we ship internationally to over 40 countries.";
  }
  if (lower.includes("refund") || lower.includes("order")) {
    return `Your refund of $1,200 has been processed and should arrive in 3–5 business days.`;
  }
  if (lower.includes("thanks") || lower.includes("thank you")) {
    return "You're welcome! Let me know if you need anything else.";
  }

  // "Accidental leak" simulation: if the user message itself contains PII-shaped
  // content, there's a chance the mock agent echoes it back verbatim in confirmation,
  // simulating a careless AI response that governance still needs to catch.
  const looksSensitive = /\d{3}-\d{2}-\d{4}|\$\d{2,3},\d{3}|@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|\d{3}[\s-]?\d{3}[\s-]?\d{4}/.test(userMessage);
  if (looksSensitive && Math.random() < 0.7) {
    return `Sure, I've confirmed and updated the record for: "${userMessage}". Let me know if that's correct.`;
  }

  return GENERIC_REPLIES[Math.floor(Math.random() * GENERIC_REPLIES.length)];
}

module.exports = { getAgentReply };
