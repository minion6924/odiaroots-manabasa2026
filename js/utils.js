/* =====================================================================
   Odia Roots — Manabasa Gurubar Heritage Competition 2026
   Shared utilities: constants, API helpers, scoring, auth, formatting
   ===================================================================== */

const ORM = (() => {
  'use strict';

  /* ---------------- Constants ---------------- */

  const CATEGORIES = [
    'Best Overall Manabasa Presentation',
    'Best Traditional Jhoti Chita',
    'Best Pitha or Bhoga Presentation',
    'Best Family Participation',
    "Best Children's Presentation",
    'Best Cultural Storytelling Video',
    'Most Creative Presentation',
    "People's Choice Award"
  ];

  const PEOPLES_CHOICE = "People's Choice Award";

  // Winner certificate award names per category
  const AWARD_NAMES = {
    'Best Overall Manabasa Presentation': 'Odia Roots Manabasa Heritage Champion',
    'Best Traditional Jhoti Chita': 'Maa Lakshmi Jhoti Samman',
    'Best Pitha or Bhoga Presentation': 'Manabasa Pitha Parampara Award',
    'Best Family Participation': 'Odia Heritage Family Award',
    "Best Children's Presentation": 'Young Odia Heritage Ambassador',
    'Best Cultural Storytelling Video': 'Lakshmi Purana Heritage Voice',
    'Most Creative Presentation': 'Creative Odia Tradition Award',
    "People's Choice Award": 'Community Choice Award'
  };

  // Judging criteria with exact weights (sum = 100%)
  const CRITERIA = [
    { key: 'cultural_authenticity',        label: 'Cultural Authenticity',                              weight: 0.25 },
    { key: 'presentation_quality',         label: 'Presentation Quality (Jhoti/Pitha/craft quality)',   weight: 0.20 },
    { key: 'explanation_storytelling',     label: 'Explanation & Storytelling',                         weight: 0.20 },
    { key: 'family_youth_participation',   label: 'Family & Youth Participation',                       weight: 0.15 },
    { key: 'creativity',                   label: 'Creativity',                                         weight: 0.10 },
    { key: 'overall_video_presentation',   label: 'Overall Video Presentation',                         weight: 0.10 }
  ];

  const US_STATES = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','Washington DC','West Virginia','Wisconsin','Wyoming','Other'];

  /* ---------------- Supabase connection ----------------
     Paste the two values from your Supabase dashboard:
       • Project URL  (looks like https://xxxxxxxx.supabase.co)
       • Publishable / anon key (safe to be public; NEVER paste the secret / service_role key)
     --------------------------------------------------------------- */
  const SUPABASE_URL = 'https://yaorirqpdbrfevfqydhz.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_SpZ29bObiNzzewMhYyuGfg_7FDwePdM';
  const REST = SUPABASE_URL.replace(/\/+$/, '') + '/rest/v1';

  /* ---------------- Sign-in tokens (judge / admin) ----------------
     Each role has its own saved session (kept only until the tab is closed). */
  const TOKEN_KEY = role => 'orm_session_' + role;
  let activeRole = '';   // set by judge.js / admin.js so requests carry the right login

  function useRole(role) { activeRole = role; }

  function loadSession(role) {
    try { return JSON.parse(sessionStorage.getItem(TOKEN_KEY(role)) || 'null'); } catch (e) { return null; }
  }
  function saveSession(role, data) {
    sessionStorage.setItem(TOKEN_KEY(role), JSON.stringify({
      access_token: data.access_token, refresh_token: data.refresh_token
    }));
  }
  function clearSession(role) { sessionStorage.removeItem(TOKEN_KEY(role)); }

  function jwtRole(token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return (payload.app_metadata && payload.app_metadata.role) || '';
    } catch (e) { return ''; }
  }

  function buildHeaders(extra = {}) {
    const h = { apikey: SUPABASE_KEY, ...extra };
    const sess = activeRole ? loadSession(activeRole) : null;
    h.Authorization = 'Bearer ' + (sess ? sess.access_token : SUPABASE_KEY);
    return h;
  }

  // Logged-in sessions last about an hour; this quietly renews them.
  async function refreshSession() {
    const sess = activeRole ? loadSession(activeRole) : null;
    if (!sess || !sess.refresh_token) return false;
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: sess.refresh_token })
      });
      if (!res.ok) return false;
      saveSession(activeRole, await res.json());
      return true;
    } catch (e) { return false; }
  }

  // Every request goes through here: attaches the login and retries once if the session expired.
  async function sb(url, options = {}) {
    const extra = options.headers || {};
    let res = await fetch(url, { ...options, headers: buildHeaders(extra) });
    if (res.status === 401 && activeRole && loadSession(activeRole)) {
      if (await refreshSession()) {
        res = await fetch(url, { ...options, headers: buildHeaders(extra) });
      }
      if (res.status === 401) {
        clearSession(activeRole);
        alert('Your session has expired. Please log in again.');
        location.reload();
        throw new Error('Session expired');
      }
    }
    return res;
  }

  // Turns a database error into a plain sentence for the page.
  async function errorText(res, fallback) {
    try {
      const j = await res.json();
      if (j && j.message) return j.message;
    } catch (e) { /* ignore */ }
    return `${fallback} (${res.status})`;
  }

  /* ---------------- API helpers (Supabase REST) ---------------- */

  // Returns { data: [...rows], total: <total rows in table> }
  async function apiList(table, params = {}) {
    const limit = Number(params.limit) || 1000;
    const page = Number(params.page) || 1;
    const offset = (page - 1) * limit;
    const url = `${REST}/${table}?select=*&order=created_at.asc,id.asc&limit=${limit}&offset=${offset}`;
    const res = await sb(url, { headers: { Prefer: 'count=exact' } });
    if (!res.ok) throw new Error(await errorText(res, `Failed to load ${table}`));
    const rows = await res.json();
    const range = res.headers.get('Content-Range') || ''; // e.g. "0-24/137"
    const total = parseInt(range.split('/')[1], 10);
    return { data: rows, total: Number.isFinite(total) ? total : rows.length };
  }

  // Fetch ALL rows of a table across pagination
  async function apiListAll(table) {
    let page = 1, all = [], total = Infinity;
    while (all.length < total) {
      const json = await apiList(table, { page, limit: 1000 });
      const rows = json.data || [];
      total = json.total ?? rows.length;
      all = all.concat(rows);
      if (rows.length === 0) break;
      page++;
    }
    return all.filter(r => !r.deleted);
  }

  async function apiCreate(table, data) {
    const res = await sb(`${REST}/${table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await errorText(res, `Failed to save to ${table}`));
    const rows = await res.json();
    return Array.isArray(rows) ? rows[0] : rows;
  }

  async function apiUpdate(table, id, data) {
    const res = await sb(`${REST}/${table}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await errorText(res, `Failed to update ${table}`));
    const rows = await res.json();
    return Array.isArray(rows) ? rows[0] : rows;
  }

  async function apiDelete(table, id) {
    const res = await sb(`${REST}/${table}?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE', headers: { Prefer: 'return=minimal' }
    });
    if (!res.ok && res.status !== 204) throw new Error(await errorText(res, `Failed to delete from ${table}`));
  }

  // Calls one of the database functions from step7_functions.sql
  async function rpc(name, args = {}) {
    const res = await sb(`${REST}/rpc/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args)
    });
    if (!res.ok) throw new Error(await errorText(res, 'Request failed'));
    return res.json();
  }

  /* ---------------- Settings ---------------- */

  let _settingsCache = null;
  async function getSettings(force = false) {
    if (_settingsCache && !force) return _settingsCache;
    const rows = await apiListAll('settings');
    const map = {};
    rows.forEach(r => { map[r.key] = { value: r.value, id: r.id }; });
    _settingsCache = map;
    return map;
  }

  async function setSetting(key, value) {
    const s = await getSettings(true);
    if (s[key]) {
      await apiUpdate('settings', s[key].id, { value: String(value) });
    } else {
      await apiCreate('settings', { key, value: String(value) });
    }
    _settingsCache = null;
  }

  /* ---------------- Scoring ---------------- */

  // Weighted judge score on a 0–100 scale.
  // Final = (CA*25%)+(PQ*20%)+(ES*20%)+(FYP*15%)+(CR*10%)+(OVP*10%), each 0–10 → ×10.
  function computeFinalScore(scores) {
    let total = 0;
    CRITERIA.forEach(c => {
      const v = Number(scores[c.key]) || 0;
      total += v * c.weight;
    });
    return Math.round(total * 10 * 100) / 100; // 0–100 scale, 2 decimals
  }

  // Engagement Score = Likes + (Comments × 2) + (Shares × 3)
  function computeEngagementScore(likes, comments, shares) {
    return (Number(likes) || 0) + (Number(comments) || 0) * 2 + (Number(shares) || 0) * 3;
  }

  // Deduplicate scorecards: keep only the most recent scorecard per (judge, entry).
  function latestScorecards(scorecards) {
    const map = {};
    scorecards.forEach(sc => {
      const key = sc.judge_key || (normalizeJudge(sc.judge_name) + '|' + (sc.entry_id || '').toUpperCase());
      const t = sc.scored_at ? new Date(sc.scored_at).getTime() : (sc.updated_at || 0);
      if (!map[key] || t >= map[key]._t) map[key] = Object.assign({}, sc, { _t: t });
    });
    return Object.values(map);
  }

  function normalizeJudge(name) {
    return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  // Average of each judge's final score per entry → { ENTRYID: {avg, judges, cards[]} }
  function aggregateScores(scorecards) {
    const latest = latestScorecards(scorecards);
    const byEntry = {};
    latest.forEach(sc => {
      const eid = (sc.entry_id || '').toUpperCase();
      if (!byEntry[eid]) byEntry[eid] = { cards: [] };
      byEntry[eid].cards.push(sc);
    });
    Object.keys(byEntry).forEach(eid => {
      const cards = byEntry[eid].cards;
      const sum = cards.reduce((a, c) => a + (Number(c.final_score) || 0), 0);
      byEntry[eid].avg = Math.round((sum / cards.length) * 100) / 100;
      byEntry[eid].judges = cards.length;
    });
    return byEntry;
  }

  // Rank judged entries within a category (never across categories).
  function rankCategory(entries, aggregates, category) {
    return entries
      .filter(e => e.category === category)
      .map(e => ({
        entry: e,
        score: aggregates[(e.entry_id || '').toUpperCase()]?.avg ?? null,
        judges: aggregates[(e.entry_id || '').toUpperCase()]?.judges ?? 0
      }))
      .filter(r => r.score !== null)
      .sort((a, b) => b.score - a.score);
  }

  /* ---------------- Login (real Supabase accounts) ----------------
     The passcode box on the judge/admin pages signs in to a real account.
     The database itself checks that account's role on every request, so
     hiding or bypassing the page does not give anyone access to data. */

  const LOGIN_EMAILS = {
    judge: 'judge-login@manabasa2026.odiaroots.org',
    admin: 'admin-login@manabasa2026.odiaroots.org'
  };

  function isAuthed(role) {
    const sess = loadSession(role);
    return !!sess && jwtRole(sess.access_token) === role;
  }

  async function tryLogin(role, passcode) {
    if (!passcode) return false;
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: LOGIN_EMAILS[role], password: passcode })
    });
    if (res.status === 400 || res.status === 401 || res.status === 422) return false; // wrong password
    if (!res.ok) throw new Error(`Login service error (${res.status})`);
    const data = await res.json();
    if (jwtRole(data.access_token) !== role) return false; // account exists but has the wrong role
    saveSession(role, data);
    activeRole = role;
    return true;
  }

  async function logout(role) {
    const sess = loadSession(role);
    if (sess) {
      try {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + sess.access_token }
        });
      } catch (e) { /* ignore: we still clear it locally */ }
    }
    clearSession(role);
    location.reload();
  }

  /* ---------------- Email integration (prepared, INACTIVE) ----------------
     A provider (e.g. Resend) is NOT yet configured. When one is connected,
     it must be wired through a secure server-side proxy / secret store —
     never hardcode an API key in this client code. Until then this is a
     no-op that records intent in the console. */

  const EMAIL_ENABLED = false; // flip only when a secure provider proxy exists
  const EMAIL_PROXY_URL = '';  // future server-side endpoint (keeps API key off the client)

  async function sendConfirmationEmail(entry) {
    if (!EMAIL_ENABLED || !EMAIL_PROXY_URL) {
      console.info('[email] Provider not configured — on-screen confirmation is the active method.', entry.entry_id);
      return { sent: false, reason: 'provider_not_configured' };
    }
    // Future implementation: POST { to, subject, html } to EMAIL_PROXY_URL
    try {
      const res = await fetch(EMAIL_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: entry.email,
          subject: `Odia Roots Competition — Your Entry ${entry.entry_id}`,
          template: 'entry_confirmation',
          data: { name: entry.participant_name, entry_id: entry.entry_id, category: entry.category }
        })
      });
      return { sent: res.ok };
    } catch (e) {
      return { sent: false, reason: String(e) };
    }
  }

  /* ---------------- Misc helpers ---------------- */

  function esc(str) {
    return String(str ?? '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  function fmtDate(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    return isNaN(d) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function initNavToggle() {
    const btn = document.querySelector('.nav-toggle');
    const links = document.querySelector('.nav-links');
    if (btn && links) {
      btn.addEventListener('click', () => links.classList.toggle('open'));
    }
  }

  document.addEventListener('DOMContentLoaded', initNavToggle);

  return {
    CATEGORIES, PEOPLES_CHOICE, AWARD_NAMES, CRITERIA, US_STATES,
    apiList, apiListAll, apiCreate, apiUpdate, apiDelete, rpc, useRole,
    getSettings, setSetting,
    computeFinalScore, computeEngagementScore,
    latestScorecards, normalizeJudge, aggregateScores, rankCategory,
    isAuthed, tryLogin, logout,
    sendConfirmationEmail,
    esc, fmtDate
  };
})();