-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_notes_updated_at 
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Vector similarity search function
CREATE OR REPLACE FUNCTION search_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  user_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  note_id uuid,
  chunk_text text,
  similarity float,
  note_title text,
  note_summary text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.note_id,
    c.chunk_text,
    1 - (c.embedding <=> query_embedding) AS similarity,
    n.title AS note_title,
    n.summary AS note_summary
  FROM chunks c
  INNER JOIN notes n ON c.note_id = n.id
  WHERE 
    1 - (c.embedding <=> query_embedding) > match_threshold
    AND (user_filter IS NULL OR n.user_id = user_filter)
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Helper function to get user by email
CREATE OR REPLACE FUNCTION get_user_by_email(user_email text)
RETURNS TABLE (
  id uuid,
  email text,
  display_name text,
  telegram_user_id bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.display_name,
    p.telegram_user_id
  FROM profiles p
  WHERE p.email = user_email;
END;
$$;

-- Helper function to verify password
CREATE OR REPLACE FUNCTION verify_user_password(user_email text, provided_password text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  stored_hash text;
BEGIN
  SELECT password_hash INTO stored_hash
  FROM profiles
  WHERE email = user_email;
  
  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN crypt(provided_password, stored_hash) = stored_hash;
END;
$$;

-- Function to create user with hashed password
CREATE OR REPLACE FUNCTION create_user(
  user_email text,
  user_password text,
  user_display_name text DEFAULT NULL,
  user_telegram_id bigint DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  INSERT INTO profiles (email, password_hash, display_name, telegram_user_id)
  VALUES (
    user_email,
    crypt(user_password, gen_salt('bf')),
    user_display_name,
    user_telegram_id
  )
  RETURNING id INTO new_user_id;
  
  RETURN new_user_id;
END;
$$;