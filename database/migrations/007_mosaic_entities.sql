-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Entities table for extracted structured data
CREATE TABLE IF NOT EXISTS public.entities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('person', 'organization', 'location', 'concept', 'date', 'event')),
  description TEXT,
  properties JSONB DEFAULT '{}',
  embedding vector(1536), -- OpenAI text-embedding-3-small dimensions
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Entity relationships (knowledge graph edges)
CREATE TABLE IF NOT EXISTS public.entity_relationships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  source_entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
  target_entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
  relationship_type TEXT NOT NULL, -- works_at, located_in, related_to, etc.
  properties JSONB DEFAULT '{}',
  confidence FLOAT DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_entity_id, target_entity_id, relationship_type),
  CHECK (source_entity_id != target_entity_id)
);

-- Link entities to their source content
CREATE TABLE IF NOT EXISTS public.entity_sources (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('note', 'task', 'event')),
  source_id UUID NOT NULL, -- polymorphic reference
  extracted_from TEXT, -- specific text fragment
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mosaic projections (pre-computed UMAP coordinates)
CREATE TABLE IF NOT EXISTS public.mosaic_projections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('note', 'task', 'event', 'entity')),
  item_id UUID NOT NULL,
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  cluster_id INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_type, item_id)
);

-- Indexes for performance
-- Entities indexes
CREATE INDEX idx_entities_user_id ON public.entities(user_id);
CREATE INDEX idx_entities_type ON public.entities(type);
CREATE INDEX idx_entities_name_lower ON public.entities(LOWER(name));
CREATE INDEX idx_entities_embedding ON public.entities USING ivfflat (embedding vector_cosine_ops);

-- Entity relationships indexes
CREATE INDEX idx_entity_relationships_source ON public.entity_relationships(source_entity_id);
CREATE INDEX idx_entity_relationships_target ON public.entity_relationships(target_entity_id);
CREATE INDEX idx_entity_relationships_type ON public.entity_relationships(relationship_type);

-- Entity sources indexes
CREATE INDEX idx_entity_sources_entity ON public.entity_sources(entity_id);
CREATE INDEX idx_entity_sources_source ON public.entity_sources(source_type, source_id);

-- Mosaic projections indexes
CREATE INDEX idx_mosaic_projections_user ON public.mosaic_projections(user_id);
CREATE INDEX idx_mosaic_projections_item ON public.mosaic_projections(item_type, item_id);
CREATE INDEX idx_mosaic_projections_user_type ON public.mosaic_projections(user_id, item_type);

-- Update triggers for entities
CREATE OR REPLACE FUNCTION update_entities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_entities_updated_at
  BEFORE UPDATE ON public.entities
  FOR EACH ROW
  EXECUTE FUNCTION update_entities_updated_at();

-- Update trigger for mosaic_projections
CREATE OR REPLACE FUNCTION update_mosaic_projections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mosaic_projections_updated_at
  BEFORE UPDATE ON public.mosaic_projections
  FOR EACH ROW
  EXECUTE FUNCTION update_mosaic_projections_updated_at();