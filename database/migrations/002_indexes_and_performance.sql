-- Performance indexes for better query performance

-- User lookup indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_telegram_user_id ON profiles(telegram_user_id);

-- Notes indexes
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_status ON notes(status);
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX idx_notes_source_type ON notes(source_type);

-- Full-text search index on notes
CREATE INDEX idx_notes_fulltext ON notes USING GIN (
  to_tsvector('english', COALESCE(raw_text, '') || ' ' || COALESCE(summary, '') || ' ' || COALESCE(title, ''))
);

-- Chunks indexes for vector search
CREATE INDEX idx_chunks_note_id ON chunks(note_id);
CREATE INDEX idx_chunks_embedding ON chunks USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

-- Note tags indexes
CREATE INDEX idx_note_tags_note_id ON note_tags(note_id);
CREATE INDEX idx_note_tags_tag_id ON note_tags(tag_id);

-- Sources indexes
CREATE INDEX idx_sources_note_id ON sources(note_id);
CREATE INDEX idx_sources_origin_type ON sources(origin_type);

-- Files indexes
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_note_id ON files(note_id);
CREATE INDEX idx_files_s3_key ON files(s3_key);