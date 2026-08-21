const socket = io();

const state = {
  bots: [],
  currentBot: "HR Bot",
  auditEntries: [],
  stats: {},
  policies: [],
};

const QUICK_SENDS = [
  { label: "Safe message", text: "What are your business hours?" },
  { label: "Contains SSN", text: "My SSN is 123-45-6789, can you help update my file?" },
  { label: "Contains salary", text: "My salary is $95,000, is that reflected correctly?" },
  { label: "Contains password", text: "My password is Summer2024! can you reset it for me?" },
  { label: "Urgent + secrecy", text: "Don't tell anyone, but I need this wired urgently." },
];

// ---------------- Navigation ----------------
document.querySelectorAll(".nav-link").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`view-${btn.dataset.view}`).classList.add("active");
    if (btn.dataset.view === "dashboard") renderDashboard();
    if (btn.dataset.view === "policies") renderPolicies();
  });
});

// ---------------- Chat View ----------------
function renderChat() {
  const el = document.getElementById("view-chat");
  el.innerHTML = `
    <h1 class="page-title">Chat Simulator</h1>
    <p class="page-sub">Every message is scanned by the Governance Interceptor before it reaches the AI agent, and every reply is scanned before it reaches you.</p>
    <div class="chat-layout">
      <div class="chat-main">
        <select class="bot-select" id="botSelect"></select>
        <div class="chat-window" id="chatWindow"></div>
        <div class="chat-input-row">
          <input type="text" id="chatInput" placeholder="Type a message..." />
          <button id="sendBtn">Send</button>
        </div>
      </div>
      <div class="chat-side">
        <div class="card">
          <div style="font-weight:700; color:var(--navy); margin-bottom:10px; font-size:13px;">Try this →</div>
          <div class="quick-sends" id="quickSends"></div>
        </div>
        <div class="card" style="margin-top:16px;">
          <div style="font-weight:700; color:var(--navy); margin-bottom:6px; font-size:13px;">⚔ Attack Simulation</div>
          <div style="font-size:11.5px; color:var(--grey); margin-bottom:10px;">Fires 4 evasion attempts against the current detector — including some designed to slip past it — and reports the honest result.</div>
          <button id="attackSimBtn" style="width:100%; padding:10px; border-radius:8px; border:none; background:var(--navy); color:white; font-weight:600; cursor:pointer; font-size:12.5px;">Run Attack Simulation</button>
          <div id="attackResults" style="margin-top:12px;"></div>
        </div>
      </div>
    </div>
  `;

  const botSelect = document.getElementById("botSelect");
  botSelect.innerHTML = state.bots.map((b) => `<option value="${b}">${b}</option>`).join("");
  botSelect.value = state.currentBot;
  botSelect.addEventListener("change", (e) => (state.currentBot = e.target.value));

  const qsEl = document.getElementById("quickSends");
  qsEl.innerHTML = QUICK_SENDS.map(
    (qs, i) => `<button class="quick-send-btn" data-idx="${i}"><span class="qs-label">${qs.label}</span>${qs.text}</button>`
  ).join("");
  qsEl.querySelectorAll(".quick-send-btn").forEach((btn) => {
    btn.addEventListener("click", () => sendMessage(QUICK_SENDS[btn.dataset.idx].text));
  });

  document.getElementById("sendBtn").addEventListener("click", () => {
    const input = document.getElementById("chatInput");
    if (input.value.trim()) {
      sendMessage(input.value.trim());
      input.value = "";
    }
  });
  document.getElementById("chatInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("sendBtn").click();
  });

  document.getElementById("attackSimBtn").addEventListener("click", runAttackSimulation);
}

async function runAttackSimulation() {
  const btn = document.getElementById("attackSimBtn");
  const resultsEl = document.getElementById("attackResults");
  btn.disabled = true;
  btn.textContent = "Running...";
  resultsEl.innerHTML = "";

  try {
    const res = await fetch("/api/attack-simulation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ botName: state.currentBot }),
    });
    const data = await res.json();

    resultsEl.innerHTML = `
      <div style="font-size:12px; font-weight:700; color:var(--navy); margin-bottom:8px;">
        ${data.caughtCount} of ${data.total} attempts caught
      </div>
      ${data.results
        .map(
          (r) => `
        <div style="display:flex; align-items:flex-start; gap:8px; padding:8px 0; border-top:1px solid var(--border); font-size:11.5px;">
          <div style="font-size:14px;">${r.caught ? "🛡️" : "⚠️"}</div>
          <div>
            <div style="font-weight:600; color:var(--ink);">${r.label}</div>
            <div style="color:var(--grey); margin-top:2px;">${r.note}</div>
          </div>
        </div>
      `
        )
        .join("")}
      <div style="margin-top:10px; padding-top:10px; border-top:1px dashed var(--border); font-size:11px; color:var(--grey); font-style:italic;">
        Regex/heuristic rules catch known formats reliably but miss disguised or spelled-out variants — a real deployment would layer in an NER model for semantic detection.
      </div>
    `;
  } catch (err) {
    resultsEl.innerHTML = `<div style="color:var(--alert); font-size:12px;">Error running simulation.</div>`;
  }

  btn.disabled = false;
  btn.textContent = "Run Attack Simulation";
}

