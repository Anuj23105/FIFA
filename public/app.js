/* PitchPal front-end controller. Vanilla ES modules, no external deps,
   so it works under a strict self-only Content Security Policy. */

const api = {
  async health() {
    const r = await fetch('/api/health');
    return r.json();
  },
  async chat(message) {
    const r = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.error || 'Request failed');
    }
    return r.json();
  },
  async venues() {
    const r = await fetch('/api/venues');
    return r.json();
  },
  async crowd(venueId, minutesToKickoff) {
    const r = await fetch(`/api/crowd/${venueId}?minutesToKickoff=${minutesToKickoff}`);
    return r.json();
  },
};

/* ---------- Assistant ---------- */

const transcript = document.getElementById('transcript');
const form = document.getElementById('chat-form');
const input = document.getElementById('message');
const sendBtn = document.getElementById('send-btn');

function addMessage(text, who, meta) {
  const el = document.createElement('div');
  el.className = `msg ${who}`;
  el.textContent = text;
  if (meta) {
    const m = document.createElement('span');
    m.className = 'meta';
    m.textContent = meta;
    el.appendChild(m);
  }
  transcript.appendChild(el);
  transcript.scrollTop = transcript.scrollHeight;
  return el;
}

async function ask(message) {
  if (!message.trim()) return;
  addMessage(message, 'user');
  input.value = '';
  sendBtn.disabled = true;
  const pending = addMessage('…', 'bot');
  try {
    const res = await api.chat(message);
    const meta = [
      res.intent && res.intent !== 'general' ? `intent: ${res.intent}` : null,
      res.language ? `lang: ${res.language}` : null,
      res.venue ? res.venue.name : null,
      `via ${res.generator}`,
    ]
      .filter(Boolean)
      .join(' · ');
    pending.textContent = res.reply;
    const m = document.createElement('span');
    m.className = 'meta';
    m.textContent = meta;
    pending.appendChild(m);
  } catch (err) {
    pending.textContent = `Sorry, something went wrong: ${err.message}`;
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  ask(input.value);
});

document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => ask(chip.dataset.q));
});

/* ---------- Operations ---------- */

const venueSelect = document.getElementById('venue-select');
const mtk = document.getElementById('mtk');
const mtkValue = document.getElementById('mtk-value');
const opsStatus = document.getElementById('ops-status');
const gateList = document.getElementById('gate-list');
const recList = document.getElementById('rec-list');

function statusLabel(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function refreshCrowd() {
  const venueId = venueSelect.value;
  if (!venueId) return;
  const minutes = Number(mtk.value);
  try {
    const snap = await api.crowd(venueId, minutes);

    opsStatus.textContent = `${snap.venueName}: ${statusLabel(snap.overallStatus)} load · avg occupancy ${Math.round(
      snap.averageOccupancy * 100,
    )}% · ${snap.minutesToKickoff} min to kickoff`;

    gateList.innerHTML = '';
    for (const g of snap.gates) {
      const li = document.createElement('li');
      li.className = 'gate-item';

      const name = document.createElement('span');
      name.className = 'gate-name';
      name.textContent = `Gate ${g.gate}`;

      const bar = document.createElement('span');
      bar.className = 'bar';
      bar.setAttribute('role', 'progressbar');
      bar.setAttribute('aria-valuenow', String(Math.round(g.occupancy * 100)));
      bar.setAttribute('aria-valuemin', '0');
      bar.setAttribute('aria-valuemax', '100');
      bar.setAttribute('aria-label', `Gate ${g.gate} occupancy`);
      const fill = document.createElement('span');
      fill.className = `fill-${g.status}`;
      fill.style.width = `${Math.round(g.occupancy * 100)}%`;
      bar.appendChild(fill);

      const pill = document.createElement('span');
      pill.className = `status-pill status-${g.status}`;
      pill.textContent = `${statusLabel(g.status)} · ${g.estimatedWaitMinutes}m`;

      li.append(name, bar, pill);
      gateList.appendChild(li);
    }

    recList.innerHTML = '';
    for (const rec of snap.recommendations) {
      const li = document.createElement('li');
      li.textContent = rec;
      recList.appendChild(li);
    }
  } catch {
    opsStatus.textContent = 'Unable to load crowd data.';
  }
}

mtk.addEventListener('input', () => {
  mtkValue.textContent = mtk.value;
  mtk.setAttribute('aria-valuenow', mtk.value);
  refreshCrowd();
});
venueSelect.addEventListener('change', refreshCrowd);

/* ---------- Init ---------- */

async function init() {
  try {
    const health = await api.health();
    const badge = document.getElementById('mode-badge');
    badge.textContent = health.llm === 'live' ? 'GenAI: live model' : 'GenAI: grounded engine';
  } catch {
    /* non-fatal */
  }

  try {
    const { venues } = await api.venues();
    for (const v of venues) {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = `${v.name} — ${v.city}`;
      venueSelect.appendChild(opt);
    }
    if (venues.length > 0) {
      venueSelect.value = venues[0].id;
      refreshCrowd();
    }
  } catch {
    opsStatus.textContent = 'Unable to load venues.';
  }

  addMessage(
    'Welcome to PitchPal. Ask me about your match day — navigation, transport, accessibility, crowds, sustainability, safety, or tickets.',
    'bot',
  );
}

init();
