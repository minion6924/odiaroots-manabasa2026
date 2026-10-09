# Odia Roots — Manabasa Gurubar Heritage Competition 2026

A US-based family cultural heritage video competition website celebrating the Odia
festival of Manabasa Gurubar. Deep maroon (#7B1E3A), gold (#C9A227), cream (#FFF8E7)
theme; Playfair Display headings, Inter body; fully mobile-responsive.

## Pages / Entry URIs

| Path | Purpose |
|---|---|
| `index.html` | Landing page — overview, how it works, 8 categories, rules, deadline (from settings, default "To Be Announced") |
| `register.html` | Combined Registration & Submission form → auto-generates unique Entry ID `ORM2026-XXXX`, shown on-screen immediately |
| `results.html` | Public results — winners per category, visible ONLY after admin publishes results |
| `certificates.html` | Certificate lookup (Entry ID + registered email) → download PDFs |
| `judge.html` | Judge Portal (password login) — 6-criteria weighted scorecard, overwrite semantics |
| `admin.html` | Admin Dashboard (password login) — overview stats, entries table w/ search & filters & CSV export, judging leaderboard per category, People's Choice engagement logging, settings (publish results, deadline) |

## Completed features

- **8 exact categories**, entries compete only within their chosen category.
- **Entry ID generation**: `ORM2026-0001`+ auto-increment, zero-padded to 4 digits,
  post-insert duplicate check with retry (client-side best-effort; see limitations).
- **Scoring formula** (exact): Final = CA×25% + PQ×20% + ES×20% + FYP×15% + CR×10% + OVP×10%,
  each criterion 0–10, expressed on 0–100. Multiple judges' final scores are averaged.
  Same judge re-scoring the same entry replaces the previous scorecard (normalized
  judge-name + entry key). Ranking is within category only.
- **People's Choice**: only entries submitted to that category; Engagement Score =
  Likes + Comments×2 + Shares×3, manually logged by admin; Flagged Suspicious status
  (No / Under Review / Disqualified); disqualified entries excluded from winning.
- **Certificates (jsPDF, client-generated PDFs)**: cream bg, gold/maroon double border,
  serif "CERTIFICATE OF ACHIEVEMENT", gold medallion seal, committee footer.
  1. "Keeper of Odia Tradition" — every entry with a submitted video.
  2. "Young Keeper of Odia Culture" — additionally when entry lists children.
  3. "Award of Excellence" — category winner, with the per-category award name
     (Heritage Champion / Maa Lakshmi Jhoti Samman / Pitha Parampara / Heritage Family /
     Young Ambassador / Purana Heritage Voice / Creative Tradition / Community Choice).
  Winner certificate unlocks only after results are published.
- **Email confirmations**: prepared but INACTIVE (`EMAIL_ENABLED=false` in `js/utils.js`);
  on-screen Entry ID confirmation is the active method. Wire a provider (e.g. Resend)
  through a server-side proxy later — never an API key in client code.
- **CSV export** of all entries + averaged scores, for reconciliation with the
  odiaroots.org Competition Manager.

## Data model (tables)

- `entries` — entry_id, participant_name, city, state, email, phone, children_info,
  category, submission_title, submission_method, facebook_link, drive_link,
  facebook_profile, description, consent_publish, video_submitted, status, submitted_at
- `scorecards` — entry_id, judge_name, judge_key, 6 criterion scores, final_score,
  comments, scored_at
- `engagement` — entry_id, likes, comments, shares, engagement_score, flag_status,
  updated_by, logged_at
- `settings` — key/value: `results_published`, `registration_deadline`

Preview rows live in the editor's data store; a Hosted-Deployed site has its own
separate live D1 database.

## Security model (Supabase)

- **Database rules (Row Level Security)** are enforced by Supabase itself, not by the web pages.
- **Public visitors** can only call: `orm_register_entry` (validated registration, server-made Entry ID),
  `orm_public_results` (empty until results are published; no emails/phones/judge names) and
  `orm_lookup_certificate` (needs Entry ID + email to match). They cannot read any table.
- **Judges** sign in with the judge account. They use `orm_judge_entries` (no emails/phones),
  `orm_submit_scorecard` (the database recalculates the weighted score; re-scoring replaces the old card)
  and `orm_my_scorecards`.
- **Admin** signs in with the admin account and has full table access.
- Accounts: `judge-login@manabasa2026.odiaroots.org` and `admin-login@manabasa2026.odiaroots.org`
  (role stored in `raw_app_meta_data`). Passwords are changed in the Supabase SQL Editor.
- Only the *publishable* key is in `js/utils.js`. Never put the secret / service_role key in the site.

## Database files (run in this order in Supabase → SQL Editor)

1. Step 2 tables  2. Step 3 settings  3. `step5_security.sql`  4. `step7_functions.sql`

## Video submission

Families submit either a **public Facebook video link** or a **Google Drive share link**
("Anyone with the link" – Viewer). Direct file upload was removed.

## Not yet implemented / next steps

1. Email confirmations — connect Resend (or similar) through a server-side function.
2. Set the real registration deadline in Admin → Settings when finalized.
3. Certificate template from Isha (currently jsPDF-drawn design).

## Libraries

Google Fonts (Playfair Display, Inter), Font Awesome 6, jsPDF 2.5.1 (certificates) — all via CDN.
