// Supabase Configuration for BizLegal AI
// Database: https://ydghhcuuopqzgqcicubg.supabase.co

const SUPABASE_URL = 'https://ydghhcuuopqzgqcicubg.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Get from Supabase dashboard

// Initialize Supabase client
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Database Schema (run in Supabase SQL Editor)
/*
-- Content table for SEO pages and blog posts
CREATE TABLE IF NOT EXISTS content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  meta_description TEXT,
  meta_keywords TEXT,
  content_html TEXT,
  status TEXT DEFAULT 'draft', -- draft, published, archived
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social media accounts
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL, -- facebook, linkedin, instagram, twitter, youtube, substack, pinterest
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
  status TEXT DEFAULT 'pending', -- pending, posted, failed
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
    -- Create Facebook post
    INSERT INTO social_posts (content_id, platform, post_text, scheduled_at)
    VALUES (NEW.id, 'facebook', 
            'New article: ' || NEW.title || ' - ' || NEW.meta_description,
            NOW() + INTERVAL '5 minutes');
    
    -- Create LinkedIn post
    INSERT INTO social_posts (content_id, platform, post_text, scheduled_at)
    VALUES (NEW.id, 'linkedin',
            'New article: ' || NEW.title || ' - ' || NEW.meta_description,
            NOW() + INTERVAL '5 minutes');
    
    -- Create Twitter post
    INSERT INTO social_posts (content_id, platform, post_text, scheduled_at)
    VALUES (NEW.id, 'twitter',
            'New: ' || NEW.title || ' | ' || LEFT(NEW.meta_description, 100) || '...',
            NOW() + INTERVAL '5 minutes');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create social posts
CREATE TRIGGER trigger_create_social_posts
  AFTER UPDATE ON content
  FOR EACH ROW
  EXECUTE FUNCTION create_social_posts_on_publish();

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_content_status ON content(status);
CREATE INDEX IF NOT EXISTS idx_content_published_at ON content(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
*/

// API Functions
export const contentAPI = {
  // Get all published content
  async getPublished() {
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Get single content by slug
  async getBySlug(slug) {
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();
    
    if (error) throw error;
    return data;
  },

  // Create new content
  async create(contentData) {
    const { data, error } = await supabase
      .from('content')
      .insert([{
        ...contentData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update content
  async update(id, updates) {
    const { data, error } = await supabase
      .from('content')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Publish content (triggers social media automation)
  async publish(id) {
    return this.update(id, {
      status: 'published',
      published_at: new Date().toISOString()
    });
  }
};

export const socialAPI = {
  // Get pending social posts
  async getPendingPosts() {
    const { data, error } = await supabase
      .from('social_posts')
      .select('*, content(title, slug)')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('scheduled_at');
    
    if (error) throw error;
    return data;
  },

  // Mark post as posted
  async markPosted(id, postUrl) {
    const { data, error } = await supabase
      .from('social_posts')
      .update({
        status: 'posted',
        posted_at: new Date().toISOString(),
        post_url: postUrl
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Mark post as failed
  async markFailed(id, errorMessage) {
    const { data, error } = await supabase
      .from('social_posts')
      .update({
        status: 'failed',
        error_message: errorMessage
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get automation settings
  async getSettings() {
    const { data, error } = await supabase
      .from('automation_settings')
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Social Media Posting Functions (requires backend integration)
export const socialPoster = {
  // Post to Facebook
  async postToFacebook(text, link) {
    // Call your backend API that handles Facebook Graph API
    const response = await fetch('/api/social/facebook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, link })
    });
    return response.json();
  },

  // Post to LinkedIn
  async postToLinkedIn(text, link) {
    const response = await fetch('/api/social/linkedin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, link })
    });
    return response.json();
  },

  // Post to Twitter
  async postToTwitter(text, link) {
    const response = await fetch('/api/social/twitter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, link })
    });
    return response.json();
  },

  // Post to Instagram
  async postToInstagram(text, imageUrl) {
    const response = await fetch('/api/social/instagram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, imageUrl })
    });
    return response.json();
  }
};

// Auto-post processor (run this periodically via cron job)
export async function processSocialPostsQueue() {
  try {
    const pendingPosts = await socialAPI.getPendingPosts();
    const settings = await socialAPI.getSettings();

    for (const post of pendingPosts) {
      try {
        let result;
        const link = `https://bizlegal-ai.vercel.app/seo/${post.content.slug}`;

        switch (post.platform) {
          case 'facebook':
            if (settings.auto_post_facebook) {
              result = await socialPoster.postToFacebook(post.post_text, link);
            }
            break;
          case 'linkedin':
            if (settings.auto_post_linkedin) {
              result = await socialPoster.postToLinkedIn(post.post_text, link);
            }
            break;
          case 'twitter':
            if (settings.auto_post_twitter) {
              result = await socialPoster.postToTwitter(post.post_text, link);
            }
            break;
          case 'instagram':
            if (settings.auto_post_instagram) {
              result = await socialPoster.postToInstagram(post.post_text, link);
            }
            break;
        }

        if (result && result.success) {
          await socialAPI.markPosted(post.id, result.postUrl);
        } else {
          await socialAPI.markFailed(post.id, result?.error || 'Unknown error');
        }
      } catch (error) {
        console.error(`Error posting to ${post.platform}:`, error);
        await socialAPI.markFailed(post.id, error.message);
      }
    }
  } catch (error) {
    console.error('Error processing social posts queue:', error);
  }
}

export { supabase };
