# Supabase Setup Guide — BizLegal AI

## Database Configuration

### 1. Access Supabase Dashboard
Go to: https://ydghhcuuopqzgqcicubg.supabase.co

### 2. Get Your API Keys
1. Go to **Settings** → **API**
2. Copy the `anon/public` key
3. Update `supabase.js` line 5 with your actual key:
```javascript
const SUPABASE_ANON_KEY = 'your-actual-anon-key-here';
```

### 3. Run Database Schema
Go to **SQL Editor** in Supabase and run the entire schema from `supabase.js` (lines 11-100):

```sql
-- Content table for SEO pages and blog posts
CREATE TABLE IF NOT EXISTS content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  meta_description TEXT,
  meta_keywords TEXT,
  content_html TEXT,
  status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social media accounts
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_url TEXT NOT NULL,
  access_token TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social posts queue
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID REFERENCES content(id),
  platform TEXT NOT NULL,
  post_text TEXT,
  post_url TEXT,
  status TEXT DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automation settings
CREATE TABLE IF NOT EXISTS automation_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auto_post_facebook BOOLEAN DEFAULT true,
  auto_post_linkedin BOOLEAN DEFAULT true,
  auto_post_twitter BOOLEAN DEFAULT true,
  auto_post_instagram BOOLEAN DEFAULT false,
  delay_minutes INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default social accounts
INSERT INTO social_accounts (platform, account_name, account_url) VALUES
  ('facebook', 'DorInnovations', 'https://www.facebook.com/DorInnovations/'),
  ('linkedin', 'DorInnovations', 'https://www.linkedin.com/company/DorInnovations'),
  ('instagram', 'dorinnovations', 'https://www.instagram.com/dorinnovations/'),
  ('twitter', 'DorInnovations', 'https://x.com/DorInnovations'),
  ('youtube', 'DorInnovations', 'https://www.youtube.com/@DorInnovations'),
  ('substack', 'dorinnovations', 'https://substack.com/@dorinnovations'),
  ('pinterest', 'DorInnovations', 'https://www.pinterest.com/DorInnovations/');

-- Insert default automation settings
INSERT INTO automation_settings (auto_post_facebook, auto_post_linkedin, auto_post_twitter, auto_post_instagram)
VALUES (true, true, true, false);

-- Function to create social posts when content is published
CREATE OR REPLACE FUNCTION create_social_posts_on_publish()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status = 'draft' THEN
    INSERT INTO social_posts (content_id, platform, post_text, scheduled_at)
    VALUES (NEW.id, 'facebook', 'New article: ' || NEW.title || ' - ' || NEW.meta_description, NOW() + INTERVAL '5 minutes');
    
    INSERT INTO social_posts (content_id, platform, post_text, scheduled_at)
    VALUES (NEW.id, 'linkedin', 'New article: ' || NEW.title || ' - ' || NEW.meta_description, NOW() + INTERVAL '5 minutes');
    
    INSERT INTO social_posts (content_id, platform, post_text, scheduled_at)
    VALUES (NEW.id, 'twitter', 'New: ' || NEW.title || ' | ' || LEFT(NEW.meta_description, 100) || '...', NOW() + INTERVAL '5 minutes');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create social posts
CREATE TRIGGER trigger_create_social_posts
  AFTER UPDATE ON content
  FOR EACH ROW
  EXECUTE FUNCTION create_social_posts_on_publish();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_status ON content(status);
CREATE INDEX IF NOT EXISTS idx_content_published_at ON content(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
```

## Social Media API Setup

### Facebook
1. Go to https://developers.facebook.com/
2. Create a new app
3. Get Page Access Token
4. Add to `.env`:
```
FACEBOOK_ACCESS_TOKEN=your_token_here
```

### LinkedIn
1. Go to https://www.linkedin.com/developers/
2. Create a new app
3. Get Organization ID and Access Token
4. Add to `.env`:
```
LINKEDIN_ACCESS_TOKEN=your_token_here
```

### Twitter/X
1. Go to https://developer.twitter.com/
2. Create a new project
3. Get Bearer Token
4. Add to `.env`:
```
TWITTER_BEARER_TOKEN=your_token_here
```

## Admin Dashboard Access

**URL:** `https://bizlegal-ai.vercel.app/admin.html`

**Default Credentials:**
- Email: `admin@bizlegal.ai`
- Password: `admin123`

⚠️ **Change these credentials in production!**

## Automation Workflow

1. **Create Content** in Admin Dashboard
2. **Publish Content** → Triggers database trigger
3. **Social Posts Created** in `social_posts` table with 5-minute delay
4. **Cron Job Runs** every minute to check pending posts
5. **Posts to Social Media** via API endpoints
6. **Updates Status** to posted/failed

## Cron Job Setup (Optional)

Set up a cron job to run every minute:

```javascript
// Run this on a server or use a service like GitHub Actions, Vercel Cron, etc.
import { processSocialPostsQueue } from './supabase.js';

// Run every minute
setInterval(processSocialPostsQueue, 60000);
```

## Social Media Links Added

All social media links are now in the footer:
- 📘 Facebook: https://www.facebook.com/DorInnovations/
- 💼 LinkedIn: https://www.linkedin.com/company/DorInnovations
- 📸 Instagram: https://www.instagram.com/dorinnovations/
- 🐦 Twitter/X: https://x.com/DorInnovations
- 📺 YouTube: https://www.youtube.com/@DorInnovations
- 📝 Substack: https://substack.com/@dorinnovations
- 📌 Pinterest: https://www.pinterest.com/DorInnovations/

## Testing

1. Log into admin dashboard
2. Create new content
3. Publish it
4. Check `social_posts` table for queued posts
5. Wait for scheduled time
6. Verify posts appear on social media

## Troubleshooting

**Posts not appearing?**
- Check API tokens are valid
- Verify social accounts have proper permissions
- Check `social_posts` table for error messages

**Admin can't login?**
- Check browser console for errors
- Verify Supabase URL and key are correct
- Check network tab for failed requests
