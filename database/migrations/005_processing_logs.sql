-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Processing Logs Table
CREATE TABLE IF NOT EXISTS public.processing_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  status TEXT DEFAULT 'started' CHECK (status IN ('started', 'completed', 'failed')),
  message TEXT,
  error_details JSONB,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_processing_logs_note_id ON public.processing_logs(note_id);
CREATE INDEX idx_processing_logs_created_at ON public.processing_logs(created_at DESC);
CREATE INDEX idx_processing_logs_status ON public.processing_logs(status);