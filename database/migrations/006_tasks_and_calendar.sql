-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tasks table for task management
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  source_note_id UUID REFERENCES public.notes(id) ON DELETE SET NULL, -- Link to note that generated this task
  source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('manual', 'ai_generated')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar Events table for scheduling
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT, -- Store RRULE for recurring events
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('tentative', 'confirmed', 'cancelled')),
  source_note_id UUID REFERENCES public.notes(id) ON DELETE SET NULL, -- Link to note that generated this event
  source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('manual', 'ai_generated')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Dependencies table (optional - for task relationships)
CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  dependent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  prerequisite_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dependent_task_id, prerequisite_task_id),
  CHECK (dependent_task_id != prerequisite_task_id)
);

-- Indexes for performance
-- Tasks indexes
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_priority ON public.tasks(priority);
CREATE INDEX idx_tasks_source_note_id ON public.tasks(source_note_id);
CREATE INDEX idx_tasks_created_at ON public.tasks(created_at DESC);
CREATE INDEX idx_tasks_user_status_due ON public.tasks(user_id, status, due_date);

-- Calendar events indexes
CREATE INDEX idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX idx_calendar_events_start_datetime ON public.calendar_events(start_datetime);
CREATE INDEX idx_calendar_events_end_datetime ON public.calendar_events(end_datetime);
CREATE INDEX idx_calendar_events_source_note_id ON public.calendar_events(source_note_id);
CREATE INDEX idx_calendar_events_status ON public.calendar_events(status);
CREATE INDEX idx_calendar_events_user_date_range ON public.calendar_events(user_id, start_datetime, end_datetime);

-- Task dependencies indexes
CREATE INDEX idx_task_dependencies_dependent ON public.task_dependencies(dependent_task_id);
CREATE INDEX idx_task_dependencies_prerequisite ON public.task_dependencies(prerequisite_task_id);

-- Update trigger for tasks updated_at
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- Update trigger for calendar_events updated_at  
CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_events_updated_at();