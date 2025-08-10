-- Enable Row Level Security (RLS) for multi-tenant isolation

-- Enable RLS on all user-specific tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Note: Since we're using custom JWT auth instead of Supabase auth,
-- we'll need to set the user context via SET statements or function parameters
-- For now, we'll create policies that can be used with proper user context

-- Profiles policies (users can only see/update their own profile)
-- These would work with a custom auth system that sets the current user context

-- Function to get current user ID from JWT or session context
-- This would be implemented in the application layer
-- CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
--   -- This would extract user ID from JWT token or session
--   -- Implementation depends on the auth mechanism used
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- For now, we'll create the policy structure but disable RLS
-- until the custom auth system is implemented

-- Disable RLS temporarily until custom auth is implemented
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE chunks DISABLE ROW LEVEL SECURITY;
ALTER TABLE note_tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE sources DISABLE ROW LEVEL SECURITY;
ALTER TABLE files DISABLE ROW LEVEL SECURITY;

-- Create policy templates for when custom auth is implemented
-- These can be enabled later with proper auth.uid() function

/*
-- Example policies for when custom auth is implemented:

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own notes" ON notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notes" ON notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes" ON notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes" ON notes
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view chunks of own notes" ON chunks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM notes WHERE notes.id = chunks.note_id AND notes.user_id = auth.uid())
  );

CREATE POLICY "Users can manage tags on own notes" ON note_tags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM notes WHERE notes.id = note_tags.note_id AND notes.user_id = auth.uid())
  );

CREATE POLICY "Users can view own files" ON files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own files" ON files
  FOR INSERT WITH CHECK (auth.uid() = user_id);
*/