-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for full-text search
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for bcrypt password hashing

-- Profiles table (custom user management)
CREATE TABLE profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, -- bcrypt hashed password
  display_name TEXT,
  telegram_user_id BIGINT UNIQUE, -- optional Telegram integration
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes table
CREATE TABLE notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  raw_text TEXT,
  summary TEXT,
  source_type TEXT CHECK (source_type IN ('telegram', 'web', 'upload')),
  file_url TEXT, -- MinIO S3 URL
  status TEXT DEFAULT 'raw' CHECK (status IN ('raw', 'processing', 'processed', 'error')),
  language TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags table
CREATE TABLE tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note-Tags junction table
CREATE TABLE note_tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(note_id, tag_id)
);

-- Chunks table with vector embeddings
CREATE TABLE chunks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  embedding vector(1536), -- OpenAI ada-002/text-embedding-3-small dimensions
  order_index INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sources/Provenance table
CREATE TABLE sources (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  origin_type TEXT,
  origin_id TEXT,
  raw_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Files table for MinIO storage tracking
CREATE TABLE files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  s3_key TEXT NOT NULL, -- MinIO object key
  s3_url TEXT NOT NULL, -- Full MinIO URL
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);