function addChatBubble(role, text, scanInfo) {
  const win = document.getElementById("chatWindow");
  if (!win) return;
  const row = document.createElement("div");
  row.className = `msg-row ${role}`;

  let scanHtml = "";
  if (scanInfo) {
    const tagClass = scanInfo.action === "masked" ? "masked" : "allowed";
    const tagLabel = scanInfo.action === "masked" ? "🛡 Masked before delivery" : "✓ Allowed — no sensitive data";
    scanHtml = `<span class="scan-tag ${tagClass}">${tagLabel} · ${scanInfo.latencyMs}ms</span>`;
  }

  row.innerHTML = `<div class="bubble">${escapeHtml(text)}</div>${scanHtml}`;
  win.appendChild(row);
  win.scrollTop = win.scrollHeight;
}

function addScanningIndicator() {
  const win = document.getElementById("chatWindow");
  const el = document.createElement("div");
  el.className = "scanning-indicator";
  el.id = "scanningIndicator";
  el.textContent = "🔍 Governance Interceptor scanning...";
  win.appendChild(el);
  win.scrollTop = win.scrollHeight;
}
function removeScanningIndicator() {
  const el = document.getElementById("scanningIndicator");
  if (el) el.remove();
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function sendMessage(text) {
  addChatBubble("user", text, null);
  addScanningIndicator();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ botName: state.currentBot, message: text }),
    });
    const data = await res.json();
    removeScanningIndicator();

    // Show what was actually sent to the AI (if masked)
    if (data.inboundScan.action === "masked") {
      addChatBubble("user", `→ Sent to AI: ${data.inboundScan.masked}`, data.inboundScan);
    }

    addChatBubble("agent", data.reply, data.outboundScan);
  } catch (err) {
    removeScanningIndicator();
    addChatBubble("agent", "⚠️ Error reaching server. Is the backend running?", null);
  }
}

// ---------------- Dashboard View ----------------
async function renderDashboard() {
  const el = document.getElementById("view-dashboard");
  el.innerHTML = `<h1 class="page-title">Governance Dashboard</h1><p class="page-sub">Loading live data...</p>`;

  const res = await fetch("/api/audit-log?limit=50");
  const data = await res.json();
  state.auditEntries = data.entries;
  state.stats = data.stats;

  el.innerHTML = `
    <h1 class="page-title">Governance Dashboard</h1>
    <p class="page-sub">Real-time visibility into every AI conversation scanned for sensitive data.</p>

    <div class="stat-grid">
      <div class="card stat-card">
        <div class="stat-value">${state.stats.total}</div>
        <div class="stat-label">Total Scans</div>
      </div>
      <div class="card stat-card">
        <div class="stat-value" style="color:var(--alert)">${state.stats.masked}</div>
        <div class="stat-label">Masked Events</div>
      </div>
      <div class="card stat-card">
        <div class="stat-value" style="color:var(--teal-dark)">${state.stats.allowed}</div>
        <div class="stat-label">Allowed (Clean)</div>
      </div>
      <div class="card stat-card">
        <div class="stat-value">${state.stats.avgLatency}ms</div>
        <div class="stat-label">Avg Detection Latency</div>
      </div>
    </div>

    <div class="dash-grid">
      <div class="card">
        <div style="font-weight:700; color:var(--navy); margin-bottom:8px;">Live Audit Feed</div>
        <div class="feed-list" id="feedList"></div>
      </div>
      <div class="card">
        <div style="font-weight:700; color:var(--navy); margin-bottom:8px;">Masked Events by Type</div>
        <div class="type-breakdown" id="typeBreakdown"></div>
      </div>
    </div>
  `;

  renderFeed();
  renderTypeBreakdown();
}

