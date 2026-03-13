-- Run this once in Supabase SQL editor
-- Dashboard → SQL Editor → paste → Run

-- Raw leads (everything scraped, before filtering)
CREATE TABLE IF NOT EXISTS leads_raw (
  id         BIGSERIAL PRIMARY KEY,
  lead_id    TEXT UNIQUE NOT NULL,
  source     TEXT,           -- reddit / quora / linkedin / google
  subreddit  TEXT,
  title      TEXT,
  body       TEXT,
  url        TEXT,
  author     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clean leads (qualified by Claude, score >= 6)
CREATE TABLE IF NOT EXISTS leads_clean (
  id         BIGSERIAL PRIMARY KEY,
  lead_id    TEXT UNIQUE NOT NULL,
  source     TEXT,
  url        TEXT,
  author     TEXT,
  email      TEXT,
  score      INT,            -- 1-10
  topic      TEXT,           -- JV Agreement / NDA / etc
  urgency    TEXT,           -- high / medium / low
  summary    TEXT,
  doc_key    TEXT,           -- jv / nda / loi / etc
  doc_url    TEXT,
  emailed    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_leads_raw_lead_id   ON leads_raw(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_clean_lead_id ON leads_clean(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_clean_created ON leads_clean(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_clean_score   ON leads_clean(score DESC);
