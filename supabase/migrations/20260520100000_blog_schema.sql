-- ============================================================
-- Migração: Blog → Schema blog (App do Redator)
-- Projeto Blog: jjypootwglypemsduxcu → kgmxntpmvlnbftjqtyxx
-- Data: 2026-05-20
-- ============================================================

-- 1. Schema
CREATE SCHEMA IF NOT EXISTS blog;

-- 2. Enum
CREATE TYPE blog.content_type AS ENUM (
  'artigo', 'redacao_exemplar', 'tema', 'video', 'podcast'
);

-- 3. Funções
CREATE OR REPLACE FUNCTION blog.has_url_or_email(text_content text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN text_content ~*
    '(https?://|' ||
    'www\.|' ||
    '\.(com|br|org|net|edu|gov|io|me|app|co)|' ||
    '[a-z0-9-]+\.[a-z]{2,}|' ||
    '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})';
END;
$$;

CREATE OR REPLACE FUNCTION blog.can_user_comment(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  comments_last_minute INT;
  comments_last_hour INT;
  comments_last_day INT;
BEGIN
  SELECT COUNT(*) INTO comments_last_minute
  FROM blog.post_comments
  WHERE user_id = p_user_id AND created_at > NOW() - INTERVAL '1 minute';

  IF comments_last_minute >= 2 THEN
    RAISE EXCEPTION 'Você está comentando muito rápido. Aguarde um momento.';
  END IF;

  SELECT COUNT(*) INTO comments_last_hour
  FROM blog.post_comments
  WHERE user_id = p_user_id AND created_at > NOW() - INTERVAL '1 hour';

  IF comments_last_hour >= 10 THEN
    RAISE EXCEPTION 'Você atingiu o limite de comentários por hora. Tente novamente mais tarde.';
  END IF;

  SELECT COUNT(*) INTO comments_last_day
  FROM blog.post_comments
  WHERE user_id = p_user_id AND created_at > NOW() - INTERVAL '24 hours';

  IF comments_last_day >= 20 THEN
    RAISE EXCEPTION 'Você atingiu o limite diário de comentários. Tente novamente amanhã.';
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION blog.update_comment_timestamp()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION blog.refresh_engagement_stats()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY blog.post_engagement_stats;
  RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION blog.update_users_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION blog.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

-- 4. Tabelas
CREATE TABLE blog.authors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       varchar NOT NULL UNIQUE,
  name        varchar NOT NULL,
  bio         text,
  avatar_url  text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE blog.categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        varchar NOT NULL UNIQUE,
  slug        varchar NOT NULL UNIQUE,
  description text,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE blog.tags (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       varchar NOT NULL UNIQUE,
  slug       varchar NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE blog.cms_contents (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page           text NOT NULL DEFAULT 'landing',
  block_slug     text NOT NULL,
  block_title    text NOT NULL,
  block_subtitle text,
  content_json   jsonb NOT NULL DEFAULT '{}',
  is_active      boolean DEFAULT true,
  updated_at     timestamptz DEFAULT now(),
  updated_by     text,
  created_at     timestamptz DEFAULT now(),
  UNIQUE(page, block_slug)
);

CREATE INDEX idx_blog_cms_slug ON blog.cms_contents(block_slug);
CREATE INDEX idx_blog_cms_page_active ON blog.cms_contents(page, is_active);

CREATE TABLE blog.products (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title              text NOT NULL,
  description        text,
  original_price     numeric,
  promotional_price  numeric NOT NULL,
  featured_image_url text,
  badge              text,
  purchase_link      text NOT NULL,
  status             text NOT NULL DEFAULT 'draft',
  display_order      integer DEFAULT 1,
  click_count        integer DEFAULT 0,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now(),
  badge_color        text DEFAULT '#ef4444'
);

CREATE TABLE blog.users (
  id         uuid PRIMARY KEY,
  email      varchar NOT NULL UNIQUE,
  name       varchar NOT NULL,
  role       varchar DEFAULT 'editor',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_blog_users_email ON blog.users(email);

CREATE TABLE blog.posts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title               varchar NOT NULL,
  slug                varchar NOT NULL UNIQUE,
  content             text NOT NULL,
  excerpt             text,
  featured_image_url  text,
  author_id           uuid NOT NULL REFERENCES blog.authors(id),
  category_id         uuid REFERENCES blog.categories(id),
  status              varchar DEFAULT 'draft',
  published_at        timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  tipo                blog.content_type DEFAULT 'artigo',
  dados_extra         jsonb DEFAULT '{}',
  data_agendada       timestamptz,
  discussion_question text,
  comments_enabled    boolean DEFAULT true
);

CREATE INDEX idx_blog_posts_slug        ON blog.posts(slug);
CREATE INDEX idx_blog_posts_author_id   ON blog.posts(author_id);
CREATE INDEX idx_blog_posts_category_id ON blog.posts(category_id);
CREATE INDEX idx_blog_posts_status      ON blog.posts(status);
CREATE INDEX idx_blog_posts_published   ON blog.posts(published_at);
CREATE INDEX idx_blog_posts_tipo        ON blog.posts(tipo);
CREATE INDEX idx_blog_posts_agendada    ON blog.posts(data_agendada);
CREATE INDEX idx_blog_posts_status_tipo ON blog.posts(status, tipo);

CREATE TABLE blog.post_tags (
  post_id uuid NOT NULL REFERENCES blog.posts(id) ON DELETE CASCADE,
  tag_id  uuid NOT NULL REFERENCES blog.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE blog.comments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      uuid NOT NULL REFERENCES blog.posts(id) ON DELETE CASCADE,
  author_name  varchar NOT NULL,
  author_email varchar NOT NULL,
  content      text NOT NULL,
  status       varchar DEFAULT 'pending',
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX idx_blog_comments_post   ON blog.comments(post_id);
CREATE INDEX idx_blog_comments_status ON blog.comments(status);

CREATE TABLE blog.post_comments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id           uuid NOT NULL REFERENCES blog.posts(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL,
  parent_comment_id uuid REFERENCES blog.post_comments(id),
  content           text NOT NULL,
  is_highlighted    boolean DEFAULT false,
  is_pinned         boolean DEFAULT false,
  is_hidden         boolean DEFAULT false,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  user_name         varchar NOT NULL
);

CREATE INDEX idx_blog_pc_post        ON blog.post_comments(post_id);
CREATE INDEX idx_blog_pc_user        ON blog.post_comments(user_id);
CREATE INDEX idx_blog_pc_parent      ON blog.post_comments(parent_comment_id);
CREATE INDEX idx_blog_pc_created     ON blog.post_comments(created_at DESC);
CREATE INDEX idx_blog_pc_post_vis    ON blog.post_comments(post_id, created_at DESC) WHERE is_hidden = false;
CREATE INDEX idx_blog_pc_highlighted ON blog.post_comments(is_highlighted) WHERE is_highlighted = true;
CREATE INDEX idx_blog_pc_pinned      ON blog.post_comments(is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_blog_pc_post_pinned ON blog.post_comments(post_id, is_pinned, created_at DESC) WHERE is_pinned = true;

CREATE TABLE blog.post_likes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES blog.posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX idx_blog_likes_post    ON blog.post_likes(post_id);
CREATE INDEX idx_blog_likes_user    ON blog.post_likes(user_id);
CREATE INDEX idx_blog_likes_created ON blog.post_likes(created_at DESC);

CREATE TABLE blog.post_shares (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id      uuid NOT NULL REFERENCES blog.posts(id) ON DELETE CASCADE,
  user_id      uuid,
  platform     varchar,
  shared_at    timestamptz DEFAULT now(),
  utm_source   varchar,
  utm_medium   varchar,
  utm_campaign varchar
);

CREATE INDEX idx_blog_shares_post     ON blog.post_shares(post_id);
CREATE INDEX idx_blog_shares_platform ON blog.post_shares(platform);
CREATE INDEX idx_blog_shares_date     ON blog.post_shares(shared_at DESC);

-- 5. Materialized view (WITH NO DATA — populada pelos triggers após inserção)
CREATE MATERIALIZED VIEW blog.post_engagement_stats AS
SELECT
  p.id AS post_id,
  p.title,
  p.tipo,
  COUNT(DISTINCT pl.id) AS like_count,
  COUNT(DISTINCT CASE WHEN pc.is_hidden = false THEN pc.id ELSE NULL::uuid END) AS comment_count,
  COUNT(DISTINCT ps.id) AS share_count,
  (
    COUNT(DISTINCT pl.id) +
    (COUNT(DISTINCT CASE WHEN pc.is_hidden = false THEN pc.id ELSE NULL::uuid END) * 2) +
    (COUNT(DISTINCT ps.id) * 3)
  ) AS engagement_score
FROM blog.posts p
  LEFT JOIN blog.post_likes    pl ON p.id = pl.post_id
  LEFT JOIN blog.post_comments pc ON p.id = pc.post_id
  LEFT JOIN blog.post_shares   ps ON p.id = ps.post_id
WHERE (p.status)::text = 'published'::text
GROUP BY p.id, p.title, p.tipo
WITH NO DATA;

CREATE UNIQUE INDEX idx_blog_engagement_post ON blog.post_engagement_stats(post_id);

-- 6. Triggers
CREATE TRIGGER update_authors_updated_at
  BEFORE UPDATE ON blog.authors
  FOR EACH ROW EXECUTE FUNCTION blog.update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON blog.posts
  FOR EACH ROW EXECUTE FUNCTION blog.update_updated_at_column();

CREATE TRIGGER update_users_updated_at_trigger
  BEFORE UPDATE ON blog.users
  FOR EACH ROW EXECUTE FUNCTION blog.update_users_updated_at();

CREATE TRIGGER trigger_update_comment_timestamp
  BEFORE UPDATE ON blog.post_comments
  FOR EACH ROW EXECUTE FUNCTION blog.update_comment_timestamp();

CREATE TRIGGER trigger_refresh_likes
  AFTER INSERT OR DELETE ON blog.post_likes
  FOR EACH ROW EXECUTE FUNCTION blog.refresh_engagement_stats();

CREATE TRIGGER trigger_refresh_comments
  AFTER INSERT OR UPDATE OR DELETE ON blog.post_comments
  FOR EACH ROW EXECUTE FUNCTION blog.refresh_engagement_stats();

CREATE TRIGGER trigger_refresh_shares
  AFTER INSERT ON blog.post_shares
  FOR EACH ROW EXECUTE FUNCTION blog.refresh_engagement_stats();

-- 7. RLS
ALTER TABLE blog.authors       ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog.categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog.cms_contents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog.comments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog.post_likes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog.post_shares   ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog.post_tags     ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog.posts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog.tags          ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog.products      ENABLE ROW LEVEL SECURITY;

-- Authors
CREATE POLICY "blog_authors_public_read"  ON blog.authors FOR SELECT USING (true);
CREATE POLICY "blog_authors_self_update"  ON blog.authors FOR UPDATE USING ((auth.uid())::text = (id)::text);

-- Categories / Tags / Post tags
CREATE POLICY "blog_categories_public_read" ON blog.categories FOR SELECT USING (true);
CREATE POLICY "blog_tags_public_read"       ON blog.tags       FOR SELECT USING (true);
CREATE POLICY "blog_post_tags_public_read"  ON blog.post_tags  FOR SELECT USING (true);

-- CMS contents
CREATE POLICY "blog_cms_public_active"  ON blog.cms_contents FOR SELECT USING (is_active = true);
CREATE POLICY "blog_cms_auth_read_all"  ON blog.cms_contents FOR SELECT USING (true);
CREATE POLICY "blog_cms_auth_insert"    ON blog.cms_contents FOR INSERT WITH CHECK (true);
CREATE POLICY "blog_cms_auth_update"    ON blog.cms_contents FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "blog_cms_auth_delete"    ON blog.cms_contents FOR DELETE USING (true);

-- Products
CREATE POLICY "blog_products_public_read" ON blog.products FOR SELECT USING (true);
CREATE POLICY "blog_products_auth_write"  ON blog.products FOR ALL USING (auth.role() = 'authenticated');

-- Posts
CREATE POLICY "blog_posts_public_published" ON blog.posts FOR SELECT USING ((status)::text = 'published'::text);
CREATE POLICY "blog_posts_auth_read_all"    ON blog.posts FOR SELECT USING (true);
CREATE POLICY "blog_posts_auth_insert"      ON blog.posts FOR INSERT WITH CHECK (true);
CREATE POLICY "blog_posts_auth_update"      ON blog.posts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "blog_posts_auth_delete"      ON blog.posts FOR DELETE USING (true);

-- Comments (sem auth)
CREATE POLICY "blog_comments_approved_read" ON blog.comments FOR SELECT USING ((status)::text = 'approved'::text);
CREATE POLICY "blog_comments_anyone_insert" ON blog.comments FOR INSERT WITH CHECK (true);

-- Post comments
CREATE POLICY "blog_pc_visible_read"    ON blog.post_comments FOR SELECT USING (is_hidden = false);
CREATE POLICY "blog_pc_own_read"        ON blog.post_comments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "blog_pc_editor_read"     ON blog.post_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM blog.users u WHERE u.id = auth.uid() AND (u.role)::text = ANY(ARRAY['admin','editor']))
);
CREATE POLICY "blog_pc_auth_insert"     ON blog.post_comments FOR INSERT WITH CHECK (
  (auth.uid() = user_id) AND blog.can_user_comment(auth.uid())
);
CREATE POLICY "blog_pc_own_update"      ON blog.post_comments FOR UPDATE
  USING ((auth.uid() = user_id) AND (created_at > (now() - '00:15:00'::interval)))
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "blog_pc_editor_moderate" ON blog.post_comments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM blog.users u WHERE u.id = auth.uid() AND (u.role)::text = ANY(ARRAY['admin','editor']))
);
CREATE POLICY "blog_pc_own_delete"      ON blog.post_comments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "blog_pc_editor_delete"   ON blog.post_comments FOR DELETE USING (
  EXISTS (SELECT 1 FROM blog.users u WHERE u.id = auth.uid() AND (u.role)::text = ANY(ARRAY['admin','editor']))
);

-- Post likes
CREATE POLICY "blog_likes_public_read"  ON blog.post_likes FOR SELECT USING (true);
CREATE POLICY "blog_likes_auth_insert"  ON blog.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "blog_likes_own_delete"   ON blog.post_likes FOR DELETE USING (auth.uid() = user_id);

-- Post shares
CREATE POLICY "blog_shares_anyone_insert" ON blog.post_shares FOR INSERT WITH CHECK (true);
CREATE POLICY "blog_shares_admin_read"    ON blog.post_shares FOR SELECT USING (
  EXISTS (SELECT 1 FROM blog.users u WHERE u.id = auth.uid() AND (u.role)::text = 'admin')
);

-- 8. Grants
GRANT USAGE ON SCHEMA blog TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA blog TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA blog TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA blog GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA blog GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- 9. Storage bucket blog-images
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('blog-images', 'blog-images', true, 5242880)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: leitura pública
CREATE POLICY "blog_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'blog-images');

CREATE POLICY "blog_images_auth_write" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'blog-images' AND auth.role() = 'authenticated');

CREATE POLICY "blog_images_auth_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'blog-images' AND auth.role() = 'authenticated');