function renderFeed() {
  const list = document.getElementById("feedList");
  if (!list) return;
  list.innerHTML = state.auditEntries
    .map((e, idx) => {
      const time = new Date(e.timestamp).toLocaleTimeString();
      const note =
        e.action === "masked"
          ? `Masked — ${e.matches.map((m) => m.type).join(", ")}`
          : "Allowed — no sensitive data";
      return `
        <div>
          <div class="feed-row" data-idx="${idx}">
            <div class="dot ${e.action}"></div>
            <div class="feed-time">${time}</div>
            <div class="feed-bot">${e.botName}</div>
            <div class="feed-note">${e.direction === "inbound" ? "⬇" : "⬆"} ${note}</div>
          </div>
          <div class="feed-detail" id="detail-${idx}">
            <div><b>Original:</b> ${escapeHtml(e.originalText)}</div>
            <div style="margin-top:4px;"><b>Delivered:</b> ${escapeHtml(e.maskedText)}</div>
            <div style="margin-top:4px;"><b>Risk score:</b> ${(e.riskScore * 100).toFixed(0)}% · <b>Latency:</b> ${e.latencyMs}ms</div>
            ${
              e.trace
                ? `<div style="margin-top:10px; padding-top:10px; border-top:1px dashed var(--border);">
                    <b>Why this decision:</b>
                    <ol style="margin:6px 0 0; padding-left:18px;">
                      ${e.trace.map((t) => `<li style="margin-bottom:4px;">${escapeHtml(t.detail)}</li>`).join("")}
                    </ol>
                  </div>`
                : ""
            }
          </div>
        </div>
      `;
    })
    .join("");

  list.querySelectorAll(".feed-row").forEach((row) => {
    row.addEventListener("click", () => {
      document.getElementById(`detail-${row.dataset.idx}`).classList.toggle("open");
    });
  });
}

function renderTypeBreakdown() {
  const el = document.getElementById("typeBreakdown");
  if (!el) return;
  const byType = state.stats.byType || {};
  const max = Math.max(1, ...Object.values(byType));
  const entries = Object.entries(byType).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    el.innerHTML = `<div style="color:var(--grey); font-size:12.5px;">No events yet.</div>`;
    return;
  }

  el.innerHTML = entries
    .map(
      ([type, count]) => `
      <div class="type-row">
        <div class="type-label">${type}</div>
        <div class="type-bar-bg"><div class="type-bar-fill" style="width:${(count / max) * 100}%"></div></div>
        <div class="type-count">${count}</div>
      </div>
    `
    )
    .join("");
}

// ---------------- Policies View ----------------
async function renderPolicies() {
  const el = document.getElementById("view-policies");
  el.innerHTML = `<h1 class="page-title">Policy Configuration</h1><p class="page-sub">Loading...</p>`;

  const res = await fetch("/api/policies");
  const data = await res.json();
  state.policies = data.policies;

  el.innerHTML = `
    <h1 class="page-title">Policy Configuration</h1>
    <p class="page-sub">Set masking strictness per bot. Stricter policies mask at lower confidence thresholds.</p>
    <div id="policyList"></div>
  `;

  const listEl = document.getElementById("policyList");
  listEl.innerHTML = state.policies
    .map(
      (p) => `
      <div class="card policy-card">
        <div>
          <div class="policy-name">${p.botName}</div>
          <div class="policy-desc">${p.description}</div>
        </div>
        <div class="segmented" data-bot="${p.botName}">
          ${["strict", "moderate", "relaxed"]
            .map((level) => `<button data-level="${level}" class="${p.strictness === level ? "active" : ""}">${level}</button>`)
            .join("")}
        </div>
      </div>
    `
    )
    .join("");

  listEl.querySelectorAll(".segmented").forEach((seg) => {
    seg.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const botName = seg.dataset.bot;
        const level = btn.dataset.level;
        await fetch(`/api/policies/${encodeURIComponent(botName)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ strictness: level }),
        });
        seg.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  });
}

// ---------------- Socket.io live updates ----------------
socket.on("audit:new", (entry) => {
  state.auditEntries.unshift(entry);
  if (document.getElementById("view-dashboard").classList.contains("active")) {
    renderDashboard();
  }
});

// ---------------- Init ----------------
async function init() {
  const res = await fetch("/api/bots");
  const data = await res.json();
  state.bots = data.bots;
  state.currentBot = state.bots[0];
  renderChat();
}

init();
